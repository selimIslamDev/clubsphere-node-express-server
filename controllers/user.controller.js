import { getDB } from "../config/db.js";
import { ObjectId } from "mongodb";

// ─── Save or Update User on Login/Register ─────────────────────────────────────
export const saveUser = async (req, res) => {
  const { name, email, photoURL } = req.body;
  const db = getDB();

  try {
    const existingUser = await db.collection("users").findOne({ email });

    if (existingUser) {
      return res.json({ success: true, message: "User already exists", user: existingUser });
    }

    const newUser = {
      name,
      email,
      photoURL: photoURL || "",
      role: "member",
      createdAt: new Date(),
    };

    const result = await db.collection("users").insertOne(newUser);
    res.status(201).json({ success: true, message: "User created", user: { ...newUser, _id: result.insertedId } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get Current User ──────────────────────────────────────────────────────────
export const getCurrentUser = async (req, res) => {
  const db = getDB();
  try {
    const user = await db.collection("users").findOne({ email: req.user.email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Get All Users (Admin) ─────────────────────────────────────────────────────
export const getAllUsers = async (req, res) => {
  const db = getDB();
  try {
    const { page = 1, limit = 10, search = "" } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = search
      ? { $or: [{ name: { $regex: search, $options: "i" } }, { email: { $regex: search, $options: "i" } }] }
      : {};

    const [users, total] = await Promise.all([
      db.collection("users").find(query).skip(skip).limit(parseInt(limit)).sort({ createdAt: -1 }).toArray(),
      db.collection("users").countDocuments(query),
    ]);

    res.json({ success: true, users, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─── Update User Role (Admin) ──────────────────────────────────────────────────
export const updateUserRole = async (req, res) => {
  const db = getDB();
  const { id } = req.params;
  const { role } = req.body;

  const validRoles = ["admin", "clubManager", "member"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, message: "Invalid role" });
  }

  try {
    // Admin cannot change their own role
    const targetUser = await db.collection("users").findOne({ _id: new ObjectId(id) });
    if (targetUser.email === req.user.email) {
      return res.status(403).json({ success: false, message: "Cannot change your own role" });
    }

    await db.collection("users").updateOne({ _id: new ObjectId(id) }, { $set: { role, updatedAt: new Date() } });
    res.json({ success: true, message: `User role updated to ${role}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
