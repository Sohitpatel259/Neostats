import { Router } from "express";
import mongoose from "mongoose";
import { demoActivity, demoMetrics } from "../data/demo.js";
import { Metric } from "../models/Metric.js";

const router = Router();

router.get("/overview", async (_request, response, next) => {
  try {
    const connected = mongoose.connection.readyState === 1;
    const metrics = connected && (await Metric.countDocuments()) > 0
      ? await Metric.find().sort({ createdAt: -1 }).limit(4).lean()
      : demoMetrics;

    response.json({
      source: connected ? "mongodb" : "demo",
      metrics,
      activity: demoActivity,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
