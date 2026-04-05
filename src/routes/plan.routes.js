import express from "express";
import { withAdminAuth } from "../middlewares/authGuard.js";
import { 
  deleteInvestmentPlanController,
  updateInvestmentPlanController,
  getInvestmentPlanByIdController,
  getInvestmentPlansController,
  createInvestmentPlanController

 } from "../controllers/plan.controller.js";



import { upload } from "../middlewares/upload.js";

const router = express.Router();

router.get("/", withAdminAuth, getInvestmentPlansController);
router.post("/", withAdminAuth, upload.single("image"), createInvestmentPlanController);
router.delete("/:id", withAdminAuth, deleteInvestmentPlanController);
router.patch("/:id", withAdminAuth, upload.single("image"), updateInvestmentPlanController);
router.get("/:id", withAdminAuth, getInvestmentPlanByIdController);


export default router;
