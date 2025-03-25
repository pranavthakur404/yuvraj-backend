import Product from "../Model/Products.js";
import Sale from "../Model/SaleModel.js";
import Replacement from "../Model/Replacement.js";
import Dealer from "../Model/Dealer.js";

// Sub-Dealer Sale (Existing)
export const createSale = async (req, res) => {
  try {
    const { code } = req.body;
    const subDealerId = req.subDealerId;

    if (!code)
      return res
        .status(400)
        .json({ message: "No barcode or serial number provided" });

    const product = await Product.findOne({
      $or: [{ barcode: code }, { serialNumber: code }],
      assignedToSubDealer: subDealerId,
      isAssignedToSubDealer: true,
      isReplaced: false,
    });

    if (!product)
      return res
        .status(404)
        .json({ message: "Product not found or not assigned to you" });

    const warrantyStartDate = new Date();
    const warrantyEndDate = calculateWarrantyEndDate(
      warrantyStartDate,
      product.warranty,
      product.warrantyUnit
    );
    const warrantyPeriod = `${product.warranty} ${product.warrantyUnit}`;

    const sale = new Sale({
      productId: product._id,
      dealerId: product.originalAssignedDealer,
      subDealerId,
      warrantyStartDate,
      warrantyEndDate,
      warrantyPeriod,
      soldBy: "subDealer",
    });
    await sale.save();

    // Remove product from sub-dealer's inventory
    await Product.findByIdAndUpdate(product._id, {
      assignedToSubDealer: null,
      isAssignedToSubDealer: false,
      warrantyStartDate,
      warrantyEndDate,
    });

    res
      .status(201)
      .json({ message: "Sub-dealer sale created successfully", sale });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to create sale", error: error.message });
  }
};

// export const assignProductToDealer = async (req, res) => {
//   try {
//     const { code } = req.body;
//     const dealerId = req.dealerId;

//     if (!code) {
//       return res
//         .status(400)
//         .json({ message: "No barcode or serial number provided" });
//     }

//     const product = await Product.findOne({
//       $or: [{ barcode: code }, { serialNumber: code }],
//       assignedTo: null,
//       isAssigned: false,
//       assignedToSubDealer: null,
//       isAssignedToSubDealer: false,
//       isReplaced: false,
//     });

//     if (!product) {
//       return res.status(404).json({
//         message: "Product not found or already assigned/sold/replaced",
//       });
//     }

//     product.assignedTo = dealerId;
//     product.isAssigned = true;
//     product.assignedAt = new Date();
//     await product.save();

//     res.status(200).json({ message: "Product assigned to dealer", product });
//   } catch (error) {
//     console.error(
//       "[Backend] Error assigning product to dealer:",
//       error.message
//     );
//     res
//       .status(500)
//       .json({ message: "Failed to assign product", error: error.message });
//   }
// };

// //Sub dealer product assign
// export const assignProductToSubDealer = async (req, res) => {
//   try {
//     const { code } = req.body;
//     const subDealerId = req.subDealerId;
//     const dealerId = req.dealerId;

//     if (!code) {
//       return res
//         .status(400)
//         .json({ message: "No barcode or serial number provided" });
//     }

//     let product = await Product.findOne({
//       $or: [{ barcode: code }, { serialNumber: code }],
//       assignedTo: dealerId,
//       isAssigned: true,
//       assignedToSubDealer: null,
//       isAssignedToSubDealer: false,
//       isReplaced: false,
//     });

//     if (!product) {
//       return res.status(404).json({
//         message:
//           "Product not found, not assigned to your dealer, or already assigned/sold/replaced",
//       });
//     }

//     product.assignedToSubDealer = subDealerId;
//     product.isAssignedToSubDealer = true;
//     product.assignedToSubDealerAt = new Date();
//     product.assignedTo = null; // Remove from dealer
//     product.isAssigned = false;
//     await product.save();

