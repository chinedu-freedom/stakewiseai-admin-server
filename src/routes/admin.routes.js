import express from "express";
import { 
  changePasswordController, 
  updateUserProfileController, 
  getUserProfileController, 
  getDashboardStatsController,
  getReferralConfigController,
  updateReferralConfigController,
  getUserInvestmentsController,
  deleteUserInvestmentController
} from "../controllers/admin.controller.js";
import { upload } from "../middlewares/upload.js";
import { withAdminAuth } from "../middlewares/authGuard.js";

const router = express.Router();

router.post("/change-password", withAdminAuth, changePasswordController);
router.patch("/profile", withAdminAuth, upload.single("image"), updateUserProfileController);
router.get("/profile", withAdminAuth, getUserProfileController);
router.get("/dashboard-stats", withAdminAuth, getDashboardStatsController);

router.get("/referral-config", withAdminAuth, getReferralConfigController);
router.patch("/referral-config", withAdminAuth, updateReferralConfigController);

router.get("/user-investments", withAdminAuth, getUserInvestmentsController);
router.delete("/user-investments/:id", withAdminAuth, deleteUserInvestmentController);

export default router;
