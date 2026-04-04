import express from "express";
import {
  register,
  login,
  logout,
  forgotPassword,
  verifyAdminOtp,
  resetPassword,
  verifyEmail,
  resendVerification,
  googleLogin
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/sign-up", register);
router.get("/verify-email", verifyEmail);
router.post("/login", login);
router.post("/logout", logout);
router.post("/request-otp", forgotPassword);
router.post("/verify-otp", verifyAdminOtp);
router.post("/reset-password", resetPassword);
router.post("/resend-verification", resendVerification);
router.post("/google", googleLogin);

export default router;
