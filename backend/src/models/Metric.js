import mongoose from "mongoose";

const metricSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    value: { type: Number, required: true, min: 0 },
    change: { type: Number, required: true },
    period: { type: String, default: "vs. last month" },
  },
  { timestamps: true },
);

export const Metric = mongoose.model("Metric", metricSchema);
