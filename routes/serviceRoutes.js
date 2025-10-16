const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const authMiddleware = require("../middlewares/authMiddleware");
const { permit } = require("../middlewares/roleMiddleware");
const serviceController = require("../controllers/serviceController");

// ---------- Multer ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, "uploads/serviceimages");
    else if (file.mimetype === "application/pdf")
      cb(null, "uploads/servicepdfs");
    else cb(new Error("Only images and PDFs allowed"));
  },
  filename: (req, file, cb) => {
    cb(
      null,
      Date.now() +
        "-" +
        Math.round(Math.random() * 1e9) +
        path.extname(file.originalname)
    );
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

/* ------------------------------------------------
   ✅ SERVICE ROUTES
------------------------------------------------ */

// Add new service
router.post(
  "/add",
  authMiddleware,
  permit("vendor"),
  upload.fields([
    { name: "serviceImage", maxCount: 1 },
    { name: "serviceFile", maxCount: 1 },
  ]),
  serviceController.addService
);

// Get all services (admin or public)
router.get("/all", serviceController.getAllServices);

// Get vendor’s own services
router.get(
  "/my-services",
  authMiddleware,
  permit("vendor"),
  serviceController.getVendorServices
);

/* ------------------------------------------------
   ✅ KEYWORD ROUTES — MUST COME BEFORE /:id
------------------------------------------------ */
router.get(
  "/allkeywords",
  authMiddleware,
  permit("vendor"),
  serviceController.getKeywords
);
router.post(
  "/addkeywords",
  authMiddleware,
  permit("vendor"),
  serviceController.addKeywords
);
router.put(
  "/updatekeywords",
  authMiddleware,
  permit("vendor"),
  serviceController.updateKeywords
);
router.delete(
  "/deletekeywords/:keyword",
  authMiddleware,
  permit("vendor"),
  serviceController.deleteKeyword
);

/* ------------------------------------------------
   ⚠️ DYNAMIC ROUTES (LAST!)
------------------------------------------------ */

// Get single service by ID
router.get("/:id", serviceController.getServiceById);

// Update service
router.put(
  "/update/:id",
  upload.fields([
    { name: "serviceImage", maxCount: 1 },
    { name: "serviceFile", maxCount: 1 },
  ]),
  serviceController.updateService
);

// Delete service
router.delete("/:id", serviceController.deleteService);

module.exports = router;
