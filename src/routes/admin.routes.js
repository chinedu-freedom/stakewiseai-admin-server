import express from "express";
import { changePasswordController, updateUserProfileController, getUserProfileController, getDashboardStatsController } from "../controllers/admin.controller.js";
import { upload } from "../middlewares/upload.js";
import { withAdminAuth } from "../middlewares/auth/authGuard.js";

const router = express.Router();

router.post("/change-password", withAdminAuth, changePasswordController);
router.patch("/profile", withAdminAuth, upload.single("image"), updateUserProfileController);
router.get("/profile", withAdminAuth, getUserProfileController);
router.get("/dashboard-stats", withAdminAuth, getDashboardStatsController);

export default router;
