const { verifyAccessToken } = require("../services/tokenService");
const User = require("../models/User");
const Vendor = require("../models/Vendor");

/**
 * Universal Authentication Middleware
 * Works for both User and Vendor tokens
 */
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ message: "Authorization header missing or invalid" });
    }

    // Extract token from "Bearer <token>"
    const token = authHeader.split(" ")[1];

    // Verify and decode token
    const payload = verifyAccessToken(token);
    if (!payload || !payload.id) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    console.log(
      `[auth] Verified token for role=${payload.role}, id=${payload.id}`
    );

    let account = null;

    // 🔹 Vendor authentication
    if (payload.role === "vendor") {
      account = await Vendor.findById(payload.id).select("-password");
      if (!account) {
        console.log("[auth] Vendor not found in DB");
        return res.status(404).json({ message: "Vendor account not found" });
      }

      if (account.active === false) {
        console.log("[auth] Vendor account inactive");
        return res.status(403).json({ message: "Vendor account is disabled" });
      }

      // Attach vendor object to request
      req.user = {
        id: account._id,
        role: account.role,
        email: account.email,
        businessName: account.businessName,
        name: account.contactPerson,
        active: account.active,
      };
    }

    // 🔹 Regular user authentication
    else {
      account = await User.findById(payload.id).select("-password");
      if (!account) {
        console.log("[auth] User not found in DB");
        return res.status(404).json({ message: "User account not found" });
      }

      if (account.active === false) {
        console.log("[auth] User account inactive");
        return res.status(403).json({ message: "User account is disabled" });
      }

      // Attach user object to request
      req.user = {
        id: account._id,
        role: account.role,
        email: account.email,
        name: account.name,
        active: account.active,
      };
    }

    console.log("[auth] Authenticated:", req.user);
    next();
  } catch (err) {
    console.error("[auth] Token verification error:", err.message);
    return res.status(401).json({
      message: "Invalid or expired token",
      error: err.message,
    });
  }
}

module.exports = authMiddleware;
