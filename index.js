import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";

// Route imports
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import clubRoutes from "./routes/club.routes.js";
import eventRoutes from "./routes/event.routes.js";
import membershipRoutes from "./routes/membership.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import bookmarkRoutes from "./routes/bookmark.routes.js";
import announcementRoutes from "./routes/announcement.routes.js";
import adminRoutes from "./routes/admin.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());

// ─── DB Connection Middleware (নতুন ইনজেক্ট করা অংশ) ─────────────────────────────
// এটি নিশ্চিত করবে যে কোন এপিআই কল হওয়ার আগে ডেটাবেস কানেকশন তৈরি হয়েছে।
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database connection middleware error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Database connection failed. Please check server logs." 
    });
  }
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/clubs", clubRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/memberships", membershipRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/bookmarks", bookmarkRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/admin", adminRoutes);

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ message: "🚀 ClubSphere API is running!", status: "OK" });
});

// ─── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`✅ ClubSphere server running on port ${PORT}`);
});

export default app; // Vercel deployment-এর জন্য এটি প্রয়োজন হতে পারে