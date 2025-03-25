import Product from "../Model/Products.js";
import path from "path";
import fs from "fs";
import busboy from "busboy";
import Category from "../Model/Category.js";

const uploadDir = path.join("uploads", "products");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const generateUniqueBarcode = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `PRD-${timestamp}-${random}`;
};
console.log("PRD- barcode", generateUniqueBarcode());

const handleFileUpload = (req) => {
  return new Promise((resolve, reject) => {
    const bb = busboy({ headers: req.headers });
    const fields = {};
    const files = [];

    bb.on("file", (name, file, info) => {
      const filePath = path.join(uploadDir, `${Date.now()}_${info.filename}`);
      const writeStream = fs.createWriteStream(filePath);
      file.pipe(writeStream);

      writeStream.on("finish", () => {
        files.push({
          fieldname: name,
          path: filePath,
          filename: info.filename,
        });
      });
    });

    bb.on("field", (name, val) => {
      fields[name] = val;
    });

    bb.on("finish", () => {
      resolve({ fields, files });
    });

    bb.on("error", (err) => {
      reject(err);
    });

    req.pipe(bb);
  });
};

export const createProduct = async (req, res) => {
  try {
    const { fields, files } = await handleFileUpload(req);
    const {
      serialNumber,
      warranty,
      warrantyUnit,
      subcategory,
      subSubcategory,
      quantityText,
      power, // Expecting "kwValue/hpValue"
      operatorHeadRange,
      maxCurrent, // New field
      capacitor, // New field
      motor, // New field (will prepend power.hp)
      dutyPoint, // New field
      nomHead, // New field
      nomDis, // New field
      overallEfficiency, // New field
      ratedSpeed, // New field
    } = fields;

    const existingProduct = await Product.findOne({ serialNumber });
    if (existingProduct) {
      return res
        .status(400)
        .json({ message: "Product with this serial number already exists" });
    }

    const images = files.map((file) => file.path);
    const qty = parseInt(fields.quantity) || 1;
    const products = [];

    const warrantyDays = calculateWarrantyDays(
      parseInt(warranty),
      warrantyUnit
    );

    // Split power into KW and HP
    const [kw, hp] = power.split("/");

    // Prepend power.hp to motor field
    const motorValue = `${hp} ${motor}`.trim();

    const baseProduct = {
      productName: fields.productName,
      category: fields.category,
      subcategory,
      subSubcategory,
      power: { kw, hp },
      phase: fields.phase,
      volts: fields.volts,
      stage: fields.stage,
      maxDischarge: fields.maxDischarge,
      maxHead: fields.maxHead,
      warranty: fields.warranty,
      warrantyUnit,
      pipeSize: fields.pipeSize,
      description: fields.description,
      images,
      quantityText,
      operatorHeadRange,
      maxCurrent, // New field
      capacitor, // New field
      motor: motorValue, // New field with power.hp prepended
      dutyPoint, // New field
      nomHead, // New field
      nomDis, // New field
      overallEfficiency, // New field
      ratedSpeed, // New field
      addedOn: new Date(),
      assignedTo: null,
      isAssigned: false,
      assignedToSubDealer: null,
      isAssignedToSubDealer: false,
    };

    for (let i = 0; i < qty; i++) {
      products.push({
        ...baseProduct,
        serialNumber: `${serialNumber}-${(i + 1).toString().padStart(3, "0")}`,
        barcode: generateUniqueBarcode(),
        quantity: 1,
      });
    }

    const savedProducts = await Product.insertMany(products);
    res.status(201).json({
      message: `Successfully created ${qty} products`,
      products: savedProducts,
    });
  } catch (error) {
    console.error("Error creating products:", error);
    res
      .status(500)
      .json({ message: "Failed to create products", error: error.message });
  }
};

//function foe warranty calc
function calculateWarrantyDays(warranty, unit) {
  console.log("Calculating warranty days - Warranty:", warranty, "Unit:", unit);
  const parsedWarranty = parseInt(warranty, 10);
  if (isNaN(parsedWarranty)) {
    throw new Error("Warranty value is not a valid number");
  }
  switch (unit) {
    case "days":
      return parsedWarranty;
    case "months":
      return parsedWarranty * 30;
    case "years":
      return parsedWarranty * 365;
    default:
      throw new Error(`Invalid warranty unit: ${unit}`);
  }
}

