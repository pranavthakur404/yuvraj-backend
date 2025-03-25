import fs from "fs";
import path from "path";
import busboy from "busboy";
import Category from "../Model/Category.js";

const uploadDir = path.join("uploads", "category");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const removeImage = (imagePath) => {
  const fullPath = path.join(process.cwd(), imagePath);
  if (fs.existsSync(fullPath)) {
    fs.unlinkSync(fullPath);
    console.log("Backend - Image Removed:", fullPath);
  }
};

export const createCategory = async (req, res) => {
  const bb = busboy({ headers: req.headers });
  let categoryData = { subcategories: [] };
  let imagePath = null;

  bb.on("file", (fieldname, file, info) => {
    console.log("Backend - Received File Field:", fieldname);
    if (fieldname === "image") {
      const { filename } = info;
      const fileName = `${Date.now()}_${filename}`;
      imagePath = `uploads/category/${fileName}`;
      const savePath = path.join(uploadDir, fileName);
      file.pipe(fs.createWriteStream(savePath));
      console.log("Backend - Image Path Set:", imagePath);
    } else {
      console.log("Backend - Unexpected File Field:", fieldname);
    }
  });

  bb.on("field", (key, value) => {
    console.log("Backend - Received Field:", key, value);
    if (key === "subcategories") {
      categoryData.subcategories = JSON.parse(value);
    } else {
      categoryData[key] = value;
    }
  });

  bb.on("finish", async () => {
    try {
      const newCategory = new Category({
        name: categoryData.name,
        image: imagePath || "",
        subcategories: categoryData.subcategories,
      });
      await newCategory.save();
      console.log("Backend - Saved Category:", newCategory.toObject());
      res.status(201).json(newCategory);
    } catch (error) {
      console.error("Backend - Error:", error);
      res
        .status(500)
        .json({ error: "Error creating category", details: error.message });
    }
  });

  req.pipe(bb);
};

export const updateCategory = async (req, res) => {
  const { id } = req.params;
  const category = await Category.findById(id);
  if (!category) return res.status(404).json({ error: "Category not found" });

  const bb = busboy({ headers: req.headers });
  let updatedData = { subcategories: category.subcategories };
  let newImagePath = null;

  bb.on("file", (_, file, info) => {
    const { filename } = info;
    const fileName = `${Date.now()}_${filename}`;
    newImagePath = `uploads/category/${fileName}`; // Consistent path
    const savePath = path.join(uploadDir, fileName);
    file.pipe(fs.createWriteStream(savePath));
  });

  bb.on("field", (key, value) => {
    if (key === "subcategories") {
      updatedData.subcategories = JSON.parse(value);
    } else {
      updatedData[key] = value;
    }
  });

  bb.on("finish", async () => {
    try {
      const updateFields = {
        name: updatedData.name,
        subcategories: updatedData.subcategories,
      };
      if (newImagePath) {
        if (category.image) removeImage(category.image);
        updateFields.image = newImagePath;
      } else if (updatedData.image === "") {
        if (category.image) removeImage(category.image);
        updateFields.image = "";
      } else {
        updateFields.image = category.image;
      }

      const updatedCategory = await Category.findByIdAndUpdate(
        id,
        updateFields,
        { new: true }
      );
      console.log("Backend - Updated Category:", updatedCategory.toObject());
      res.json(updatedCategory);
    } catch (error) {
      console.error("Backend - Update Error:", error);
      res
        .status(500)
        .json({ error: "Error updating category", details: error.message });
    }
  });

  req.pipe(bb);
};

export const removeCategoryImage = async (req, res) => {
  const { id } = req.params;
  try {
    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ error: "Category not found" });
    if (category.image) removeImage(category.image);
    await Category.findByIdAndUpdate(id, { image: "" }); // Changed null to "" for consistency
    res.json({ message: "Image removed successfully" });
  } catch (error) {
    console.error("Backend - Remove Image Error:", error);
    res.status(500).json({ error: "Error removing image" });
  }
};

export const deleteCategory = async (req, res) => {
  const { id } = req.params;
  console.log("Backend - Delete Category ID:", id); // Log the ID received
  try {
    const category = await Category.findById(id);
    if (!category) return res.status(404).json({ error: "Category not found" });
    if (category.image) removeImage(category.image);
    await Category.findByIdAndDelete(id);
    console.log("Backend - Category Deleted:", id);
    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Backend - Delete Error:", error);
    res
      .status(500)
      .json({ error: "Error deleting category", details: error.message });
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find();

    res.json(categories);
  } catch (error) {
    console.error("Backend - Fetch Error:", error);
    res.status(500).json({ error: "Error fetching categories" });
  }
};
