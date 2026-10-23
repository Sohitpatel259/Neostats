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
const roles = ["admin", "manager", "member", "viewer"];
const projectRoles = ["manager", "member", "viewer"];
const taskStatuses = ["todo", "in_progress", "done"];
const priorities = ["low", "medium", "high"];

function requireBodyFields(body, fields) {
  return fields.filter((field) => typeof body[field] !== "string" || !body[field].trim());
}

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

router.get("/projects/:id", authenticate, requireProjectAccess, async (request, response) => {
  response.json(request.project);
});

router.post("/projects", authenticate, requireRole("admin"), async (request, response, next) => {
  try {
    const missing = requireBodyFields(request.body, ["name"]);
    if (missing.length) return response.status(400).json({ error: `Missing required fields: ${missing.join(", ")}.` });
    if (request.body.managerId && !idIsValid(request.body.managerId)) return response.status(400).json({ error: "Invalid manager id." });
    const managerId = request.body.managerId || request.user.id;
    if (!(await User.exists({ _id: managerId, active: true, role: { $in: ["admin", "manager"] } }))) {
      return response.status(400).json({ error: "The project manager must be an active admin or manager." });
    }
    const project = await Project.create({
      name: request.body.name,
      description: request.body.description || "",
      status: request.body.status || "on_track",
      managerId,
      members: [{ userId: managerId, role: "manager" }],
    });
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
    const updates = {};
    if (typeof request.body.name === "string") updates.name = request.body.name.trim();
    if (typeof request.body.description === "string") updates.description = request.body.description.trim();
    if (["on_track", "at_risk", "archived"].includes(request.body.status)) updates.status = request.body.status;
    if (request.body.managerId !== undefined) {
      if (!idIsValid(request.body.managerId)) return response.status(400).json({ error: "Invalid manager id." });
      if (!(await User.exists({ _id: request.body.managerId, active: true, role: { $in: ["admin", "manager"] } }))) {
        return response.status(400).json({ error: "The project manager must be an active admin or manager." });
      }
      updates.managerId = request.body.managerId;
      updates.$addToSet = { members: { userId: request.body.managerId, role: "manager" } };
    }
    const project = await Project.findByIdAndUpdate(request.params.id, updates, { new: true, runValidators: true });
    if (!project) return response.status(404).json({ error: "Project not found." });
    response.json(project);
  } catch (error) { next(error); }
});

router.patch("/projects/:id/archive", authenticate, requireMinimumRole("manager"), async (request, response, next) => {
  try {
    if (!idIsValid(request.params.id)) return response.status(400).json({ error: "Invalid project id." });
    const existing = await Project.findById(request.params.id).lean();
    if (!existing) return response.status(404).json({ error: "Project not found." });
    if (request.user.role !== "admin" && existing.managerId?.toString() !== request.user.id) return response.status(403).json({ error: "Only the assigned project manager can archive this project." });
    const project = await Project.findByIdAndUpdate(request.params.id, { status: "archived" }, { new: true });
    response.json(project);
  } catch (error) { next(error); }
});

router.delete("/projects/:id", authenticate, requireRole("admin"), async (request, response, next) => {
  try {
    if (!idIsValid(request.params.id)) return response.status(400).json({ error: "Invalid project id." });
    const project = await Project.findByIdAndDelete(request.params.id);
    if (!project) return response.status(404).json({ error: "Project not found." });
    const projectTasks = await Task.find({ projectId: project._id }).select("_id").lean();
    await Task.deleteMany({ projectId: project._id });
    await Comment.deleteMany({ taskId: { $in: projectTasks.map((task) => task._id) } });
    response.status(204).end();
  } catch (error) { next(error); }
});

router.get("/projects/:projectId/tasks", authenticate, requireProjectAccess, async (request, response, next) => {
  try {
    if (!idIsValid(request.params.projectId)) return response.status(400).json({ error: "Invalid project id." });
    const tasks = await Task.find({ projectId: request.params.projectId }).sort({ updatedAt: -1 }).lean();
    response.json({ items: tasks });
  } catch (error) { next(error); }
});

router.get("/tasks/:id", authenticate, requireTaskAccess, async (request, response) => {
  response.json(request.task);
});

