import express from "express";
import {
  getWithdrawalsController,
  getWithdrawalController,
  updateWithdrawalStatusController,
  deleteWithdrawalController
} from "../controllers/withdrawal.controller.js";
import { withAdminAuth } from "../middlewares/auth/authGuard.js";

const router = express.Router();

router.get("/", withAdminAuth, getWithdrawalsController);
router.get("/:id", withAdminAuth, getWithdrawalController);
router.patch("/:id", withAdminAuth, updateWithdrawalStatusController);
router.delete("/:id", withAdminAuth, deleteWithdrawalController);


export default router;
