import express from "express";
import { getAdminStats, getManagerStats } from "../controllers/stats.controller.js";
import { verifyToken, verifyAdmin, verifyManager } from "../middleware/auth.middleware.js";

const router = express.Router();
router.get("/stats", verifyToken, verifyAdmin, getAdminStats);
router.get("/manager-stats", verifyToken, verifyManager, getManagerStats);

export default router;
