const multer = require("multer");
const Ingredient = require("../model/meal/ingredient");
const Meal = require("../model/meal");
const User = require("../model/user");
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

exports.ingredientsFromImage = async (req, res) => {
  try {
    const file = req.file;
    const { imageUrl, userId, heightCm, weightKg, bmi: bmiParam } = req.body;

    const ingredientsFromGemini = await extractIngredientsFromImage({
      imageBuffer: file ? file.buffer : undefined,
      mimeType: file ? file.mimetype : undefined,
      imageUrl,
    });

    // Tìm Ingredient theo tên xấp xỉ (regex không phân biệt hoa thường)
    const nameRegexes = ingredientsFromGemini.map((n) => new RegExp(`^${n.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}$`, "i"));
    const ingredients = await Ingredient.find({ name: { $in: nameRegexes } }).lean();

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

    // Truy vấn bữa ăn chứa đầy đủ tất cả nguyên liệu nhận diện được (có thể đổi sang $in để lỏng hơn)
    const mealQuery = { ingredients: { $all: ingredientIds } };

    // BMI filter cho premium
    if (userId) {
      const user = await User.findById(userId).lean();
      if (user?.premiumMembership) {
        let bmi = Number(bmiParam);
        if (!bmi && heightCm && weightKg) {
          const h = Number(heightCm) / 100;
          const w = Number(weightKg);
          if (h && w) bmi = w / (h * h);
        }
        const dietType = computeDietTypeFromBMI(bmi);
        if (dietType) {
          mealQuery.dietType = dietType;
        }
      }
    }

    const meals = await Meal.find(mealQuery)
      .select("name image totalKcal dietType mealTime category subCategory ingredients")
      .populate({ path: "category", select: "name" })
      .populate({ path: "subCategory", select: "name" })
      .populate({ path: "ingredients", select: "name unit type" })
      .limit(50)
      .lean();

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


