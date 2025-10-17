const express = require("express");
const router = express.Router();
const { body, param, query, validationResult } = require("express-validator");

const vendorController = require("../controllers/vendorController");
const authMiddleware = require("../middlewares/authMiddleware");
const uploadBrochure = require("../middlewares/uploadBrochure");
const { permit } = require("../middlewares/roleMiddleware");
const {
  uploadMultiplePhotos,
  handleUploadError,
} = require("../middlewares/uploadMiddleware");
const { uploadVideo, handleVideoError } = require("../middlewares/videoUpload");

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation failed",
      success: false,
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
};

// Basic validation for required fields
const validateRequiredFields = [
  body("businessName").notEmpty().withMessage("Business name is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("mobileNumber")
    .isMobilePhone("en-IN")
    .withMessage("Valid mobile number is required"),
  body("whatsappNumber")
    .isMobilePhone("en-IN")
    .withMessage("Valid WhatsApp number is required"),
  body("workingDays").isArray().withMessage("Working days must be an array"),
  body("workingDays.*")
    .isIn([
      "All Days",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ])
    .withMessage("Invalid working day"),
  handleValidationErrors,
];

// Complete validation for registration
const validateVendorRegistration = [
  body("businessName").notEmpty().withMessage("Business name is required"),
  body("pincode").notEmpty().withMessage("Pincode is required"),
  body("plotNumber").notEmpty().withMessage("Plot number is required"),
  body("buildingName").notEmpty().withMessage("Building name is required"),
  body("streetName").notEmpty().withMessage("Street name is required"),
  body("landmark").notEmpty().withMessage("Landmark is required"),
  body("area").notEmpty().withMessage("Area is required"),
  body("city").notEmpty().withMessage("City is required"),
  body("state").notEmpty().withMessage("State is required"),
  body("title").notEmpty().withMessage("Title is required"),
  body("contactPerson").notEmpty().withMessage("Contact person is required"),
  body("mobileNumber")
    .isMobilePhone("en-IN")
    .withMessage("Valid mobile number is required"),
  body("whatsappNumber")
    .isMobilePhone("en-IN")
    .withMessage("Valid WhatsApp number is required"),
  body("email").isEmail().withMessage("Valid email is required"),
  body("workingDays").isArray().withMessage("Working days must be an array"),
  body("workingDays.*")
    .isIn([
      "All Days",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ])
    .withMessage("Invalid working day"),
  body("businessOpenHours")
    .notEmpty()
    .withMessage("Business open hours is required"),
  body("openTime").notEmpty().withMessage("Open time is required"),
  body("closingTime").notEmpty().withMessage("Closing time is required"),
  handleValidationErrors,
];

// Admin query validation
const validateAdminQuery = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
  query("status")
    .optional()
    .isIn(["pending", "verified", "approved", "rejected"])
    .withMessage("Invalid status"),
  query("city")
    .optional()
    .isLength({ min: 1 })
    .withMessage("City must not be empty"),
  query("state")
    .optional()
    .isLength({ min: 1 })
    .withMessage("State must not be empty"),
  handleValidationErrors,
];

// MongoDB ID validation
const validateMongoId = [
  param("vendorId").isMongoId().withMessage("Invalid vendor ID"),
  handleValidationErrors,
];

// ==================== PUBLIC ROUTES ====================

// Vendor Registration
router.post(
  "/register",
  validateVendorRegistration,
  vendorController.vendorRegister
);

router.post(
  "/verify-email",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("code")
      .isLength({ min: 4, max: 6 })
      .withMessage("Valid OTP code is required"),
    handleValidationErrors,
  ],
  vendorController.verifyVendorEmailAndCreate
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
    handleValidationErrors,
  ],
  vendorController.vendorLogin
);

// Public search suggestions
router.get("/vendor-suggestions", vendorController.getVendorSuggestions);

// ==================== PROTECTED VENDOR ROUTES ====================

// Apply auth middleware to all routes below this line
router.use(authMiddleware);

// Vendor Profile Routes
router.get("/profile", permit("vendor"), vendorController.getVendorProfile);
router.put(
  "/profile",
  permit("vendor"),
  vendorController.updateVendorProfile
);

// Vendor Business Photos Routes
router.post(
  "/photos/upload",
  [permit("vendor"), uploadMultiplePhotos, handleUploadError],
  vendorController.uploadBusinessPhotos
);

router.get(
  "/photos",
  permit("vendor"),
  vendorController.getBusinessPhotos
);

router.delete(
  "/photos/:photoId",
  [
    permit("vendor"),
    param("photoId").isMongoId().withMessage("Invalid photo ID"),
    handleValidationErrors,
  ],
  vendorController.deleteBusinessPhoto
);

// Social Media Links Routes
router.put(
  "/social-links",
  permit("vendor"),
  vendorController.updateSocialMediaLinks
);

router.delete(
  "/delete-social-links/:platform",
  permit("vendor"),
  vendorController.deleteSocialMediaLinks
);

// Video Routes
router.post(
  "/upload-video",
  permit("vendor"),
  uploadVideo,
  handleVideoError,
  vendorController.uploadBusinessVideo
);

router.put(
  "/edit-video",
  permit("vendor"),
  uploadVideo,
  handleVideoError,
  vendorController.editBusinessVideo
);

router.delete(
  "/delete-video",
  permit("vendor"),
  vendorController.deleteBusinessVideo
);

// Brochure Routes
router.post(
  "/brochure",
  permit("vendor"),
  uploadBrochure.single("brochure"),
  vendorController.addBrochure
);

router.delete(
  "/brochure",
  permit("vendor"),
  vendorController.deleteBrochure
);

// ==================== ADMIN ROUTES ====================

router.get(
  "/allvendors",
  [permit("super_admin", "admin"), ...validateAdminQuery],
  vendorController.getAllVendors
);

router.get(
  "/:vendorId",
  [permit("super_admin", "admin"), ...validateMongoId],
  vendorController.getVendorById
);

router.put(
  "/:vendorId/status",
  [
    permit("super_admin", "admin"),
    ...validateMongoId,
    body("registrationStatus")
      .optional()
      .isIn(["pending", "verified", "approved", "rejected"])
      .withMessage("Invalid registration status"),
    body("active")
      .optional()
      .isBoolean()
      .withMessage("Active must be a boolean"),
    handleValidationErrors,
  ],
  vendorController.updateVendorStatus
);

router.delete(
  "/:vendorId",
  [permit("super_admin"), ...validateMongoId],
  vendorController.deleteVendor
);

module.exports = router;