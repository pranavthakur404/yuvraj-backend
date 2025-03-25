import express from "express";
import {
  createProduct,
  getProducts,
  updateProduct,
  deleteProduct,
  assignProductToSubDealer,
  dealerManualAssignProduct,
  assignProductToDealer,
  bulkAssignProductsToDealer,
} from "../Controllers/ProductController.js";
import {
  authenticateSubDealer,
  isDealerAuthenticated,
} from "../Middleware/authMiddleware.js";

const router = express.Router();

router.post("/", createProduct);
router.get("/", getProducts);
router.put("/:id", updateProduct);
router.delete("/:id", deleteProduct);
router.post("/assign", assignProductToDealer);
router.post(
  "/subdealer/assign-product",

  assignProductToSubDealer
);
router.post("/dealer/manual-assign", dealerManualAssignProduct);
router.post("/bulk-assign-to-dealer", bulkAssignProductsToDealer);

export default router;
