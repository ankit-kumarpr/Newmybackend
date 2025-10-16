const express = require("express");
const router = express.Router();
const { body, validationResult } = require("express-validator");

const searchController = require("../controllers/searchController");
const authMiddleware = require("../middlewares/authMiddleware");

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

const validateSearchEnquiry = [
  body("searchKeyword").notEmpty().withMessage("Search keyword is required"),
  body("explanation").notEmpty().withMessage("Explanation is required"),
  handleValidationErrors,
];

// All routes require authentication
router.use(authMiddleware);

// Update user location
router.put(
  "/location",
  [
    body("latitude").isNumeric().withMessage("Valid latitude is required"),
    body("longitude").isNumeric().withMessage("Valid longitude is required")
  ],
  handleValidationErrors,
  searchController.updateUserLocation
);

// Get user location
router.get("/location", searchController.getUserLocation);

// Create search enquiry
router.post(
  "/enquire",
  validateSearchEnquiry,
  searchController.searchAndCreateEnquiry
);

// Get user's enquiries
router.get("/my-enquiries", searchController.getUserEnquiries);

// Get vendor enquiries
router.get("/vendor/enquiries", searchController.getVendorEnquiries);

// Update enquiry status (vendor response)
router.put(
  "/enquiry/:enquiryId/status",
  [
    body("status").isIn(["accepted", "rejected"]).withMessage("Status must be accepted or rejected"),
    body("responseMessage").optional().isString()
  ],
  handleValidationErrors,
  searchController.updateEnquiryStatus
);

// Search vendors (for autocomplete)
router.get("/vendors", searchController.searchVendorsByKeyword);

router.post(
  "/enquiry/:enquiryId/accept/payment",
  searchController.initiateLeadAcceptance
);

// Verify payment and accept lead
router.post(
  "/enquiry/:enquiryId/verify-payment",
  [
    body("razorpay_order_id").notEmpty().withMessage("Order ID is required"),
    body("razorpay_payment_id").notEmpty().withMessage("Payment ID is required"),
    body("razorpay_signature").notEmpty().withMessage("Signature is required")
  ],
  handleValidationErrors,
  searchController.verifyLeadPayment
);

// Vendor rejects enquiry (no payment)
router.post(
  "/enquiry/:enquiryId/reject",
  searchController.rejectEnquiry
);

// Get vendor payment history
router.get(
  "/vendor/payments",
  searchController.getVendorPayments
);

// Keep old route for backward compatibility (optional)
router.put(
  "/enquiry/:enquiryId/status",
  [
    body("status").isIn(["accepted", "rejected"]).withMessage("Status must be accepted or rejected"),
    body("responseMessage").optional().isString()
  ],
  handleValidationErrors,
  searchController.updateEnquiryStatus
);

module.exports = router;