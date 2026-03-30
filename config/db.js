import { MongoClient } from "mongodb";

let db;
let client;

export const connectDB = async () => {
  try {
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db = client.db("clubsphere");
    console.log("✅ MongoDB connected successfully");
    await createIndexes();
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
  }
};

const createIndexes = async () => {
  try {
    await db.collection("users").createIndex({ email: 1 }, { unique: true });
    await db.collection("clubs").createIndex({ status: 1 });
    await db.collection("clubs").createIndex({ category: 1 });
    await db.collection("clubs").createIndex({ clubName: "text", description: "text" });
    await db.collection("memberships").createIndex({ userEmail: 1, clubId: 1 });
    await db.collection("events").createIndex({ clubId: 1 });
    await db.collection("events").createIndex({ eventDate: 1 });
    await db.collection("eventRegistrations").createIndex({ eventId: 1, userEmail: 1 });
    await db.collection("reviews").createIndex({ clubId: 1 });
    await db.collection("bookmarks").createIndex({ userEmail: 1 });
    await db.collection("announcements").createIndex({ clubId: 1 });
    console.log("✅ Database indexes created");
  } catch (error) {
    console.error("Index creation error:", error);
  }
};

export const getDB = () => {
  if (!db) throw new Error("Database not initialized");
  return db;
};