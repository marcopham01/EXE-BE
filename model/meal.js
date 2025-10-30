const mongoose = require("mongoose");

const schema = mongoose.Schema;
const mealSchema = new schema({
    name: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    // Danh sách nguyên liệu tham chiếu sang collection Ingredient
    ingredients: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Ingredient",
            required: true,
        },
    ],
    instructions: {
        type: [String],
        required: true,
    },
    image: {
        type: String,
        default: "https://via.placeholder.com/150",
    },
    // Danh mục chính tham chiếu Category
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true,
        index: true,
    },
    // Tiểu mục tham chiếu SubCategory
    subCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SubCategory",
        required: true,
    },
    dietType: {
        type: String,
        enum: [
            "Giảm cân",
            "Tăng cân",
            "Eat clean",
        ],
        required: true,
        index: true,
    },
    totalKcal: {
        type: Number,
        required: true,
    },
    tag: {
        type: [String],
        required: true,
    },
    mealTime: {
        type: [String],
        enum: ["breakfast", "lunch", "dinner", "dessert"],
    },
    rating: {
        type: Number,
        default: 0,
        require: true,
    },
    reviews: {
        type: [String],
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
},
    { timestamps: true }
);

const meal = mongoose.model("Meal", mealSchema);
module.exports = meal;