const Otp = require('../models/Otp');
const { default: cryptoRandomString } = require('crypto-random-string');

async function createOtp({ target, type, vendorData = null, minutes = Number(process.env.OTP_EXPIRES_MIN || 10) }) {
  const code = cryptoRandomString({ length: 6, type: 'numeric' });
  const expiresAt = new Date(Date.now() + minutes * 60 * 1000);
  const otp = new Otp({ target, type, code, expiresAt, vendorData });
  await otp.save();
  return otp;
}

async function verifyOtp({ target, type, code }) {
  const otp = await Otp.findOne({ target, type, code, used: false }).sort({ expiresAt: -1 });
  if (!otp) return false;
  if (otp.expiresAt < new Date()) return false;
  otp.used = true;
  await otp.save();
  return otp; // Return the OTP object instead of just true
}

// 



module.exports = { createOtp, verifyOtp };
