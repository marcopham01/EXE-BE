var Meal = require("../model/meal");
const mongoose = require("mongoose");
const Ingredient = require("../model/meal/ingredient");
const Category = require("../model/meal/category");
const SubCategory = require("../model/meal/subCategory");
var bryctjs = require("bcryptjs");
var jwt = require("jsonwebtoken");
const { cacheGet, cacheSet, cacheDel } = require("../services/redis");
const crypto = require("crypto");
const Payment = require("../model/payment");
const User = require("../model/user");
const MealPlan = require("../model/mealPlan");
const SavedMeal = require("../model/savedMeal");
const MealLogEntry = require("../model/mealLogEntry");

const MEAL_TIMES = ["breakfast", "lunch", "dinner"];

const toDateKey = (d) => {
    const year = d.getFullYear();
    const month = `${d.getMonth() + 1}`.padStart(2, "0");
    const day = `${d.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const normalizeDateKey = (value) => {
    if (value && typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }
    const parsed = value instanceof Date ? value : value ? new Date(value) : new Date();
    if (Number.isNaN(parsed.getTime())) {
        throw new Error("Ngày không hợp lệ");
    }
    return toDateKey(parsed);
};

const normalizeTags = (tags) => {
    if (!Array.isArray(tags)) return [];
    return tags
        .filter((tag) => typeof tag === "string" && tag.trim() !== "")
        .map((tag) => tag.trim());
};
const Noti = require("./NotificationController");
const {
  createPagination,
  createPaginatedResponse,
  validatePagination,
} = require("../utils/pagination");

exports.getAllMeal = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const { page: validatedPage, limit: validatedLimit } = validatePagination(page, limit);
        const query = {};
        const total = await Meal.countDocuments(query);
        const pagination = createPagination(validatedPage, validatedLimit, total);
        const meals = await Meal.find(query)
            .populate({ path: "ingredients", select: "name calories unit type image" })
            .populate({ path: "category", select: "name description" })
            .populate({ path: "subCategory", select: "name category" })
            .skip(pagination.skip)
            .limit(pagination.limit)
            .lean();
        const response = createPaginatedResponse(meals, pagination, "Get all meal successfully");
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

exports.getMealById = async (req, res) => {
    try {
        const { id } = req.params;
        const meal = await Meal.findById(id)
            .populate({ path: "ingredients", select: "name calories unit type image" })
            .populate({ path: "category", select: "name description" })
            .populate({ path: "subCategory", select: "name category" })
            .lean();
        if (!meal) {
            return res.status(404).json({ message: "Meal not found", error: true, success: false });
        }
        return res.status(200).json({ message: "Meal found successfully", error: false, success: true, data: meal });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

exports.searchMealByName = async (req, res) => {
    try {
        const { name, page = 1, limit = 10 } = req.query;
        
        if (!name || name.trim() === "") {
            return res.status(400).json({ 
                message: "Tên món ăn không được để trống", 
                error: true, 
                success: false 
            });
        }

        const { page: validatedPage, limit: validatedLimit } = validatePagination(page, limit);
        
        // Tìm kiếm không phân biệt hoa thường với regex
        const searchQuery = {
            name: { $regex: name.trim(), $options: "i" }
        };
        
        const total = await Meal.countDocuments(searchQuery);
        const pagination = createPagination(validatedPage, validatedLimit, total);
        
        const meals = await Meal.find(searchQuery)
            .populate({ path: "ingredients", select: "name calories unit type image" })
            .populate({ path: "category", select: "name description" })
            .populate({ path: "subCategory", select: "name category" })
            .skip(pagination.skip)
            .limit(pagination.limit)
            .lean();
        
        const response = createPaginatedResponse(
            meals, 
            pagination, 
            `Tìm thấy ${total} món ăn với từ khóa "${name}"`
        );
        
        return res.status(200).json(response);
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

// exports.createMeal = async (req, res) => {
exports.createMeal = async (req, res) => {
    try {
        const {
            name,
            description,
            ingredients, // array of Ingredient id strings
            instructions,
            image,
            category, // Category ObjectId string
            subCategory, // SubCategory ObjectId string
            dietType, // enum string
            totalKcal,
            preparationTime, // Thời gian chuẩn bị (phút)
            tag,
            mealTime,
        } = req.body;

        if (!Array.isArray(ingredients) || ingredients.length === 0) {
            return res.status(400).json({ message: "ingredients must be a non-empty array of ids", error: true, success: false });
        }
        if (!category) {
            return res.status(400).json({ message: "category is required", error: true, success: false });
        }
        if (!subCategory) {
            return res.status(400).json({ message: "subCategory is required", error: true, success: false });
        }

        // Helper: convert to ObjectId only for Category/SubCategory
        const toObjectId = async (value, Model, fieldName, options = {}) => {
            const { required = false } = options;
            if (!value) {
                if (required) {
                    throw new Error(`${fieldName} is required`);
                }
                return null;
            }
            if (mongoose.Types.ObjectId.isValid(value)) return value;
            const doc = await Model.findOne({ name: value }).select("_id").lean();
            if (!doc) {
                throw new Error(`${fieldName} not found for value '${value}'`);
            }
            return doc._id;
        };

        // Map ingredients -> ObjectId (chấp nhận id hợp lệ hoặc tên)
        const ingredientIds = await Promise.all(
            ingredients.map((it) => toObjectId(it, Ingredient, "ingredient", { required: true }))
        );
        const categoryId = await toObjectId(category, Category, "category", { required: true });
        const subCategoryId = await toObjectId(subCategory, SubCategory, "subCategory", { required: true });

        // validate dietType theo enum của schema Meal
        const allowedDietTypes = [
            "Giảm cân",
            "Tăng cân",
            "Eat clean",
        ];
        if (!allowedDietTypes.includes(dietType)) {
            return res.status(400).json({ message: "dietType không hợp lệ", error: true, success: false });
        }

        const meal = await Meal.create({
            name,
            description,
            ingredients: ingredientIds,
            instructions,
            image,
            category: categoryId,
            subCategory: subCategoryId,
            dietType,
            totalKcal,
            preparationTime: preparationTime !== undefined ? Number(preparationTime) : undefined,
            tag,
            mealTime,
        });

        return res.status(201).json({ message: "Meal created successfully", error: false, success: true, data: meal });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

// exports.updateMeal = async (req, res) => {
exports.updateMeal = async (req, res) => {
    try {
        const { id } = req.params;
        const update = { ...req.body };

        // Best-effort mapping for ids/names -> ObjectId (dùng cho ingredients/category/subCategory)
        const mapMaybe = async (value, Model) => {
            if (value === undefined) return undefined;
            if (Array.isArray(value)) {
                return Promise.all(
                    value.map(async (v) =>
                        mongoose.Types.ObjectId.isValid(v)
                            ? v
                            : (await Model.findOne({ name: v }).select("_id").lean())?._id
                    )
                );
            }
            if (mongoose.Types.ObjectId.isValid(value)) return value;
            return (await Model.findOne({ name: value }).select("_id").lean())?._id;
        };

        if (update.ingredients) update.ingredients = await mapMaybe(update.ingredients, Ingredient);
        if (update.category) update.category = await mapMaybe(update.category, Category);
        if (update.subCategory) update.subCategory = await mapMaybe(update.subCategory, SubCategory);
        if (update.totalKcal) update.totalKcal = update.totalKcal;
        // Validate preparationTime nếu được cung cấp
        if (update.preparationTime !== undefined) {
            const prepTime = Number(update.preparationTime);
            if (isNaN(prepTime) || prepTime < 0) {
                return res.status(400).json({ message: "preparationTime phải là số >= 0", error: true, success: false });
            }
            update.preparationTime = prepTime;
        }
        // validate dietType nếu client gửi
        if (update.dietType) {
            const allowedDietTypes = [
                "Giảm cân",
                "Tăng cân",
                "Eat clean",
            ];
            if (!allowedDietTypes.includes(update.dietType)) {
                return res.status(400).json({ message: "dietType không hợp lệ", error: true, success: false });
            }
        }
        const meal = await Meal.findByIdAndUpdate(id, update, { new: true })
            .populate({ path: "ingredients", select: "name calories unit type image" })
            .populate({ path: "category", select: "name description" })
            .populate({ path: "subCategory", select: "name category" })
            .lean();
        if (!meal) {
            return res.status(404).json({ message: "Meal not found", error: true, success: false });
        }
        return res.status(200).json({ message: "Meal updated successfully", error: false, success: true, data: meal });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

// exports.deleteMeal = async (req, res) => {
exports.deleteMeal = async (req, res) => {
    try {
        const { id } = req.params;
        const meal = await Meal.findByIdAndDelete(id).lean();
        if (!meal) {
            return res.status(404).json({ message: "Meal not found", error: true, success: false });
        }
        return res.status(200).json({ message: "Meal deleted successfully", error: false, success: true, data: meal });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, error: true, success: false });
    }
}

// Kiểm tra user có premium còn hạn không
async function isPremiumActive(userId) {
    const now = new Date();
    // Ưu tiên Payment còn hạn
    const paid = await Payment.findOne({ user_id: userId, status: "paid", expiredAt: { $gt: now } })
        .sort({ expiredAt: -1 })
        .lean();
    if (paid) return true;
    // Fallback: dựa vào field trên User để test nhanh
    const u = await User.findById(userId).select("premiumMembership premiumMembershipExpires").lean();
    if (u?.premiumMembership && u?.premiumMembershipExpires && new Date(u.premiumMembershipExpires) > now) return true;
    return false;
}

// Tính BMI, BMR, TDEE và đề xuất khẩu phần + món ăn theo mục tiêu
exports.recommendMealsByBMI = async (req, res) => {
    try {
        const userId = req._id?.toString();
        if (!userId) return res.status(401).json({ message: "Chưa đăng nhập", success: false });

        const premium = await isPremiumActive(userId);
        if (!premium) {
            return res.status(402).json({ message: "Tính năng Premium: gói đã hết hạn hoặc chưa kích hoạt", success: false });
        }

        let { heightCm, weightKg, activityLevel, goal } = req.body || {};

        // Luôn lấy giới tính và ngày sinh từ hồ sơ user
        const profile = await User.findById(userId).lean();
        const gender = profile?.gender;
        const birthDate = profile?.birthDate;
        if (!heightCm || !weightKg) {
            return res.status(400).json({ message: "Thiếu chiều cao hoặc cân nặng", success: false });
        }

        // Tính tuổi
        let age;
        if (birthDate) {
            const today = new Date();
            const dob = new Date(birthDate);
            age = today.getFullYear() - dob.getFullYear();
            const m = today.getMonth() - dob.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        }
        if (!age || age < 13 || age > 120) age = 25; // fallback an toàn

        // Chuẩn hoá lựa chọn activityLevel và goal (chỉ 3 lựa chọn)
        const normalize = (s) =>
            (s || "")
                .toString()
                .replace(/\u00A0/g, " ") // chuyển NBSP -> space thường
                .trim()
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "") // bỏ dấu tiếng Việt
                .replace(/[‘’'“”]/g, "") // bỏ ngoặc thông minh/nháy
                .replace(/\s+/g, " "); // gom nhiều khoảng trắng về 1

        const lv = normalize(activityLevel);
        // Chỉ cho phép đúng 3 lựa chọn tiếng Việt
        const allowedLevels = {
            "it van dong": { factor: 1.2, label: "Ít vận động" },
            "van dong vua phai": { factor: 1.55, label: "Vận động vừa phải" },
            "van dong nhieu": { factor: 1.725, label: "Vận động nhiều" },
        };
        const pickedLv = allowedLevels[lv];
        if (!pickedLv) {
            return res.status(400).json({
                success: false,
                message: "activityLevel chỉ được phép: 'Ít vận động' | 'Vận động vừa phải' | 'Vận động nhiều'",
            });
        }
        const factor = pickedLv.factor;

        const g = normalize(goal);
        if (![
            "giam can",
            "duy tri can nang",
            "tang can",
        ].includes(g)) {
            return res.status(400).json({
                success: false,
                message: "goal chỉ được phép: 'Giảm cân' | 'Duy trì cân nặng' | 'Tăng cân'",
            });
        }

        // BMI Calculation: BMI = weight (kg) / height (m)^2
        // Phân loại theo tiêu chuẩn WHO:
        // - < 18.5: Thiếu cân (Underweight)
        // - 18.5-24.9: Cân đối (Normal)
        // - 25-29.9: Thừa cân (Overweight)
        // - >= 30: Béo phì (Obesity)
        const h = Number(heightCm) / 100;
        const w = Number(weightKg);
        if (!(h > 0) || !(w > 0)) {
            return res.status(400).json({ message: "Giá trị chiều cao/cân nặng không hợp lệ", success: false });
        }
        const bmi = +(w / (h * h)).toFixed(1);
        let bmiClass = "Normal";
        let bmiClassVi = "Cân đối";
        if (bmi < 18.5) {
            bmiClass = "Underweight";
            bmiClassVi = "Thiếu cân";
        } else if (bmi < 25) {
            bmiClass = "Normal";
            bmiClassVi = "Cân đối";
        } else if (bmi < 30) {
            bmiClass = "Overweight";
            bmiClassVi = "Thừa cân";
        } else {
            bmiClass = "Obesity";
            bmiClassVi = "Béo phì";
        }

        // BMR (Basal Metabolic Rate) - Công thức Mifflin-St Jeor
        // BMR là lượng calo cơ thể đốt cháy khi nghỉ ngơi hoàn toàn
        // Công thức: BMR = 10*weight(kg) + 6.25*height(cm) - 5*age + (male: +5, female: -161)
        const bmr = Math.round(10 * w + 6.25 * (heightCm) - 5 * age + (gender === "male" ? 5 : -161));

        // TDEE (Total Daily Energy Expenditure) - Tổng năng lượng tiêu thụ hàng ngày
        // TDEE = BMR * Activity Factor
        // Activity Factor: Ít vận động (1.2), Vận động vừa phải (1.55), Vận động nhiều (1.725)
        const tdee = Math.round(bmr * factor);

        // Calorie Target - Mục tiêu calo hàng ngày dựa trên goal
        // Logic theo đề xuất: Kết hợp % TDEE và mức calo cố định an toàn
        let calorieTarget;
        if (g === "giam can") {
            // Logic Giảm cân (Thâm hụt Calo)
            let reduction;
            if (bmi >= 30) {
                // BMI ≥ 30 (Béo phì): Chọn mức NHỎ NHẤT trong 3 lựa chọn
                const option1 = Math.round(tdee * 0.20); // 20% TDEE
                const option2 = 750; // 750 kcal
                const option3 = 1000; // 1000 kcal
                reduction = Math.min(option1, option2, option3);
            } else if (bmi >= 25) {
                // BMI 25-30 (Thừa cân): Chọn mức NHỎ NHẤT trong 2 lựa chọn
                const option1 = Math.round(tdee * 0.15); // 15% TDEE
                const option2 = 500; // 500 kcal
                reduction = Math.min(option1, option2);
            } else {
                // BMI < 25 (Bình thường): Giảm nhẹ 10% TDEE (nếu muốn giảm)
                reduction = Math.round(tdee * 0.10);
            }
            calorieTarget = tdee - reduction;
            
            // Giới hạn an toàn tối thiểu theo BMI
            if (bmi >= 30) {
                // Béo phì: MAX(calorieTarget, 1500 kcal, BMR)
                calorieTarget = Math.max(calorieTarget, 1500, bmr);
            } else if (bmi >= 25) {
                // Thừa cân: MAX(calorieTarget, 1200 kcal, BMR)
                calorieTarget = Math.max(calorieTarget, 1200, bmr);
            } else {
                // Bình thường: MAX(calorieTarget, BMR)
                calorieTarget = Math.max(calorieTarget, bmr);
            }
        } else if (g === "tang can") {
            // Logic Tăng cân (Thặng dư Calo)
            let increase;
            if (bmi < 18.5) {
                // BMI < 18.5 (Thiếu cân): Chọn mức NHỎ NHẤT
                const option1 = Math.round(tdee * 0.15); // 15% TDEE
                const option2 = 500; // 500 kcal
                increase = Math.min(option1, option2);
            } else {
                // BMI 18.5-25 (Bình thường): Chọn mức NHỎ NHẤT (nếu muốn tăng cơ)
                const option1 = Math.round(tdee * 0.10); // 10% TDEE
                const option2 = 300; // 300 kcal
                increase = Math.min(option1, option2);
            }
            calorieTarget = tdee + increase;
        } else {
            // Duy trì cân nặng
            calorieTarget = tdee;
        }
        
        // Lưu ý quan trọng: Mục tiêu calo phải luôn ≥ BMR (an toàn tuyệt đối)
        calorieTarget = Math.max(calorieTarget, bmr);

        // Phân bổ cho các bữa
        const ratios = { breakfast: 0.20, lunch: 0.4, dinner: 0.4 };
        const breakdown = Object.fromEntries(
            Object.entries(ratios).map(([k, r]) => [k, Math.round(calorieTarget * r)])
        );

        // Ánh xạ dietType theo mục tiêu
        const dietByGoal = g === "giam can" ? "Giảm cân" : g === "tang can" ? "Tăng cân" : "Eat clean";

        // Tìm món phù hợp từng bữa ±15% quanh mục tiêu bữa
        const picks = {};
        for (const [mealTime, kcal] of Object.entries(breakdown)) {
            const minK = Math.round(kcal * 0.85);
            const maxK = Math.round(kcal * 1.15);
            // eslint-disable-next-line no-await-in-loop
            const items = await Meal.find({
                mealTime: mealTime,
                dietType: dietByGoal,
                totalKcal: { $gte: minK, $lte: maxK },
            })
                .sort({ rating: -1 })
                .limit(10)
                .select("name image totalKcal dietType mealTime category subCategory")
                .populate({ path: "category", select: "name" })
                .populate({ path: "subCategory", select: "name" })
                .lean();
            picks[mealTime] = items;
        }

        // Lưu kế hoạch vào MealPlan
        const planData = {
            user_id: userId,
            input: { heightCm, weightKg, activityLevel, goal },
            result: {
                bmi,
                bmiClass,
                bmiClassVi,
                bmr,
                tdee,
                calorieTarget,
                breakdown,
                dietType: dietByGoal,
                meals: picks,
            },
        };
        try {
            const created = await MealPlan.create(planData);
            try {
                await Noti.createForUser(userId, {
                    type: "meal_plan_created",
                    title: "Đã tạo kế hoạch bữa ăn cá nhân hoá",
                    message: `Kế hoạch mới đã sẵn sàng với mục tiêu ${planData.result.calorieTarget} kcal/ngày` ,
                    data: { mealPlanId: created?._id, bmi: planData.result.bmi, tdee: planData.result.tdee },
                });
            } catch (_) {}
        } catch (e) {
            // Không chặn response nếu lưu lịch sử lỗi
        }

        return res.status(200).json({
            message: "Tạo kế hoạch bữa ăn cá nhân hoá thành công",
            success: true,
            data: {
                ...planData.result,
                bmiClassVi,
            },
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, success: false });
    }
}

// Lấy lịch sử kế hoạch của user (mới nhất trước)
exports.getMealPlanHistory = async (req, res) => {
    try {
        const userId = req._id?.toString();
        if (!userId) return res.status(401).json({ message: "Chưa đăng nhập", success: false });

        const { page = 1, limit = 10 } = req.query;
        const p = Math.max(1, parseInt(page, 10) || 1);
        const l = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

        const total = await MealPlan.countDocuments({ user_id: userId });
        const items = await MealPlan.find({ user_id: userId })
            .sort({ createdAt: -1 })
            .skip((p - 1) * l)
            .limit(l)
            .lean();

        return res.status(200).json({
            success: true,
            data: items,
            pagination: { page: p, limit: l, total },
        });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, success: false });
    }
}

// Lấy bản kế hoạch mới nhất
exports.getLatestMealPlan = async (req, res) => {
    try {
        const userId = req._id?.toString();
        if (!userId) return res.status(401).json({ message: "Chưa đăng nhập", success: false });

        const latest = await MealPlan.findOne({ user_id: userId }).sort({ createdAt: -1 }).lean();
        if (!latest) return res.status(404).json({ success: false, message: "Chưa có kế hoạch nào" });
        return res.status(200).json({ success: true, data: latest });
    } catch (error) {
        return res.status(500).json({ message: error.message || error, success: false });
    }
}

exports.upsertSavedMeal = async (req, res) => {
    try {
        const userId = req._id?.toString();
        if (!userId) return res.status(401).json({ success: false, message: "Chưa đăng nhập" });

        const { mealId, note, tags } = req.body || {};
        if (!mealId) {
            return res.status(400).json({ success: false, message: "Thiếu mealId" });
        }
        if (!mongoose.Types.ObjectId.isValid(mealId)) {
            return res.status(400).json({ success: false, message: "mealId không hợp lệ" });
        }

        const meal = await Meal.findById(mealId)
            .select("name image totalKcal dietType mealTime tag")
            .lean();
        if (!meal) {
            return res.status(404).json({ success: false, message: "Không tìm thấy món ăn" });
        }

        const payload = {};
        if (note !== undefined) payload.note = note;
        if (tags !== undefined) payload.tags = normalizeTags(tags);

        let saved = await SavedMeal.findOne({ user_id: userId, meal: mealId });
        if (saved) {
            if (payload.note !== undefined) saved.note = payload.note;
            if (payload.tags !== undefined) saved.tags = payload.tags;
            await saved.save();
        } else {
            saved = await SavedMeal.create({
                user_id: userId,
                meal: mealId,
                note: payload.note,
                tags: payload.tags || [],
            });
        }

        const populated = await saved.populate({
            path: "meal",
            select: "name image totalKcal dietType mealTime tag",
        });

        return res.status(200).json({
            success: true,
            message: "Đã lưu món ăn cho user",
            data: populated,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message || error });
    }
};

exports.getSavedMeals = async (req, res) => {
    try {
        const userId = req._id?.toString();
        if (!userId) return res.status(401).json({ success: false, message: "Chưa đăng nhập" });

        const { page = 1, limit = 20 } = req.query;
        const p = Math.max(1, parseInt(page, 10) || 1);
        const l = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));

        const query = { user_id: userId };
        const [total, items] = await Promise.all([
            SavedMeal.countDocuments(query),
            SavedMeal.find(query)
                .sort({ createdAt: -1 })
                .skip((p - 1) * l)
                .limit(l)
                .populate({ path: "meal", select: "name image totalKcal dietType mealTime tag" })
                .lean(),
        ]);

        return res.status(200).json({
            success: true,
            data: items,
            pagination: {
                page: p,
                limit: l,
                total,
                totalPages: Math.ceil(total / l) || 1,
                hasNextPage: p * l < total,
                hasPrevPage: p > 1,
            },
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message || error });
    }
};

exports.removeSavedMeal = async (req, res) => {
    try {
        const userId = req._id?.toString();
        if (!userId) return res.status(401).json({ success: false, message: "Chưa đăng nhập" });

        const { mealId } = req.params;
        if (!mongoose.Types.ObjectId.isValid(mealId)) {
            return res.status(400).json({ success: false, message: "mealId không hợp lệ" });
        }

        const removed = await SavedMeal.findOneAndDelete({ user_id: userId, meal: mealId });
        if (!removed) {
            return res.status(404).json({ success: false, message: "User chưa lưu món ăn này" });
        }

        return res.status(200).json({ success: true, message: "Đã xoá món ăn khỏi danh sách lưu" });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message || error });
    }
};

exports.createMealLogEntry = async (req, res) => {
    try {
        const userId = req._id?.toString();
        if (!userId) return res.status(401).json({ success: false, message: "Chưa đăng nhập" });

        const { mealId, mealTime, date, portion = 1, note, caloriesOverride } = req.body || {};

        if (!mealId || !mealTime) {
            return res.status(400).json({ success: false, message: "Thiếu mealId hoặc mealTime" });
        }
        if (!mongoose.Types.ObjectId.isValid(mealId)) {
            return res.status(400).json({ success: false, message: "mealId không hợp lệ" });
        }
        if (!MEAL_TIMES.includes(mealTime)) {
            return res.status(400).json({ success: false, message: "mealTime phải là breakfast, lunch hoặc dinner" });
        }
        if (!(portion > 0)) {
            return res.status(400).json({ success: false, message: "portion phải lớn hơn 0" });
        }
        if (caloriesOverride !== undefined && !(caloriesOverride >= 0)) {
            return res.status(400).json({ success: false, message: "caloriesOverride không hợp lệ" });
        }

        let dateKey;
        try {
            dateKey = normalizeDateKey(date);
        } catch (err) {
            return res.status(400).json({ success: false, message: err.message });
        }

        const meal = await Meal.findById(mealId)
            .select("name image totalKcal dietType mealTime tag")
            .lean();
        if (!meal) {
            return res.status(404).json({ success: false, message: "Không tìm thấy món ăn" });
        }

        const entry = await MealLogEntry.create({
            user_id: userId,
            meal: mealId,
            mealTime,
            date: dateKey,
            portion,
            note,
            caloriesOverride,
        });

        const populated = await entry.populate({
            path: "meal",
            select: "name image totalKcal dietType mealTime tag",
        });

        return res.status(201).json({
            success: true,
            message: "Đã lưu bữa ăn vào nhật ký",
            data: populated,
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message || error });
    }
};

exports.getMealLogs = async (req, res) => {
    try {
        const userId = req._id?.toString();
        if (!userId) return res.status(401).json({ success: false, message: "Chưa đăng nhập" });

        let { startDate, endDate } = req.query;

        try {
            if (startDate) startDate = normalizeDateKey(startDate);
            if (endDate) endDate = normalizeDateKey(endDate);
        } catch (err) {
            return res.status(400).json({ success: false, message: err.message });
        }

        if (!startDate && !endDate) {
            const end = new Date();
            const start = new Date();
            start.setDate(end.getDate() - 6);
            startDate = normalizeDateKey(start);
            endDate = normalizeDateKey(end);
        } else if (startDate && !endDate) {
            endDate = startDate;
        } else if (!startDate && endDate) {
            startDate = endDate;
        }

        if (startDate > endDate) {
            return res.status(400).json({ success: false, message: "startDate không được lớn hơn endDate" });
        }

        const entries = await MealLogEntry.find({
            user_id: userId,
            date: { $gte: startDate, $lte: endDate },
        })
            .sort({ date: -1, mealTime: 1, createdAt: -1 })
            .populate({ path: "meal", select: "name image totalKcal dietType mealTime tag" })
            .lean();

        const grouped = {};
        entries.forEach((entry) => {
            if (!grouped[entry.date]) {
                grouped[entry.date] = { breakfast: [], lunch: [], dinner: [] };
            }
            const payload = {
                _id: entry._id,
                mealTime: entry.mealTime,
                portion: entry.portion,
                note: entry.note,
                caloriesOverride: entry.caloriesOverride,
                meal: entry.meal,
                createdAt: entry.createdAt,
                updatedAt: entry.updatedAt,
            };
            grouped[entry.date][entry.mealTime].push(payload);
        });

        return res.status(200).json({
            success: true,
            data: grouped,
            range: { startDate, endDate },
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message || error });
    }
};

exports.deleteMealLogEntry = async (req, res) => {
    try {
        const userId = req._id?.toString();
        if (!userId) return res.status(401).json({ success: false, message: "Chưa đăng nhập" });

        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "ID không hợp lệ" });
        }

        const removed = await MealLogEntry.findOneAndDelete({ _id: id, user_id: userId });
        if (!removed) {
            return res.status(404).json({ success: false, message: "Không tìm thấy bản ghi" });
        }

        return res.status(200).json({ success: true, message: "Đã xoá bản ghi bữa ăn" });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message || error });
    }
};