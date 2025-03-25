import express from "express";
import {
  createDealer,
  dealerLogin,
  getDealers,
  deleteDealer,
  updateDealer,
  getDealerProducts,
  requestPasswordChange,
  updateDealerPasswordByAdmin,
  getDealersAll,
} from "../Controllers/DealerController.js";
import {
  authenticateSubDealer,
  isAuthenticated,
  isDealerAuthenticated,
  isSubDealerAuthenticated,
} from "../Middleware/authMiddleware.js";

import {
  createSubDealer,
  subDealerLogin,
  getSubDealers,
  updateSubDealer,
  deleteSubDealer,
  getSubDealerProducts,
  getAllSubDealers,
  requestSubDealerPasswordChange,
  updateSubDealerPasswordByDealer,
  getSubDealerProductsAll,
} from "../Controllers/SubDealerController.js";

const router = express.Router();

router.post("/create", createDealer);
router.post("/login", dealerLogin);
router.get("/list", getDealers);
router.delete("/:id", deleteDealer);
router.put("/:id", updateDealer);
router.get("/products", getDealerProducts);
router.get("/products/:dealerId", getDealerProducts);
router.post("/password/request", requestPasswordChange);
router.put("/password/:id", updateDealerPasswordByAdmin);
router.get("/v1/list/dealer", getDealers);
router.get("/v1/dealer/all/list", getDealersAll);

//Sub-Dealer
router.post("/subdealer/create", createSubDealer);
router.get("/subdealer/:subDealerId/products", getSubDealerProducts);
router.post("/subdealer/login", subDealerLogin);

router.get("/subdealer/subdealers", isDealerAuthenticated, getSubDealers);
router.put("/subdealer/subdealer/:id", isDealerAuthenticated, updateSubDealer);
router.delete(
  "/subdealer/subdealer/:id",
  isDealerAuthenticated,
  deleteSubDealer
);
router.get("/subdealer/products", getSubDealerProducts);

router.get("/subdealer/products/list", getSubDealerProductsAll);
router.get("/subdealer/subdealers", isSubDealerAuthenticated, getSubDealers);
router.get("/v1/subdealer/all/list", getAllSubDealers);
router.post("/subdealer/password/request", requestSubDealerPasswordChange);
router.put("/subdealer/password/:id", updateSubDealerPasswordByDealer);

export default router;
