const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
const Vendor = require("../models/Vendor");
const User = require("../models/User");
const generatePassword = require("../utils/generatePassword");
const {
  sendMail,
  otpEmailTemplate,
  welcomeForVendorTemplate,
} = require("../services/emailService");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("../services/tokenService");
const { createOtp, verifyOtp } = require("../services/otpService");
const fs = require("fs");
const path = require("path");

const SALT_ROUNDS = 10;

/**
 * Vendor Registration - Send OTP to email for verification
 */
const vendorRegister = async (req, res) => {
  try {
    const {
      businessName,
      pincode,
      plotNumber,
      buildingName,
      streetName,
      landmark,
      area,
      city,
      state,
      title,
      contactPerson,
      mobileNumber,
      whatsappNumber,
      email,
      workingDays,
      businessOpenHours,
      openTime,
      closingTime,
    } = req.body;

    // Validate required fields
    const requiredFields = [
      "businessName",
      "pincode",
      "plotNumber",
      "buildingName",
      "streetName",
      "landmark",
      "area",
      "city",
      "state",
      "title",
      "contactPerson",
      "mobileNumber",
      "whatsappNumber",
      "email",
      "workingDays",
      "businessOpenHours",
      "openTime",
      "closingTime",
    ];

    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          message: `Missing required field: ${field}`,
          success: false,
        });
      }
    }

    // Validate working days
    if (req.body.workingDays) {
      const validDays = [
        "All Days",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ];
      const invalidDays = req.body.workingDays.filter(
        (day) => !validDays.includes(day)
      );

      if (invalidDays.length > 0) {
        return res.status(400).json({
          message: `Invalid working days: ${invalidDays.join(", ")}`,
          success: false,
        });
      }

      // Check if "All Days" is selected with other days
      if (
        req.body.workingDays.includes("All Days") &&
        req.body.workingDays.length > 1
      ) {
        return res.status(400).json({
          message: 'If "All Days" is selected, it should be the only option',
          success: false,
        });
      }

      // Check if at least one day is selected
      if (req.body.workingDays.length === 0) {
        return res.status(400).json({
          message: "At least one working day must be selected",
          success: false,
        });
      }
    }

    // Check if vendor already exists
    const existingVendor = await Vendor.findOne({
      $or: [{ email }, { mobileNumber }, { whatsappNumber }],
    });

    if (existingVendor) {
      return res.status(400).json({
        message:
          "Vendor with this email, mobile, or WhatsApp number already exists",
        success: false,
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { phone: mobileNumber }],
    });

    if (existingUser) {
      return res.status(400).json({
        message: "User with this email or mobile number already exists",
        success: false,
      });
    }

    // Create OTP for email verification and store vendor data temporarily
    const otp = await createOtp({
      target: email,
      type: "vendor_email_verify",
      vendorData: {
        businessName,
        pincode,
        plotNumber,
        buildingName,
        streetName,
        landmark,
        area,
        city,
        state,
        title,
        contactPerson,
        mobileNumber,
        whatsappNumber,
        workingDays,
        businessOpenHours,
        openTime,
        closingTime,
      },
    });

    // Send OTP email
    await sendMail({
      to: email,
      subject: "Gnet E-commerce — Verify Your Vendor Registration",
      html: otpEmailTemplate({ code: otp.code }),
    });

    res.status(200).json({
      message:
        "OTP sent to email. Please verify to complete vendor registration.",
      success: true,
      email: email,
    });
  } catch (err) {
    console.error("Vendor registration error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      success: false,
    });
  }
};

/**
 * Verify vendor email OTP and create vendor account
 */
