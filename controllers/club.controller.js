import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

// ─── Get All Approved Clubs (Public) ──────────────────────────────────────────
export const getAllClubs = async (req, res) => {
  const db = getDB();
  try {
    const {
      page = 1, limit = 9, search = "",
      category = "", sortBy = "createdAt", order = "desc",
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = { status: "approved" };

    if (search) query.$text = { $search: search };
    if (category) query.category = category;

    const sortOrder = order === "asc" ? 1 : -1;
    const sortField = ["membershipFee", "createdAt", "clubName"].includes(sortBy) ? sortBy : "createdAt";

    const [clubs, total] = await Promise.all([
      db.collection("clubs").find(query).skip(skip).limit(parseInt(limit)).sort({ [sortField]: sortOrder }).toArray(),
      db.collection("clubs").countDocuments(query),
    ]);

    // Attach member count to each club
    const clubsWithCount = await Promise.all(
      clubs.map(async (club) => {
        const memberCount = await db.collection("memberships").countDocuments({
          clubId: club._id.toString(), status: "active",
        });
        return { ...club, memberCount };
      })
    );

    res.json({ success: true, clubs: clubsWithCount, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Single Club ───────────────────────────────────────────────────────────
export const getClubById = async (req, res) => {
  const db = getDB();
  try {
    const club = await db.collection("clubs").findOne({ _id: new ObjectId(req.params.id) });
    if (!club) return res.status(404).json({ success: false, message: "Club not found" });

    const [memberCount, eventCount, avgRating] = await Promise.all([
      db.collection("memberships").countDocuments({ clubId: req.params.id, status: "active" }),
      db.collection("events").countDocuments({ clubId: req.params.id }),
      db.collection("reviews").aggregate([
        { $match: { clubId: req.params.id } },
        { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
      ]).toArray(),
    ]);

    res.json({
      success: true,
      club: {
        ...club,
        memberCount,
        eventCount,
        avgRating: avgRating[0]?.avg?.toFixed(1) || 0,
        reviewCount: avgRating[0]?.count || 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Create Club (Manager) ─────────────────────────────────────────────────────
export const createClub = async (req, res) => {
  const db = getDB();
  try {
    const { clubName, description, category, location, bannerImage, membershipFee } = req.body;

    const newClub = {
      clubName,
      description,
      category,
      location,
      bannerImage: bannerImage || "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800",
      membershipFee: parseFloat(membershipFee) || 0,
      status: "pending",
      managerEmail: req.user.email,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("clubs").insertOne(newClub);
    res.status(201).json({ success: true, message: "Club created! Awaiting admin approval.", clubId: result.insertedId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Update Club (Manager owns it / Admin) ────────────────────────────────────
export const updateClub = async (req, res) => {
  const db = getDB();
  try {
    const club = await db.collection("clubs").findOne({ _id: new ObjectId(req.params.id) });
    if (!club) return res.status(404).json({ success: false, message: "Club not found" });

    // Check ownership (unless admin)
    if (req.dbUser.role !== "admin" && club.managerEmail !== req.user.email) {
      return res.status(403).json({ success: false, message: "Not authorized to edit this club" });
    }

    const updateData = { ...req.body, updatedAt: new Date() };
    delete updateData._id;

    await db.collection("clubs").updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });
    res.json({ success: true, message: "Club updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Approve / Reject Club (Admin) ────────────────────────────────────────────
export const updateClubStatus = async (req, res) => {
  const db = getDB();
  try {
    const { status } = req.body;
    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    await db.collection("clubs").updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status, updatedAt: new Date() } }
    );
    res.json({ success: true, message: `Club ${status} successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Manager's Own Clubs ───────────────────────────────────────────────────
export const getManagerClubs = async (req, res) => {
  const db = getDB();
  try {
    const clubs = await db.collection("clubs").find({ managerEmail: req.user.email }).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, clubs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Featured Clubs (Home Page) ───────────────────────────────────────────
export const getFeaturedClubs = async (req, res) => {
  const db = getDB();
  try {
    const clubs = await db.collection("clubs").find({ status: "approved" }).sort({ createdAt: -1 }).limit(6).toArray();
    const clubsWithCount = await Promise.all(
      clubs.map(async (club) => {
        const memberCount = await db.collection("memberships").countDocuments({ clubId: club._id.toString(), status: "active" });
        return { ...club, memberCount };
      })
    );
    res.json({ success: true, clubs: clubsWithCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get All Clubs (Admin) ─────────────────────────────────────────────────────
export const getAllClubsAdmin = async (req, res) => {
  const db = getDB();
  try {
    const { page = 1, limit = 10, status = "" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const query = status ? { status } : {};

    const [clubs, total] = await Promise.all([
      db.collection("clubs").find(query).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }).toArray(),
      db.collection("clubs").countDocuments(query),
    ]);

    const clubsWithStats = await Promise.all(
      clubs.map(async (club) => {
        const [memberCount, eventCount] = await Promise.all([
          db.collection("memberships").countDocuments({ clubId: club._id.toString() }),
          db.collection("events").countDocuments({ clubId: club._id.toString() }),
        ]);
        return { ...club, memberCount, eventCount };
      })
    );

    res.json({ success: true, clubs: clubsWithStats, total, totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
