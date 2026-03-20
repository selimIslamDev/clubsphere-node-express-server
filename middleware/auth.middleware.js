import admin from "../config/firebase.js";
import { getDB } from "../config/db.js";

// ─── Verify Firebase Token ─────────────────────────────────────────────────────
export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: "Unauthorized: Invalid token" });
  }
};

// ─── Verify Admin Role ─────────────────────────────────────────────────────────
export const verifyAdmin = async (req, res, next) => {
  try {
    const db = getDB();
    const user = await db.collection("users").findOne({ email: req.user.email });

    if (!user || user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden: Admins only" });
    }
    req.dbUser = user;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Verify Club Manager Role ──────────────────────────────────────────────────
export const verifyManager = async (req, res, next) => {
  try {
    const db = getDB();
    const user = await db.collection("users").findOne({ email: req.user.email });

    if (!user || (user.role !== "clubManager" && user.role !== "admin")) {
      return res.status(403).json({ success: false, message: "Forbidden: Club Managers only" });
    }
    req.dbUser = user;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── Verify Member (any logged-in user) ───────────────────────────────────────
export const verifyMember = async (req, res, next) => {
  try {
    const db = getDB();
    const user = await db.collection("users").findOne({ email: req.user.email });

    if (!user) {
      return res.status(403).json({ success: false, message: "Forbidden: User not found" });
    }
    req.dbUser = user;
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
