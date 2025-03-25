import Admin from "../Model/Admin.js";
import nodemailer from "nodemailer";

export const seedAdmin = async (req, res) => {
  try {
    const adminExists = await Admin.findOne();
    if (!adminExists) {
      const admin = new Admin({
        username: "admin",
        password: "admin123",
        email: "jatinkumar07911@gmail.com",
      });
      await admin.save();
      return res
        .status(201)
        .json({ message: "Initial admin created successfully" });
    }
    return res.status(200).json({ message: "Admin already exists" });
  } catch (error) {
    console.error("Error seeding admin:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const adminLogin = async (req, res) => {
  const { username, password } = req.body;

  try {
    const admin = await Admin.findOne({ username });
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.cookie("adminAuth", "authenticated", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 3600000,
    });
    return res.status(200).json({ message: "Login successful" });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const adminLogout = (req, res) => {
  res.clearCookie("adminAuth", {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
  });
  res.status(200).json({ message: "Logout successful" });
};

export const adminProtected = (req, res) => {
  if (req.cookies.adminAuth === "authenticated") {
    return res.status(200).json({ message: "You are authenticated" });
  }
  return res.status(401).json({ message: "Unauthorized" });
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Please provide an email" });
  }

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res
        .status(404)
        .json({ message: "Admin not found with this email" });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Admin Password Recovery",
      text: `Here are your admin credentials:\nUsername: ${admin.username}\nPassword:  ${admin.password} [Your current password is hidden for security. Please use the update password feature after logging in or contact support if needed.]\n\nNote: For security, we recommend updating your password after logging in.`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({
      message: "Credentials sent to your email. Please check your inbox.",
    });
  } catch (error) {
    console.error("Email error:", error);
    res.status(500).json({ message: "Failed to send email" });
  }
};

export const updatePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!req.cookies.adminAuth || req.cookies.adminAuth !== "authenticated") {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const admin = await Admin.findOne(); // Assuming single admin; adjust if multiple admins
    if (!admin || !(await admin.comparePassword(oldPassword))) {
      return res.status(401).json({ message: "Old password is incorrect" });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({
        message: "New password must be at least 8 characters long",
      });
    }

    admin.password = newPassword; // Will be hashed by pre-save hook
    await admin.save();

    res.clearCookie("adminAuth", {
      httpOnly: true,
      secure: true,
      sameSite: "strict",
    });

    return res.status(200).json({
      message:
        "Password updated successfully. Please login with new credentials",
    });
  } catch (error) {
    console.error("Update password error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
