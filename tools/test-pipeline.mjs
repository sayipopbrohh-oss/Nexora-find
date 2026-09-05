/* ============================================================
   Nexora.Find — End-to-end pipeline test (dev tool)
   Exercises: checkout POST → Postgres → admin auth → list/search
   → status updates, by invoking the REAL function handlers.
   Also seeds a few demo orders so the admin preview looks alive.
   Usage: node tools/test-pipeline.mjs
   ============================================================ */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/* load .env */
for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
  if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const { handler: ordersHandler } = await import("../netlify/functions/orders.mjs");
const { handler: authHandler } = await import("../netlify/functions/admin-auth.mjs");
const { handler: statusHandler } = await import("../netlify/functions/order-status.mjs");
const { handler: healthHandler } = await import("../netlify/functions/health.mjs");

let pass = 0, fail = 0;
function check(name, cond, extra = "") {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.log(`  ❌ ${name} ${extra}`); }
}

async function invoke(handler, { method = "GET", body = null, query = {}, headers = {} } = {}) {
  const res = await handler({
    httpMethod: method,
    path: "/api/x",
    headers: { "content-type": "application/json", ...headers },
    body: body == null ? null : JSON.stringify(body),
    queryStringParameters: query,
    isBase64Encoded: false
  }, {});
  let data = null;
  try { data = JSON.parse(res.body); } catch { /* ignore */ }
  return { status: res.statusCode, data, headers: res.headers || {} };
}

function cookieFrom(res) {
  const sc = res.headers["Set-Cookie"] || res.headers["set-cookie"];
  return sc ? String(Array.isArray(sc) ? sc[0] : sc).split(";")[0] : null;
}

const validOrder = (over = {}) => ({
  customer: { name: "Aditi Sharma", phone: "9876543210", email: "aditi@example.com" },
  shipping: { address: "12 Marine Drive, Fort", city: "Mumbai", state: "Maharashtra", pincode: "400001", landmark: "Near GPO" },
  payment_method: "upi",
  items: [{ id: "nx-001", qty: 1, variant: "Onyx Black" }, { id: "nx-008", qty: 2, variant: null }],
  ...over
});

console.log("\n═══ Nexora.Find pipeline test ═══\n");

/* ---------- health ---------- */
{
  const r = await invoke(healthHandler);
  check("GET /api/health → 200 ok", r.status === 200 && r.data.status === "ok");
}

/* ---------- create orders ---------- */
let created;
{
  const r = await invoke(ordersHandler, { method: "POST", body: validOrder() });
  created = r.data;
  check("POST /api/orders → 201", r.status === 201 && r.data.ok === true, JSON.stringify(r.data));
  check("real order code issued (NXF-1000xx)", /^NXF-\d{6}$/.test(r.data?.orderId || ""), r.data?.orderId);
  // 2499*1 + 649*2 = 3797 ≥ 999 → free shipping
  check("server-computed total = ₹3,797 (free shipping)", r.data?.total === 3797, `got ${r.data?.total}`);
}
{
  // small order → shipping fee applies; client-sent price/totals must be ignored
  const r = await invoke(ordersHandler, {
    method: "POST",
    body: validOrder({ items: [{ id: "nx-008", qty: 1, price: 1, variant: "Black" }] })
  });
  check("tampered client price ignored → ₹649 + ₹79 shipping = ₹728", r.data?.total === 728, `got ${r.data?.total}`);
}
{
  const r = await invoke(ordersHandler, { method: "POST", body: validOrder({ customer: { name: "X", phone: "123", email: "bad" } }) });
  check("invalid customer data → 400", r.status === 400);
}
{
  const r = await invoke(ordersHandler, { method: "POST", body: validOrder({ items: [{ id: "nx-999", qty: 1 }] }) });
  check("unknown product id → 400", r.status === 400);
}
{
  const r = await invoke(ordersHandler, { method: "POST", body: validOrder({ shipping: { address: "12 MG Road", city: "Kochi", state: "Kerala", pincode: "6820" } }) });
  check("invalid pincode → 400", r.status === 400);
}

/* ---------- admin auth ---------- */
let cookie;
{
  const r = await invoke(ordersHandler, { method: "GET" });
  check("GET /api/orders without session → 401", r.status === 401);
}
{
  const r = await invoke(authHandler, { method: "POST", body: { username: "admin", password: "wrong-password" } });
  check("login with wrong password → 401", r.status === 401);
}
{
  const r = await invoke(authHandler, { method: "POST", body: { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD } });
  cookie = cookieFrom(r);
  check("login with correct credentials → 200 + session cookie", r.status === 200 && !!cookie);
}
{
  const r = await invoke(authHandler, { headers: { cookie } });
  check("GET session check → authenticated", r.status === 200 && r.data.authenticated === true);
}

/* ---------- list / search / filter ---------- */
{
  const r = await invoke(ordersHandler, { headers: { cookie } });
  check("GET /api/orders (admin) → 200 with orders + stats", r.status === 200 && Array.isArray(r.data.orders) && !!r.data.stats);
  check("created order is in the list", r.data.orders.some((o) => o.orderCode === created.orderId));
  const s = r.data.stats;
  const sum = Object.values(s.byStatus).reduce((a, b) => a + b, 0);
  check("stats consistent (total = sum of statuses)", s.total === sum, `${s.total} vs ${sum}`);
}
{
  const r = await invoke(ordersHandler, { headers: { cookie }, query: { q: "aditi" } });
  check("search q=aditi finds the order", r.data.orders.some((o) => o.orderCode === created.orderId));
}
{
  const r = await invoke(ordersHandler, { headers: { cookie }, query: { status: "pending" } });
  check("status filter → only pending", r.data.orders.every((o) => o.status === "pending"));
}

