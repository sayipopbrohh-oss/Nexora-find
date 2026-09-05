/* ============================================================
   Nexora.Find — Function utilities (responses, body parsing,
   order serialization)
   ============================================================ */

export function jsonResponse(statusCode, data, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders
    },
    body: JSON.stringify(data)
  };
}

export function parseJsonBody(event) {
  try {
    const raw = event?.isBase64Encoded
      ? Buffer.from(event.body || "", "base64").toString("utf8")
      : event?.body;
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clientIp(event) {
  const fwd = event?.headers?.["x-forwarded-for"];
  if (fwd) return String(fwd).split(",")[0].trim();
  return "unknown";
}

/** Consistent order shape for every API consumer (admin dashboard). */
export function serializeOrder(r) {
  return {
    id: Number(r.id),
    orderCode: r.order_code,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    status: r.status,
    customer: r.customer,
    shipping: r.shipping,
    items: r.items,
    paymentMethod: r.payment_method,
    subtotal: r.subtotal,
    shippingFee: r.shipping_fee,
    total: Number(r.total)
  };
}
