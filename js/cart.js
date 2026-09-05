/* ============================================================
   Nexora.Find — Cart Engine
   Persists cart in localStorage so it survives across pages.
   ============================================================ */

const Cart = {
  KEY: "nexora_cart_v1",

  read() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY)) || [];
    } catch (e) {
      return [];
    }
  },

  write(items) {
    localStorage.setItem(this.KEY, JSON.stringify(items));
    this.updateBadge();
  },

  add(productId, qty = 1, variant = null) {
    const items = this.read();
    const existing = items.find(
      (i) => i.id === productId && i.variant === variant
    );
    if (existing) {
      existing.qty += qty;
    } else {
      items.push({ id: productId, qty, variant });
    }
    this.write(items);
  },

  updateQty(productId, variant, qty) {
    let items = this.read();
    if (qty <= 0) {
      items = items.filter((i) => !(i.id === productId && i.variant === variant));
    } else {
      const item = items.find((i) => i.id === productId && i.variant === variant);
      if (item) item.qty = qty;
    }
    this.write(items);
  },

  remove(productId, variant) {
    const items = this.read().filter(
      (i) => !(i.id === productId && i.variant === variant)
    );
    this.write(items);
  },

  clear() {
    this.write([]);
  },

  count() {
    return this.read().reduce((sum, i) => sum + i.qty, 0);
  },

  lineItems() {
    return this.read()
      .map((i) => {
        const product = PRODUCTS.find((p) => p.id === i.id);
        if (!product) return null;
        return { ...i, product };
      })
      .filter(Boolean);
  },

  subtotal() {
    return this.lineItems().reduce(
      (sum, li) => sum + li.product.price * li.qty,
      0
    );
  },

  updateBadge() {
    document.querySelectorAll("[data-cart-count]").forEach((el) => {
      const n = this.count();
      el.textContent = n;
      el.style.display = n > 0 ? "flex" : "none";
    });
  }
};

document.addEventListener("DOMContentLoaded", () => Cart.updateBadge());
