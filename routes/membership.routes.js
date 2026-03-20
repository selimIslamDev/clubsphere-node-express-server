import express from "express";
import {
  joinFreeClub, getMemberMemberships, getClubMembers,
  registerForEvent, getMemberEventRegistrations,
} from "../controllers/membership.controller.js";
import { verifyToken, verifyMember, verifyManager } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/join-free", verifyToken, verifyMember, joinFreeClub);
router.get("/my-memberships", verifyToken, verifyMember, getMemberMemberships);
router.get("/club/:clubId/members", verifyToken, verifyManager, getClubMembers);
router.post("/event/register", verifyToken, verifyMember, registerForEvent);
router.get("/my-events", verifyToken, verifyMember, getMemberEventRegistrations);

export default router;
