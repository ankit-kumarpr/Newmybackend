const mongoose = require("mongoose");

const EnquirySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  searchKeyword: {
    type: String,
    required: true,
    index: true,
  },
  explanation: {
    type: String,
    required: true,
  },
  userLocation: {
    address: String,
    city: String,
    state: String,
    pincode: String,
    latitude: Number,
    longitude: Number,
  },
  matchedVendors: [{
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
    },
    matchReason: String,
    distance: Number,
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected", "payment_pending"],
      default: "pending"
    },
    respondedAt: Date,
    vendorResponse: String,
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending"
    },
    razorpayOrderId: String
  }],
  status: {
    type: String,
    enum: ["active", "resolved", "expired"],
    default: "active",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  },
});

// Indexes for better performance
EnquirySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
EnquirySchema.index({ "matchedVendors.vendor": 1 });
EnquirySchema.index({ user: 1 });
EnquirySchema.index({ searchKeyword: "text" });

module.exports = mongoose.model("Enquiry", EnquirySchema);