import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

// ─── Join Free Club ────────────────────────────────────────────────────────────
export const joinFreeClub = async (req, res) => {
  const db = getDB();
  try {
    const { clubId } = req.body;
    const club = await db.collection("clubs").findOne({ _id: new ObjectId(clubId) });

    if (!club) return res.status(404).json({ success: false, message: "Club not found" });
    if (club.status !== "approved") return res.status(400).json({ success: false, message: "Club is not approved" });
    if (club.membershipFee > 0) return res.status(400).json({ success: false, message: "This club requires payment" });

    const existing = await db.collection("memberships").findOne({ userEmail: req.user.email, clubId });
    if (existing) return res.status(400).json({ success: false, message: "Already a member" });

    await db.collection("memberships").insertOne({
      userEmail: req.user.email,
      clubId,
      status: "active",
      paymentId: null,
      joinedAt: new Date(),
      expiresAt: null,
    });

    res.status(201).json({ success: true, message: "Successfully joined the club!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Member's Memberships ──────────────────────────────────────────────────
export const getMemberMemberships = async (req, res) => {
  const db = getDB();
  try {
    const memberships = await db.collection("memberships")
      .find({ userEmail: req.user.email })
      .sort({ joinedAt: -1 })
      .toArray();

    const membershipsWithClub = await Promise.all(
      memberships.map(async (m) => {
        const club = await db.collection("clubs").findOne({ _id: new ObjectId(m.clubId) });
        return { ...m, club };
      })
    );

    res.json({ success: true, memberships: membershipsWithClub });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Club Members (Manager) ───────────────────────────────────────────────
export const getClubMembers = async (req, res) => {
  const db = getDB();
  try {
    const { clubId } = req.params;
    const club = await db.collection("clubs").findOne({ _id: new ObjectId(clubId) });

    if (!club) return res.status(404).json({ success: false, message: "Club not found" });
    if (club.managerEmail !== req.user.email && req.dbUser.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const memberships = await db.collection("memberships").find({ clubId }).sort({ joinedAt: -1 }).toArray();

    const membershipsWithUser = await Promise.all(
      memberships.map(async (m) => {
        const user = await db.collection("users").findOne({ email: m.userEmail }, { projection: { name: 1, email: 1, photoURL: 1 } });
        return { ...m, user };
      })
    );

    res.json({ success: true, members: membershipsWithUser });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Register for Event ────────────────────────────────────────────────────────
export const registerForEvent = async (req, res) => {
  const db = getDB();
  try {
    const { eventId, paymentId } = req.body;
    const event = await db.collection("events").findOne({ _id: new ObjectId(eventId) });

    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    const existing = await db.collection("eventRegistrations").findOne({ eventId, userEmail: req.user.email });
    if (existing) return res.status(400).json({ success: false, message: "Already registered" });

    if (event.maxAttendees) {
      const count = await db.collection("eventRegistrations").countDocuments({ eventId, status: "registered" });
      if (count >= event.maxAttendees) return res.status(400).json({ success: false, message: "Event is full" });
    }

    await db.collection("eventRegistrations").insertOne({
      eventId,
      userEmail: req.user.email,
      clubId: event.clubId,
      status: "registered",
      paymentId: paymentId || null,
      registeredAt: new Date(),
    });

    res.status(201).json({ success: true, message: "Successfully registered for event!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Member's Event Registrations ─────────────────────────────────────────
export const getMemberEventRegistrations = async (req, res) => {
  const db = getDB();
  try {
    const registrations = await db.collection("eventRegistrations")
      .find({ userEmail: req.user.email })
      .sort({ registeredAt: -1 })
      .toArray();

    const regWithDetails = await Promise.all(
      registrations.map(async (r) => {
        const event = await db.collection("events").findOne({ _id: new ObjectId(r.eventId) });
        const club = event ? await db.collection("clubs").findOne({ _id: new ObjectId(event.clubId) }) : null;
        return { ...r, event, club };
      })
    );

    res.json({ success: true, registrations: regWithDetails });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
