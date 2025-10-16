const Service = require("../models/Service");
const Vendor = require("../models/Vendor");
const fs = require("fs");
const path = require("path");

// Helper to delete file if exists
const deleteFileIfExists = (filePath) => {
  if (!filePath) return;
  try {
    const abs = path.isAbsolute(filePath)
      ? filePath
      : path.join(process.cwd(), filePath);
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch (err) {
    console.error("File delete error:", err);
  }
};

// ✅ Add Service
exports.addService = async (req, res) => {
  try {
    const {
      category,
      serviceName,
      description,
      specifications,
      priceType,
      singlePrice,
      priceRange,
      quantityBasedPrice,
    } = req.body;

    if (!category || !serviceName || !priceType) {
      return res
        .status(400)
        .json({ message: "Category, serviceName, and priceType are required" });
    }

    if (!req.files || !req.files["serviceImage"]) {
      return res.status(400).json({ message: "Service image is required" });
    }

    const imageFile = req.files["serviceImage"][0];
    const pdfFile = req.files["serviceFile"]
      ? req.files["serviceFile"][0]
      : null;

    const newService = new Service({
      vendor: req.user.id, // JWT vendor
      category,
      serviceName,
      description,
      specifications,
      priceType,
      serviceImage: {
        filename: imageFile.filename,
        originalName: imageFile.originalname,
        path: imageFile.path,
        size: imageFile.size,
      },
      serviceFile: pdfFile
        ? {
            filename: pdfFile.filename,
            originalName: pdfFile.originalname,
            path: pdfFile.path,
            size: pdfFile.size,
            uploadedAt: new Date(),
          }
        : undefined,
    });

    if (priceType === "single" && singlePrice)
      newService.singlePrice = JSON.parse(singlePrice);
    if (priceType === "range" && priceRange)
      newService.priceRange = JSON.parse(priceRange);
    if (priceType === "quantityRange" && quantityBasedPrice)
      newService.quantityBasedPrice = JSON.parse(quantityBasedPrice);

    await newService.save();

    res
      .status(201)
      .json({ message: "Service added successfully", service: newService });
  } catch (err) {
    console.error("Add Service Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Get all services (optional filter by vendor)
exports.getAllServices = async (req, res) => {
  try {
    const { vendorId } = req.query;
    const query = vendorId ? { vendor: vendorId } : {};

    const services = await Service.find(query)
      .populate("vendor", "businessName")
      .populate("category", "name");

    res.status(200).json(services);
  } catch (err) {
    console.error("Get Services Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Get single service by id
exports.getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findById(id)
      .populate("vendor", "businessName")
      .populate("category", "name");
    if (!service) return res.status(404).json({ message: "Service not found" });
    res.status(200).json(service);
  } catch (err) {
    console.error("Get Service Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Update Service
exports.updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Service.findById(id);
    if (!existing)
      return res.status(404).json({ message: "Service not found" });

    // Fields from body (optional)
    const {
      categoryId,
      serviceName,
      description,
      specifications,
      priceType,
      singlePrice,
      priceRange,
      quantityBasedPrice,
    } = req.body;

    // Update simple fields if provided
    if (categoryId) existing.category = categoryId;
    if (serviceName) existing.serviceName = serviceName;
    if (description !== undefined) existing.description = description;
    if (specifications !== undefined) existing.specifications = specifications;

    // Handle uploaded files (if any)
    if (req.files && req.files["serviceImage"]) {
      // delete old image file
      if (existing.serviceImage && existing.serviceImage.path) {
        deleteFileIfExists(existing.serviceImage.path);
      }
      const imageFile = req.files["serviceImage"][0];
      existing.serviceImage = {
        filename: imageFile.filename,
        originalName: imageFile.originalname,
        path: imageFile.path,
        size: imageFile.size,
        uploadedAt: new Date(),
      };
    }

    if (req.files && req.files["serviceFile"]) {
      // delete old pdf file if exists
      if (existing.serviceFile && existing.serviceFile.path) {
        deleteFileIfExists(existing.serviceFile.path);
      }
      const pdfFile = req.files["serviceFile"][0];
      existing.serviceFile = {
        filename: pdfFile.filename,
        originalName: pdfFile.originalname,
        path: pdfFile.path,
        size: pdfFile.size,
        uploadedAt: new Date(),
      };
    }

    // Handle priceType changes & data
    if (priceType) {
      if (!["single", "range", "quantityRange"].includes(priceType)) {
        return res.status(400).json({ message: "Invalid priceType" });
      }
      existing.priceType = priceType;

      // Clear all price structures first to avoid stale data
      existing.singlePrice = undefined;
      existing.priceRange = undefined;
      existing.quantityBasedPrice = [];

      // Set based on provided data (if provided)
      if (priceType === "single" && singlePrice) {
        existing.singlePrice = JSON.parse(singlePrice);
      } else if (priceType === "range" && priceRange) {
        existing.priceRange = JSON.parse(priceRange);
      } else if (priceType === "quantityRange" && quantityBasedPrice) {
        existing.quantityBasedPrice = JSON.parse(quantityBasedPrice);
      }
    } else {
      // If priceType not provided, still allow updating existing price blocks individually
      if (singlePrice) existing.singlePrice = JSON.parse(singlePrice);
      if (priceRange) existing.priceRange = JSON.parse(priceRange);
      if (quantityBasedPrice)
        existing.quantityBasedPrice = JSON.parse(quantityBasedPrice);
    }

    existing.updatedAt = Date.now();
    await existing.save();

    res
      .status(200)
      .json({ message: "Service updated successfully", service: existing });
  } catch (err) {
    console.error("Update Service Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// ✅ Delete service
exports.deleteService = async (req, res) => {
  try {
    const { id } = req.params;
    const service = await Service.findByIdAndDelete(id);
    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    // delete files from disk
    if (service.serviceImage && service.serviceImage.path) {
      deleteFileIfExists(service.serviceImage.path);
    }
    if (service.serviceFile && service.serviceFile.path) {
      deleteFileIfExists(service.serviceFile.path);
    }

    res.status(200).json({ message: "Service deleted successfully" });
  } catch (err) {
    console.error("Delete Service Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// get any vendor his services

exports.getVendorServices = async (req, res) => {
  try {
    const services = await Service.find({ vendor: req.user.id })
      .populate("category", "name")
      .sort({ createdAt: -1 });
    res.status(200).json(services);
  } catch (err) {
    console.error("Get Services Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


exports.addKeywords = async (req, res) => {
  try {
    const vendorId = req.user.id; // get from JWT
    const { keywords } = req.body; // expecting array of strings

    if (!Array.isArray(keywords) || keywords.length === 0) {
      return res.status(400).json({ message: "Keywords should be a non-empty array." });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });

    keywords.forEach((kw) => {
      if (!vendor.keywords.includes(kw)) vendor.keywords.push(kw);
    });

    await vendor.save();
    res.status(200).json({ message: "Keywords added successfully", keywords: vendor.keywords });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all keywords
exports.getKeywords = async (req, res) => {
  try {
    const vendorId = req.user.id; // taken from JWT
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.status(200).json({
      message: "Keywords retrieved successfully",
      keywords: vendor.keywords || [], // return empty array if none
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update keywords (replace all)
exports.updateKeywords = async (req, res) => {
  try {
    const vendorId = req.user.id; // from JWT
    const { keywords } = req.body;

    if (!Array.isArray(keywords)) {
      return res.status(400).json({ message: "Keywords should be an array." });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });

    vendor.keywords = keywords;
    await vendor.save();
    res.status(200).json({ message: "Keywords updated successfully", keywords: vendor.keywords });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Delete a keyword
exports.deleteKeyword = async (req, res) => {
  try {
    const vendorId = req.user.id; // from JWT
    const { keyword } = req.params;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) return res.status(404).json({ message: "Vendor not found" });

    vendor.keywords = vendor.keywords.filter((kw) => kw !== keyword);
    await vendor.save();

    res.status(200).json({ message: "Keyword deleted successfully", keywords: vendor.keywords });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
