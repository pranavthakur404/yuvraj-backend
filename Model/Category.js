import mongoose from "mongoose";

const subSubCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
});

const subCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  subSubcategories: [subSubCategorySchema],
});

const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  image: { type: String, required: false, default: "" },
  subcategories: [subCategorySchema],
});

export default mongoose.model("Category", categorySchema);
