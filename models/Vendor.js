const mongoose = require("mongoose");

const VendorSchema = new mongoose.Schema({
  // Basic Business Information
  businessName: {
    type: String,
    required: true,
    trim: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },

  // Address Information
  pincode: {
    type: String,
    required: true,
    trim: true,
  },
  plotNumber: {
    type: String,
    required: true,
    trim: true,
  },
  buildingName: {
    type: String,
    required: true,
    trim: true,
  },
  streetName: {
    type: String,
    required: true,
    trim: true,
  },
  landmark: {
    type: String,
    required: true,
    trim: true,
  },
  area: {
    type: String,
    required: true,
    trim: true,
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  state: {
    type: String,
    required: true,
    trim: true,
  },
  businessLatitude: {
    type: Number,
    default: null
  },
  businessLongitude: {
    type: Number,
    default: null
  },
  serviceRadius: {
    type: Number,
    default: 10 // Default 10km radius
  },

  // Contact Information
  contactPerson: {
    type: String,
    required: true,
    trim: true,
  },
  mobileNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  whatsappNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },

  // Business Hours
  workingDays: {
    type: [String],
    required: true,
    enum: [
      "All Days",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    validate: {
      validator: function (days) {
        // If "All Days" is selected, it should be the only option
        if (days.includes("All Days")) {
          return days.length === 1;
        }
        // Otherwise, allow any combination of individual days
        return days.length > 0;
      },
      message:
        'If "All Days" is selected, it should be the only option. Otherwise, select at least one day.',
    },
  },
  businessOpenHours: {
    type: String,
    required: true,
    trim: true,
  },
  openTime: {
    type: String,
    required: true,
    trim: true,
  },
  closingTime: {
    type: String,
    required: true,
    trim: true,
  },

  // Business Photos
  businessPhotos: [
    {
      filename: {
        type: String,
        required: true,
      },
      originalName: {
        type: String,
        required: true,
      },
      path: {
        type: String,
        required: true,
      },
      size: {
        type: Number,
        required: true,
      },
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],

  socialMediaLinks: {
    instagram: { type: String },
    facebook: { type: String },
    youtube: { type: String },
    website: { type: String },
    other: { type: String },
  },
  businessVideo: {
    filename: { type: String },
    originalName: { type: String },
    path: { type: String },
    size: { type: Number },
    uploadedAt: { type: Date },
  },
  brochure: {
    filename: { type: String },
    originalName: { type: String },
    path: { type: String },
    size: { type: Number },
    uploadedAt: { type: Date },
  },

  keywords: [
    {
      type: String,
      trim: true,
    },
  ],
  // System Fields
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    default: "vendor",
    enum: ["vendor"],
  },
  customId: {
    type: String,
    unique: true,
    index: true,
  },
  active: {
    type: Boolean,
    default: true,
  },
  emailVerified: {
    type: Boolean,
    default: false,
  },
  registrationStatus: {
    type: String,
    enum: ["pending", "verified", "approved", "rejected"],
    default: "pending",
  },

  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Pre-save hook to generate customId
VendorSchema.pre("save", async function (next) {
  if (this.isNew && !this.customId) {
    try {
      // Count existing vendors
      const count = await mongoose.model("Vendor").countDocuments();

      // Generate ID like gnetecomvendor0001
      const sequence = String(count + 1).padStart(4, "0");
      this.customId = `gnetecomvendor${sequence}`;
    } catch (err) {
      return next(err);
    }
  }

  // Update updatedAt field
  this.updatedAt = Date.now();
  next();
});

// Index for better performance (only for fields without unique/index already defined)
VendorSchema.index({ city: 1, state: 1 });
VendorSchema.index({ registrationStatus: 1 });
VendorSchema.index({ businessLatitude: 1, businessLongitude: 1 });
VendorSchema.index({ keywords: "text", businessName: "text" });
module.exports = mongoose.model("Vendor", VendorSchema);
