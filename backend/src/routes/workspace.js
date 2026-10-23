import { Router } from "express";
import mongoose from "mongoose";
import { Comment } from "../models/Comment.js";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { authenticate, requireMinimumRole, requireProjectAccess, requireProjectManager, requireRole, requireTaskAccess } from "../middleware/authorization.js";
import { User } from "../models/User.js";
import { hashPassword } from "../auth.js";

const router = Router();
const idIsValid = (value) => mongoose.Types.ObjectId.isValid(value);

router.get("/projects", authenticate, async (request, response, next) => {
  try {
    const page = Math.max(Number(request.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(request.query.limit) || 20, 1), 100);
    const statusFilter = request.query.status === "archived" ? { status: "archived" } : { status: { $ne: "archived" } };
    const filter = request.user.role === "admin"
      ? statusFilter
      : { ...statusFilter, $or: [{ managerId: request.user.id }, { "members.userId": request.user.id }] };
    const [items, total] = await Promise.all([
      Project.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Project.countDocuments(filter),
    ]);
    response.json({ items, page, limit, total });
  } catch (error) { next(error); }
});

router.post("/projects", authenticate, requireRole("admin"), async (request, response, next) => {
  try {
    const project = await Project.create(request.body);
    response.status(201).json(project);
  } catch (error) { next(error); }
});

router.patch("/projects/:id", authenticate, requireMinimumRole("manager"), async (request, response, next) => {
  try {
    if (!idIsValid(request.params.id)) return response.status(400).json({ error: "Invalid project id." });
    const existing = await Project.findById(request.params.id).lean();
    if (!existing) return response.status(404).json({ error: "Project not found." });
    if (request.user.role !== "admin" && existing.managerId?.toString() !== request.user.id) {
      return response.status(403).json({ error: "Only the assigned project manager can update this project." });
    }
    const project = await Project.findByIdAndUpdate(request.params.id, request.body, { new: true, runValidators: true });
    if (!project) return response.status(404).json({ error: "Project not found." });
    response.json(project);
  } catch (error) { next(error); }
});

router.get("/projects/:projectId/tasks", authenticate, requireProjectAccess, async (request, response, next) => {
  try {
    if (!idIsValid(request.params.projectId)) return response.status(400).json({ error: "Invalid project id." });
    const tasks = await Task.find({ projectId: request.params.projectId }).sort({ updatedAt: -1 }).lean();
    response.json({ items: tasks });
  } catch (error) { next(error); }
});

router.post("/projects/:projectId/tasks", authenticate, requireProjectAccess, requireProjectManager, async (request, response, next) => {
  try {
    if (!idIsValid(request.params.projectId)) return response.status(400).json({ error: "Invalid project id." });
    const task = await Task.create({ ...request.body, projectId: request.params.projectId });
    response.status(201).json(task);
  } catch (error) { next(error); }
});

router.patch("/tasks/:id", authenticate, requireTaskAccess, requireMinimumRole("member"), async (request, response, next) => {
  try {
    if (!idIsValid(request.params.id)) return response.status(400).json({ error: "Invalid task id." });
    const expectedVersion = Number(request.header("if-match-version") || request.body.version);
    if (!Number.isInteger(expectedVersion)) return response.status(428).json({ error: "A task version is required for updates." });
    const updates = { ...request.body };
    delete updates.version;
    const task = await Task.findOneAndUpdate(
      { _id: request.params.id, version: expectedVersion },
      { $set: updates, $inc: { version: 1 } },
      { new: true, runValidators: true },
    );
    if (!task) return response.status(409).json({ error: "This task changed since you opened it. Refresh and review the latest version." });
    response.json(task);
  } catch (error) { next(error); }
});

router.delete("/tasks/:id", authenticate, requireTaskAccess, requireMinimumRole("manager"), async (request, response, next) => {
  try {
    if (!idIsValid(request.params.id)) return response.status(400).json({ error: "Invalid task id." });
    const task = await Task.findByIdAndDelete(request.params.id);
    if (!task) return response.status(404).json({ error: "Task not found." });
    await Comment.deleteMany({ taskId: task._id });
    response.status(204).end();
  } catch (error) { next(error); }
});

