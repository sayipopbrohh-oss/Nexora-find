/* ============================================================
   Nexora.Find — Local preview server (dev tool, not deployed)
   Emulates Netlify locally:
     • serves the static site from the repo root
     • routes /api/* to the real Netlify Function handlers
     • loads .env (same variables Netlify provides in production)
   Usage: node tools/preview-server.mjs   (PORT=8080 by default)
   ============================================================ */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/* ---- load .env (never override real env) ---- */
try {
  const envFile = fs.readFileSync(path.join(ROOT, ".env"), "utf8");
  for (const line of envFile.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
} catch { /* no .env — fine */ }

/* ---- function registry (mirrors the /api/* redirect in netlify.toml) ---- */
const FUNCTIONS = {
  "/api/orders": (await import("../netlify/functions/orders.mjs")).handler,
  "/api/admin-auth": (await import("../netlify/functions/admin-auth.mjs")).handler,
  "/api/order-status": (await import("../netlify/functions/order-status.mjs")).handler,
  "/api/health": (await import("../netlify/functions/health.mjs")).handler
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain"
};

const BLOCKED_PREFIXES = ["/netlify/", "/tools/", "/node_modules/", "/.env", "/.git", "/.pgdata"];

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  const pathname = decodeURIComponent(url.pathname);

  /* ---- API → Netlify Function handler ---- */
  if (pathname.startsWith("/api/")) {
    const handler = FUNCTIONS[pathname.replace(/\/+$/, "")];
    if (!handler) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: false, error: "No such API route" }));
    }
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 1_000_000) break; // 1MB cap
    }
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) headers[k.toLowerCase()] = v;
    headers["x-forwarded-proto"] = headers["x-forwarded-proto"] || "http";
    headers["x-forwarded-for"] = req.socket.remoteAddress || "127.0.0.1";

    const event = {
      httpMethod: req.method,
      path: pathname,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? null : body,
      queryStringParameters: Object.fromEntries(url.searchParams),
      isBase64Encoded: false
    };

    try {
      const result = await handler(event, {});
      const outHeaders = {};
      for (const [k, v] of Object.entries(result.headers || {})) outHeaders[k] = v;
      res.writeHead(result.statusCode || 200, outHeaders);
      res.end(result.body || "");
    } catch (err) {
      console.error("function error:", err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: "Internal server error" }));
    }
    return;
  }

  /* ---- static site ---- */
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405); return res.end("Method not allowed");
  }
  if (BLOCKED_PREFIXES.some((p) => pathname.startsWith(p))) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    return res.end("Not found");
  }

  let filePath = path.normalize(path.join(ROOT, pathname));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); return res.end("Forbidden");
  }
  try {
    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }
    if (!fs.existsSync(filePath)) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Not found");
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    if (req.method === "HEAD") return res.end();
    fs.createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(500); res.end("Server error");
  }
});

const PORT = Number(process.env.PORT || 8080);
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Nexora.Find preview → http://0.0.0.0:${PORT}`);
  console.log(`  storefront : /index.html`);
  console.log(`  admin login: /pages/admin-login.html`);
  console.log(`  api        : /api/orders, /api/admin-auth, /api/order-status, /api/health`);
  if (!process.env.DATABASE_URL) console.warn("  ⚠ DATABASE_URL not set — order creation will fail");
});
