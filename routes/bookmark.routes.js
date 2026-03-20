import express from "express";
import { toggleBookmark, getUserBookmarks } from "../controllers/extras.controller.js";
import { verifyToken, verifyMember } from "../middleware/auth.middleware.js";

const router = express.Router();
router.get("/", verifyToken, verifyMember, getUserBookmarks);
router.post("/toggle", verifyToken, verifyMember, toggleBookmark);

export default router;
