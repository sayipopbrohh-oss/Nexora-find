/* ============================================================
   Nexora.Find — Admin session helpers
   HMAC-signed, expiring session token stored in an HttpOnly
   cookie. Uses only node:crypto — no extra dependencies.
   Env: ADMIN_SESSION_SECRET (min 16 chars, 32+ recommended)
   ============================================================ */

import crypto from "node:crypto";

export const COOKIE_NAME = "nxf_admin";
const TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function getSecret() {
  const s = process.env.ADMIN_SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("ADMIN_SESSION_SECRET is not set or too short (min 16 chars).");
  }
  return s;
}

function hmac(data) {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("base64url");
}

export function signSession(username) {
  const payload = Buffer.from(
    JSON.stringify({ u: username, exp: Date.now() + TTL_MS })
  ).toString("base64url");
  return `${payload}.${hmac(payload)}`;
}

export function verifySession(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = hmac(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data || typeof data.u !== "string" || typeof data.exp !== "number") return null;
    if (data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function parseCookies(header) {
  const out = {};
  String(header || "")
    .split(";")
    .forEach((pair) => {
      const i = pair.indexOf("=");
      if (i > 0) {
        out[pair.slice(0, i).trim()] = decodeURIComponent(pair.slice(i + 1).trim());
      }
    });
  return out;
}

function isSecureRequest(event) {
  const proto = event?.headers?.["x-forwarded-proto"] || "";
  return proto.split(",")[0].trim() === "https";
}

export function sessionCookie(token, event) {
  const parts = [
    `${COOKIE_NAME}=${token}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${Math.floor(TTL_MS / 1000)}`
  ];
  if (isSecureRequest(event)) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(event) {
  const parts = [`${COOKIE_NAME}=`, "HttpOnly", "Path=/", "SameSite=Lax", "Max-Age=0"];
  if (isSecureRequest(event)) parts.push("Secure");
  return parts.join("; ");
}

/** Returns { ok:true, username } or { ok:false } (caller produces the 401). */
export function requireAdmin(event) {
  try {
    const cookies = parseCookies(event?.headers?.cookie || event?.headers?.Cookie);
    const session = verifySession(cookies[COOKIE_NAME]);
    if (session) return { ok: true, username: session.u };
    return { ok: false };
  } catch {
    return { ok: false };
  }
}