const verifyVendorEmailAndCreate = async (req, res) => {
  try {
    const { email, code } = req.body;

    // Validate required fields
    if (!code || !email) {
      return res.status(400).json({
        message: "Missing OTP code or email",
        success: false,
      });
    }

    // Verify OTP and get stored vendor data
    const otpResult = await verifyOtp({
      target: email,
      type: "vendor_email_verify",
      code,
    });
    if (!otpResult) {
      return res.status(400).json({
        message: "Invalid or expired OTP",
        success: false,
      });
    }

    // Check if vendor already exists
    const existingVendor = await Vendor.findOne({ email });
    if (existingVendor) {
      return res.status(400).json({
        message: "Vendor with this email already exists",
        success: false,
      });
    }

    // Get vendor data from OTP
    const vendorData = otpResult.vendorData;
    if (!vendorData) {
      return res.status(400).json({
        message: "Vendor data not found. Please register again.",
        success: false,
      });
    }

    // Generate password
    const password = generatePassword(12);
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create vendor with actual data
    const vendor = new Vendor({
      businessName: vendorData.businessName,
      pincode: vendorData.pincode,
      plotNumber: vendorData.plotNumber,
      buildingName: vendorData.buildingName,
      streetName: vendorData.streetName,
      landmark: vendorData.landmark,
      area: vendorData.area,
      city: vendorData.city,
      state: vendorData.state,
      title: vendorData.title,
      contactPerson: vendorData.contactPerson,
      mobileNumber: vendorData.mobileNumber,
      whatsappNumber: vendorData.whatsappNumber,
      email,
      workingDays: vendorData.workingDays,
      businessOpenHours: vendorData.businessOpenHours,
      openTime: vendorData.openTime,
      closingTime: vendorData.closingTime,
      password: hashedPassword,
      emailVerified: true,
      registrationStatus: "verified",
    });

    await vendor.save();

    // Send welcome email
    await sendMail({
      to: email,
      subject: "Welcome to Gnet E-commerce - Vendor Account Verified",
      html: welcomeForVendorTemplate({
        businessName: vendorData.businessName,
        contactPerson: vendorData.contactPerson,
        email,
        phone: vendorData.mobileNumber,
        password,
        customId: vendor.customId,
      }),
    });

    res.status(201).json({
      message: "Vendor account created successfully and welcome email sent",
      success: true,
      data: [vendor],
    });
  } catch (err) {
    console.error("Vendor verification error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      success: false,
    });
  }
};

/**
 * Vendor Login
 */
const vendorLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
        success: false,
      });
    }

    const vendor = await Vendor.findOne({ email });
    if (!vendor) {
      return res.status(401).json({
        message: "Invalid credentials",
        success: false,
      });
    }

    if (!vendor.active) {
      return res.status(403).json({
        message: "Vendor account is disabled",
        success: false,
      });
    }

    const passwordMatch = await bcrypt.compare(password, vendor.password);
    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid credentials",
        success: false,
      });
    }

    const accessToken = signAccessToken({ id: vendor._id, role: vendor.role });
    const refreshToken = signRefreshToken({
      id: vendor._id,
      role: vendor.role,
    });

    res.json({
      message: "Login successful",
      success: true,
      accessToken,
      refreshToken,
      vendor: {
        id: vendor._id,
        customId: vendor.customId,
        businessName: vendor.businessName,
        contactPerson: vendor.contactPerson,
        email: vendor.email,
        mobileNumber: vendor.mobileNumber,
        whatsappNumber: vendor.whatsappNumber,
        role: vendor.role,
        registrationStatus: vendor.registrationStatus,
        active: vendor.active,
      },
    });
  } catch (err) {
    console.error("Vendor login error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      success: false,
    });
  }
};

/**
 * Get vendor profile - returns all vendor details
 */