router.post("/projects/:projectId/tasks", authenticate, requireProjectAccess, requireProjectManager, async (request, response, next) => {
  try {
    if (!idIsValid(request.params.projectId)) return response.status(400).json({ error: "Invalid project id." });
    const missing = requireBodyFields(request.body, ["title"]);
    if (missing.length) return response.status(400).json({ error: `Missing required fields: ${missing.join(", ")}.` });
    if (request.body.assigneeId && !idIsValid(request.body.assigneeId)) return response.status(400).json({ error: "Invalid assignee id." });
    if (request.body.assigneeId && !(await User.exists({ _id: request.body.assigneeId, active: true }))) return response.status(400).json({ error: "Assignee not found or inactive." });
    if (request.body.status && !taskStatuses.includes(request.body.status)) return response.status(400).json({ error: "Invalid task status." });
    if (request.body.priority && !priorities.includes(request.body.priority)) return response.status(400).json({ error: "Invalid task priority." });
    const task = await Task.create({
      projectId: request.params.projectId,
      title: request.body.title,
      description: request.body.description || "",
      status: request.body.status || "todo",
      priority: request.body.priority || "medium",
      assigneeId: request.body.assigneeId || null,
    });
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
    const allowedFields = ["title", "description", "status", "priority", "assigneeId"];
    for (const field of Object.keys(updates)) if (!allowedFields.includes(field)) delete updates[field];
    if (updates.status && !taskStatuses.includes(updates.status)) return response.status(400).json({ error: "Invalid task status." });
    if (updates.priority && !priorities.includes(updates.priority)) return response.status(400).json({ error: "Invalid task priority." });
    if (updates.assigneeId && (!idIsValid(updates.assigneeId) || !(await User.exists({ _id: updates.assigneeId, active: true })))) return response.status(400).json({ error: "Assignee not found or inactive." });
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
  try {
    const page = Math.max(Number(request.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(request.query.limit) || 50, 1), 100);
    const filter = { taskId: request.params.taskId };
    const [items, total] = await Promise.all([
      Comment.find(filter).sort({ createdAt: 1 }).skip((page - 1) * limit).limit(limit).populate("authorId", "name email").lean(),
      Comment.countDocuments(filter),
    ]);
    response.json({ items, page, limit, total });
  } catch (error) { next(error); }
});

router.post("/tasks/:taskId/comments", authenticate, requireTaskAccess, requireMinimumRole("member"), async (request, response, next) => {
  try {
    if (!request.user.id || !idIsValid(request.user.id)) return response.status(401).json({ error: "A valid user identity is required." });
    if (typeof request.body.body !== "string" || !request.body.body.trim()) return response.status(400).json({ error: "Comment body is required." });
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

router.get("/projects/:projectId/members", authenticate, requireProjectAccess, async (request, response, next) => {
  try {
    const project = await Project.findById(request.params.projectId).populate("members.userId", "name email role active").lean();
    response.json({ items: project.members || [] });
  } catch (error) { next(error); }
});

router.get("/users", authenticate, requireRole("admin"), async (_request, response, next) => {
  try { response.json({ items: await User.find().select("-passwordHash").sort({ name: 1 }).lean() }); } catch (error) { next(error); }
});

router.patch("/users/:id", authenticate, requireRole("admin"), async (request, response, next) => {
  try {
    if (request.params.id === request.user.id) return response.status(400).json({ error: "You cannot change your own account role here." });
    const updates = {};
    if (typeof request.body.name === "string") updates.name = request.body.name.trim();
    if (["admin", "manager", "member", "viewer"].includes(request.body.role)) updates.role = request.body.role;
    if (typeof request.body.active === "boolean") updates.active = request.body.active;
    const user = await User.findByIdAndUpdate(request.params.id, updates, { new: true, runValidators: true }).select("-passwordHash").lean();
    if (!user) return response.status(404).json({ error: "User not found." });
    response.json(user);
  } catch (error) { next(error); }
});

router.delete("/users/:id", authenticate, requireRole("admin"), async (request, response, next) => {
  try {
    if (request.params.id === request.user.id) return response.status(400).json({ error: "You cannot remove your own account." });
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
