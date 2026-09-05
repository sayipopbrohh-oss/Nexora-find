/* ============================================================
   Nexora.Find — Admin shared utilities
   Used by pages/admin-login.html and pages/admin-orders.html.
   No external dependencies; talks to /api/* Netlify Functions.
   ============================================================ */

const AdminAPI = {
  async request(path, opts = {}) {
    const init = { method: opts.method || "GET", credentials: "same-origin", headers: {} };
    if (opts.body) {
      init.headers["Content-Type"] = "application/json";
      init.body = opts.body;
    }
    const res = await fetch(path, init);

    // Session expired on a protected route → back to login.
    if (res.status === 401 && !path.includes("admin-auth")) {
      location.replace("admin-login.html");
      throw new Error("Session expired — please sign in again.");
    }

    let data = null;
    try { data = await res.json(); } catch { data = null; }

    if (!res.ok) {
      const err = new Error((data && data.error) || `Request failed (${res.status})`);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  },

  session() {
    return this.request("/api/admin-auth");
  },
  login(username, password) {
    return this.request("/api/admin-auth", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
  },
  logout() {
    return this.request("/api/admin-auth", {
      method: "POST",
      body: JSON.stringify({ action: "logout" })
    });
  },
  orders(params = {}) {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v !== "" && v != null)
    ).toString();
    return this.request("/api/orders" + (qs ? "?" + qs : ""));
  },
  setStatus(orderId, status) {
    return this.request("/api/order-status", {
      method: "POST",
      body: JSON.stringify({ orderId, status })
    });
  },

  /** Redirects to login unless an admin session is active. Returns session or null. */
  async requireSession() {
    try {
      const s = await this.session();
      if (s && s.authenticated) return s;
    } catch (e) {
      /* fall through to redirect */
    }
    location.replace("admin-login.html");
    return null;
  }
};

/* ---------- status metadata (shared across table, cards, drawer) ---------- */
const ORDER_STATUS = {
  pending:   { label: "Pending" },
  confirmed: { label: "Confirmed" },
  shipped:   { label: "Shipped" },
  delivered: { label: "Delivered" },
  cancelled: { label: "Cancelled" }
};
const STATUS_FLOW = ["pending", "confirmed", "shipped", "delivered"];

function statusBadge(status) {
  const meta = ORDER_STATUS[status] || { label: status };
  return `<span class="badge badge-${NxfFmt.esc(status)}">${NxfFmt.esc(meta.label)}</span>`;
}

/* ---------- formatters ---------- */
const NxfFmt = {
  esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[c]));
  },
  inr(n) {
    return "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
  },
  dateTime(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "—";
    return d.toLocaleString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true
    });
  },
  dayShort(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return "—";
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  },
  ago(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    if (isNaN(diff)) return "";
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return m + "m ago";
    const h = Math.floor(m / 60);
    if (h < 24) return h + "h ago";
    const d = Math.floor(h / 24);
    if (d < 30) return d + "d ago";
    return NxfFmt.dayShort(iso);
  },
  initials(name) {
    const parts = String(name || "?").trim().split(/\s+/).slice(0, 2);
    return parts.map((p) => p[0] ? p[0].toUpperCase() : "").join("") || "?";
  },
  payLabel(method) {
    return { upi: "UPI", card: "Card", cod: "COD" }[method] || String(method || "—").toUpperCase();
  },
  phoneHref(digits) {
    return "tel:+91" + String(digits || "").replace(/\D/g, "");
  }
};

/* ---------- toast ---------- */
function nxfToast(message, type = "ok") {
  let root = document.getElementById("toast-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "toast-root";
    document.body.appendChild(root);
  }
  const el = document.createElement("div");
  el.className = "adm-toast" + (type === "err" ? " err" : "");
  const icon = type === "err"
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4.5M12 16h.01"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>';
  el.innerHTML = icon + "<span>" + NxfFmt.esc(message) + "</span>";
  root.innerHTML = "";
  root.appendChild(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("show")));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 400);
  }, 2800);
}

/* ---------- inline SVG icons (stroke style, matches storefront) ---------- */
const NxfIcon = {
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3 8l9 5 9-5M12 13v8"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  truck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1 6h13v10H1zM14 9h4l3 3v4h-7"/><circle cx="6" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/></svg>',
  rupee: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 4h10M7 8.5h10M16.5 4c0 3-2.2 4.5-5.5 4.5H7l8 8.5"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.8-3.8"/></svg>',
  refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 12a9 9 0 1 1-2.6-6.3M21 3v6h-6"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="4.5" y="10" width="15" height="10.5" rx="2.5"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="4.5" width="19" height="15" rx="2.5"/><path d="M3 7l9 6 9-6"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7-5.6-7-11a7 7 0 0 1 14 0c0 5.4-7 11-7 11z"/><circle cx="12" cy="10" r="2.6"/></svg>',
  card: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M20 6L9 17l-5-5"/></svg>',
  ban: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 8v4.5M12 16h.01"/></svg>',
  arrowLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>',
  arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>',
  chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M17.9 17.9A10.6 10.6 0 0 1 12 19.5C5.5 19.5 1.5 12 1.5 12a19 19 0 0 1 5.1-6.4M9.9 5.2A10.7 10.7 0 0 1 12 5c6.5 0 10.5 7 10.5 7a19 19 0 0 1-2.6 3.9M9.9 9.9a3 3 0 0 0 4.2 4.2M1.5 1.5l21 21"/></svg>'
};
