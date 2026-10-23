import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import { config } from "./config.js";
import { connectDatabase } from "./db.js";
import authRouter from "./routes/auth.js";
import workspaceRouter from "./routes/workspace.js";

const app = express();

const allowedOrigin = (origin, callback) => {
  if (!origin || origin === config.clientUrl || /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+):\d+$/.test(origin)) {
    return callback(null, true);
  }
  return callback(new Error("Origin is not allowed by the API CORS policy."));
};

app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

app.get("/", (_request, response) => {
  response.json({
    name: "Orbit API",
    status: "ok",
    message: "The API is running. Open http://localhost:3000 to use the workspace.",
    frontend: config.clientUrl,
    health: "/api/health",
  });
});

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    database: mongoose.connection.readyState === 1 ? "connected" : "demo",
    databaseName: mongoose.connection.readyState === 1 ? mongoose.connection.name : null,
    host: mongoose.connection.readyState === 1 ? mongoose.connection.host : null,
  });
});

app.use("/api", authRouter);
app.use("/api", workspaceRouter);

app.use((error, _request, response, _next) => {
  console.error(error);
  response.status(500).json({ error: "Something went wrong while processing the request." });
});

const databaseConnected = await connectDatabase();
app.listen(config.port, () => {
  console.log(`Neostats API listening on http://localhost:${config.port}`);
  console.log(`Workspace data source: ${databaseConnected ? "MongoDB" : "demo data"}`);
});
