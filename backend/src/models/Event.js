import mongoose from "mongoose";

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 160 },
  description: { type: String, default: "", maxlength: 1000 },
  date: { type: Date, required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", default: null },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });

export const Event = mongoose.model("Event", eventSchema);
