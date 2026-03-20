import express from "express";
import { createReview, getClubReviews, deleteReview } from "../controllers/extras.controller.js";
import { verifyToken, verifyMember } from "../middleware/auth.middleware.js";

const router = express.Router();
router.get("/:clubId", getClubReviews);
router.post("/", verifyToken, verifyMember, createReview);
router.delete("/:id", verifyToken, verifyMember, deleteReview);

export default router;
