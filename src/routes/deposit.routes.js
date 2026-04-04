import express from "express";
import { withAdminAuth } from "../middlewares/authGuard.js";
import {
  getDepositByIdController,
  updateDepositStatusController,
  deleteDepositController,
  getDepositsController
} from "../controllers/deposit.controller.js";

const router = express.Router();

router.get("/", withAdminAuth, getDepositsController);
router.get("/:id", withAdminAuth, getDepositByIdController);
router.patch("/:id", withAdminAuth, updateDepositStatusController);
router.delete("/:id", withAdminAuth, deleteDepositController);

export default router;