const getVendorProfile = async (req, res) => {
  try {
    const vendorId = req.user.id;

    const vendor = await Vendor.findById(vendorId).select("-password");
    if (!vendor) {
      return res.status(404).json({
        message: "Vendor not found",
        success: false,
      });
    }

    res.json({
      message: "Vendor profile retrieved successfully",
      success: true,
      vendor: {
        id: vendor._id,
        customId: vendor.customId,
        businessName: vendor.businessName,
        title: vendor.title,
        pincode: vendor.pincode,
        plotNumber: vendor.plotNumber,
        buildingName: vendor.buildingName,
        streetName: vendor.streetName,
        landmark: vendor.landmark,
        area: vendor.area,
        city: vendor.city,
        state: vendor.state,
        contactPerson: vendor.contactPerson,
        mobileNumber: vendor.mobileNumber,
        whatsappNumber: vendor.whatsappNumber,
        email: vendor.email,
        workingDays: vendor.workingDays,
        businessOpenHours: vendor.businessOpenHours,
        openTime: vendor.openTime,
        closingTime: vendor.closingTime,
        businessPhotos: vendor.businessPhotos.map((photo) => ({
          id: photo._id,
          filename: photo.filename,
          originalName: photo.originalName,
          size: photo.size,
          uploadedAt: photo.uploadedAt,
          url: `/uploads/business-photos/${photo.filename}`,
        })),
        role: vendor.role,
        active: vendor.active,
        emailVerified: vendor.emailVerified,
        registrationStatus: vendor.registrationStatus,
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt,
      },
    });
  } catch (err) {
    console.error("Get vendor profile error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      success: false,
    });
  }
};

/**
 * Update vendor profile
 */
const updateVendorProfile = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const updateData = req.body;

    // Remove sensitive fields that shouldn't be updated directly
    delete updateData.password;
    delete updateData.customId;
    delete updateData.role;
    delete updateData.emailVerified;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    // If email is being updated, check for duplicates
    if (updateData.email) {
      const existingVendor = await Vendor.findOne({
        email: updateData.email,
        _id: { $ne: vendorId },
      });
      if (existingVendor) {
        return res.status(400).json({
          message: "Email already exists",
          success: false,
        });
      }
    }

    // If mobile number is being updated, check for duplicates
    if (updateData.mobileNumber) {
      const existingVendor = await Vendor.findOne({
        mobileNumber: updateData.mobileNumber,
        _id: { $ne: vendorId },
      });
      if (existingVendor) {
        return res.status(400).json({
          message: "Mobile number already exists",
          success: false,
        });
      }
    }

    // If WhatsApp number is being updated, check for duplicates
    if (updateData.whatsappNumber) {
      const existingVendor = await Vendor.findOne({
        whatsappNumber: updateData.whatsappNumber,
        _id: { $ne: vendorId },
      });
      if (existingVendor) {
        return res.status(400).json({
          message: "WhatsApp number already exists",
          success: false,
        });
      }
    }

    const vendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select("-password");

    if (!vendor) {
      return res.status(404).json({
        message: "Vendor not found",
        success: false,
      });
    }

    res.json({
      message: "Vendor profile updated successfully",
      success: true,
      vendor: {
        id: vendor._id,
        customId: vendor.customId,
        businessName: vendor.businessName,
        title: vendor.title,
        pincode: vendor.pincode,
        plotNumber: vendor.plotNumber,
        buildingName: vendor.buildingName,
        streetName: vendor.streetName,
        landmark: vendor.landmark,
        area: vendor.area,
        city: vendor.city,
        state: vendor.state,
        contactPerson: vendor.contactPerson,
        mobileNumber: vendor.mobileNumber,
        whatsappNumber: vendor.whatsappNumber,
        email: vendor.email,
        workingDays: vendor.workingDays,
        businessOpenHours: vendor.businessOpenHours,
        openTime: vendor.openTime,
        closingTime: vendor.closingTime,
        businessPhotos: vendor.businessPhotos.map((photo) => ({
          id: photo._id,
          filename: photo.filename,
          originalName: photo.originalName,
          size: photo.size,
          uploadedAt: photo.uploadedAt,
          url: `/uploads/business-photos/${photo.filename}`,
        })),
        role: vendor.role,
        active: vendor.active,
        emailVerified: vendor.emailVerified,
        registrationStatus: vendor.registrationStatus,
        updatedAt: vendor.updatedAt,
      },
    });
  } catch (err) {
    console.error("Update vendor profile error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      success: false,
    });
  }
};

/**
 * Get all vendors (Admin only)
 */
