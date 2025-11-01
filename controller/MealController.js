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
            tag,
            mealTime,
        } = req.body;

        if (!Array.isArray(ingredients) || ingredients.length === 0) {
            return res.status(400).json({ message: "ingredients must be a non-empty array of ids", error: true, success: false });
        }

        // Helper: convert to ObjectId only for Category/SubCategory
        const toObjectId = async (value, Model, fieldName) => {
            if (!value) return null;
            if (mongoose.Types.ObjectId.isValid(value)) return value;
            const doc = await Model.findOne({ name: value }).select("_id").lean();
            if (!doc) {
                throw new Error(`${fieldName} not found for value '${value}'`);
            }
            return doc._id;
        };

        // Map ingredients -> ObjectId (chấp nhận id hợp lệ hoặc tên)
        const ingredientIds = await Promise.all(
            ingredients.map((it) => toObjectId(it, Ingredient, "ingredient"))
        );
        const categoryId = await toObjectId(category, Category, "category");
        const subCategoryId = await toObjectId(subCategory, SubCategory, "subCategory");

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

        // BMI
        const h = Number(heightCm) / 100;
        const w = Number(weightKg);
        if (!(h > 0) || !(w > 0)) {
            return res.status(400).json({ message: "Giá trị chiều cao/cân nặng không hợp lệ", success: false });
        }
        const bmi = +(w / (h * h)).toFixed(1);
        let bmiClass = "Normal";
        if (bmi < 18.5) bmiClass = "Underweight";
        else if (bmi < 25) bmiClass = "Normal";
        else if (bmi < 30) bmiClass = "Overweight";
        else bmiClass = "Obesity";

        // BMR (Mifflin St Jeor)
        const bmr = Math.round(10 * w + 6.25 * (heightCm) - 5 * age + (gender === "male" ? 5 : -161));

        // Hệ số hoạt động (đã chuẩn hoá ở trên)
        const tdee = Math.round(bmr * factor);

        // Mục tiêu
        const goalMapVi = { "giam can": -500, "duy tri can nang": 0, "tang can": 500 };
        const delta = goalMapVi[g];
        let calorieTarget = tdee + delta;
        if (calorieTarget < 1200) calorieTarget = 1200; // sàn an toàn

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
                bmr,
                tdee,
                calorieTarget,
                breakdown,
                dietType: dietByGoal,
                meals: picks,
            },
        };
        try {
            await MealPlan.create(planData);
        } catch (e) {
            // Không chặn response nếu lưu lịch sử lỗi
        }

        return res.status(200).json({
            message: "Tạo kế hoạch bữa ăn cá nhân hoá thành công",
            success: true,
            data: planData.result,
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