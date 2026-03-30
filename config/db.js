import { MongoClient } from "mongodb";

let db;
let client;

// export const connectDB = async () => {
//   try {
//     client = new MongoClient(process.env.MONGODB_URI);
//     await client.connect();
//     db = client.db("clubsphere");
//     console.log("✅ MongoDB connected successfully");

//     // Create indexes for better performance
//     await createIndexes();
//   } catch (error) {
//     console.error("❌ MongoDB connection failed:", error);
//     process.exit(1);
//   }
// };
export const connectDB = async () => {
  try {
    // কানেকশন স্ট্রিং এ অনেক সময় সরাসরি অবজেক্ট লাগে
    client = new MongoClient(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    await client.connect();
    db = client.db("clubsphere");
    console.log("✅ MongoDB connected successfully");

    await createIndexes();
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    // লোকাল হোস্টে এরর আসলে সাথে সাথে প্রসেস বন্ধ না করে চেক করা ভালো
    // process.exit(1); 
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
