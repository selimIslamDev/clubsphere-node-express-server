import express from "express";
import {
  getAllEvents, getEventById, createEvent, updateEvent,
  deleteEvent, getManagerEvents, getEventRegistrations,
} from "../controllers/event.controller.js";
import { verifyToken, verifyManager, verifyMember } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", getAllEvents);
router.get("/manager/my-events", verifyToken, verifyManager, getManagerEvents);
router.get("/:id", getEventById);
router.get("/:id/registrations", verifyToken, verifyManager, getEventRegistrations);
router.post("/", verifyToken, verifyManager, createEvent);
router.put("/:id", verifyToken, verifyManager, updateEvent);
router.delete("/:id", verifyToken, verifyManager, deleteEvent);

export default router;
