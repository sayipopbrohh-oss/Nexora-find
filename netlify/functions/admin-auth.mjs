/* ============================================================
   Nexora.Find — Admin Authentication API
   POST /api/admin-auth  { username, password }      → login
   POST /api/admin-auth  { action: "logout" }        → logout
   GET  /api/admin-auth                              → session check
   Env: ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_SESSION_SECRET
   ============================================================ */

import crypto from "node:crypto";
import { jsonResponse, parseJsonBody, clientIp } from "./_shared/util.mjs";
import {
  signSession,
  verifySession,
  parseCookies,
  sessionCookie,
  clearSessionCookie,
  requireAdmin,
  COOKIE_NAME
} from "./_shared/session.mjs";

/* Very light in-memory brute-force guard (per function instance). */
const attempts = new Map(); // ip → { count, firstAt }
const MAX_ATTEMPTS = 12;
const WINDOW_MS = 15 * 60 * 1000;

function throttled(ip) {
  const now = Date.now();
  const rec = attempts.get(ip);
  if (!rec || now - rec.firstAt > WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAt: now });
    return false;
  }
  rec.count += 1;
  return rec.count > MAX_ATTEMPTS;
}

function resetAttempts(ip) {
  attempts.delete(ip);
}

function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export async function handler(event) {
  try {
    if (event.httpMethod === "OPTIONS") return jsonResponse(200, { ok: true });

    if (event.httpMethod === "GET") {
      const auth = requireAdmin(event);
      return jsonResponse(200, {
        ok: true,
        authenticated: auth.ok,
        username: auth.ok ? auth.username : null
      });
    }

    if (event.httpMethod !== "POST") {
      return jsonResponse(405, { ok: false, error: "Method not allowed" });
    }

    const body = parseJsonBody(event);
    if (!body) return jsonResponse(400, { ok: false, error: "Invalid request body" });

    if (body.action === "logout") {
      return jsonResponse(200, { ok: true }, { "Set-Cookie": clearSessionCookie(event) });
    }

    /* --- login --- */
    const user = process.env.ADMIN_USERNAME;
    const pass = process.env.ADMIN_PASSWORD;
    if (!user || !pass) {
      return jsonResponse(503, {
        ok: false,
        error: "Admin login is not configured (ADMIN_USERNAME / ADMIN_PASSWORD missing)."
      });
    }

    const ip = clientIp(event);
    if (throttled(ip)) {
      return jsonResponse(429, { ok: false, error: "Too many attempts. Try again in 15 minutes." });
    }

    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    const userOk = safeEqual(username, user);
    const passOk = safeEqual(password, pass);

    if (!userOk || !passOk) {
      await new Promise((r) => setTimeout(r, 300)); // slow down guessing
      return jsonResponse(401, { ok: false, error: "Invalid username or password" });
    }

    resetAttempts(ip);
    const token = signSession(username);
    return jsonResponse(
      200,
      { ok: true, username },
      { "Set-Cookie": sessionCookie(token, event) }
    );
  } catch (err) {
    console.error("admin-auth error:", err.message);
    return jsonResponse(500, { ok: false, error: "Authentication service error" });
  }
}
