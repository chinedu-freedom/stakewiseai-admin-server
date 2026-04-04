import express from "express";
import { withAdminAuth } from "../middlewares/auth/authGuard.js";
import { 
  deleteInvestmentController,
  updateInvestmentController,
  getInvestmentByIdController,
  getInvestmentsController,
  createInvestmentController

 } from "../controllers/investment/investments.controller.js";
import {
  createCryptoPlanController,
  getCryptoPlansController,
  getCryptoPlanByIdController,
  updateCryptoPlanController,
  deleteCryptoPlanController,
} from "../controllers/investment/crypto/cryptoPlan.controller.js";

import {
  createLoanPlanController,
  getLoanPlansController,
  getLoanPlanByIdController,
  updateLoanPlanController,
  deleteLoanPlanController,
} from "../controllers/investment/loan/loanPlan.controller.js";

import {
  getRealEstatePlanByIdController,
  updateRealEstatePlanController,
  deleteRealEstatePlanController,
    createRealEstatePlanController,
  getRealEstatePlansController,
} from "../controllers/investment/real-estate/realEstatePlan.controller.js";

import {
  createStockBondPlanController,
  getStockBondPlansController,
  getSingleStockBondPlanController,
  updateStockBondPlanController,
  deleteStockBondPlanController,
} from "../controllers/investment/stock-bond/stockBondPlan.controller.js";

import { upload } from "../middlewares/upload.js";

const router = express.Router();

router.get("/", withAdminAuth, getInvestmentsController);
router.post("/", withAdminAuth, upload.single("image"), createInvestmentController);
router.delete("/:id", withAdminAuth, deleteInvestmentController);
router.patch("/:id", withAdminAuth, upload.single("image"), updateInvestmentController);
router.get("/:id", withAdminAuth, getInvestmentByIdController);

router.post("/crypto/plans", withAdminAuth, createCryptoPlanController);
router.get("/crypto/plans", withAdminAuth, getCryptoPlansController);
router.get("/crypto/plans/:id", withAdminAuth, getCryptoPlanByIdController);
router.patch("/crypto/plans/:id", withAdminAuth, updateCryptoPlanController);
router.delete("/crypto/plans/:id", withAdminAuth, deleteCryptoPlanController);

router.post("/loan/plans", withAdminAuth, createLoanPlanController);
router.get("/loan/plans/:id", withAdminAuth, getLoanPlanByIdController);
router.patch("/loan/plans/:id", withAdminAuth, updateLoanPlanController);
router.delete("/loan/plans/:id", withAdminAuth, deleteLoanPlanController);
router.get("/loan/plans", withAdminAuth, getLoanPlansController);

router.post(
  "/real-estate/plans",
  withAdminAuth,
  upload.single("image"),
  createRealEstatePlanController
);
router.get("/real-estate/plans/:id", withAdminAuth, getRealEstatePlanByIdController);

router.patch(
  "/real-estate/plans/:id",
  withAdminAuth,
  upload.single("image"),
  updateRealEstatePlanController
);

router.delete("/real-estate/plans/:id", withAdminAuth, deleteRealEstatePlanController);
router.get(
  "/real-estate/plans",
  withAdminAuth,
  getRealEstatePlansController
);

router.post(
  "/stock-bond/plans",
  withAdminAuth,
  upload.single("image"),
  createStockBondPlanController
);
router.get("/stock-bond/plans/:id", withAdminAuth, getSingleStockBondPlanController);
router.patch(
  "/stock-bond/plans/:id",
    withAdminAuth,
    upload.single("image"),
    updateStockBondPlanController
);
router.delete("/stock-bond/plans/:id", withAdminAuth, deleteStockBondPlanController);

router.get("/stock-bond/plans", withAdminAuth, getStockBondPlansController);

export default router;
