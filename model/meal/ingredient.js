const mongoose = require("mongoose");
const schema = mongoose.Schema;

const IngredientSchema = new mongoose.Schema({
  _id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
  name: { type: String, required: true, unique: true },
  calories: { type: Number,},
  unit: { type: String, required: true },
  type: { type: String, required: true }, // ví dụ: "meat", "vegetable", "spice", ...
  image: { type: String, required: true },
});

module.exports = mongoose.model("Ingredient", IngredientSchema);
