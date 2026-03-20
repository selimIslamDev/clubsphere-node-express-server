import express from "express";
import {
  getAllClubs, getClubById, createClub, updateClub,
  updateClubStatus, getManagerClubs, getFeaturedClubs, getAllClubsAdmin,
} from "../controllers/club.controller.js";
import { verifyToken, verifyAdmin, verifyManager, verifyMember } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/featured", getFeaturedClubs);
router.get("/", getAllClubs);
router.get("/manager/my-clubs", verifyToken, verifyManager, getManagerClubs);
router.get("/admin/all", verifyToken, verifyAdmin, getAllClubsAdmin);
router.get("/:id", getClubById);
router.post("/", verifyToken, verifyManager, createClub);
router.put("/:id", verifyToken, verifyMember, updateClub);
router.patch("/:id/status", verifyToken, verifyAdmin, updateClubStatus);

export default router;
