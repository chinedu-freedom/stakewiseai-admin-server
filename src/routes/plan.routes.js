import express from "express";
import { withAdminAuth } from "../middlewares/authGuard.js";
import { 
  deleteInvestmentPlanController,
  updateInvestmentPlanController,
  getInvestmentPlanByIdController,
  getInvestmentPlansController,
  createInvestmentPlanController

 } from "../controllers/plan.controller.js";

const router = express.Router();

router.get("/", withAdminAuth, getInvestmentPlansController);
router.post("/", withAdminAuth, createInvestmentPlanController);
router.delete("/:id", withAdminAuth, deleteInvestmentPlanController);
router.patch("/:id", withAdminAuth, updateInvestmentPlanController);
router.get("/:id", withAdminAuth, getInvestmentPlanByIdController);


export default router;
