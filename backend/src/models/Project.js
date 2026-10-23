import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: "", maxlength: 500 },
  status: { type: String, enum: ["on_track", "at_risk", "archived"], default: "on_track" },
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  members: [{ userId: mongoose.Schema.Types.ObjectId, role: { type: String, enum: ["manager", "member", "viewer"], default: "member" } }],
}, { timestamps: true });

export const Project = mongoose.model("Project", projectSchema);
