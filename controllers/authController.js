const bcrypt = require("bcrypt");
const { validationResult } = require("express-validator");
const User = require("../models/User");
const generatePassword = require("../utils/generatePassword");
const {
  sendMail,
  welcomeForAdminTemplate,
  otpEmailTemplate,
  welcomeForUserTemplate,
  welcomeForIndividualTemplate,
} = require("../services/emailService");
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} = require("../services/tokenService");
const { createOtp, verifyOtp } = require("../services/otpService");
const Otp = require("../models/Otp");
const Vendor = require("../models/Vendor");
const Service = require("../models/Service");

const SALT_ROUNDS = 10;

/**
 * Create initial super admin (one-time) -- protected via a special key in request header or body
 */
const createSuperAdmin = async (req, res) => {
  try {
    const { key } = req.body;
    if (key !== process.env.SUPER_ADMIN_CREATION_KEY) {
      return res.status(403).json({ message: "Invalid key" });
    }
    const { name, email, phone } = req.body;
    if (!name || !email || !phone)
      return res.status(400).json({ message: "Missing fields" });

    const exists = await User.findOne({ $or: [{ email }, { phone }] });
    if (exists) return res.status(400).json({ message: "User exists" });

    const password = generatePassword(12);
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const user = new User({
      name,
      email,
      phone,
      password: hashed,
      role: "super_admin",
      emailVerified: true,
    });
    await user.save();

    await sendMail({
      to: email,
      subject: "Welcome to Gnet E-commerce (Super Admin)",
      html: welcomeForAdminTemplate({
        name,
        email,
        phone,
        password,
        customId: user.customId,
      }),
    });

    res.status(201).json({ message: "Super admin created and email sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * super_admin registers admin or sales_person
 */
const registerBySuperAdmin = async (req, res) => {
  try {
    const creator = req.user;
    if (creator.role !== "super_admin")
      return res
        .status(403)
        .json({ message: "Only super admin can create admin/sales" });

    const { name, email, phone, role } = req.body;
    if (!["admin", "sales_person"].includes(role))
      return res.status(400).json({ message: "Invalid role" });

    const exists = await User.findOne({ $or: [{ email }, { phone }] });
    if (exists) return res.status(400).json({ message: "User exists" });

    const password = generatePassword(10);
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const user = new User({
      name,
      email,
      phone,
      password: hashed,
      role,
      emailVerified: true,
      createdBy: creator._id,
    });
    await user.save();

    await sendMail({
      to: email,
      subject: `Welcome to Gnet E-commerce (Role: ${role})`,
      html: welcomeForAdminTemplate({
        name,
        email,
        phone,
        password,
        customId: user.customId,
      }),
    });

    res.status(201).json({ message: "User created and email sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * Vendor/User self register -> send OTP to email for verification
 */
const selfRegister = async (req, res) => {
  try {
    const { name, email, phone, role } = req.body;
    if (!["vendor", "user", "individual"].includes(role))
      return res
        .status(400)
        .json({ message: "role must be vendor, user, or individual" });

    const exists = await User.findOne({ $or: [{ email }, { phone }] });
    if (exists) return res.status(400).json({ message: "User exists" });

    // Temporarily store user data in OTP target or client should call verify endpoint with same details.
    // We'll create OTP bound to email. After verify, we'll create actual user.
    const otp = await createOtp({ target: email, type: "email_verify" });

    // send templated OTP email
    await sendMail({
      to: email,
      subject: "Gnet E-commerce — Verify your email",
      html: otpEmailTemplate({ code: otp.code }),
    });

    // We need to persist the name/phone/role until verification. Simplest: return a temporary token client must send when verifying.
    // But to keep flow stateless here, client will call /auth/verify-email and send name/email/phone/role and otp.
    res
      .status(200)
      .json({ message: "OTP sent to email. Verify to complete registration." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * Verify email OTP and create the user with random password and send welcome email containing password
 */
const verifyEmailAndCreate = async (req, res) => {
  try {
    const { name, email, phone, role, code } = req.body;
    if (!name || !email || !phone || !role || !code)
      return res.status(400).json({ message: "Missing fields" });
    if (!["vendor", "user", "individual"].includes(role))
      return res.status(400).json({ message: "Invalid role" });

    const ok = await verifyOtp({ target: email, type: "email_verify", code });
    if (!ok) return res.status(400).json({ message: "Invalid or expired OTP" });

    const exists = await User.findOne({ $or: [{ email }, { phone }] });
    if (exists) return res.status(400).json({ message: "User exists" });

    const password = generatePassword(10);
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const user = new User({
      name,
      email,
      phone,
      password: hashed,
      role,
      emailVerified: true,
    });
    await user.save();

    // Send appropriate welcome email based on role
    let emailTemplate;
    let subject;

    if (role === "individual") {
      emailTemplate = welcomeForIndividualTemplate({
        name,
        email,
        phone,
        password,
        customId: user.customId,
      });
      subject = "Welcome to Gnet E-commerce - Individual Account";
    } else {
      emailTemplate = welcomeForUserTemplate({
        name,
        email,
        phone,
        password,
        customId: user.customId,
      });
      subject = "Welcome to Gnet E-commerce";
    }

    await sendMail({
      to: email,
      subject: subject,
      html: emailTemplate,
    });

    res.status(201).json({ message: "User created and welcome email sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * Login using email + password
 */
// const loginWithEmail = async (req, res) => {
//   try {
//     const { email, password } = req.body;
//     if (!email || !password)
//       return res.status(400).json({ message: "Missing fields" });

//     const user = await User.findOne({ email });
//     if (!user) return res.status(401).json({ message: "Invalid credentials" });
//     if (!user.active)
//       return res.status(403).json({ message: "Account is disabled" });

//     const match = await bcrypt.compare(password, user.password);
//     if (!match) return res.status(401).json({ message: "Invalid credentials" });

//     const accessToken = signAccessToken({ id: user._id, role: user.role });
//     const refreshToken = signRefreshToken({ id: user._id, role: user.role });

//     res.json({
//       accessToken,
//       refreshToken,
//       user: {
//         id: user._id,
//         name: user.name,
//         customId: user.customId,
//         email: user.email,
//         phone: user.phone,
//         role: user.role,
//       },
//     });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// };

const loginWithEmail = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
        success: false,
      });
    }

    // First, try to find the user in the User collection
    let user = await User.findOne({ email });
    let role = "user";

    // If not found in User, try Vendor collection
    if (!user) {
      user = await Vendor.findOne({ email });
      role = "vendor";
    }

    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
        success: false,
      });
    }

    if (!user.active) {
      return res.status(403).json({
        message: "Account is disabled",
        success: false,
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid credentials",
        success: false,
      });
    }

    const accessToken = signAccessToken({
      id: user._id,
      role: user.role || role,
    });
    const refreshToken = signRefreshToken({
      id: user._id,
      role: user.role || role,
    });

    // Build response based on whether it's a User or Vendor
    let responseData = {};
    if (role === "vendor") {
      responseData = {
        id: user._id,
        customId: user.customId,
        businessName: user.businessName,
        contactPerson: user.contactPerson,
        email: user.email,
        mobileNumber: user.mobileNumber,
        whatsappNumber: user.whatsappNumber,
        role: user.role,
        registrationStatus: user.registrationStatus,
        active: user.active,
      };
    } else {
      responseData = {
        id: user._id,
        name: user.name,
        customId: user.customId,
        email: user.email,
        phone: user.phone,
        role: user.role,
      };
    }

    res.json({
      message: "Login successful",
      success: true,
      accessToken,
      refreshToken,
      user: responseData,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      success: false,
    });
  }
};

/**
 * Send OTP to phone for login (phone -> OTP)
 */
const sendPhoneOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: "Missing phone" });
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ message: "Phone not registered" });

    // create OTP targeted at phone
    const otp = await createOtp({ target: phone, type: "phone_login" });

    // For demonstration we will send OTP to email if email exists, or respond ok.
    // In production you would integrate SMS gateway. For now, send OTP to user's email for reliability.
    if (user.email) {
      await sendMail({
        to: user.email,
        subject: "Your login OTP for Gnet E-commerce",
        html: otpEmailTemplate({ code: otp.code }),
      });
    }

    res.json({ message: "OTP sent (to registered email or SMS gateway)." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * Verify phone OTP and log in
 */
const verifyPhoneOtpAndLogin = async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code)
      return res.status(400).json({ message: "Missing fields" });

    const ok = await verifyOtp({ target: phone, type: "phone_login", code });
    if (!ok) return res.status(400).json({ message: "Invalid or expired OTP" });

    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.active)
      return res.status(403).json({ message: "Account disabled" });

    const accessToken = signAccessToken({ id: user._id, role: user.role });
    const refreshToken = signRefreshToken({ id: user._id, role: user.role });

    res.json({
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

/**
 * Refresh token endpoint
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken)
      return res.status(400).json({ message: "Missing refresh token" });

    const payload = verifyRefreshToken(refreshToken);
    const user = await User.findById(payload.id);
    if (!user)
      return res.status(401).json({ message: "Invalid refresh token" });
    if (!user.active)
      return res.status(403).json({ message: "Account disabled" });

    const newAccess = signAccessToken({ id: user._id, role: user.role });
    const newRefresh = signRefreshToken({ id: user._id, role: user.role });

    res.json({ accessToken: newAccess, refreshToken: newRefresh });
  } catch (err) {
    console.error(err);
    res.status(401).json({
      message: "Invalid or expired refresh token",
      error: err.message,
    });
  }
};

/**
 * Admin / Super Admin ability to activate/deactivate users
 */
const setActiveStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { active } = req.body;

    // only admins & super_admins can toggle, but requirement: super admin has right to activate/deactivate any account
    const actor = req.user;
    if (actor.role !== "super_admin" && actor.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Only super_admin can modify admins? We'll allow super_admin to change any. Admin can change lower-level roles.
    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ message: "User not found" });

    // protect super_admin changes: only super_admin can toggle another super_admin
    if (target.role === "super_admin" && actor.role !== "super_admin") {
      return res.status(403).json({ message: "Cannot modify super admin" });
    }

    // admin cannot deactivate admin or higher
    if (
      actor.role === "admin" &&
      ["admin", "super_admin"].includes(target.role)
    ) {
      return res
        .status(403)
        .json({ message: "Admin cannot modify this account" });
    }

    target.active = !!active;
    await target.save();

    res.json({
      message: "Status updated",
      user: { id: target._id, active: target.active },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};


const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let profileData = null;

    if (userRole === "vendor") {
      // Fetch vendor data
      const vendor = await Vendor.findById(userId).select("-password");

      if (!vendor) {
        return res.status(404).json({
          message: "Vendor profile not found",
          success: false,
        });
      }

      // Fetch all services added by this vendor
      const services = await Service.find({ vendor: vendor._id })
        .populate("category", "name")
        .lean();

      profileData = {
        id: vendor._id,
        customId: vendor.customId,
        businessName: vendor.businessName,
        title: vendor.title,
        pincode: vendor.pincode,
        plotNumber: vendor.plotNumber,
        buildingName: vendor.buildingName,
        streetName: vendor.streetName,
        landmark: vendor.landmark,
        area: vendor.area,
        city: vendor.city,
        state: vendor.state,
        contactPerson: vendor.contactPerson,
        mobileNumber: vendor.mobileNumber,
        whatsappNumber: vendor.whatsappNumber,
        email: vendor.email,
        workingDays: vendor.workingDays,
        businessOpenHours: vendor.businessOpenHours,
        openTime: vendor.openTime,
        closingTime: vendor.closingTime,

        // ✅ Include vendor latitude & longitude
        businessLatitude: vendor.businessLatitude || null,
        businessLongitude: vendor.businessLongitude || null,

        // ✅ Optional: include Google Maps link
        locationLink:
          vendor.businessLatitude && vendor.businessLongitude
            ? `https://www.google.com/maps?q=${vendor.businessLatitude},${vendor.businessLongitude}`
            : null,

        businessPhotos: vendor.businessPhotos.map((photo) => ({
          id: photo._id,
          filename: photo.filename,
          originalName: photo.originalName,
          size: photo.size,
          uploadedAt: photo.uploadedAt,
          url: `/uploads/business-photos/${photo.filename}`,
        })),

        socialMediaLinks: vendor.socialMediaLinks || {
          instagram: "",
          facebook: "",
          youtube: "",
          website: "",
          other: "",
        },

        businessVideo: vendor.businessVideo
          ? {
              filename: vendor.businessVideo.filename,
              originalName: vendor.businessVideo.originalName,
              size: vendor.businessVideo.size,
              uploadedAt: vendor.businessVideo.uploadedAt,
              url: `/uploads/business-videos/${vendor.businessVideo.filename}`,
            }
          : {},

        keywords: vendor.keywords || [],
        services: services.map((service) => ({
          id: service._id,
          category: service.category ? service.category.name : null,
          serviceName: service.serviceName,
          description: service.description,
          specifications: service.specifications,
          priceType: service.priceType,
          singlePrice: service.singlePrice,
          priceRange: service.priceRange,
          quantityBasedPrice: service.quantityBasedPrice,
          serviceImage: service.serviceImage
            ? {
                filename: service.serviceImage.filename,
                originalName: service.serviceImage.originalName,
                path: service.serviceImage.path,
                size: service.serviceImage.size,
                uploadedAt: service.serviceImage.uploadedAt,
                url: `/uploads/serviceimages/${service.serviceImage.filename}`,
              }
            : null,
          serviceFile: service.serviceFile
            ? {
                filename: service.serviceFile.filename,
                originalName: service.serviceFile.originalName,
                path: service.serviceFile.path,
                size: service.serviceFile.size,
                uploadedAt: service.serviceFile.uploadedAt,
                url: `/uploads/servicepdfs/${service.serviceFile.filename}`,
              }
            : null,
          createdAt: service.createdAt,
          updatedAt: service.updatedAt,
        })),
        role: vendor.role,
        active: vendor.active,
        emailVerified: vendor.emailVerified,
        registrationStatus: vendor.registrationStatus,
        createdAt: vendor.createdAt,
        updatedAt: vendor.updatedAt,
      };
    } else {
      // For other users
      const user = await User.findById(userId).select("-password");

      if (!user) {
        return res.status(404).json({
          message: "User profile not found",
          success: false,
        });
      }

      profileData = {
        id: user._id,
        customId: user.customId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        active: user.active,
        emailVerified: user.emailVerified,
        createdBy: user.createdBy,
        createdAt: user.createdAt,
        location: user.location
          ? {
              latitude: user.location.latitude,
              longitude: user.location.longitude,
              address: user.location.address,
              city: user.location.city,
              state: user.location.state,
              pincode: user.location.pincode,
            }
          : null,
      };
    }

    res.json({
      message: "Profile retrieved successfully",
      success: true,
      profile: profileData,
    });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      success: false,
    });
  }
};


const updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const updateData = req.body;

    // Remove sensitive fields that shouldn't be updated directly
    delete updateData.password;
    delete updateData.customId;
    delete updateData.role;
    delete updateData.emailVerified;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    let updatedProfile = null;

    if (userRole === "vendor") {
      // Import Vendor model dynamically to avoid circular dependency
      const Vendor = require("../models/Vendor");

      // If email is being updated, check for duplicates
      if (updateData.email) {
        const existingVendor = await Vendor.findOne({
          email: updateData.email,
          _id: { $ne: userId },
        });
        if (existingVendor) {
          return res.status(400).json({
            message: "Email already exists",
            success: false,
          });
        }
      }

      // If mobile number is being updated, check for duplicates
      if (updateData.mobileNumber) {
        const existingVendor = await Vendor.findOne({
          mobileNumber: updateData.mobileNumber,
          _id: { $ne: userId },
        });
        if (existingVendor) {
          return res.status(400).json({
            message: "Mobile number already exists",
            success: false,
          });
        }
      }

      // If WhatsApp number is being updated, check for duplicates
      if (updateData.whatsappNumber) {
        const existingVendor = await Vendor.findOne({
          whatsappNumber: updateData.whatsappNumber,
          _id: { $ne: userId },
        });
        if (existingVendor) {
          return res.status(400).json({
            message: "WhatsApp number already exists",
            success: false,
          });
        }
      }

      const vendor = await Vendor.findByIdAndUpdate(
        userId,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).select("-password");

      if (!vendor) {
        return res.status(404).json({
          message: "Vendor not found",
          success: false,
        });
      }

      updatedProfile = {
        id: vendor._id,
        customId: vendor.customId,
        businessName: vendor.businessName,
        title: vendor.title,
        pincode: vendor.pincode,
        plotNumber: vendor.plotNumber,
        buildingName: vendor.buildingName,
        streetName: vendor.streetName,
        landmark: vendor.landmark,
        area: vendor.area,
        city: vendor.city,
        state: vendor.state,
        contactPerson: vendor.contactPerson,
        mobileNumber: vendor.mobileNumber,
        whatsappNumber: vendor.whatsappNumber,
        email: vendor.email,
        workingDays: vendor.workingDays,
        businessOpenHours: vendor.businessOpenHours,
        openTime: vendor.openTime,
        closingTime: vendor.closingTime,
        businessPhotos: vendor.businessPhotos.map((photo) => ({
          id: photo._id,
          filename: photo.filename,
          originalName: photo.originalName,
          size: photo.size,
          uploadedAt: photo.uploadedAt,
          url: `/uploads/business-photos/${photo.filename}`,
        })),
        role: vendor.role,
        active: vendor.active,
        emailVerified: vendor.emailVerified,
        registrationStatus: vendor.registrationStatus,
        updatedAt: vendor.updatedAt,
      };
    } else {
      // For regular users
      const user = await User.findByIdAndUpdate(
        userId,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      ).select("-password");

      if (!user) {
        return res.status(404).json({
          message: "User not found",
          success: false,
        });
      }

      updatedProfile = {
        id: user._id,
        customId: user.customId,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        active: user.active,
        emailVerified: user.emailVerified,
        createdBy: user.createdBy,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };
    }

    res.json({
      message: "Profile updated successfully",
      success: true,
      profile: updatedProfile,
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({
      message: "Server error",
      error: err.message,
      success: false,
    });
  }
};

// all users list

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: "user" }).select("-password"); // exclude password for safety
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: "No users found" });
    }
    res.status(200).json({ success: true, count: users.length, users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, message: "Server Error", error });
  }
};

module.exports = {
  createSuperAdmin,
  registerBySuperAdmin,
  selfRegister,
  verifyEmailAndCreate,
  loginWithEmail,
  sendPhoneOtp,
  verifyPhoneOtpAndLogin,
  refreshToken,
  setActiveStatus,
  getProfile,
  updateProfile,
  getAllUsers
};
