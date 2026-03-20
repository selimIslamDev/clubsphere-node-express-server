import Stripe from "stripe";
import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ─── Create Payment Intent (Membership) ────────────────────────────────────────
export const createMembershipPaymentIntent = async (req, res) => {
  const db = getDB();
  try {
    const { clubId } = req.body;
    const club = await db.collection("clubs").findOne({ _id: new ObjectId(clubId) });

    if (!club) return res.status(404).json({ success: false, message: "Club not found" });
    if (club.membershipFee <= 0) return res.status(400).json({ success: false, message: "This club is free to join" });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(club.membershipFee * 100), // Stripe uses cents
      currency: "usd",
      metadata: {
        clubId: clubId,
        userEmail: req.user.email,
        type: "membership",
      },
    });

    res.json({ success: true, clientSecret: paymentIntent.client_secret, amount: club.membershipFee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Create Payment Intent (Event) ────────────────────────────────────────────
export const createEventPaymentIntent = async (req, res) => {
  const db = getDB();
  try {
    const { eventId } = req.body;
    const event = await db.collection("events").findOne({ _id: new ObjectId(eventId) });

    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    if (!event.isPaid) return res.status(400).json({ success: false, message: "This event is free" });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(event.eventFee * 100),
      currency: "usd",
      metadata: {
        eventId: eventId,
        clubId: event.clubId,
        userEmail: req.user.email,
        type: "event",
      },
    });

    res.json({ success: true, clientSecret: paymentIntent.client_secret, amount: event.eventFee });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Confirm Membership After Payment ─────────────────────────────────────────
export const confirmMembershipPayment = async (req, res) => {
  const db = getDB();
  try {
    const { clubId, paymentIntentId } = req.body;

    // Verify payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (paymentIntent.status !== "succeeded") {
      return res.status(400).json({ success: false, message: "Payment not completed" });
    }

    // Create membership record
    const membership = {
      userEmail: req.user.email,
      clubId,
      status: "active",
      paymentId: paymentIntentId,
      joinedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    };

    await db.collection("memberships").updateOne(
      { userEmail: req.user.email, clubId },
      { $set: membership },
      { upsert: true }
    );

    // Save payment record
    const club = await db.collection("clubs").findOne({ _id: new ObjectId(clubId) });
    await db.collection("payments").insertOne({
      userEmail: req.user.email,
      amount: paymentIntent.amount / 100,
      type: "membership",
      clubId,
      clubName: club?.clubName,
      stripePaymentIntentId: paymentIntentId,
      status: "completed",
      createdAt: new Date(),
    });

    res.json({ success: true, message: "Membership activated!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get All Payments (Admin) ──────────────────────────────────────────────────
export const getAllPayments = async (req, res) => {
  const db = getDB();
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [payments, total] = await Promise.all([
      db.collection("payments").find().skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }).toArray(),
      db.collection("payments").countDocuments(),
    ]);

    const totalRevenue = await db.collection("payments").aggregate([
      { $match: { status: "completed" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]).toArray();

    res.json({
      success: true, payments, total,
      totalRevenue: totalRevenue[0]?.total || 0,
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Member's Payment History ─────────────────────────────────────────────
export const getMemberPayments = async (req, res) => {
  const db = getDB();
  try {
    const payments = await db.collection("payments")
      .find({ userEmail: req.user.email })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ success: true, payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
