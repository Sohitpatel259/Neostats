import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["admin", "manager", "member", "viewer"], default: "member" },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true });

export const User = mongoose.model("User", userSchema);
