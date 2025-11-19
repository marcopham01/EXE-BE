const mongoose = require("mongoose");

const MealLogEntrySchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    meal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Meal",
      required: true,
    },
    mealTime: {
      type: String,
      enum: ["breakfast", "lunch", "dinner"],
      required: true,
    },
    date: {
      type: String, // YYYY-MM-DD (local date key)
      required: true,
      index: true,
    },
    portion: {
      type: Number,
      default: 1,
      min: 0.1,
    },
    note: {
      type: String,
    },
    caloriesOverride: {
      type: Number,
      min: 0,
    },
  },
  { timestamps: true }
);

MealLogEntrySchema.index({ user_id: 1, date: 1 });

module.exports = mongoose.model("MealLogEntry", MealLogEntrySchema);


