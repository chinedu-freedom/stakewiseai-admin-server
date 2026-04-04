import express from "express";
import { getDashboardStatsController } from "../controllers/dashboardStats.controller.js";
import { changePasswordController, getUserProfileController, updateUserProfileController } from "../controllers/admin.controller.js";
import { withAdminAuth } from "../middlewares/authGuard.js";
import {
  getUsersController
} from "../controllers/user.controller.js";

const router = express.Router();

router.get("/", withAdminAuth, getUsersController);
router.get("/dashboard-stats", withAdminAuth, getDashboardStatsController);
router.get("/me", withAdminAuth, getUserProfileController);
router.patch("/me", withAdminAuth, updateUserProfileController);
router.post("/change-password", withAdminAuth, changePasswordController);


export default router;
