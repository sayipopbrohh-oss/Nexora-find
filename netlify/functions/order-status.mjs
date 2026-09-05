/* ============================================================
   Nexora.Find — Order Status API (admin only)
   POST /api/order-status { orderId, status }
   orderId: numeric DB id or order code ("NXF-100001")
   status:  pending | confirmed | shipped | delivered | cancelled
   ============================================================ */

import { ensureSchema, getPool } from "./_shared/db.mjs";
import { jsonResponse, parseJsonBody, serializeOrder } from "./_shared/util.mjs";
import { requireAdmin } from "./_shared/session.mjs";

const VALID_STATUSES = new Set(["pending", "confirmed", "shipped", "delivered", "cancelled"]);

export async function handler(event) {
  try {
    if (event.httpMethod === "OPTIONS") return jsonResponse(200, { ok: true });
    if (event.httpMethod !== "POST") {
      return jsonResponse(405, { ok: false, error: "Method not allowed" });
    }

    const auth = requireAdmin(event);
    if (!auth.ok) {
      return jsonResponse(401, { ok: false, error: "Admin authentication required" });
    }

    const body = parseJsonBody(event);
    if (!body) return jsonResponse(400, { ok: false, error: "Invalid request body" });

    const status = String(body.status || "").trim().toLowerCase();
    if (!VALID_STATUSES.has(status)) {
      return jsonResponse(400, { ok: false, error: "Invalid status" });
    }

    const orderId = body.orderId;
    const isNumeric = Number.isInteger(Number(orderId)) && Number(orderId) > 0;
    if (!isNumeric && typeof orderId !== "string") {
      return jsonResponse(400, { ok: false, error: "orderId is required" });
    }

    await ensureSchema();
    const pool = getPool();
    const res = await pool.query(
      `UPDATE orders
          SET status = $1, updated_at = now()
        WHERE id::text = $2 OR order_code = $2
        RETURNING *`,
      [status, String(orderId)]
    );

    if (res.rowCount === 0) {
      return jsonResponse(404, { ok: false, error: "Order not found" });
    }

    return jsonResponse(200, { ok: true, order: serializeOrder(res.rows[0]) });
  } catch (err) {
    console.error("order-status error:", err.message);
    return jsonResponse(500, { ok: false, error: "Could not update order status" });
  }
}
