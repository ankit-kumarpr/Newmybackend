const mongoose = require("mongoose");

const ServiceSchema = new mongoose.Schema({
  vendor: { type: mongoose.Schema.Types.ObjectId, ref: "Vendor", required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: "Category", required: true },
  serviceName: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  specifications: { type: String, trim: true },
  priceType: {
    type: String,
    enum: ["single", "range", "quantityRange"],
    required: true,
  },
  singlePrice: {
    actualPrice: Number,
    discountPrice: Number,
    quantity: Number,
  },
  priceRange: {
    minPrice: Number,
    maxPrice: Number,
    unit: String,
  },
  quantityBasedPrice: [
    {
      quantityFrom: Number,
      quantityTo: Number,
      price: Number,
    },
  ],
  serviceImage: {
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now },
  },
  serviceFile: {
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    uploadedAt: { type: Date },
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update updatedAt automatically
ServiceSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Service", ServiceSchema);
