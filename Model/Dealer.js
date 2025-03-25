import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const dealerSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phoneNumber: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  createdAt: { type: Date, default: Date.now },
  passwordChangeRequest: {
    status: {
      type: String,
      enum: ["none", "pending", "approved"],
      default: "none",
    },
    requestedAt: { type: Date },
  },
});

dealerSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    console.log("Hashing password:", this.password);
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    console.log("Hashed password:", this.password);
  }
  next();
});

dealerSchema.methods.comparePassword = async function (candidatePassword) {
  console.log(
    "Comparing password - Provided:",
    candidatePassword,
    "Stored:",
    this.password
  );
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("Dealer", dealerSchema);
