// import express from "express";
// import { withKycAuth } from "../../middlewares/auth/kycGuard.js";
// import { upload } from "../../middlewares/upload.js";
// import {
//   createDepositHandler,
//   getDepositHistoryHandler,
// } from "../../controllers/deposit/deposit.controller.js";
// import { withAdminAuth } from "../../middlewares/auth/authGuard.js";

// const router = express.Router();

// router.post(
//   "/",
//   withAdminAuth,
//   withKycAuth,
//   upload.single("proofOfPayment"),
//   createDepositHandler
// );

// router.get("/history", getDepositHistoryHandler);


// export default router;






import express from "express";
import { withAdminAuth } from "../middlewares/auth/authGuard.js";
import {
  getDepositByIdController,
  updateDepositStatusController,
  deleteDepositController,
  getDepositsController
} from "../controllers/deposit.controller.js";

const router = express.Router();

router.get("/", withAdminAuth, getDepositsController);
// GET a single deposit by ID
router.get("/:id", withAdminAuth, getDepositByIdController);

// PATCH — update deposit status
router.patch("/:id", withAdminAuth, updateDepositStatusController);

// DELETE — remove a deposit
router.delete("/:id", withAdminAuth, deleteDepositController);

export default router;
