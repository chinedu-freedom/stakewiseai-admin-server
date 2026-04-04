import express from "express";
import { withAdminAuth } from "../../middlewares/auth/authGuard.js";
import {  getKycController,
   getKycByIdController,
   updateKycStatusController,
   deleteKycController
  } from "../../controllers/users/kyc.controller.js";
import {
  getUserByIdController,
  updateUserController,
  deleteUserController,
  getUsersController
} from "../../controllers/users/user.controller.js";

const router = express.Router();

router.get("/kyc", withAdminAuth, getKycController);
router.get("/kyc/:id", withAdminAuth, getKycByIdController);
router.patch("/kyc/:id", withAdminAuth, updateKycStatusController);
router.delete("/kyc/:id", withAdminAuth, deleteKycController);

router.get("/", withAdminAuth, getUsersController);
router.get("/:id", withAdminAuth, getUserByIdController);
router.patch("/:id", withAdminAuth, updateUserController);
router.delete("/:id", withAdminAuth, deleteUserController);

export default router;
