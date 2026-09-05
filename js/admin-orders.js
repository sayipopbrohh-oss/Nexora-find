/* ============================================================
   Nexora.Find — Admin Orders dashboard logic
   Loaded by pages/admin-orders.html. Depends on js/admin.js.
   ============================================================ */

(function () {
  const esc = NxfFmt.esc;

  const state = {
    orders: [],
    stats: null,
    q: "",
    status: "",
    loading: true,
    drawerOrder: null,
    session: null
  };

  const el = {
    stats: document.getElementById("stats"),
    pills: document.getElementById("pills"),
    search: document.getElementById("search-input"),
    searchWrap: document.getElementById("search-wrap"),
    searchClear: document.getElementById("search-clear"),
    resultCount: document.getElementById("result-count"),
    refreshBtn: document.getElementById("refresh-btn"),
    tableWrap: document.getElementById("table-wrap"),
    cardsWrap: document.getElementById("cards-wrap"),
    errorBanner: document.getElementById("error-banner"),
    errorText: document.getElementById("error-text"),
    errorRetry: document.getElementById("error-retry"),
    overlay: document.getElementById("overlay"),
    drawer: document.getElementById("drawer"),
    logoutBtn: document.getElementById("logout-btn"),
    userChip: document.getElementById("adm-user")
  };

  /* ================= boot ================= */

  document.addEventListener("DOMContentLoaded", async () => {
    const session = await AdminAPI.requireSession();
    if (!session) return; // redirected to login
    state.session = session;
    if (el.userChip) {
      el.userChip.querySelector(".uname").textContent = session.username || "admin";
      el.userChip.querySelector(".adm-avatar").textContent = NxfFmt.initials(session.username || "admin");
    }
    bindEvents();
    await load();
  });

  function bindEvents() {
    let t = null;
    el.search.addEventListener("input", () => {
      el.searchWrap.classList.toggle("has-value", !!el.search.value);
      clearTimeout(t);
      t = setTimeout(() => { state.q = el.search.value.trim(); load(); }, 350);
    });
    el.searchClear.addEventListener("click", () => {
      el.search.value = "";
      el.searchWrap.classList.remove("has-value");
      state.q = "";
      load();
      el.search.focus();
    });
    el.refreshBtn.addEventListener("click", () => load(true));
    el.errorRetry.addEventListener("click", () => load());
    el.logoutBtn.addEventListener("click", async () => {
      try { await AdminAPI.logout(); } catch { /* ignore */ }
      location.replace("admin-login.html");
    });
    el.overlay.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });
  }

  /* ================= data ================= */

  async function load(spin) {
    state.loading = true;
    if (spin) el.refreshBtn.classList.add("spinning");
    el.errorBanner.hidden = true;
    renderSkeleton();
    try {
      const data = await AdminAPI.orders({ q: state.q, status: state.status });
      state.orders = data.orders || [];
      state.stats = data.stats || null;
      renderStats();
      renderPills();
      renderOrders();
    } catch (err) {
      el.errorText.textContent = err.message || "Could not load orders.";
      el.errorBanner.hidden = false;
    } finally {
      state.loading = false;
      el.refreshBtn.classList.remove("spinning");
    }
  }

  /* ================= stats ================= */

  const STAT_META = [
    { key: "total",     label: "Total Orders", icon: "box",    tint: "#232326", tintBg: "rgba(10,10,11,.07)" },
    { key: "pending",   label: "Pending",      icon: "clock",  tint: "#8a6a23", tintBg: "rgba(201,169,97,.16)" },
    { key: "shipped",   label: "Shipped",      icon: "truck",  tint: "#2f4f85", tintBg: "rgba(58,95,158,.12)" },
    { key: "revenue",   label: "Revenue",      icon: "rupee",  tint: "#256b41", tintBg: "rgba(46,125,79,.13)" }
  ];

  function renderStats() {
    const s = state.stats;
    if (!s) return;
    el.stats.innerHTML = STAT_META.map((m) => {
      const value = m.key === "revenue" ? NxfFmt.inr(s.revenue) : (s.byStatus && s.byStatus[m.key] != null ? s.byStatus[m.key] : s[m.key]);
      const sub = {
        total: `<strong>${s.byStatus.delivered}</strong> delivered · <strong>${s.byStatus.cancelled}</strong> cancelled`,
        pending: "awaiting confirmation",
        shipped: "in transit right now",
        revenue: "excluding cancelled orders"
      }[m.key];
      return `
        <div class="adm-stat" style="--tint:${m.tint};--tint-bg:${m.tintBg}">
          <div class="adm-stat-top">
            <span class="adm-stat-label">${m.label}</span>
            <span class="adm-stat-icon">${NxfIcon[m.icon]}</span>
          </div>
          <div class="adm-stat-value">${m.key === "revenue" ? esc(value) : (value ?? "—")}</div>
          <div class="adm-stat-sub">${sub}</div>
        </div>`;
    }).join("");
  }

  /* ================= filter pills ================= */

  function renderPills() {
    const s = state.stats;
    if (!s) return;
    const defs = [
      { key: "", label: "All", n: s.total },
      { key: "pending", label: "Pending", n: s.byStatus.pending },
      { key: "confirmed", label: "Confirmed", n: s.byStatus.confirmed },
      { key: "shipped", label: "Shipped", n: s.byStatus.shipped },
      { key: "delivered", label: "Delivered", n: s.byStatus.delivered },
      { key: "cancelled", label: "Cancelled", n: s.byStatus.cancelled }
    ];
    el.pills.innerHTML = defs.map((d) => `
      <button class="adm-pill${state.status === d.key ? " active" : ""}" data-status="${d.key}">
        ${d.label}<span class="n">${d.n}</span>
      </button>`).join("");
    el.pills.querySelectorAll(".adm-pill").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.status = btn.dataset.status;
        renderPills();
        load();
      });
    });
  }

  /* ================= orders: table + mobile cards ================= */

  function renderSkeleton() {
    if (state.orders.length) return; // keep old rows while refreshing
    const rows = Array.from({ length: 5 }, () => `
      <div class="adm-skel-row">
        <div class="skel" style="width:34px;height:34px;border-radius:50%"></div>
        <div class="skel" style="width:110px;height:14px"></div>
        <div class="skel" style="width:150px;height:14px"></div>
        <div class="skel" style="width:90px;height:14px"></div>
        <div class="skel" style="width:100px;height:24px;border-radius:999px"></div>
        <div class="skel" style="width:70px;height:14px;margin-left:auto"></div>
      </div>`).join("");
    el.tableWrap.innerHTML = rows;
    el.cardsWrap.innerHTML = "";
    el.resultCount.textContent = "";
  }

  function renderOrders() {
    const orders = state.orders;
    el.resultCount.textContent =
      (state.q || state.status)
        ? `${orders.length} result${orders.length === 1 ? "" : "s"}`
        : `${orders.length} order${orders.length === 1 ? "" : "s"}`;

    if (!orders.length) {
      const filtered = !!(state.q || state.status);
      const empty = `
        <div class="adm-empty">
          <div class="adm-empty-icon">${NxfIcon.box}</div>
          <h3>${filtered ? "No matching orders" : "No orders yet"}</h3>
          <p>${filtered
            ? "Try a different search term or clear the status filter."
            : "When customers place orders on the storefront, they'll appear here instantly."}</p>
          ${filtered ? '<button class="adm-btn adm-btn-outline adm-btn-sm" id="clear-filters" style="margin-top:18px">Clear filters</button>' : ""}
        </div>`;
      el.tableWrap.innerHTML = empty;
      el.cardsWrap.innerHTML = "";
      const cf = document.getElementById("clear-filters");
      if (cf) cf.addEventListener("click", () => {
        state.q = ""; state.status = "";
        el.search.value = ""; el.searchWrap.classList.remove("has-value");
        renderPills(); load();
      });
      return;
    }

    /* desktop table */
    el.tableWrap.innerHTML = `
      <div class="adm-table-scroll">
        <table class="adm-table">
          <thead>
            <tr>
              <th>Order</th><th>Customer</th><th>Destination</th><th>Items</th>
              <th>Payment</th><th>Status</th><th>Total</th><th></th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(rowHtml).join("")}
          </tbody>
        </table>
      </div>`;

    /* mobile cards */
    el.cardsWrap.innerHTML = orders.map((o, i) => `
      <div class="adm-ocard" data-id="${o.id}" style="animation-delay:${Math.min(i * 35, 350)}ms">
        <div class="adm-ocard-top">
          <span class="adm-code">${esc(o.orderCode)}</span>
          ${statusBadge(o.status)}
        </div>
        <div class="adm-ocard-grid">
          <div><div class="adm-ocard-k">Customer</div><div class="adm-ocard-v">${esc(o.customer.name)}<small>${esc(o.customer.phone)}</small></div></div>
          <div><div class="adm-ocard-k">Destination</div><div class="adm-ocard-v">${esc(o.shipping.city)}<small>${esc(o.shipping.state)} · ${esc(o.shipping.pincode)}</small></div></div>
          <div><div class="adm-ocard-k">Placed</div><div class="adm-ocard-v">${esc(NxfFmt.ago(o.createdAt))}<small>${esc(NxfFmt.dayShort(o.createdAt))}</small></div></div>
          <div><div class="adm-ocard-k">Items · Payment</div><div class="adm-ocard-v">${itemCount(o)} · ${esc(NxfFmt.payLabel(o.paymentMethod))}</div></div>
        </div>
        <div class="adm-ocard-foot">
          <span class="adm-ocard-total">${esc(NxfFmt.inr(o.total))}</span>
          <span class="adm-view">View details ${NxfIcon.chevronRight}</span>
        </div>
      </div>`).join("");

    /* row / card click → drawer */
    el.tableWrap.querySelectorAll("tbody tr").forEach((tr) => {
      tr.addEventListener("click", () => openDrawer(Number(tr.dataset.id)));
    });
    el.cardsWrap.querySelectorAll(".adm-ocard").forEach((c) => {
      c.addEventListener("click", () => openDrawer(Number(c.dataset.id)));
    });
  }

  function itemCount(o) {
    return (o.items || []).reduce((s, i) => s + (Number(i.qty) || 0), 0);
  }

  function rowHtml(o) {
    const first = (o.items && o.items[0]) || {};
    const extra = o.items.length > 1 ? `+${o.items.length - 1} more` : `Qty ${first.qty || 1}`;
    return `
      <tr data-id="${o.id}">
        <td>
          <div class="adm-code">${esc(o.orderCode)}</div>
          <div class="adm-date" title="${esc(NxfFmt.dateTime(o.createdAt))}">${esc(NxfFmt.ago(o.createdAt))}</div>
        </td>
        <td>
          <div class="adm-cust">
            <span class="adm-cust-avatar">${esc(NxfFmt.initials(o.customer.name))}</span>
            <span style="min-width:0">
              <span class="adm-cust-name">${esc(o.customer.name)}</span>
              <span class="adm-cust-phone">${esc(o.customer.phone)}</span>
            </span>
          </div>
        </td>
        <td><div class="adm-city">${esc(o.shipping.city)}<small>${esc(o.shipping.state)} · ${esc(o.shipping.pincode)}</small></div></td>
        <td>
          <div class="adm-items-cell">
            <img class="adm-thumb" src="${esc(first.img || "")}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
            <span style="min-width:0">
              <span class="adm-items-name">${esc(first.name || "—")}</span>
              <span class="adm-items-more">${esc(extra)}</span>
            </span>
          </div>
        </td>
        <td><span class="pay-chip">${NxfIcon.card}${esc(NxfFmt.payLabel(o.paymentMethod))}</span></td>
        <td>${statusBadge(o.status)}</td>
        <td><span class="adm-total">${esc(NxfFmt.inr(o.total))}</span></td>
        <td><span class="adm-view">View ${NxfIcon.chevronRight}</span></td>
      </tr>`;
  }

  /* ================= drawer ================= */

  function openDrawer(id) {
    const order = state.orders.find((o) => o.id === id);
    if (!order) return;
    state.drawerOrder = order;
    el.drawer.innerHTML = drawerHtml(order);
    el.overlay.hidden = false;
    el.drawer.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.overlay.classList.add("open");
      el.drawer.classList.add("open");
    }));
    bindDrawerEvents(order);
  }

  function closeDrawer() {
    if (el.drawer.hidden) return;
    el.overlay.classList.remove("open");
    el.drawer.classList.remove("open");
    document.body.style.overflow = "";
    state.drawerOrder = null;
    setTimeout(() => { el.drawer.hidden = true; el.overlay.hidden = true; }, 380);
  }

  function drawerHtml(o) {
    const c = o.customer, s = o.shipping;
    const stepIdx = STATUS_FLOW.indexOf(o.status);
    const stepper = o.status === "cancelled"
      ? `<div class="adm-cancelled-note">${NxfIcon.ban} This order was cancelled.</div>`
      : `<div class="adm-stepper">${STATUS_FLOW.map((st, i) => `
          <div class="adm-step ${i < stepIdx ? "done" : i === stepIdx ? "current" : ""}">
            <span class="adm-step-dot">${i < stepIdx ? NxfIcon.check : ""}</span>
            <span class="adm-step-label">${ORDER_STATUS[st].label}</span>
          </div>`).join("")}</div>`;

    const itemsHtml = o.items.map((it) => `
      <div class="adm-item">
        <img src="${esc(it.img || "")}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
        <div class="adm-item-info">
          <div class="adm-item-name">${esc(it.name)}</div>
          <div class="adm-item-variant">${it.variant ? esc(it.variant) + " · " : ""}${esc(it.id ? it.id.toUpperCase() : "")}</div>
        </div>
        <div class="adm-item-right">
          <div class="adm-item-price">${esc(NxfFmt.inr((it.price || 0) * (it.qty || 0)))}</div>
          <div class="adm-item-qty">${it.qty} × ${esc(NxfFmt.inr(it.price))}</div>
        </div>
      </div>`).join("");

    return `
      <div class="adm-drawer-head">
        <div class="adm-drawer-head-top">
          <div class="adm-drawer-title">
            <div class="row1">
              <h2>${esc(o.orderCode)}</h2>
              <button class="adm-copy-btn" id="copy-code" title="Copy order code" aria-label="Copy order code">${NxfIcon.copy}</button>
              ${statusBadge(o.status)}
            </div>
            <div class="adm-drawer-meta">
              <span>Placed ${esc(NxfFmt.dateTime(o.createdAt))}</span>
              <span class="sep"></span>
              <span>${esc(NxfFmt.ago(o.createdAt))}</span>
              <span class="sep"></span>
              <span class="pay-chip">${NxfIcon.card}${esc(NxfFmt.payLabel(o.paymentMethod))}</span>
            </div>
          </div>
          <button class="adm-close" id="drawer-close" aria-label="Close details">${NxfIcon.close}</button>
        </div>
      </div>

      <div class="adm-drawer-body">
        ${stepper}

        <div class="adm-sec">
          <div class="adm-sec-title">${NxfIcon.user} Customer</div>
          <div class="adm-sec-body">
            <div class="adm-kv"><span class="k">Name</span><span class="v">${esc(c.name)}</span></div>
            <div class="adm-kv"><span class="k">Phone</span><span class="v"><a href="${esc(NxfFmt.phoneHref(c.phone))}">${esc(c.phone)}</a></span></div>
            <div class="adm-kv"><span class="k">Email</span><span class="v"><a href="mailto:${esc(c.email)}">${esc(c.email)}</a></span></div>
          </div>
        </div>

        <div class="adm-sec">
          <div class="adm-sec-title">${NxfIcon.pin} Shipping Address</div>
          <div class="adm-sec-body">
            <div class="adm-kv"><span class="k">Address</span>
              <span class="v adm-addr">
                ${esc(s.address)}<br>
                ${s.landmark ? `<span class="line2">${esc(s.landmark)}</span><br>` : ""}
                <span class="line2">${esc(s.city)}, ${esc(s.state)}</span> — <span class="pin">${esc(s.pincode)}</span>
              </span>
            </div>
          </div>
        </div>

        <div class="adm-sec">
          <div class="adm-sec-title">${NxfIcon.box} Items · ${o.items.length} line${o.items.length === 1 ? "" : "s"} · ${itemCount(o)} unit${itemCount(o) === 1 ? "" : "s"}</div>
          <div class="adm-sec-body">${itemsHtml}</div>
        </div>

        <div class="adm-sec">
          <div class="adm-sec-title">${NxfIcon.rupee} Payment &amp; Totals</div>
          <div class="adm-totals">
            <div class="adm-total-row"><span>Subtotal</span><span>${esc(NxfFmt.inr(o.subtotal))}</span></div>
            <div class="adm-total-row"><span>Shipping</span><span>${o.shippingFee === 0 ? '<span class="free">FREE</span>' : esc(NxfFmt.inr(o.shippingFee))}</span></div>
            <div class="adm-total-row"><span>Payment method</span><span>${esc(NxfFmt.payLabel(o.paymentMethod))}</span></div>
            <div class="adm-total-row grand"><span>Total</span><span>${esc(NxfFmt.inr(o.total))}</span></div>
          </div>
        </div>
      </div>

      <div class="adm-actions" id="drawer-actions">${actionButtons(o.status)}</div>`;
  }

  function actionButtons(status) {
    const cancel = `<button class="adm-btn adm-btn-danger-ghost adm-btn-sm" data-set="cancelled">${NxfIcon.ban} Cancel order</button>`;
    switch (status) {
      case "pending":
        return `<button class="adm-btn adm-btn-primary adm-btn-sm" data-set="confirmed">${NxfIcon.check} Confirm order</button>
                <span class="spacer"></span>${cancel}`;
      case "confirmed":
        return `<button class="adm-btn adm-btn-primary adm-btn-sm" data-set="shipped">${NxfIcon.truck} Mark shipped</button>
                <span class="spacer"></span>${cancel}`;
      case "shipped":
        return `<button class="adm-btn adm-btn-primary adm-btn-sm" data-set="delivered">${NxfIcon.check} Mark delivered</button>
                <span class="spacer"></span>${cancel}`;
      case "delivered":
        return `<span class="adm-action-hint" style="width:auto">✓ Fulfilment complete — no actions available.</span>`;
      case "cancelled":
        return `<button class="adm-btn adm-btn-outline adm-btn-sm" data-set="pending">${NxfIcon.refresh} Restore to pending</button>`;
      default:
        return "";
    }
  }

  function bindDrawerEvents(o) {
    document.getElementById("drawer-close").addEventListener("click", closeDrawer);
    document.getElementById("copy-code").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(o.orderCode);
        nxfToast("Order code copied — " + o.orderCode);
      } catch {
        nxfToast(o.orderCode);
      }
    });
    el.drawer.querySelectorAll("[data-set]").forEach((btn) => {
      btn.addEventListener("click", () => applyStatus(o, btn.dataset.set, btn));
    });
  }

  async function applyStatus(order, status, btn) {
    const label = ORDER_STATUS[status].label;
    btn.disabled = true;
    el.drawer.querySelectorAll("[data-set]").forEach((b) => (b.disabled = true));
    try {
      const res = await AdminAPI.setStatus(order.id, status);
      const updated = res.order;
      const i = state.orders.findIndex((x) => x.id === updated.id);
      if (i > -1) state.orders[i] = updated;
      nxfToast(`${updated.orderCode} → ${label}`);
      closeDrawer();
      await load();
    } catch (err) {
      nxfToast(err.message || "Could not update status", "err");
      el.drawer.querySelectorAll("[data-set]").forEach((b) => (b.disabled = false));
    }
  }
})();