//     res
//       .status(200)
//       .json({ message: "Product assigned to sub-dealer", product });
//   } catch (error) {
//     console.error(
//       "[Backend] Error assigning product to sub-dealer:",
//       error.message
//     );
//     res.status(500).json({
//       message: "Failed to assign product to sub-dealer",
//       error: error.message,
//     });
//   }
// };

// Dealer Sale (New)
export const createDealerSale = async (req, res) => {
  try {
    const { code } = req.body;
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
        .json({ message: "Product not found or not assigned to you" });

    const warrantyStartDate = new Date();
    const warrantyEndDate = calculateWarrantyEndDate(
      warrantyStartDate,
      product.warranty,
      product.warrantyUnit
    );
    const warrantyPeriod = `${product.warranty} ${product.warrantyUnit}`;

    const sale = new Sale({
      productId: product._id,
      dealerId,
      warrantyStartDate,
      warrantyEndDate,
      warrantyPeriod,
      soldBy: "dealer",
    });
    await sale.save();

    await Product.findByIdAndUpdate(product._id, {
      assignedTo: null,
      isAssigned: false,
      warrantyStartDate,
      warrantyEndDate,
    });

    res.status(201).json({ message: "Dealer sale created successfully", sale });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to create dealer sale", error: error.message });
  }
};

// Get Sub-Dealer Sales (Existing)
export const getSales = async (req, res) => {
  try {
    const subDealerId = req.subDealerId;
    const sales = await Sale.find({ subDealerId })
      .populate(
        "productId",
        "productName barcode serialNumber warranty warrantyUnit"
      )
      .sort({ createdAt: -1 });

    res.status(200).json({ sales });
  } catch (error) {
    console.error("Error fetching sub-dealer sales:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch sales", error: error.message });
  }
};

// Get Dealer Sales (New)
export const getDealerSales = async (req, res) => {
  try {
    const dealerId = req.dealerId;
    const sales = await Sale.find({ dealerId })
      .populate(
        "productId",
        "productName barcode serialNumber warranty warrantyUnit"
      )
      .sort({ createdAt: -1 });

    res.status(200).json({ sales });
  } catch (error) {
    console.error("Error fetching dealer sales:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch dealer sales", error: error.message });
  }
};

//admin replace product :
export const adminReplaceProduct = async (req, res) => {
  try {
    const { saleId } = req.params;
    const { code } = req.body;
    const adminId = req.adminId;

    if (!code) {
      return res.status(400).json({
        message: "No barcode or serial number provided for replacement",
      });
    }

    const sale = await Sale.findById(saleId).populate("productId");
    if (!sale) {
      return res.status(404).json({ message: "Sale not found" });
    }

    const now = new Date();
    if (new Date(sale.warrantyEndDate) <= now) {
      return res.status(400).json({ message: "Warranty has expired" });
    }

    const remainingWarrantyStart = sale.warrantyStartDate;
    const remainingWarrantyEnd = sale.warrantyEndDate;

    let newProduct = await Product.findOne({
      $or: [{ barcode: code }, { serialNumber: code }],
      assignedTo: null,
      isAssigned: false,
      assignedToSubDealer: null,
      isAssignedToSubDealer: false,
      isReplaced: false,
    });

    if (!newProduct) {
      return res.status(404).json({
        message:
          "Replacement product not found or already assigned/sold/replaced",
      });
    }

    // Create replacement record
    const replacement = new Replacement({
      originalProductId: sale.productId._id,
      newProductId: newProduct._id,
      dealerId: sale.dealerId || null,
      subDealerId: sale.subDealerId || null,
      warrantyStartDate: remainingWarrantyStart,
      warrantyEndDate: remainingWarrantyEnd,
      replacedDate: new Date(),
      replacedBy: "admin",
    });
    await replacement.save();

    // Create new sale for the replacement product
    const newSale = new Sale({
      productId: newProduct._id,
      dealerId: sale.dealerId || null,
      subDealerId: sale.subDealerId || null,
      warrantyStartDate: remainingWarrantyStart,
      warrantyEndDate: remainingWarrantyEnd,
      warrantyPeriod: sale.warrantyPeriod,
      soldBy: sale.soldBy,
    });
    await newSale.save();

    // Update the new product
    await Product.findByIdAndUpdate(newProduct._id, {
      assignedTo: null,
      isAssigned: false,
      assignedToSubDealer: null,
      isAssignedToSubDealer: false,
      warrantyStartDate: remainingWarrantyStart,
      warrantyEndDate: remainingWarrantyEnd,
      originalDealerId: sale.dealerId || null,
    });

    // Update the original product
    await Product.findByIdAndUpdate(sale.productId._id, {
      assignedTo: null,
      isAssigned: false,
      assignedToSubDealer: null,
      isAssignedToSubDealer: false,
      warrantyStartDate: null,
      warrantyEndDate: null,
      isReplaced: true,
    });

    // Delete the original sale
    await Sale.findByIdAndDelete(saleId);

    // Populate the new sale for response
    const populatedNewSale = await Sale.findById(newSale._id).populate(
      "productId",
      "productName barcode serialNumber warranty warrantyUnit"
    );

    res.status(200).json({
      message: "Product replaced successfully by admin",
      sale: populatedNewSale,
      replacement,
    });
  } catch (error) {
    console.error(
      "[Backend] Error in admin product replacement:",
      error.message
    );
    res.status(500).json({
      message: "Failed to replace product",
      error: error.message,
    });
  }
};