const getAllVendors = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, city, state } = req.query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter = {};
    if (status) filter.registrationStatus = status;
    if (city) filter.city = new RegExp(city, "i");
    if (state) filter.state = new RegExp(state, "i");

    const vendors = await Vendor.find(filter)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Vendor.countDocuments(filter);

    res.json({
      message: "Vendors retrieved successfully",
      success: true,
      vendors,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalVendors: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (err) {
    console.error("Get all vendors error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      success: false,
    });
  }
};

/**
 * Get vendor by ID (Admin only)
 */
const getVendorById = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await Vendor.findById(vendorId).select("-password");
    if (!vendor) {
      return res.status(404).json({
        message: "Vendor not found",
        success: false,
      });
    }

    res.json({
      message: "Vendor retrieved successfully",
      success: true,
      vendor,
    });
  } catch (err) {
    console.error("Get vendor by ID error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      success: false,
    });
  }
};

/**
 * Update vendor status (Admin only)
 */
const updateVendorStatus = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const { registrationStatus, active } = req.body;

    const updateData = {};
    if (registrationStatus !== undefined)
      updateData.registrationStatus = registrationStatus;
    if (active !== undefined) updateData.active = active;

    const vendor = await Vendor.findByIdAndUpdate(
      vendorId,
      { ...updateData, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).select("-password");

    if (!vendor) {
      return res.status(404).json({
        message: "Vendor not found",
        success: false,
      });
    }

    res.json({
      message: "Vendor status updated successfully",
      success: true,
      vendor: {
        id: vendor._id,
        customId: vendor.customId,
        businessName: vendor.businessName,
        email: vendor.email,
        registrationStatus: vendor.registrationStatus,
        active: vendor.active,
      },
    });
  } catch (err) {
    console.error("Update vendor status error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      success: false,
    });
  }
};

/**
 * Delete vendor (Admin only)
 */
const deleteVendor = async (req, res) => {
  try {
    const { vendorId } = req.params;

    const vendor = await Vendor.findByIdAndDelete(vendorId);
    if (!vendor) {
      return res.status(404).json({
        message: "Vendor not found",
        success: false,
      });
    }

    res.json({
      message: "Vendor deleted successfully",
      success: true,
      deletedVendor: {
        id: vendor._id,
        customId: vendor.customId,
        businessName: vendor.businessName,
        email: vendor.email,
      },
    });
  } catch (err) {
    console.error("Delete vendor error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      success: false,
    });
  }
};

/**
 * Upload business photos for vendor
 */
const uploadBusinessPhotos = async (req, res) => {
  try {
    const vendorId = req.user.id;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        message: "No photos uploaded",
        success: false,
      });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        message: "Vendor not found",
        success: false,
      });
    }

    // Prepare photo data
    const photosData = req.files.map((file) => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size,
      uploadedAt: new Date(),
    }));

    // Add photos to vendor's businessPhotos array
    vendor.businessPhotos.push(...photosData);
    await vendor.save();

    res.json({
      message: `${req.files.length} photo(s) uploaded successfully`,
      success: true,
      uploadedPhotos: photosData.map((photo) => ({
        filename: photo.filename,
        originalName: photo.originalName,
        size: photo.size,
        uploadedAt: photo.uploadedAt,
      })),
      totalPhotos: vendor.businessPhotos.length,
    });
  } catch (err) {
    console.error("Upload business photos error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      success: false,
    });
  }
};

/**
 * Delete a specific business photo
 */
const deleteBusinessPhoto = async (req, res) => {
  try {
    const vendorId = req.user.id;
    const { photoId } = req.params;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        message: "Vendor not found",
        success: false,
      });
    }

    // Find the photo to delete
    const photoIndex = vendor.businessPhotos.findIndex(
      (photo) => photo._id.toString() === photoId
    );
    if (photoIndex === -1) {
      return res.status(404).json({
        message: "Photo not found",
        success: false,
      });
    }

    const photoToDelete = vendor.businessPhotos[photoIndex];

    // Delete file from filesystem
    const filePath = photoToDelete.path;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Remove photo from array
    vendor.businessPhotos.splice(photoIndex, 1);
    await vendor.save();

    res.json({
      message: "Photo deleted successfully",
      success: true,
      deletedPhoto: {
        filename: photoToDelete.filename,
        originalName: photoToDelete.originalName,
      },
      remainingPhotos: vendor.businessPhotos.length,
    });
  } catch (err) {
    console.error("Delete business photo error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      success: false,
    });
  }
};

