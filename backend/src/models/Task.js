import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  description: { type: String, default: "", maxlength: 2000 },
  status: { type: String, enum: ["todo", "in_progress", "done"], default: "todo" },
  priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  version: { type: Number, default: 1 },
}, { timestamps: true });

export const Task = mongoose.model("Task", taskSchema);
