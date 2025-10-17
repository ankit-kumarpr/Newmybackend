const express = require("express");
const router = express.Router();
const { body } = require("express-validator");

const authController = require("../controllers/authController");
const authMiddleware = require("../middlewares/authMiddleware");
const { permit } = require("../middlewares/roleMiddleware");

/* Public routes */
router.post("/create-super-admin", authController.createSuperAdmin); // protected via key in body
router.post(
  "/self-register",
  [
    body("name").notEmpty(),
    body("email").isEmail(),
    body("phone").notEmpty(),
    body("role").notEmpty(),
  ],
  authController.selfRegister
);

router.post("/verify-email-create", authController.verifyEmailAndCreate);

router.post(
  "/login",
  [body("email").optional().isEmail(), body("password").optional()],
  authController.loginWithEmail
);

router.post("/phone/send-otp", authController.sendPhoneOtp);
router.post("/phone/verify", authController.verifyPhoneOtpAndLogin);

router.post("/token/refresh", authController.refreshToken);

/* Protected routes */
router.post(
  "/admin/create",
  authMiddleware,
  permit("super_admin"),
  authController.registerBySuperAdmin
);

router.patch(
  "/user/:userId/active",
  authMiddleware,
  authController.setActiveStatus
); // checks role inside

router.get("/profile", authMiddleware, authController.getProfile);
router.put("/profile", authMiddleware, authController.updateProfile);

// all users list (role =user)

router.get(
  "/alluserlist",
  authMiddleware,
  permit("super_admin","admin"),
  authController.getAllUsers
);

module.exports = router;
