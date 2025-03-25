import jwt from "jsonwebtoken";
import SubDealer from "../Model/SubDealer.js";
import Product from "../Model/Products.js";

export const createSubDealer = async (req, res) => {
  try {
    const { firstName, lastName, phoneNumber, username, password } = req.body;
    const subDealer = new SubDealer({
      firstName,
      lastName,
      phoneNumber,

      username,
      password,
      createdBy: req.dealerId,
    });
    await subDealer.save();
    res
      .status(201)
      .json({ message: "Sub-dealer created successfully", subDealer });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating sub-dealer", error: error.message });
  }
};

export const subDealerLogin = async (req, res) => {
  const { identifier, password } = req.body;
  try {
    const subDealer = await SubDealer.findOne({
      $or: [{ username: identifier }, { phoneNumber: identifier }],
    });

    if (!subDealer) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (subDealer.passwordChangeRequest.status === "pending") {
      return res
        .status(403)
        .json({ message: "Password change request pending. Contact dealer." });
    }

    const isMatch = await subDealer.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: subDealer._id, role: "subDealer" },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.cookie("subDealerToken", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
      maxAge: 3600000 * 36000,
    });

    res.status(200).json({ message: "Login successful", token });
  } catch (error) {
    res.status(500).json({ message: "Login error", error: error.message });
  }
};

export const getSubDealers = async (req, res) => {
  try {
    const dealerId = req.dealerId;

    console.log("Fetching sub-dealers for dealerId:", dealerId);

    if (!dealerId) {
      return res.status(400).json({ message: "Dealer ID is required" });
    }

    const subDealers = await SubDealer.find({ createdBy: dealerId }).select(
      "-password"
    );

    if (!subDealers || subDealers.length === 0) {
      return res
        .status(200)
        .json({ message: "No sub-dealers found", subDealers: [] });
    }

    res.status(200).json(subDealers);
  } catch (error) {
    console.error("Error fetching sub-dealers:", error);
    res.status(500).json({
      message: "Error fetching sub-dealers",
      error: error.message,
    });
  }
};

export const updateSubDealer = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      phoneNumber,
      password,
      passwordChangeRequest,
    } = req.body;

    const subDealer = await SubDealer.findOne({
      _id: id,
      createdBy: req.dealerId,
    });
    if (!subDealer) {
      return res.status(404).json({ message: "Sub-dealer not found" });
    }

    subDealer.firstName = firstName || subDealer.firstName;
    subDealer.lastName = lastName || subDealer.lastName;
    subDealer.phoneNumber = phoneNumber || subDealer.phoneNumber;

    if (password) subDealer.password = password;
    if (passwordChangeRequest)
      subDealer.passwordChangeRequest = passwordChangeRequest;

    await subDealer.save();

    res
      .status(200)
      .json({ message: "Sub-dealer updated successfully", subDealer });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating sub-dealer", error: error.message });
  }
};

export const deleteSubDealer = async (req, res) => {
  try {
    const { id } = req.params;
    const subDealer = await SubDealer.findOneAndDelete({
      _id: id,
      createdBy: req.dealerId,
    });
    if (!subDealer) {
      return res.status(404).json({ message: "Sub-dealer not found" });
    }
    res.status(200).json({ message: "Sub-dealer deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error deleting sub-dealer", error: error.message });
  }
};

export const getSubDealerProducts = async (req, res) => {
  try {
    const subDealerId = req.params.subDealerId || req.query.subDealerId;
    const dealerId = req.query.dealerId || req.dealerId;

    if (!subDealerId) {
      return res.status(400).json({ message: "Sub-dealer ID is required" });
    }

    if (dealerId) {
      const subDealer = await SubDealer.findOne({
        _id: subDealerId,
        createdBy: dealerId,
      });
      if (!subDealer) {
        return res.status(404).json({
          message: "Sub-dealer not found or not associated with this dealer",
        });
      }
    }

    const products = await Product.find({
      assignedToSubDealer: subDealerId,
      isAssignedToSubDealer: true,
      isReplaced: false,
    })
      .populate("category", "name")
      .sort({ assignedToSubDealerAt: -1 });

    res.status(200).json({ products });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching sub-dealer products",
      error: error.message,
    });
  }
};

export const getSubDealerProductsAll = async (req, res) => {
  try {
    const subDealerId = req.subDealerId;
    const products = await Product.find({
      assignedToSubDealer: subDealerId,
      isAssignedToSubDealer: true,
      isReplaced: false,
    })
      .populate("category", "name")
      .sort({ assignedToSubDealerAt: -1 });

    res.status(200).json({ products });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching sub-dealer products",
      error: error.message,
    });
  }
};

// New endpoint in your backend
export const getAllSubDealers = async (req, res) => {
  try {
    const subDealers = await SubDealer.find().select("-password");
    res.status(200).json(subDealers);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching all sub-dealers",
      error: error.message,
    });
  }
};

export const requestSubDealerPasswordChange = async (req, res) => {
  try {
    const { username, phoneNumber } = req.body;
    const subDealer = await SubDealer.findOne({
      username,
      phoneNumber,
    });

    if (!subDealer) {
      return res.status(404).json({ message: "Sub-dealer not found" });
    }

    await SubDealer.findByIdAndUpdate(subDealer._id, {
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

export const updateSubDealerPasswordByDealer = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const subDealer = await SubDealer.findOne({
      _id: id,
      createdBy: req.dealerId,
    });
    if (!subDealer) {
      return res.status(404).json({ message: "Sub-dealer not found" });
    }

    subDealer.password = newPassword;
    subDealer.passwordChangeRequest = { status: "approved", requestedAt: null };
    await subDealer.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error updating password", error: error.message });
  }
};
