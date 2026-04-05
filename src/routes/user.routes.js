import express from "express";
import { withAdminAuth } from "../middlewares/authGuard.js";
import {
  getUsersController,
  deleteUserController,
  updateUserController,
  getUserByIdController,
} from "../controllers/user.controller.js";

const router = express.Router();


router.get("/", withAdminAuth, getUsersController);
router.delete("/:id", withAdminAuth, deleteUserController);
router.patch("/:id", withAdminAuth, updateUserController);
router.get("/:id", withAdminAuth, getUserByIdController);


export default router;
