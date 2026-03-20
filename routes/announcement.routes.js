import express from "express";
import {
  createAnnouncement, getClubAnnouncements,
  getMemberAnnouncements, deleteAnnouncement,
} from "../controllers/extras.controller.js";
import { verifyToken, verifyMember, verifyManager } from "../middleware/auth.middleware.js";

const router = express.Router();
router.get("/member/feed", verifyToken, verifyMember, getMemberAnnouncements);
router.get("/club/:clubId", getClubAnnouncements);
router.post("/", verifyToken, verifyManager, createAnnouncement);
router.delete("/:id", verifyToken, verifyManager, deleteAnnouncement);

export default router;