export const assignProductToDealer = async (req, res) => {
  try {
    const { code, dealerId } = req.body;
    const assignerId = req.adminId || req.dealerId;
    const isAdmin = !!req.adminId;

    if (!code || !dealerId)
      return res
        .status(400)
        .json({ message: "Code and dealer ID are required" });

    const product = await Product.findOne({
      $or: [{ barcode: code }, { serialNumber: code }],
      assignedTo: null,
      isAssigned: false,
      assignedToSubDealer: null,
      isAssignedToSubDealer: false,
      isReplaced: false,
    });

    if (!product)
      return res.status(404).json({
        message: "Product not found or already assigned/sold/replaced",
      });

    product.assignedTo = dealerId;
    product.isAssigned = true;
    product.assignedAt = new Date();
    product.assignedBy = assignerId;
    product.assignedByAdmin = isAdmin;
    product.originalAssignedDealer = dealerId;
    await product.save();

    res.status(200).json({
      message: `Product assigned to dealer by ${isAdmin ? "admin" : "dealer"}`,
      product,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to assign product", error: error.message });
  }
};

export const dealerManualAssignProduct = async (req, res) => {
  try {
    const { code } = req.body;
    const dealerId = req.dealerId;

    if (!code) {
      return res.status(400).json({ message: "No product ID provided" });
    }

    const product = await Product.findOne({
      $or: [{ barcode: code }, { serialNumber: code }],
      assignedTo: null,
      isAssigned: false,
      assignedToSubDealer: null,
      isAssignedToSubDealer: false,
      isReplaced: false,
    });
    if (!product) {
      return res.status(404).json({
        message: "Product not found or already assigned/sold/replaced",
      });
    }

    product.assignedTo = dealerId;
    product.isAssigned = true;
    product.assignedAt = new Date();
    product.assignedBy = dealerId;
    product.assignedByAdmin = false;
    product.originalAssignedDealer = dealerId;
    await product.save();

    res.status(200).json({
      message: "Product manually assigned to dealer",
      product,
    });
  } catch (error) {
    console.error("[Backend] Error in manual assignment:", error.message);
    res
      .status(500)
      .json({ message: "Failed to assign product", error: error.message });
  }
};

// New bulk assign function
export const bulkAssignProductsToDealer = async (req, res) => {
  try {
    const { productIds, dealerId } = req.body;

    if (!productIds || !Array.isArray(productIds) || !dealerId) {
      return res
        .status(400)
        .json({ message: "Product IDs and dealer ID are required" });
    }

    const products = await Product.find({
      _id: { $in: productIds },
      assignedTo: null,
      isAssigned: false,
      assignedToSubDealer: null,
      isAssignedToSubDealer: false,
      isReplaced: false,
    });

    if (products.length !== productIds.length) {
      return res
        .status(404)
        .json({ message: "Some products not found or already assigned" });
    }

    await Product.updateMany(
      { _id: { $in: productIds } },
      {
        assignedTo: dealerId,
        isAssigned: true,
        assignedAt: new Date(),
        assignedBy: req.adminId,
        assignedByAdmin: true,
        originalAssignedDealer: dealerId,
      }
    );

    res.status(200).json({
      message: `Successfully assigned ${productIds.length} products to dealer`,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to bulk assign products",
      error: error.message,
    });
  }
};

export const assignProductToSubDealer = async (req, res) => {
  try {
    const { code } = req.body;
    const subDealerId = req.subDealerId || req.body.subDealerId;
    const dealerId = req.dealerId;

    if (!code)
      return res
        .status(400)
        .json({ message: "No barcode or serial number provided" });

    const product = await Product.findOne({
      $or: [{ barcode: code }, { serialNumber: code }],
      assignedTo: dealerId,
      isAssigned: true,
      assignedToSubDealer: null,
      isAssignedToSubDealer: false,
      isReplaced: false,
    });

    if (!product)
      return res
        .status(404)
        .json({ message: "Product not found or not assigned to your dealer" });

    product.assignedTo = null;
    product.isAssigned = false;
    product.assignedToSubDealer = subDealerId;
    product.isAssignedToSubDealer = true;
    product.assignedToSubDealerAt = new Date();
    await product.save();

    res
      .status(200)
      .json({ message: "Product assigned to sub-dealer", product });
  } catch (error) {
    res.status(500).json({
      message: "Failed to assign product to sub-dealer",
      error: error.message,
    });
  }
};

export const getProducts = async (req, res) => {
  try {
    const { page = 1, limit = 50, search = "", categoryName } = req.query;

    const query = {};
    if (search) {
      query.$or = [
        { productName: { $regex: search, $options: "i" } },
        { serialNumber: { $regex: search, $options: "i" } },
        { barcode: { $regex: search, $options: "i" } },
      ];
    }
    if (categoryName && categoryName !== "all") {
      const category = await Category.findOne({ name: categoryName });
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      query.category = category._id;
    }

    const [products, total] = await Promise.all([
      Product.find(query)
        .populate("category", "name")
        .populate("assignedTo", "firstName lastName")
        .sort({ addedOn: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean(),
      Product.countDocuments(query),
    ]);

    res.status(200).json({
      products,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch products", error: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { fields, files } = await handleFileUpload(req);
    const updateData = { ...fields };

    if (fields.power) {
      const [kw, hp] = fields.power.split("/");
      updateData.power = { kw, hp };
      if (fields.motor) {
        updateData.motor = `${hp} ${fields.motor}`.trim();
      }
    }

    if (files.length > 0) {
      const product = await Product.findById(id);
      if (product.images && product.images.length > 0) {
        for (const image of product.images) {
          fs.unlinkSync(image);
        }
      }
      updateData.images = files.map((file) => file.path);
    } else if (fields.deleteImage) {
      const product = await Product.findById(id);
      if (product.images && product.images.length > 0) {
        for (const image of product.images) {
          fs.unlinkSync(image);
        }
      }
      updateData.images = [];
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
    }).populate("category", "name");
    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(updatedProduct);
  } catch (error) {
    console.error("Error updating product:", error);
    res
      .status(500)
      .json({ message: "Failed to update product", error: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (product.images && product.images.length > 0) {
      for (const image of product.images) {
        fs.unlinkSync(image);
      }
    }

    await Product.findByIdAndDelete(id);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    res
      .status(500)
      .json({ message: "Failed to delete product", error: error.message });
  }
};
