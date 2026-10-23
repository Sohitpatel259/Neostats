import { Router } from "express";
import { createToken, hashPassword, verifyPassword } from "../auth.js";
import { authenticate } from "../middleware/authorization.js";
import { User } from "../models/User.js";

const router = Router();
const publicUser = (user) => ({ id: user._id, name: user.name, email: user.email, role: user.role, active: user.active });

router.post("/auth/register", async (request, response, next) => {
  try {
    const { name, email, password } = request.body;
    if (!name || !email || !password) return response.status(400).json({ error: "Name, email, and password are required." });
    const normalizedEmail = String(email).toLowerCase().trim();
    if (await User.exists({ email: normalizedEmail })) return response.status(409).json({ error: "An account with that email already exists." });
    const role = (await User.countDocuments()) === 0 ? "admin" : "member";
    const user = await User.create({ name, email: normalizedEmail, passwordHash: await hashPassword(password), role });
    response.status(201).json({ user: publicUser(user), token: createToken(user) });
  } catch (error) { next(error); }
});

router.post("/auth/login", async (request, response, next) => {
  try {
    const email = String(request.body.email || "").toLowerCase().trim();
    const user = await User.findOne({ email }).select("+passwordHash");
    if (!user || !user.active || !(await verifyPassword(request.body.password, user.passwordHash))) {
      return response.status(401).json({ error: "Invalid email or password." });
    }
    response.json({ user: publicUser(user), token: createToken(user) });
  } catch (error) { next(error); }
});

router.get("/auth/me", authenticate, (request, response) => {
  response.json({ user: request.user });
});

export default router;
