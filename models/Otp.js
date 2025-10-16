const mongoose = require('mongoose');

const OtpSchema = new mongoose.Schema({
  target: { type: String, required: true }, // email or phone
  code: { type: String, required: true },
  type: { 
    type: String, 
    enum: [
      'email_verify',           // General email verification
      'phone_login',            // Phone number login
      'vendor_email_verify',    // Vendor email verification
      'password_reset',         // Password reset OTP
      'phone_verify'            // Phone number verification
    ], 
    required: true 
  },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  vendorData: { type: mongoose.Schema.Types.Mixed, default: null } // Store vendor data temporarily
});

OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

module.exports = mongoose.model('Otp', OtpSchema);
