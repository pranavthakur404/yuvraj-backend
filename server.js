import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import bodyParser from "body-parser";
import connectDB from "./Config/db.js";
import categoryRoutes from "./Routes/CategoryRoutes.js";
import adminRoutes from "./Routes/AdminRoutes.js";
import productRoutes from "./Routes/ProductRoutes.js";
import dealerRoutes from "./Routes/DealerRoutes.js";
import saleRoutes from "./Routes/SaleRoutes.js";

import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.ORIGIN_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE"],
    // allowedHeaders: ["Content-Type", "Authorization"],
    // exposedHeaders: ["Set-Cookie"],
  })
);
app.use("/uploads", express.static(join(__dirname, "uploads")));
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/dealer", dealerRoutes);
app.use("/api/sale", saleRoutes);
app.use("/api/admin", adminRoutes);

const PORT = process.env.PORT || 4550;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
