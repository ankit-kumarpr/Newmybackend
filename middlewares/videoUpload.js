const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads directory exists
const videoDir = path.join(__dirname, "../uploads/business-videos");
if (!fs.existsSync(videoDir)) {
  fs.mkdirSync(videoDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, videoDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `business-video-${uniqueSuffix}${ext}`);
  },
});

// File filter for videos
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(new Error("Only video files are allowed!"), false);
  }
};

// Multer config
const uploadVideo = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
}).single("video");

// Error handler
const handleVideoError = (err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message.includes("video")) {
    return res.status(400).json({
      success: false,
      message:
        err.message ||
        "Video upload error. Allowed: only video files under 50MB.",
    });
  }
  next(err);
};

module.exports = { uploadVideo, handleVideoError };