/**
 * Get all business photos for vendor
 */
const getBusinessPhotos = async (req, res) => {
  try {
    // For testing without auth, use a hardcoded vendor ID
    const vendorId = req.user?.id; // Replace with actual vendor ID
    console.log("vendor id is", vendorId);
    const vendor = await Vendor.findById(vendorId).select("businessPhotos");
    console.log("vendor data", vendor);
    if (!vendor) {
      return res.status(404).json({
        message: "Vendor not found",
        success: false,
      });
    }

    res.json({
      message: "Business photos retrieved successfully",
      success: true,
      photos: vendor.businessPhotos.map((photo) => ({
        id: photo._id,
        filename: photo.filename,
        originalName: photo.originalName,
        size: photo.size,
        uploadedAt: photo.uploadedAt,
        url: `/uploads/business-photos/${photo.filename}`,
      })),
      totalPhotos: vendor.businessPhotos.length,
    });
  } catch (err) {
    console.error("Get business photos error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      success: false,
    });
  }
};


// update social media links api

const updateSocialMediaLinks = async (req, res) => {
  try {
    const vendorId = req.user.id;

    // Extract only valid social links from body
    const { instagram, facebook, youtube, website, other } = req.body;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: 'Vendor not found',
      });
    }

    // Update only provided fields
    vendor.socialMediaLinks = {
      instagram: instagram ?? vendor.socialMediaLinks?.instagram,
      facebook: facebook ?? vendor.socialMediaLinks?.facebook,
      youtube: youtube ?? vendor.socialMediaLinks?.youtube,
      website: website ?? vendor.socialMediaLinks?.website,
      other: other ?? vendor.socialMediaLinks?.other,
    };

    await vendor.save();

    return res.status(200).json({
      success: true,
      message: 'Social media links updated successfully',
      socialMediaLinks: vendor.socialMediaLinks,
    });
  } catch (error) {
    console.error('[updateSocialMediaLinks]', error);
    return res.status(500).json({
      success: false,
      message: 'Error updating social media links',
      error: error.message,
    });
  }
};

// 🧹 Delete Social Media Links
const deleteSocialMediaLinks = async (req, res) => {
  try {
    const { platform } = req.params; // instagram / facebook / youtube / website / other
    const allowed = ['instagram', 'facebook', 'youtube', 'website', 'other'];

    if (!allowed.includes(platform)) {
      return res.status(400).json({
        message: 'Invalid platform name',
        allowedPlatforms: allowed,
        success: false
      });
    }

    const vendor = await Vendor.findById(req.user.id);
    if (!vendor) return res.status(404).json({ message: 'Vendor not found', success: false });

    vendor.socialMediaLinks[platform] = undefined; // delete that one key only
    await vendor.save();

    res.json({
      message: `${platform} link deleted successfully`,
      success: true,
      socialMediaLinks: vendor.socialMediaLinks
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message, success: false });
  }
};


// upload video 

const uploadBusinessVideo = async (req, res) => {
  try {
    const vendorId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a video file.",
      });
    }

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      return res.status(404).json({ success: false, message: "Vendor not found" });
    }

    // If vendor already has a video, delete old file
    if (vendor.businessVideo && vendor.businessVideo.path) {
      fs.unlink(vendor.businessVideo.path, (err) => {
        if (err) console.warn("Old video delete error:", err.message);
      });
    }

    // Save new video info
    vendor.businessVideo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      uploadedAt: new Date(),
    };

    await vendor.save();

    res.status(200).json({
      success: true,
      message: "Business video uploaded successfully",
      video: vendor.businessVideo,
    });
  } catch (err) {
    console.error("Upload video error:", err);
    res.status(500).json({
      success: false,
      message: "Error uploading video",
      error: err.message,
    });
  }
};

