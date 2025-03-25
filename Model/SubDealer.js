import mongoose from "mongoose";
import { hashPassword, comparePassword } from "../utils/hashedPassword.js";

const subDealerSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  phoneNumber: { type: String, required: true, unique: true },
  // email: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Dealer",
    required: true,
  },
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

subDealerSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await hashPassword(this.password);
  }
  next();
});

subDealerSchema.methods.comparePassword = async function (candidatePassword) {
  return comparePassword(candidatePassword, this.password);
};

export default mongoose.model("SubDealer", subDealerSchema);
