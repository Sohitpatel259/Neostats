import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT) || 5000,
  mongoUrl: process.env.MONGO_URL?.trim() || "",
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  authSecret: process.env.AUTH_SECRET || "local-development-secret-change-me",
};
