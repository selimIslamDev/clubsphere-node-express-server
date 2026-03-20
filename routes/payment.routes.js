import express from "express";
import {
  createMembershipPaymentIntent, createEventPaymentIntent,
  confirmMembershipPayment, getAllPayments, getMemberPayments,
} from "../controllers/payment.controller.js";
import { verifyToken, verifyAdmin, verifyMember } from "../middleware/auth.middleware.js";

const router = express.Router();

router.post("/create-membership-intent", verifyToken, verifyMember, createMembershipPaymentIntent);
router.post("/create-event-intent", verifyToken, verifyMember, createEventPaymentIntent);
router.post("/confirm-membership", verifyToken, verifyMember, confirmMembershipPayment);
router.get("/all", verifyToken, verifyAdmin, getAllPayments);
router.get("/my-payments", verifyToken, verifyMember, getMemberPayments);

export default router;
