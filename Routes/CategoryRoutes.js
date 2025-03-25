import express from "express";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  getCategories,
  removeCategoryImage,
} from "../Controllers/CategoryController.js";

const router = express.Router();

router.post("/", createCategory);
router.get("/", getCategories);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);
router.delete("/:id/remove-image", removeCategoryImage);

export default router;
