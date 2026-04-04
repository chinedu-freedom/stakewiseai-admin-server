import express from "express";
import { withAdminAuth } from "../../middlewares/auth/authGuard.js";

import { 
    getCryptoInvestmentsController, 
      getSingleCryptoInvestmentController,
  updateCryptoInvestmentStatusController,
  deleteCryptoInvestmentController
} from "../../controllers/users/investments/crypto/cryptoInvestments.controller.js";
import { getLoanInvestmentsController, 
  updateLoanInvestmentController,
  getSingleLoanInvestmentController,
  deleteLoanInvestmentController
} from "../../controllers/users/investments/loan/loanInvestments.controller.js";
import { 
    getRealEstateInvestmentsController,
      getSingleRealEstateInvestmentController,
  updateRealEstateInvestmentStatusController,
  deleteRealEstateInvestmentController,
 } from "../../controllers/users/investments/real-estate/realEstateInvestments.controller.js";
import {
     getSingleStockBondInvestmentController,
  patchStockBondInvestmentController,
  deleteStockBondInvestmentController,
  getStockBondInvestmentsController
 } from "../../controllers/users/investments/stock-bond/stockBondInvestments.controller.js";

const router = express.Router();

router.get("/crypto", withAdminAuth, getCryptoInvestmentsController);
router.get("/crypto/:id", withAdminAuth, getSingleCryptoInvestmentController);
router.patch("/crypto/:id", withAdminAuth, updateCryptoInvestmentStatusController);
router.delete("/crypto/:id", withAdminAuth, deleteCryptoInvestmentController);

router.get("/loan", withAdminAuth, getLoanInvestmentsController);
router.patch("/loan/:id", withAdminAuth, updateLoanInvestmentController);
router.get("/loan/:id", withAdminAuth, getSingleLoanInvestmentController);
router.delete("/loan/:id", withAdminAuth, deleteLoanInvestmentController );


router.get("/real-estate", withAdminAuth, getRealEstateInvestmentsController);
router.get("/real-estate/:id", withAdminAuth, getSingleRealEstateInvestmentController);
router.patch("/real-estate/:id", withAdminAuth, updateRealEstateInvestmentStatusController);
router.delete("/real-estate/:id", withAdminAuth, deleteRealEstateInvestmentController);

router.get("/stock-bond", withAdminAuth, getStockBondInvestmentsController);
router.get("/stock-bond/:id", withAdminAuth, getSingleStockBondInvestmentController);
router.patch("/stock-bond/:id", withAdminAuth, patchStockBondInvestmentController);
router.delete("/stock-bond/:id", withAdminAuth, deleteStockBondInvestmentController);

export default router;
