const mongoose = require("mongoose");

const MealPlanSchema = new mongoose.Schema(
    {
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true, index: true },
        input: {
            heightCm: { type: Number, required: true },
            weightKg: { type: Number, required: true },
            activityLevel: { type: String, required: true },
            goal: { type: String, required: true },
        },
        result: {
            bmi: { type: Number, required: true },
            bmiClass: { type: String, required: true },
            bmr: { type: Number, required: true },
            tdee: { type: Number, required: true },
            calorieTarget: { type: Number, required: true },
            breakdown: {
                breakfast: { type: Number, required: true },
                lunch: { type: Number, required: true },
                dinner: { type: Number, required: true },
                dessert: { type: Number, required: true },
            },
            dietType: { type: String, required: true },
            meals: {
                breakfast: { type: Array, default: [] },
                lunch: { type: Array, default: [] },
                dinner: { type: Array, default: [] },
                dessert: { type: Array, default: [] },
            },
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("mealplan", MealPlanSchema);


