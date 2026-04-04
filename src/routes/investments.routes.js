import express from "express";
import { withAdminAuth } from "../middlewares/authGuard.js";
import { 
  deleteInvestmentController,
  updateInvestmentController,
  getInvestmentByIdController,
  getInvestmentsController,
  createInvestmentController

 } from "../controllers/investments.controller.js";



import { upload } from "../middlewares/upload.js";

const router = express.Router();

router.get("/", withAdminAuth, getInvestmentsController);
router.post("/", withAdminAuth, upload.single("image"), createInvestmentController);
router.delete("/:id", withAdminAuth, deleteInvestmentController);
router.patch("/:id", withAdminAuth, upload.single("image"), updateInvestmentController);
router.get("/:id", withAdminAuth, getInvestmentByIdController);


export default router;
