import express from "express";
import { withAdminAuth } from "../middlewares/authGuard.js";
import {
  getUsersController,
  deleteUserController,
  updateUserController,
  getUserByIdController,
  getUserActivitiesController,
  impersonateUserController,
  resetUserPasswordController,
} from "../controllers/user.controller.js";

const router = express.Router();


router.get("/", withAdminAuth, getUsersController);
router.delete("/:id", withAdminAuth, deleteUserController);
router.patch("/:id", withAdminAuth, updateUserController);
router.get("/:id", withAdminAuth, getUserByIdController);
router.get("/:id/activities", withAdminAuth, getUserActivitiesController);
router.post("/:id/impersonate", withAdminAuth, impersonateUserController);
router.post("/:id/reset-password", withAdminAuth, resetUserPasswordController);


export default router;