router.get("/tasks/:taskId/comments", authenticate, requireTaskAccess, async (request, response, next) => {
  try { response.json({ items: await Comment.find({ taskId: request.params.taskId }).sort({ createdAt: 1 }).lean() }); } catch (error) { next(error); }
});

router.post("/tasks/:taskId/comments", authenticate, requireTaskAccess, requireMinimumRole("member"), async (request, response, next) => {
  try {
    if (!request.user.id || !idIsValid(request.user.id)) return response.status(401).json({ error: "A valid user identity is required." });
    const comment = await Comment.create({ taskId: request.params.taskId, authorId: request.user.id, body: request.body.body });
    response.status(201).json(comment);
  } catch (error) { next(error); }
});

router.delete("/comments/:id", authenticate, requireMinimumRole("manager"), async (request, response, next) => {
  try {
    const comment = await Comment.findByIdAndDelete(request.params.id);
    if (!comment) return response.status(404).json({ error: "Comment not found." });
    response.status(204).end();
  } catch (error) { next(error); }
});

router.get("/users", authenticate, requireRole("admin"), async (_request, response, next) => {
  try { response.json({ items: await User.find().select("-passwordHash").sort({ name: 1 }).lean() }); } catch (error) { next(error); }
});

router.patch("/users/:id", authenticate, requireRole("admin"), async (request, response, next) => {
  try {
    const user = await User.findByIdAndUpdate(request.params.id, request.body, { new: true, runValidators: true }).select("-passwordHash").lean();
    if (!user) return response.status(404).json({ error: "User not found." });
    response.json(user);
  } catch (error) { next(error); }
});

router.delete("/users/:id", authenticate, requireRole("admin"), async (request, response, next) => {
  try {
    const user = await User.findByIdAndUpdate(request.params.id, { active: false }, { new: true }).select("-passwordHash").lean();
    if (!user) return response.status(404).json({ error: "User not found." });
    response.json(user);
  } catch (error) { next(error); }
});

router.post("/projects/:projectId/members", authenticate, requireProjectAccess, requireProjectManager, async (request, response, next) => {
  try {
    const { userId, role = "member" } = request.body;
    if (!userId || !["manager", "member", "viewer"].includes(role)) return response.status(400).json({ error: "A userId and valid project role are required." });
    const project = await Project.findByIdAndUpdate(request.params.projectId, { $addToSet: { members: { userId, role } } }, { new: true, runValidators: true });
    response.status(201).json(project);
  } catch (error) { next(error); }
});

router.delete("/projects/:projectId/members/:userId", authenticate, requireProjectAccess, requireProjectManager, async (request, response, next) => {
  try {
    const project = await Project.findByIdAndUpdate(request.params.projectId, { $pull: { members: { userId: request.params.userId } } }, { new: true });
    response.json(project);
  } catch (error) { next(error); }
});

router.patch("/projects/:projectId/members/:userId", authenticate, requireProjectAccess, requireProjectManager, async (request, response, next) => {
  try {
    const { role } = request.body;
    if (!["manager", "member", "viewer"].includes(role)) return response.status(400).json({ error: "A valid project role is required." });
    const project = await Project.findOneAndUpdate(
      { _id: request.params.projectId, "members.userId": request.params.userId },
      { $set: { "members.$.role": role } },
      { new: true, runValidators: true },
    );
    if (!project) return response.status(404).json({ error: "Project member not found." });
    response.json(project);
  } catch (error) { next(error); }
});

router.post("/users", authenticate, requireRole("admin"), async (request, response, next) => {
  try {
    const { name, email, password, role = "member" } = request.body;
    if (!name || !email || !password || !["admin", "manager", "member", "viewer"].includes(role)) {
      return response.status(400).json({ error: "Name, email, password, and a valid role are required." });
    }
    const user = await User.create({ name, email: String(email).toLowerCase().trim(), passwordHash: await hashPassword(password), role });
    const safeUser = user.toObject();
    delete safeUser.passwordHash;
    response.status(201).json(safeUser);
  } catch (error) { next(error); }
});

export default router;
