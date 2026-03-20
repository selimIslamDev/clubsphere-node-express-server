import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

// ════════════════════════════════════════════════════════════════
// REVIEWS
// ════════════════════════════════════════════════════════════════

export const createReview = async (req, res) => {
  const db = getDB();
  try {
    const { clubId, rating, comment } = req.body;

    // Check if user is a member of this club
    const membership = await db.collection("memberships").findOne({
      userEmail: req.user.email, clubId, status: "active",
    });
    if (!membership) return res.status(403).json({ success: false, message: "You must be a member to review" });

    // Check if already reviewed
    const existing = await db.collection("reviews").findOne({ userEmail: req.user.email, clubId });
    if (existing) {
      // Update existing review
      await db.collection("reviews").updateOne(
        { _id: existing._id },
        { $set: { rating, comment, updatedAt: new Date() } }
      );
      return res.json({ success: true, message: "Review updated!" });
    }

    await db.collection("reviews").insertOne({
      clubId,
      userEmail: req.user.email,
      userName: req.dbUser.name,
      userPhoto: req.dbUser.photoURL,
      rating: parseInt(rating),
      comment,
      createdAt: new Date(),
    });

    res.status(201).json({ success: true, message: "Review submitted!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getClubReviews = async (req, res) => {
  const db = getDB();
  try {
    const { clubId } = req.params;
    const reviews = await db.collection("reviews").find({ clubId }).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteReview = async (req, res) => {
  const db = getDB();
  try {
    const review = await db.collection("reviews").findOne({ _id: new ObjectId(req.params.id) });
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });
    if (review.userEmail !== req.user.email && req.dbUser.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }
    await db.collection("reviews").deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true, message: "Review deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ════════════════════════════════════════════════════════════════
// BOOKMARKS
// ════════════════════════════════════════════════════════════════

export const toggleBookmark = async (req, res) => {
  const db = getDB();
  try {
    const { clubId } = req.body;
    const existing = await db.collection("bookmarks").findOne({ userEmail: req.user.email, clubId });

    if (existing) {
      await db.collection("bookmarks").deleteOne({ _id: existing._id });
      return res.json({ success: true, message: "Bookmark removed", bookmarked: false });
    }

    await db.collection("bookmarks").insertOne({
      userEmail: req.user.email,
      clubId,
      createdAt: new Date(),
    });
    res.json({ success: true, message: "Club bookmarked!", bookmarked: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserBookmarks = async (req, res) => {
  const db = getDB();
  try {
    const bookmarks = await db.collection("bookmarks").find({ userEmail: req.user.email }).sort({ createdAt: -1 }).toArray();

    const bookmarksWithClub = await Promise.all(
      bookmarks.map(async (b) => {
        const club = await db.collection("clubs").findOne({ _id: new ObjectId(b.clubId) });
        return { ...b, club };
      })
    );
    res.json({ success: true, bookmarks: bookmarksWithClub });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ════════════════════════════════════════════════════════════════
// ANNOUNCEMENTS
// ════════════════════════════════════════════════════════════════

export const createAnnouncement = async (req, res) => {
  const db = getDB();
  try {
    const { clubId, title, content } = req.body;
    const club = await db.collection("clubs").findOne({ _id: new ObjectId(clubId) });

    if (!club || club.managerEmail !== req.user.email) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    await db.collection("announcements").insertOne({
      clubId,
      clubName: club.clubName,
      title,
      content,
      managerEmail: req.user.email,
      createdAt: new Date(),
    });

    res.status(201).json({ success: true, message: "Announcement posted!" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getClubAnnouncements = async (req, res) => {
  const db = getDB();
  try {
    const announcements = await db.collection("announcements")
      .find({ clubId: req.params.clubId })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ success: true, announcements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getMemberAnnouncements = async (req, res) => {
  const db = getDB();
  try {
    // Get all clubs user is member of
    const memberships = await db.collection("memberships").find({ userEmail: req.user.email, status: "active" }).toArray();
    const clubIds = memberships.map((m) => m.clubId);

    const announcements = await db.collection("announcements")
      .find({ clubId: { $in: clubIds } })
      .sort({ createdAt: -1 })
      .limit(20)
      .toArray();

    res.json({ success: true, announcements });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteAnnouncement = async (req, res) => {
  const db = getDB();
  try {
    await db.collection("announcements").deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true, message: "Announcement deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
