var Meal = require("../model/meal");
const mongoose = require("mongoose");
const Ingredient = require("../model/meal/ingredient");
const Category = require("../model/meal/category");
const SubCategory = require("../model/meal/subCategory");
var bryctjs = require("bcryptjs");
var jwt = require("jsonwebtoken");
const { cacheGet, cacheSet, cacheDel } = require("../services/redis");
const crypto = require("crypto");
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