import mongoose from "mongoose";

const saleSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  subDealerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SubDealer",
    required: false,
  },
  dealerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Dealer",
    required: false,
  },
  warrantyStartDate: {
    type: Date,
    required: true,
  },
  warrantyEndDate: {
    type: Date,
    required: true,
  },
  warrantyPeriod: {
    type: String,
    required: true,
  },
  soldBy: { type: String, enum: ["dealer", "subDealer"] },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("SaleModel", saleSchema);
