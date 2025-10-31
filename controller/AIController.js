const multer = require("multer");
const mongoose = require("mongoose");
const Ingredient = require("../model/meal/ingredient");
const Meal = require("../model/meal");
const User = require("../model/user");
const MealPlan = require("../model/mealPlan");
const { extractIngredientsFromImage } = require("../services/gemini");

// Multer dùng bộ nhớ tạm (không lưu ổ đĩa)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Middleware export để gắn vào route
exports.uploadMiddleware = upload.single("image");

function computeDietTypeFromBMI(bmi) {
  if (bmi == null || Number.isNaN(Number(bmi))) return undefined;
  const v = Number(bmi);
  if (v < 18.5) return "Tăng cân";
  if (v >= 25) return "Giảm cân";
  return "Eat clean";
}

function normalizeVi(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

exports.ingredientsFromImage = async (req, res) => {
  try {
    const file = req.file;
    const { imageUrl } = req.body;

    const ingredientsFromGemini = await extractIngredientsFromImage({
      imageBuffer: file ? file.buffer : undefined,
      mimeType: file ? file.mimetype : undefined,
      imageUrl,
    });

    // Chuẩn hoá và match mềm theo tên (bỏ dấu, lower-case)
    const detectedNorm = new Set(ingredientsFromGemini.map((n) => normalizeVi(n)));
    const allIngs = await Ingredient.find({}).lean();
    const normToDoc = [];
    for (const ing of allIngs) {
      const normName = normalizeVi(ing.name);
      if (detectedNorm.has(normName)) normToDoc.push(ing);
    }
    const ingredients = normToDoc;

    // Nếu chưa map được gì thì trả lại danh sách tên thô để người dùng chỉnh
    if (!ingredients.length) {
      return res.status(200).json({
        success: true,
        ingredientsDetected: ingredientsFromGemini,
        matchedIngredients: [],
        meals: [],
        note: "Không tìm thấy nguyên liệu khớp trong cơ sở dữ liệu",
      });
    }

    const ingredientIds = ingredients.map((i) => i._id);
    const objectIds = ingredientIds
      .filter((id) => mongoose.isValidObjectId(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    // Truy vấn bữa ăn có ÍT NHẤT 1 nguyên liệu khớp (hỗ trợ cả kiểu ObjectId lẫn string)
    const mealQuery = ingredientIds.length
      ? { $or: [{ ingredients: { $in: ingredientIds } }, { ingredients: { $in: objectIds } }] }
      : {};

    // BMI filter cho premium
    const requesterId = req._id?.toString();
    if (requesterId) {
      const user = await User.findById(requesterId).lean();
      if (user?.premiumMembership) {
        // Ưu tiên lấy dietType từ bản kế hoạch BMI mới nhất nếu có
        const latestPlan = await MealPlan.findOne({ user_id: requesterId }).sort({ createdAt: -1 }).lean();
        let dietType;
        if (latestPlan?.result?.dietType) {
          dietType = latestPlan.result.dietType;
        } else {
          // Fallback tính sơ bộ từ height/weight nếu đã lưu
          const h = Number(user.heightCm);
          const w = Number(user.weightKg);
          let bmi;
          if (h && w) {
            const m = h / 100;
            bmi = w / (m * m);
          }
          dietType = computeDietTypeFromBMI(bmi);
        }
        if (dietType) mealQuery.dietType = dietType;
      }
    }

    let meals;
    const idStrings = ingredientIds.map(String);
    if (ingredientIds.length) {
      // Dùng aggregation để so khớp kiểu dữ liệu hỗn hợp (ObjectId hoặc String) bằng cách ép về string
      const pipeline = [];
      if (mealQuery.dietType) {
        pipeline.push({ $match: { dietType: mealQuery.dietType } });
      }
      pipeline.push(
        { $addFields: { ingStr: { $map: { input: "$ingredients", as: "i", in: { $toString: "$$i" } } } } },
        { $addFields: { score: { $size: { $setIntersection: ["$ingStr", idStrings] } } } },
        { $match: { score: { $gt: 0 } } },
        { $sort: { score: -1, rating: -1 } },
        { $limit: 50 },
        { $project: { ingStr: 0 } }
      );
      const agg = await Meal.aggregate(pipeline);
      const ids = agg.map((m) => m._id);
      const order = new Map(ids.map((v, i) => [String(v), i]));
      meals = await Meal.find({ _id: { $in: ids } })
        .select("name image totalKcal dietType mealTime category subCategory ingredients")
        .populate({ path: "category", select: "name" })
        .populate({ path: "subCategory", select: "name" })
        .populate({ path: "ingredients", select: "name unit type" })
        .lean();
      meals.sort((a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0));
    } else {
      meals = await Meal.find({})
        .select("name image totalKcal dietType mealTime category subCategory ingredients")
        .populate({ path: "category", select: "name" })
        .populate({ path: "subCategory", select: "name" })
        .populate({ path: "ingredients", select: "name unit type" })
        .limit(50)
        .lean();
    }

    // Nếu có lọc dietType mà không ra kết quả, thử bỏ dietType để nới lỏng (chỉ khi đã có nguyên liệu)
    if (!meals.length && mealQuery.dietType && ingredientIds.length) {
      const pipeline = [
        { $addFields: { ingStr: { $map: { input: "$ingredients", as: "i", in: { $toString: "$$i" } } } } },
        { $addFields: { score: { $size: { $setIntersection: ["$ingStr", idStrings] } } } },
        { $match: { score: { $gt: 0 } } },
        { $sort: { score: -1, rating: -1 } },
        { $limit: 50 },
        { $project: { ingStr: 0 } },
      ];
      const agg = await Meal.aggregate(pipeline);
      const ids = agg.map((m) => m._id);
      const order = new Map(ids.map((v, i) => [String(v), i]));
      meals = await Meal.find({ _id: { $in: ids } })
        .select("name image totalKcal dietType mealTime category subCategory ingredients")
        .populate({ path: "category", select: "name" })
        .populate({ path: "subCategory", select: "name" })
        .populate({ path: "ingredients", select: "name unit type" })
        .lean();
      meals.sort((a, b) => (order.get(String(a._id)) ?? 0) - (order.get(String(b._id)) ?? 0));
    }

    if (ingredientIds.length) {
      const idSet = new Set(ingredientIds.map(String).concat(objectIds.map(String)));
      meals = meals
        .map((m) => ({
          score: Array.isArray(m.ingredients)
            ? m.ingredients.reduce((c, ing) => (idSet.has(String(ing?._id)) ? c + 1 : c), 0)
            : 0,
          data: m,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 50)
        .map((x) => x.data);
    }

    return res.status(200).json({
      success: true,
      ingredientsDetected: ingredientsFromGemini,
      matchedIngredients: ingredients,
      meals,
    });
  } catch (err) {
    console.error("ingredientsFromImage error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