//Get all replacement for admin
export const getAllReplacements = async (req, res) => {
  try {
    const replacements = await Replacement.find()
      .populate("originalProductId", "productName barcode serialNumber")
      .populate("newProductId", "productName barcode serialNumber")
      .populate("dealerId", "firstName lastName")
      .populate("subDealerId", "firstName lastName")
      .sort({ replacedDate: -1 });

    const formattedReplacements = replacements.map((replacement) => ({
      _id: replacement._id,
      originalSerialNumber:
        replacement.originalProductId?.serialNumber || "N/A",
      originalBarcode: replacement.originalProductId?.barcode || "N/A",
      originalProductName: replacement.originalProductId?.productName || "N/A",
      newSerialNumber: replacement.newProductId?.serialNumber || "N/A",
      newBarcode: replacement.newProductId?.barcode || "N/A",
      newProductName: replacement.newProductId?.productName || "N/A",
      dealerName: replacement.dealerId
        ? `${replacement.dealerId.firstName} ${replacement.dealerId.lastName}`
        : "None",
      subDealerName: replacement.subDealerId
        ? `${replacement.subDealerId.firstName} ${replacement.subDealerId.lastName}`
        : "None",
      warrantyPeriod: `${
        replacement.warrantyStartDate && replacement.warrantyEndDate
          ? `${Math.round(
              (new Date(replacement.warrantyEndDate) -
                new Date(replacement.warrantyStartDate)) /
                (1000 * 60 * 60 * 24)
            )} days`
          : "N/A"
      }`,
      warrantyStartDate: replacement.warrantyStartDate,
      warrantyEndDate: replacement.warrantyEndDate,
      replacedDate: replacement.replacedDate,
      replacedBy: replacement.replacedBy || "unknown",
    }));

    res.status(200).json({ replacements: formattedReplacements });
  } catch (error) {
    console.error("Error fetching all replacements:", error);
    res.status(500).json({
      message: "Failed to fetch replacements",
      error: error.message,
    });
  }
};