/* ---------- status updates ---------- */
{
  const r0 = await invoke(statusHandler, { method: "POST", body: { orderId: created.orderId, status: "confirmed" }, headers: { cookie } });
  check("pending → confirmed", r0.status === 200 && r0.data.order.status === "confirmed");
  const r1 = await invoke(statusHandler, { method: "POST", body: { orderId: created.orderId, status: "shipped" }, headers: { cookie } });
  check("confirmed → shipped", r1.status === 200 && r1.data.order.status === "shipped");
  const r2 = await invoke(statusHandler, { method: "POST", body: { orderId: created.orderId, status: "delivered" }, headers: { cookie } });
  check("shipped → delivered", r2.status === 200 && r2.data.order.status === "delivered");
  const r3 = await invoke(statusHandler, { method: "POST", body: { orderId: created.orderId, status: "hacked" }, headers: { cookie } });
  check("invalid status → 400", r3.status === 400);
  const r4 = await invoke(statusHandler, { method: "POST", body: { orderId: created.orderId, status: "pending" } });
  check("status update without session → 401", r4.status === 401);
  const r5 = await invoke(statusHandler, { method: "POST", body: { orderId: "NXF-999999", status: "pending" }, headers: { cookie } });
  check("unknown order → 404", r5.status === 404);
}

/* ---------- logout ---------- */
{
  const r = await invoke(authHandler, { method: "POST", body: { action: "logout" }, headers: { cookie } });
  check("logout → 200 + cookie cleared", r.status === 200 && /Max-Age=0/.test(String(r.headers["Set-Cookie"] || "")));
}

/* ---------- demo seed data (for the preview dashboard) ---------- */
console.log("\n  Seeding demo orders for the preview dashboard…");
const seeds = [
  { customer: { name: "Rohan Verma", phone: "9812345678", email: "rohan.v@example.com" }, shipping: { address: "44 Residency Road", city: "Bengaluru", state: "Karnataka", pincode: "560025" }, payment_method: "cod", items: [{ id: "nx-002", qty: 1, variant: "Matte Black" }], status: "pending" },
  { customer: { name: "Sneha Pillai", phone: "9745612308", email: "sneha.p@example.com" }, shipping: { address: "Panambilly Nagar, Phase 2", city: "Kochi", state: "Kerala", pincode: "682036", landmark: "Behind SBI" }, payment_method: "upi", items: [{ id: "nx-003", qty: 1, variant: "Sand" }, { id: "nx-006", qty: 1, variant: "Tortoise" }], status: "pending" },
  { customer: { name: "Kabir Mehta", phone: "9930012345", email: "kabir@example.com" }, shipping: { address: "7 Hill Road, Bandra West", city: "Mumbai", state: "Maharashtra", pincode: "400050" }, payment_method: "card", items: [{ id: "nx-005", qty: 1, variant: "Black" }, { id: "nx-004", qty: 2, variant: "Slate" }], status: "confirmed" },
  { customer: { name: "Ishita Nair", phone: "9061234567", email: "ishita.nair@example.com" }, shipping: { address: "Sasthamangalam, House 12", city: "Thiruvananthapuram", state: "Kerala", pincode: "695010" }, payment_method: "upi", items: [{ id: "nx-007", qty: 2, variant: "Walnut" }], status: "shipped" },
  { customer: { name: "Arjun Rao", phone: "9849012345", email: "arjun.rao@example.com" }, shipping: { address: "Jubilee Hills, Road 36", city: "Hyderabad", state: "Telangana", pincode: "500033" }, payment_method: "cod", items: [{ id: "nx-008", qty: 3, variant: "Silver" }], status: "delivered" },
  { customer: { name: "Meera Krishnan", phone: "9781234560", email: "meera.k@example.com" }, shipping: { address: "18 North Usman Road, T. Nagar", city: "Chennai", state: "Tamil Nadu", pincode: "600017" }, payment_method: "upi", items: [{ id: "nx-001", qty: 1, variant: "Pearl White" }], status: "cancelled" }
];
{
  const r = await invoke(authHandler, { method: "POST", body: { username: process.env.ADMIN_USERNAME, password: process.env.ADMIN_PASSWORD } });
  const c = cookieFrom(r);
  for (const seed of seeds) {
    const { status, ...payload } = seed;
    const createdRes = await invoke(ordersHandler, { method: "POST", body: payload });
    if (createdRes.status === 201 && status !== "pending") {
      await invoke(statusHandler, { method: "POST", body: { orderId: createdRes.data.orderId, status }, headers: { cookie: c } });
    }
  }
  const list = await invoke(ordersHandler, { headers: { cookie: c } });
  check("seed data present (≥ 6 orders, all 5 statuses)", list.data.stats.total >= 6 &&
    ["pending", "confirmed", "shipped", "delivered", "cancelled"].every((st) => list.data.stats.byStatus[st] >= 1),
    JSON.stringify(list.data?.stats));
}

console.log(`\n═══ Results: ${pass} passed, ${fail} failed ═══\n`);
process.exit(fail ? 1 : 0);
