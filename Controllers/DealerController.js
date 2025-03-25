import jwt from "jsonwebtoken";
import Dealer from "../Model/Dealer.js";
import Product from "../Model/Products.js";
import mongoose from "mongoose";

export const createDealer = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, username, password } = req.body;
    const dealer = new Dealer({
      firstName,
      lastName,
      phoneNumber,
      username,
      password,
      createdBy: req.adminId,
    });
    await dealer.save();
    res.status(201).json({ message: "Dealer created successfully", dealer });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating dealer", error: error.message });
  }
};

export const dealerLogin = async (req, res) => {
  const { identifier, password } = req.body;
  try {
    const dealer = await Dealer.findOne({
      $or: [{ username: identifier }, { phoneNumber: identifier }],
    });

    if (!dealer) {
      console.log("Dealer not found for identifier:", identifier);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (dealer.passwordChangeRequest?.status === "pending") {
      console.log("Login blocked - pending password change for:", identifier);
      return res
        .status(403)
        .json({ message: "Password change request pending. Contact admin." });
    }

    const isMatch = await dealer.comparePassword(password);
    if (!isMatch) {
      console.log("Password mismatch for:", identifier);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: dealer._id, role: "dealer" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("dealerToken", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 60 * 60 * 1000,
    });

    console.log("Dealer token set for:", dealer._id);
    res.status(200).json({
      message: "Login successful",
      dealerId: dealer._id,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Login error", error: error.message });
  }
};

export const getDealers = async (req, res) => {
  try {
    const dealers = await Dealer.find().select("-password");
    res.status(200).json(dealers);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching dealers", error: error.message });
  }
};

export const getDealerProducts = async (req, res) => {
  try {
    const dealerId = req.params.dealerId || req.dealerId;
    console.log("Dealer----->", dealerId);
    if (!dealerId)
      return res.status(400).json({ message: "Dealer ID is required" });

    const products = await Product.find({
      assignedTo: dealerId,
      isAssigned: true,
      assignedToSubDealer: null,
      isAssignedToSubDealer: false,
      isReplaced: false,
    })
      .populate("category", "name")
      .sort({ assignedAt: -1 });

    res.status(200).json({ products });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching dealer products",
      error: error.message,
    });
  }
};

export const updateDealer = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      phoneNumber,
      username,
      password,
      passwordChangeRequest,
    } = req.body;

    const dealer = await Dealer.findById(id);
    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    dealer.firstName = firstName || dealer.firstName;
    dealer.lastName = lastName || dealer.lastName;
    dealer.phoneNumber = phoneNumber || dealer.phoneNumber;
    dealer.username = username || dealer.username;
    if (password) dealer.password = password;
    if (passwordChangeRequest)
      dealer.passwordChangeRequest = passwordChangeRequest;

    await dealer.save();
    res.status(200).json({ message: "Dealer updated successfully", dealer });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating dealer", error: error.message });
  }
};
export const deleteDealer = async (req, res) => {
  try {
    const { id } = req.params;
    const dealer = await Dealer.findByIdAndDelete(id);
    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }
    res.status(200).json({ message: "Dealer deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting dealer", error: error.message });
  }
};

export const requestPasswordChange = async (req, res) => {
  try {
    const { username, phoneNumber } = req.body;
    const dealer = await Dealer.findOne({
      username,
      phoneNumber,
    });

    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    await Dealer.findByIdAndUpdate(dealer._id, {
      passwordChangeRequest: {
        status: "pending",
        requestedAt: new Date(),
      },
    });

    res.status(200).json({ message: "Password change request submitted" });
  } catch (error) {
    res.status(500).json({
      message: "Error requesting password change",
      error: error.message,
    });
  }
};

export const updateDealerPasswordByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const dealer = await Dealer.findById(id);
    if (!dealer) {
      return res.status(404).json({ message: "Dealer not found" });
    }

    dealer.password = newPassword;
    dealer.passwordChangeRequest = { status: "approved", requestedAt: null };
    await dealer.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating password", error: error.message });
  }
};

export const getDealersAll = async (req, res) => {
  try {
    const dealers = await mongoose
      .model("Dealer")
      .find({}, "username firstName lastName");
    res.status(200).json(dealers);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to fetch dealers", error: error.message });
  }
};