// Replace Product (Sub-Dealer, Existing)
export const replaceProduct = async (req, res) => {
  try {
    const { saleId } = req.params;
    const { code } = req.body;
    const subDealerId = req.subDealerId;

    if (!code)
      return res
        .status(400)
        .json({ message: "No barcode or serial number provided" });

    const sale = await Sale.findById(saleId).populate("productId");
    if (!sale || sale.subDealerId?.toString() !== subDealerId) {
      return res
        .status(404)
        .json({ message: "Sale not found or unauthorized" });
    }

    if (new Date(sale.warrantyEndDate) <= new Date()) {
      return res.status(400).json({ message: "Warranty has expired" });
    }

    const newProduct = await Product.findOne({
      $or: [{ barcode: code }, { serialNumber: code }],
      assignedToSubDealer: subDealerId,
      isAssignedToSubDealer: true,
      isReplaced: false,
    });

    if (!newProduct)
      return res.status(404).json({ message: "Replacement product not found" });

    // Record the replacement
    const replacement = new Replacement({
      originalProductId: sale.productId._id,
      newProductId: newProduct._id,
      subDealerId,
      warrantyStartDate: sale.warrantyStartDate,
      warrantyEndDate: sale.warrantyEndDate,
      replacedDate: new Date(),
    });
    await replacement.save();

    // Create new sale with the replacement product using remaining warranty
    const newSale = new Sale({
      productId: newProduct._id,
      dealerId: sale.dealerId,
      subDealerId,
      warrantyStartDate: sale.warrantyStartDate,
      warrantyEndDate: sale.warrantyEndDate,
      warrantyPeriod: sale.warrantyPeriod,
      soldBy: "subDealer",
    });
    await newSale.save();

    // Remove new product from sub-dealer's inventory
    await Product.findByIdAndUpdate(newProduct._id, {
      assignedToSubDealer: null,
      isAssignedToSubDealer: false,
      warrantyStartDate: sale.warrantyStartDate,
      warrantyEndDate: sale.warrantyEndDate,
    });

    // Mark original product as replaced
    await Product.findByIdAndUpdate(sale.productId._id, { isReplaced: true });

    // Delete the old sale
    await Sale.findByIdAndDelete(saleId);

    res
      .status(200)
      .json({ message: "Product replaced successfully", replacement });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to replace product", error: error.message });
  }
};

// Replace Product (Dealer, New)
export const replaceDealerProduct = async (req, res) => {
  try {
    const { saleId } = req.params;
    const { code } = req.body;
    const dealerId = req.dealerId;

    if (!code)
      return res
        .status(400)
        .json({ message: "No barcode or serial number provided" });

    const sale = await Sale.findById(saleId).populate("productId");
    if (
      !sale ||
      sale.dealerId?.toString() !== dealerId ||
      sale.soldBy !== "dealer"
    ) {
      return res
        .status(404)
        .json({ message: "Sale not found or unauthorized" });
    }

    if (new Date(sale.warrantyEndDate) <= new Date()) {
      return res.status(400).json({ message: "Warranty has expired" });
    }

    const newProduct = await Product.findOne({
      $or: [{ barcode: code }, { serialNumber: code }],
      assignedTo: dealerId,
      isAssigned: true,
      assignedToSubDealer: null,
      isAssignedToSubDealer: false,
      isReplaced: false,
    });

    if (!newProduct)
      return res.status(404).json({ message: "Replacement product not found" });

    // Record the replacement
    const replacement = new Replacement({
      originalProductId: sale.productId._id,
      newProductId: newProduct._id,
      dealerId,
      warrantyStartDate: sale.warrantyStartDate,
      warrantyEndDate: sale.warrantyEndDate,
      replacedDate: new Date(),
    });
    await replacement.save();

    // Create new sale with the replacement product using remaining warranty
    const newSale = new Sale({
      productId: newProduct._id,
      dealerId,
      warrantyStartDate: sale.warrantyStartDate,
      warrantyEndDate: sale.warrantyEndDate,
      warrantyPeriod: sale.warrantyPeriod,
      soldBy: "dealer",
    });
    await newSale.save();

    // Remove new product from dealer's inventory
    await Product.findByIdAndUpdate(newProduct._id, {
      assignedTo: null,
      isAssigned: false,
      warrantyStartDate: sale.warrantyStartDate,
      warrantyEndDate: sale.warrantyEndDate,
    });

    // Mark original product as replaced
    await Product.findByIdAndUpdate(sale.productId._id, { isReplaced: true });

    // Delete the old sale
    await Sale.findByIdAndDelete(saleId);

    res
      .status(200)
      .json({ message: "Product replaced successfully", replacement });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to replace product", error: error.message });
  }
};

