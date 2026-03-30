import { MongoClient } from "mongodb";

let client;
let db;

export const connectDB = async () => {
  // যদি আগে থেকেই কানেকশন থাকে, তবে সেটিই রিটার্ন করবে
  if (db) return db;

  try {
    if (!client) {
      client = new MongoClient(process.env.MONGODB_URI, {
        maxPoolSize: 10, // সার্ভারলেস ফাংশনের জন্য এটি ভালো
      });
    }
    await client.connect();
    db = client.db("clubsphere");
    console.log("✅ MongoDB connected successfully");
    
    // ইন্ডেক্স তৈরির কাজ এখানে না করে আলাদাভাবে একবার করা উচিত
    // await createIndexes(db); 
    
    return db;
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error.message);
    throw error;
  }
};

export const getDB = () => {
  if (!db) throw new Error("Database not initialized. Call connectDB first.");
  return db;
};