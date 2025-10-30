const mongoose = require("mongoose");
const schema = mongoose.Schema;

const SubCategorySchema = new schema({
  name: { type: String, required: true, unique: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
});

module.exports = mongoose.model("SubCategory", SubCategorySchema);
