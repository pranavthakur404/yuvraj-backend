import express from "express";
import {
  adminReplaceProduct,
  createDealerSale,
  createSale,
  getAllReplacements,
  getAllSales,
  getDealerReplacements,
  getDealerSales,
  getReplacements,
  getSales,
  replaceDealerProduct,
  replaceProduct,
} from "../Controllers/SaleController.js";
import {
  isAuthenticated,
  isDealerAuthenticated,
  isSubDealerAuthenticated,
} from "../Middleware/authMiddleware.js";

const router = express.Router();

router.post("/v1/create", createSale);
router.get("/v1/sale/list", getSales);
router.put("/v1/replace/:saleId", replaceProduct);
router.get("/v1/replacements", getReplacements);

router.post("/v1/dealer/create", createDealerSale);
router.get("/v1/dealer/sales", getDealerSales);
router.put(
  "/v1/dealer/replace/:saleId",

  replaceDealerProduct
);
router.get(
  "/v1/dealer/replacements",

  getDealerReplacements
);

router.get("/v1/sales/all", getAllSales);
router.post("/v1/sales/replace/admin/:saleId", adminReplaceProduct);

router.get("/v1/replacements/all", getAllReplacements);

export default router;
