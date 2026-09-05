/* ============================================================
   Nexora.Find — Server-side product catalog (price authority)
   Mirror of the storefront catalog in js/data.js.
   Used by the orders API to validate items and compute totals
   server-side, so prices can never be tampered with client-side.
   If you add/edit products in js/data.js, update id/name/price/img here too.
   ============================================================ */

export const PRODUCTS = [
  { id: "nx-001", name: "Aurora Wireless Earbuds",        price: 2499, img: "https://picsum.photos/seed/nexora-earbuds/900/900",     variants: ["Onyx Black", "Pearl White", "Champagne Gold"] },
  { id: "nx-002", name: "Lumen Smart Desk Lamp",          price: 1899, img: "https://picsum.photos/seed/nexora-lamp/900/900",        variants: ["Matte Black", "Warm Ivory"] },
  { id: "nx-003", name: "Drift Everyday Crossbody",       price: 1299, img: "https://picsum.photos/seed/nexora-bag/900/900",         variants: ["Black", "Sand", "Olive"] },
  { id: "nx-004", name: "Nimbus Insulated Bottle 750ml",  price: 899,  img: "https://picsum.photos/seed/nexora-bottle/900/900",      variants: ["Slate", "Blush", "Forest"] },
  { id: "nx-005", name: "Pulse Fitness Band X2",          price: 1799, img: "https://picsum.photos/seed/nexora-band/900/900",        variants: ["Black", "Grey", "Rose"] },
  { id: "nx-006", name: "Haze Minimalist Sunglasses",     price: 999,  img: "https://picsum.photos/seed/nexora-sunglasses/900/900",  variants: ["Black", "Tortoise", "Clear"] },
  { id: "nx-007", name: "Kindle Nightstand Organiser",    price: 1099, img: "https://picsum.photos/seed/nexora-organiser/900/900",   variants: ["Walnut", "Oak", "Black Ash"] },
  { id: "nx-008", name: "Orbit Magnetic Phone Stand",     price: 649,  img: "https://picsum.photos/seed/nexora-standp/900/900",      variants: ["Black", "Silver"] }
];

export const FREE_SHIPPING_THRESHOLD = 999; // ₹ — matches storefront rule
export const SHIPPING_FEE = 79;             // ₹ flat fee below threshold

export function findProduct(id) {
  return PRODUCTS.find((p) => p.id === id) || null;
}