// Get Sub-Dealer Replacements (Existing)
export const getReplacements = async (req, res) => {
  try {
    const subDealerId = req.subDealerId;
    const replacements = await Replacement.find({ subDealerId })
      .populate("originalProductId", "productName serialNumber")
      .populate("newProductId", "serialNumber")
      .sort({ replacedDate: -1 });

    res.status(200).json({ replacements });
  } catch (error) {
    console.error("Error fetching sub-dealer replacements:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch replacements", error: error.message });
  }
};

// Get Dealer Replacements (New)
export const getDealerReplacements = async (req, res) => {
  try {
    const dealerId = req.dealerId;
    const replacements = await Replacement.find({ dealerId })
      .populate("originalProductId", "productName serialNumber")
      .populate("newProductId", "serialNumber")
      .sort({ replacedDate: -1 });

    res.status(200).json({ replacements });
  } catch (error) {
    console.error("Error fetching dealer replacements:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch replacements", error: error.message });
  }
};

// Warranty End Date Calculation (Helper Function)
function calculateWarrantyEndDate(startDate, warranty, unit) {
  const endDate = new Date(startDate);
  const warrantyValue = parseInt(warranty, 10);

  switch (unit) {
    case "days":
      endDate.setDate(endDate.getDate() + warrantyValue);
      break;
    case "months":
      endDate.setMonth(endDate.getMonth() + warrantyValue);
      break;
    case "years":
      endDate.setFullYear(endDate.getFullYear() + warrantyValue);
      break;
    default:
      throw new Error(`Invalid warranty unit: ${unit}`);
  }
  return endDate;
}

//get all sales track

export const getAllSales = async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate(
        "productId",
        "productName barcode serialNumber originalAssignedDealer"
      )
      .populate("dealerId", "firstName lastName")
      .populate("subDealerId", "firstName lastName")
      .sort({ createdAt: -1 });

    const formattedSales = await Promise.all(
      sales.map(async (sale) => {
        let dealerName = "None";
        let subDealerName = "None";

        // Get the original assigned dealer from the product
        const originalDealerId = sale.productId?.originalAssignedDealer;
        if (originalDealerId) {
          const originalDealer = await Dealer.findById(originalDealerId).select(
            "firstName lastName"
          );
          if (originalDealer) {
            dealerName = `${originalDealer.firstName} ${originalDealer.lastName}`;
          }
        }

        // For sub-dealer sales, include sub-dealer name
        if (sale.soldBy === "subDealer" && sale.subDealerId) {
          subDealerName = `${sale.subDealerId.firstName} ${sale.subDealerId.lastName}`;
        } else if (sale.soldBy === "dealer" && sale.dealerId) {
          // For dealer sales, use the dealerId from the sale
          dealerName = `${sale.dealerId.firstName} ${sale.dealerId.lastName}`;
        }

        return {
          saleId: sale._id,
          serialNumber: sale.productId?.serialNumber || "N/A",
          productName: sale.productId?.productName || "N/A",
          barcode: sale.productId?.barcode || "N/A",
          dealerName,
          subDealerName,
          warrantyPeriod: sale.warrantyPeriod,
          warrantyStartDate: sale.warrantyStartDate,
          warrantyEndDate: sale.warrantyEndDate,
          soldBy: sale.soldBy,
        };
      })
    );

    res.status(200).json({ sales: formattedSales });
  } catch (error) {
    console.error("[getAllSales] Error:", error.message);
    res
      .status(500)
      .json({ message: "Failed to fetch sales", error: error.message });
  }
};
