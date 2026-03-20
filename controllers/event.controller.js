import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

// ─── Get All Events (Public) ───────────────────────────────────────────────────
export const getAllEvents = async (req, res) => {
  const db = getDB();
  try {
    const { page = 1, limit = 9, sortBy = "eventDate", order = "asc", clubId = "" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { eventDate: { $gte: new Date() } };
    if (clubId) query.clubId = clubId;

    const sortOrder = order === "asc" ? 1 : -1;
    const [events, total] = await Promise.all([
      db.collection("events").find(query).skip(skip).limit(parseInt(limit)).sort({ [sortBy]: sortOrder }).toArray(),
      db.collection("events").countDocuments(query),
    ]);

    // Attach club name to each event
    const eventsWithClub = await Promise.all(
      events.map(async (event) => {
        const club = await db.collection("clubs").findOne({ _id: new ObjectId(event.clubId) }, { projection: { clubName: 1, bannerImage: 1 } });
        const registrationCount = await db.collection("eventRegistrations").countDocuments({ eventId: event._id.toString(), status: "registered" });
        return { ...event, clubName: club?.clubName || "Unknown", clubBanner: club?.bannerImage, registrationCount };
      })
    );

    res.json({ success: true, events: eventsWithClub, total, totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Single Event ──────────────────────────────────────────────────────────
export const getEventById = async (req, res) => {
  const db = getDB();
  try {
    const event = await db.collection("events").findOne({ _id: new ObjectId(req.params.id) });
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    const club = await db.collection("clubs").findOne({ _id: new ObjectId(event.clubId) });
    const registrationCount = await db.collection("eventRegistrations").countDocuments({ eventId: req.params.id, status: "registered" });

    res.json({ success: true, event: { ...event, club, registrationCount } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Create Event (Manager) ────────────────────────────────────────────────────
export const createEvent = async (req, res) => {
  const db = getDB();
  try {
    const { clubId, title, description, eventDate, location, isPaid, eventFee, maxAttendees, bannerImage } = req.body;

    // Verify manager owns this club
    const club = await db.collection("clubs").findOne({ _id: new ObjectId(clubId) });
    if (!club || club.managerEmail !== req.user.email) {
      return res.status(403).json({ success: false, message: "Not authorized to create events for this club" });
    }

    const newEvent = {
      clubId,
      title,
      description,
      eventDate: new Date(eventDate),
      location,
      isPaid: Boolean(isPaid),
      eventFee: isPaid ? parseFloat(eventFee) || 0 : 0,
      maxAttendees: parseInt(maxAttendees) || null,
      bannerImage: bannerImage || club.bannerImage,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("events").insertOne(newEvent);
    res.status(201).json({ success: true, message: "Event created successfully", eventId: result.insertedId });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Update Event ──────────────────────────────────────────────────────────────
export const updateEvent = async (req, res) => {
  const db = getDB();
  try {
    const event = await db.collection("events").findOne({ _id: new ObjectId(req.params.id) });
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    const club = await db.collection("clubs").findOne({ _id: new ObjectId(event.clubId) });
    if (club.managerEmail !== req.user.email && req.dbUser.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const updateData = { ...req.body, updatedAt: new Date() };
    if (updateData.eventDate) updateData.eventDate = new Date(updateData.eventDate);
    delete updateData._id;

    await db.collection("events").updateOne({ _id: new ObjectId(req.params.id) }, { $set: updateData });
    res.json({ success: true, message: "Event updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Delete Event ──────────────────────────────────────────────────────────────
export const deleteEvent = async (req, res) => {
  const db = getDB();
  try {
    const event = await db.collection("events").findOne({ _id: new ObjectId(req.params.id) });
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });

    const club = await db.collection("clubs").findOne({ _id: new ObjectId(event.clubId) });
    if (club.managerEmail !== req.user.email && req.dbUser.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    await db.collection("events").deleteOne({ _id: new ObjectId(req.params.id) });
    await db.collection("eventRegistrations").deleteMany({ eventId: req.params.id });

    res.json({ success: true, message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Manager's Events ──────────────────────────────────────────────────────
export const getManagerEvents = async (req, res) => {
  const db = getDB();
  try {
    const clubs = await db.collection("clubs").find({ managerEmail: req.user.email }).toArray();
    const clubIds = clubs.map((c) => c._id.toString());

    const events = await db.collection("events").find({ clubId: { $in: clubIds } }).sort({ eventDate: -1 }).toArray();

    const eventsWithStats = await Promise.all(
      events.map(async (event) => {
        const registrationCount = await db.collection("eventRegistrations").countDocuments({ eventId: event._id.toString(), status: "registered" });
        const club = clubs.find((c) => c._id.toString() === event.clubId);
        return { ...event, registrationCount, clubName: club?.clubName };
      })
    );

    res.json({ success: true, events: eventsWithStats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Event Registrations (Manager) ────────────────────────────────────────
export const getEventRegistrations = async (req, res) => {
  const db = getDB();
  try {
    const registrations = await db.collection("eventRegistrations")
      .find({ eventId: req.params.id })
      .sort({ registeredAt: -1 })
      .toArray();

    res.json({ success: true, registrations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