// ✏️ Edit video (re-upload)
const editBusinessVideo = uploadBusinessVideo; // same logic for replacing old video

// ❌ Delete business video
const deleteBusinessVideo = async (req, res) => {
  try {
    const vendorId = req.user.id;

    const vendor = await Vendor.findById(vendorId);
    if (!vendor || !vendor.businessVideo) {
      return res.status(404).json({
        success: false,
        message: "No video found for this vendor",
      });
    }

    // Delete file from storage
    if (vendor.businessVideo.path) {
      fs.unlink(vendor.businessVideo.path, (err) => {
        if (err) console.warn("Video delete error:", err.message);
      });
    }

    vendor.businessVideo = undefined;
    await vendor.save();

    res.status(200).json({
      success: true,
      message: "Business video deleted successfully",
    });
  } catch (err) {
    console.error("Delete video error:", err);
    res.status(500).json({
      success: false,
      message: "Error deleting video",
      error: err.message,
    });
  }
};


// add broscher section
const addBrochure = async (req, res) => {
   try {
    const vendorId = req.user.id; // <-- Vendor ID from JWT token
    const file = req.file;

    if (!file) return res.status(400).json({ message: "No brochure file uploaded" });

    const vendor = await Vendor.findById(vendorId);
    if (!vendor) {
      fs.unlinkSync(file.path);
      return res.status(404).json({ message: "Vendor not found" });
    }

    // delete old brochure if exists
    if (vendor.brochure?.path && fs.existsSync(vendor.brochure.path)) {
      fs.unlinkSync(vendor.brochure.path);
    }

    vendor.brochure = {
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size,
      uploadedAt: new Date(),
    };

    await vendor.save();

    res.status(200).json({
      message: "Brochure uploaded successfully",
      brochure: vendor.brochure,
    });
  } catch (err) {
    res.status(500).json({ message: "Error uploading brochure", error: err.message });
  }
};

// ❌ Delete brochure
const deleteBrochure = async (req, res) => {
  try {
    const vendorId = req.user.id; // <-- Vendor ID from JWT token
    const vendor = await Vendor.findById(vendorId);

    if (!vendor) return res.status(404).json({ message: "Vendor not found" });
    if (!vendor.brochure || !vendor.brochure.path)
      return res.status(400).json({ message: "No brochure to delete" });

    if (fs.existsSync(vendor.brochure.path)) {
      fs.unlinkSync(vendor.brochure.path);
    }

    vendor.brochure = undefined;
    await vendor.save();

    res.status(200).json({ message: "Brochure deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error deleting brochure", error: err.message });
  }
};



// search api 
const getVendorSuggestions = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim() === "") {
      return res.status(400).json({ message: "Query parameter is required." });
    }

    const regex = new RegExp(query, "i");

    // ✅ Use $regex directly instead of $elemMatch
    const vendors = await Vendor.find({ keywords: { $regex: regex } })
      .select("businessName keywords")
      .limit(10);

    let suggestions = [];
    vendors.forEach((vendor) => {
      const matched = vendor.keywords.filter((k) => regex.test(k));
      suggestions.push(...matched);
    });

    suggestions = [...new Set(suggestions)];

    res.json({ suggestions });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};



module.exports = {
  vendorRegister,
  verifyVendorEmailAndCreate,
  vendorLogin,
  getVendorProfile,
  updateVendorProfile,
  getAllVendors,
  getVendorById,
  updateVendorStatus,
  deleteVendor,
  uploadBusinessPhotos,
  deleteBusinessPhoto,
  getBusinessPhotos,
  updateSocialMediaLinks,
  uploadBusinessVideo,
  editBusinessVideo,
  deleteBusinessVideo,
  deleteSocialMediaLinks,
  addBrochure,
  deleteBrochure,
  getVendorSuggestions,

};
