import express from "express";
import {
  adminLogin,
  adminLogout,
  adminProtected,
  forgotPassword,
  seedAdmin,
  updatePassword,
} from "../Controllers/AdminController.js";
import { isAuthenticated } from "../Middleware/authMiddleware.js";

const router = express.Router();

router.post("/login", adminLogin);
router.post("/logout", adminLogout);
router.get("/protected", isAuthenticated, adminProtected);
router.post("/forgot-password", forgotPassword);
router.post("/update-password", isAuthenticated, updatePassword);
router.post("/seed", seedAdmin);

export default router;
