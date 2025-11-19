const mongoose = require("mongoose");

const SavedMealSchema = new mongoose.Schema(
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
    note: {
      type: String,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

SavedMealSchema.index({ user_id: 1, meal: 1 }, { unique: true });

module.exports = mongoose.model("SavedMeal", SavedMealSchema);


