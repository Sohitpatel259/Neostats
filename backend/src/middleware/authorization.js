import { readToken } from "../auth.js";
import { Project } from "../models/Project.js";
import { Task } from "../models/Task.js";
import { User } from "../models/User.js";

const roleRank = { viewer: 1, member: 2, manager: 3, admin: 4 };

export async function authenticate(request, response, next) {
  const token = request.header("authorization")?.replace(/^Bearer\s+/i, "");
  const claims = readToken(token);
  if (!claims) return response.status(401).json({ error: "Authentication is required." });
  const user = await User.findOne({ _id: claims.sub, active: true }).lean();
  if (!user) return response.status(401).json({ error: "Your session is no longer active." });
  request.user = { id: user._id.toString(), role: user.role, name: user.name };
  next();
}

export function requireRole(...allowedRoles) {
  return (request, response, next) => {
    if (!request.user || !allowedRoles.includes(request.user.role)) {
      return response.status(403).json({ error: "You do not have permission to perform this action." });
    }
    next();
  };
}

export function requireMinimumRole(role) {
  return (request, response, next) => {
    if (!request.user || roleRank[request.user.role] < roleRank[role]) {
      return response.status(403).json({ error: "You do not have permission to perform this action." });
    }
    next();
  };
}

export async function requireProjectAccess(request, response, next) {
  const project = await Project.findById(request.params.projectId || request.params.id).lean();
  if (!project) return response.status(404).json({ error: "Project not found." });
  const isMember = project.members?.some((member) => member.userId?.toString() === request.user.id);
  if (request.user.role !== "admin" && !isMember && project.managerId?.toString() !== request.user.id) {
    return response.status(403).json({ error: "You do not have access to this project." });
  }
  request.project = project;
  next();
}

export function requireProjectManager(request, response, next) {
  if (request.user.role === "admin" || request.project?.managerId?.toString() === request.user.id ||
      request.project?.members?.some((member) => member.userId?.toString() === request.user.id && member.role === "manager")) {
    return next();
  }
  return response.status(403).json({ error: "Only the project manager or an admin can perform this action." });
}

export async function requireTaskAccess(request, response, next) {
  const task = await Task.findById(request.params.id || request.params.taskId).lean();
  if (!task) return response.status(404).json({ error: "Task not found." });
  const project = await Project.findById(task.projectId).lean();
  const isMember = project?.members?.some((member) => member.userId?.toString() === request.user.id);
  const hasProjectAccess = request.user.role === "admin" || project?.managerId?.toString() === request.user.id || isMember;
  if (!hasProjectAccess) return response.status(403).json({ error: "You do not have access to this task." });
  if (request.user.role === "member" && task.assigneeId?.toString() !== request.user.id) {
    return response.status(403).json({ error: "Team members can only update tasks assigned to them." });
  }
  request.task = task;
  request.project = project;
  next();
}

export function canEditTask(request) {
  return roleRank[request.user?.role] >= roleRank.member;
}
