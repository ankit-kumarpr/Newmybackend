const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["super_admin", "admin", "sales_person", "vendor", "user", "individual"],
    default: "user",
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
  
  // ✅ Location fields for users
  location: {
    address: String,
    city: String,
    state: String,
    pincode: String,
    latitude: Number,
    longitude: Number,
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
});

// 📌 Pre-save hook to generate customId
UserSchema.pre("save", async function (next) {
  if (this.isNew && !this.customId) {
    try {
      const count = await mongoose.model("User").countDocuments({ role: this.role });
      const roleCode = this.role.replace("_", "");
      const sequence = String(count + 1).padStart(4, "0");
      this.customId = `gnetecom${roleCode}${sequence}`;
    } catch (err) {
      return next(err);
    }
  }
  next();
});

// ✅ Distance calculation method
UserSchema.statics.calculateDistance = function(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

module.exports = mongoose.model("User", UserSchema);