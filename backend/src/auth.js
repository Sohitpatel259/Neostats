import { createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { config } from "./config.js";

const scrypt = promisify(scryptCallback);
const tokenDurationSeconds = 60 * 60 * 8;

export async function hashPassword(password) {
  if (typeof password !== "string" || password.length < 8) throw new Error("Password must be at least 8 characters.");
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
  const [salt, expectedHex] = String(storedHash || "").split(":");
  if (!salt || !expectedHex) return false;
  const actual = await scrypt(password, salt, 64);
  const expected = Buffer.from(expectedHex, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function createToken(user) {
  const payload = Buffer.from(JSON.stringify({
    sub: user._id.toString(),
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + tokenDurationSeconds,
  })).toString("base64url");
  const signature = createHmac("sha256", config.authSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function readToken(token) {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", config.authSecret).update(payload).digest("base64url");
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return parsed.exp > Math.floor(Date.now() / 1000) ? parsed : null;
  } catch {
    return null;
  }
}
