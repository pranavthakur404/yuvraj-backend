import jwt from "jsonwebtoken";
import SubDealer from "../Model/SubDealer.js";
import Dealer from "../Model/Dealer.js";

// Generic token verification middleware
const verifyToken = (tokenName, role) => {
  return async (req, res, next) => {
    console.log("cokkie", req.cookies);
    console.log("header", req.headers);

    const token =
      (req.headers.authorization?.startsWith("Bearer ") &&
        req.headers.authorization.split(" ")[1]) ||
      req.cookies[tokenName];

    if (!token) {
      return res.status(401).json({
        message: `No ${role} token provided`,
        tokenName,
      });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Decoded Token:", decoded);

      if (!decoded.id || decoded.role !== role) {
        throw new Error("Invalid token payload or role mismatch");
      }

      if (role === "dealer") {
        const dealer = await Dealer.findById(decoded.id);
        if (!dealer) {
          return res.status(404).json({ message: "Dealer not found" });
        }
        req.dealerId = decoded.id;
        req.role = role;
        console.log("Authenticated Dealer ID:", req.dealerId);
      } else if (role === "subDealer") {
        const subDealer = await SubDealer.findById(decoded.id);
        if (!subDealer) {
          return res.status(404).json({ message: "Sub-dealer not found" });
        }
        req.subDealerId = decoded.id;
        req.dealerId = subDealer.createdBy; // Set dealerId for sub-dealer context
        req.role = role;
        console.log(
          "Authenticated SubDealer ID:",
          req.subDealerId,
          "Dealer ID:",
          req.dealerId
        );
      }

      next();
    } catch (error) {
      console.error(`Token verification failed for ${role}:`, error.message);
      return res.status(401).json({
        message: "Invalid or expired token",
        error: error.message,
      });
    }
  };
};

// Admin authentication middleware
export const isAuthenticated = (req, res, next) => {
  const adminAuth = req.cookies.adminAuth;

  if (!adminAuth || adminAuth !== "authenticated") {
    return res.status(401).json({
      message: "Unauthorized admin access",
      required: "adminAuth cookie",
    });
  }

  next();
};

// Dealer authentication middleware
export const isDealerAuthenticated = verifyToken("dealerToken", "dealer");

// Sub-dealer authentication middleware
export const isSubDealerAuthenticated = verifyToken(
  "subDealerToken",
  "subDealer"
);

// Standalone sub-dealer authentication (if needed separately)
export const authenticateSubDealer = async (req, res, next) => {
  const token =
    req.cookies.subDealerToken || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "No sub-dealer token provided",
      tokenName: "subDealerToken",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded.id) {
      throw new Error("Invalid token payload");
    }

    const subDealer = await SubDealer.findById(decoded.id);
    if (!subDealer) {
      return res.status(404).json({
        message: "Sub-dealer not found",
        subDealerId: decoded.id,
      });
    }

    req.subDealerId = decoded.id;
    req.dealerId = subDealer.createdBy;
    req.role = decoded.role || "subDealer";

    console.log(
      "Authenticated - SubDealer ID:",
      req.subDealerId,
      "Dealer ID:",
      req.dealerId
    );
    next();
  } catch (error) {
    console.error("Sub-dealer authentication error:", error);
    return res.status(401).json({
      message: "Invalid or expired sub-dealer token",
      error: error.message,
    });
  }
};
