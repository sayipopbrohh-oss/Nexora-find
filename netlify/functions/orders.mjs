/* ============================================================
   Nexora.Find — Orders API
   POST /api/orders        → public: create an order (checkout)
   GET  /api/orders        → admin only: list orders + stats
   Totals are always recomputed server-side from the trusted
   catalog (netlify/functions/_shared/products.mjs).
   ============================================================ */

import { ensureSchema, getPool } from "./_shared/db.mjs";
import { findProduct, FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from "./_shared/products.mjs";
import { jsonResponse, parseJsonBody, serializeOrder } from "./_shared/util.mjs";
import { requireAdmin } from "./_shared/session.mjs";

const VALID_PAYMENTS = new Set(["upi", "card", "cod"]);
const VALID_STATUSES = new Set(["pending", "confirmed", "shipped", "delivered", "cancelled"]);

export async function handler(event) {
  try {
    await ensureSchema();
    if (event.httpMethod === "OPTIONS") return jsonResponse(200, { ok: true });
    if (event.httpMethod === "POST") return await createOrder(event);
    if (event.httpMethod === "GET") return await listOrders(event);
    return jsonResponse(405, { ok: false, error: "Method not allowed" });
  } catch (err) {
    console.error("orders function error:", err.message);
    const unconfigured = /DATABASE_URL|ADMIN_SESSION_SECRET/.test(err.message);
    return jsonResponse(
      unconfigured ? 503 : 500,
      {
        ok: false,
        error: unconfigured
          ? "Order service is not configured yet. Please try again later."
          : "Something went wrong while saving your order. Please try again."
      }
    );
  }
}

/* ---------------- helpers ---------------- */

function cleanStr(v, max) {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

function normalizePhone(v) {
  let d = String(v || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return d;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function badRequest(msg) {
  return jsonResponse(400, { ok: false, error: msg });
}

/* ---------------- POST /api/orders ---------------- */

async function createOrder(event) {
  const body = parseJsonBody(event);
  if (!body) return badRequest("Invalid request body");

  const customerIn = body.customer || {};
  const shippingIn = body.shipping || {};

  // --- validate customer ---
  const name = cleanStr(customerIn.name, 80);
  const phone = normalizePhone(customerIn.phone);
  const email = cleanStr(customerIn.email, 120).toLowerCase();
  if (name.length < 2) return badRequest("Please enter your full name");
  if (!/^\d{10}$/.test(phone)) return badRequest("Please enter a valid 10-digit phone number");
  if (!EMAIL_RE.test(email)) return badRequest("Please enter a valid email address");

  // --- validate shipping ---
  const address = cleanStr(shippingIn.address, 200);
  const city = cleanStr(shippingIn.city, 60);
  const state = cleanStr(shippingIn.state, 60);
  const pincode = cleanStr(shippingIn.pincode, 6);
  const landmark = cleanStr(shippingIn.landmark, 80);
  if (address.length < 5) return badRequest("Please enter your address");
  if (city.length < 2) return badRequest("Please enter your city");
  if (state.length < 2) return badRequest("Please enter your state");
  if (!/^\d{6}$/.test(pincode)) return badRequest("Please enter a valid 6-digit pincode");

  // --- validate payment ---
  const paymentMethod = cleanStr(body.payment_method, 10).toLowerCase();
  if (!VALID_PAYMENTS.has(paymentMethod)) return badRequest("Please choose a payment method");

  // --- validate items & recompute prices server-side ---
  const rawItems = Array.isArray(body.items) ? body.items : [];
  if (rawItems.length < 1 || rawItems.length > 50) return badRequest("Your cart looks empty or invalid");

  const items = [];
  let subtotal = 0;
  for (const raw of rawItems) {
    const product = findProduct(cleanStr(raw?.id, 20));
    if (!product) return badRequest(`Unknown product in cart (${raw?.id || "?"})`);
    const qty = Number(raw?.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) return badRequest("Invalid quantity in cart");
    const variant = raw?.variant == null ? null : cleanStr(raw.variant, 40) || null;
    items.push({
      id: product.id,
      name: product.name,
      price: product.price,
      qty,
      variant,
      img: product.img
    });
    subtotal += product.price * qty;
  }

  const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = subtotal + shippingFee;

  // --- persist ---
  const pool = getPool();
  const inserted = await pool.query(
    `INSERT INTO orders (order_code, customer, shipping, items, payment_method, subtotal, shipping_fee, total)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, created_at`,
    [
      `TMP-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      JSON.stringify({ name, phone, email }),
      JSON.stringify({ address, city, state, pincode, landmark }),
      JSON.stringify(items),
      paymentMethod,
      subtotal,
      shippingFee,
      total
    ]
  );
  const id = Number(inserted.rows[0].id);
  const orderCode = `NXF-${100000 + id}`;
  await pool.query(`UPDATE orders SET order_code = $1 WHERE id = $2`, [orderCode, id]);

  return jsonResponse(
    201,
    {
      ok: true,
      orderId: orderCode,
      total,
      subtotal,
      shippingFee,
      items: items.length,
      status: "pending",
      createdAt: inserted.rows[0].created_at
    },
    { "Access-Control-Allow-Origin": "*" }
  );
}

/* ---------------- GET /api/orders (admin) ---------------- */

async function listOrders(event) {
  const auth = requireAdmin(event);
  if (!auth.ok) {
    return jsonResponse(401, { ok: false, error: "Admin authentication required" });
  }

  const qs = event.queryStringParameters || {};
  const q = cleanStr(qs.q, 80);
  const status = VALID_STATUSES.has(qs.status) ? qs.status : null;
  const limit = Math.min(Math.max(parseInt(qs.limit, 10) || 100, 1), 500);
  const offset = Math.max(parseInt(qs.offset, 10) || 0, 0);

  const pool = getPool();
  const where = [];
  const params = [];
  if (status) {
    params.push(status);
    where.push(`status = $${params.length}`);
  }
  if (q) {
    const like = `%${q}%`;
    params.push(like);
    const n = params.length;
    where.push(
      `(order_code ILIKE $${n} OR customer->>'name' ILIKE $${n} OR customer->>'phone' ILIKE $${n} OR customer->>'email' ILIKE $${n} OR shipping->>'city' ILIKE $${n})`
    );
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  params.push(limit, offset);

  const [listRes, statsRes] = await Promise.all([
    pool.query(
      `SELECT * FROM orders ${whereSql} ORDER BY created_at DESC, id DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    ),
    pool.query(`
      SELECT COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE status = 'pending')::int   AS pending,
             COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed,
             COUNT(*) FILTER (WHERE status = 'shipped')::int   AS shipped,
             COUNT(*) FILTER (WHERE status = 'delivered')::int AS delivered,
             COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
             COALESCE(SUM(total) FILTER (WHERE status <> 'cancelled'), 0)::bigint AS revenue
      FROM orders
    `)
  ]);

  const s = statsRes.rows[0];
  return jsonResponse(200, {
    ok: true,
    orders: listRes.rows.map(serializeOrder),
    stats: {
      total: s.total,
      byStatus: {
        pending: s.pending,
        confirmed: s.confirmed,
        shipped: s.shipped,
        delivered: s.delivered,
        cancelled: s.cancelled
      },
      revenue: Number(s.revenue)
    }
  });
}
