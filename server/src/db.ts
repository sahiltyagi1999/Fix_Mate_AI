import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectDB = async (): Promise<void> => {
  try {
    const uri = process.env.MONGODB_URI!;
    await mongoose.connect(uri);
    console.log(" connected successfully");
  } catch (err) {
    console.error("connection error:", err);
    process.exit(1);
  }
};
