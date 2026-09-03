import express from "express";
import { runPayoutCron } from "../controllers/cronController.js";

const router = express.Router();

router.get("/process-payouts", runPayoutCron);

export default router;