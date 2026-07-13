import express from "express";

import {
  deductCredits,
  login,
  logout,
  updatePlan,
} from "../controllers/auth.controllers.js";
import { requireInternal } from "../middlewares/internal.middleware.js";

const router = express.Router();

router.post("/login", login);
router.get("/logout", logout);
router.patch("/internal/update-plan", requireInternal, updatePlan);
router.patch("/internal/deduct-credits", requireInternal, deductCredits);

export default router;
