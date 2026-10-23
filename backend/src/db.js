import mongoose from "mongoose";
import { config } from "./config.js";

export async function connectDatabase() {
  if (!config.mongoUrl) {
    console.warn("MONGO_URL is not configured; using demo data.");
    return false;
  }

  try {
    await mongoose.connect(config.mongoUrl, { serverSelectionTimeoutMS: 3000 });
    console.log("Connected to MongoDB.");
    return true;
  } catch (error) {
    console.warn(
      [
        "MongoDB unavailable; using demo data.",
        "If this is MongoDB Atlas, add your current public IP under Security > Network Access.",
        "Also verify the username, password, cluster hostname, and database name in backend/.env.",
        `Driver message: ${error.message}`,
      ].join(" "),
    );
    return false;
  }
}
