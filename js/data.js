/* ============================================================
   Nexora.Find — Product Data
   Placeholder imagery only (no assets were provided in chat).
   Swap the `img` fields for your real product photography —
   every other file reads from this array, so nothing else
   needs to change.
   ============================================================ */

const PRODUCTS = [
  {
    id: "nx-001",
    name: "Aurora Wireless Earbuds",
    category: "Tech & Gadgets",
    price: 2499,
    mrp: 4999,
    rating: 4.6,
    reviews: 812,
    badge: "Trending",
    img: "https://picsum.photos/seed/nexora-earbuds/900/900",
    gallery: [
      "https://picsum.photos/seed/nexora-earbuds/900/900",
      "https://picsum.photos/seed/nexora-earbuds2/900/900",
      "https://picsum.photos/seed/nexora-earbuds3/900/900"
    ],
    variants: { Colour: ["Onyx Black", "Pearl White", "Champagne Gold"] },
    description:
      "Studio-tuned drivers, active noise cancellation, and a 32-hour case battery — built for people who notice detail. Aurora pairs instantly and stays connected across every device you own.",
    highlights: [
      "Active Noise Cancellation (ANC)",
      "32-hour total battery life",
      "IPX5 sweat & splash resistant",
      "Instant multipoint pairing"
    ]
  },
  {
    id: "nx-002",
    name: "Lumen Smart Desk Lamp",
    category: "Home Essentials",
    price: 1899,
    mrp: 2999,
    rating: 4.8,
    reviews: 431,
    badge: "Viral Find",
    img: "https://picsum.photos/seed/nexora-lamp/900/900",
    gallery: [
      "https://picsum.photos/seed/nexora-lamp/900/900",
      "https://picsum.photos/seed/nexora-lamp2/900/900",
      "https://picsum.photos/seed/nexora-lamp3/900/900"
    ],
    variants: { Colour: ["Matte Black", "Warm Ivory"] },
    description:
      "Touch-dim, colour-adaptive lighting that shifts from crisp focus mode to warm wind-down mode. A quiet, architectural object your desk has been missing.",
    highlights: [
      "3 colour temperatures, stepless dimming",
      "Touch-sensitive base",
      "USB-C powered, 1.5m braided cable",
      "Foldable, travel-friendly frame"
    ]
  },
  {
    id: "nx-003",
    name: "Drift Everyday Crossbody",
    category: "Accessories",
    price: 1299,
    mrp: 1999,
    rating: 4.4,
    reviews: 265,
    badge: "New",
    img: "https://picsum.photos/seed/nexora-bag/900/900",
    gallery: [
      "https://picsum.photos/seed/nexora-bag/900/900",
      "https://picsum.photos/seed/nexora-bag2/900/900",
      "https://picsum.photos/seed/nexora-bag3/900/900"
    ],
    variants: { Colour: ["Black", "Sand", "Olive"] },
    description:
      "Vegan-leather crossbody with a structured silhouette and a strap length that actually adjusts properly. Fits a phone, cards, and the essentials — nothing else.",
    highlights: [
      "Water-resistant vegan leather",
      "Adjustable strap, 3 lengths",
      "Magnetic secure closure",
      "Interior card slot + zip pocket"
    ]
  },
  {
    id: "nx-004",
    name: "Nimbus Insulated Bottle 750ml",
    category: "Lifestyle",
    price: 899,
    mrp: 1499,
    rating: 4.7,
    reviews: 1042,
    badge: "Bestseller",
    img: "https://picsum.photos/seed/nexora-bottle/900/900",
    gallery: [
      "https://picsum.photos/seed/nexora-bottle/900/900",
      "https://picsum.photos/seed/nexora-bottle2/900/900",
      "https://picsum.photos/seed/nexora-bottle3/900/900"
    ],
    variants: { Colour: ["Slate", "Blush", "Forest"] },
    description:
      "Double-wall insulation that keeps things cold for 24 hours, hot for 12. Leak-proof, drop-tested, and finished in a soft matte coat that resists fingerprints.",
    highlights: [
      "24hr cold / 12hr hot retention",
      "Leak-proof flip lid",
      "Soft-touch matte finish",
      "BPA-free, food-grade steel"
    ]
  },
  {
    id: "nx-005",
    name: "Pulse Fitness Band X2",
    category: "Tech & Gadgets",
    price: 1799,
    mrp: 3299,
    rating: 4.3,
    reviews: 597,
    badge: "Trending",
    img: "https://picsum.photos/seed/nexora-band/900/900",
    gallery: [
      "https://picsum.photos/seed/nexora-band/900/900",
      "https://picsum.photos/seed/nexora-band2/900/900",
      "https://picsum.photos/seed/nexora-band3/900/900"
    ],
    variants: { Colour: ["Black", "Grey", "Rose"] },
    description:
      "Heart rate, sleep, and stress tracking in a band that doesn't feel like a gadget on your wrist. Seven-day battery life means you charge it once a week, not once a night.",
    highlights: [
      "24/7 heart rate & SpO2 tracking",
      "7-day battery life",
      "Sleep & stress analysis",
      "5ATM water resistance"
    ]
  },
  {
    id: "nx-006",
    name: "Haze Minimalist Sunglasses",
    category: "Accessories",
    price: 999,
    mrp: 1799,
    rating: 4.5,
    reviews: 348,
    badge: "Viral Find",
    img: "https://picsum.photos/seed/nexora-sunglasses/900/900",
    gallery: [
      "https://picsum.photos/seed/nexora-sunglasses/900/900",
      "https://picsum.photos/seed/nexora-sunglasses2/900/900",
      "https://picsum.photos/seed/nexora-sunglasses3/900/900"
    ],
    variants: { Colour: ["Black", "Tortoise", "Clear"] },
    description:
      "UV400-protected polarised lenses on a featherweight frame. The shape everyone's been wearing this year, minus the markup.",
    highlights: [
      "Polarised, UV400 protection",
      "Featherweight TR90 frame",
      "Scratch-resistant coating",
      "Includes microfibre pouch"
    ]
  },
  {
    id: "nx-007",
    name: "Kindle Nightstand Organiser",
    category: "Home Essentials",
    price: 1099,
    mrp: 1699,
    rating: 4.6,
    reviews: 189,
    badge: "New",
    img: "https://picsum.photos/seed/nexora-organiser/900/900",
    gallery: [
      "https://picsum.photos/seed/nexora-organiser/900/900",
      "https://picsum.photos/seed/nexora-organiser2/900/900",
      "https://picsum.photos/seed/nexora-organiser3/900/900"
    ],
    variants: { Colour: ["Walnut", "Oak", "Black Ash"] },
    description:
      "A quiet catch-all for your nightstand — phone charging slot, glasses tray, and a felt-lined drawer for the small things that always go missing.",
    highlights: [
      "Built-in charging cable channel",
      "Felt-lined drawer",
      "Sustainably sourced wood veneer",
      "Non-slip base pads"
    ]
  },
  {
    id: "nx-008",
    name: "Orbit Magnetic Phone Stand",
    category: "Tech & Gadgets",
    price: 649,
    mrp: 1199,
    rating: 4.5,
    reviews: 723,
    badge: "Bestseller",
    img: "https://picsum.photos/seed/nexora-standp/900/900",
    gallery: [
      "https://picsum.photos/seed/nexora-standp/900/900",
      "https://picsum.photos/seed/nexora-standp2/900/900",
      "https://picsum.photos/seed/nexora-standp3/900/900"
    ],
    variants: { Colour: ["Black", "Silver"] },
    description:
      "Foldable, pocket-flat, and strong enough to hold your phone steady through an entire video call. MagSafe-compatible, works everywhere else too.",
    highlights: [
      "MagSafe compatible",
      "Folds flat for travel",
      "Adjustable viewing angle",
      "Aircraft-grade aluminium"
    ]
  }
];

const REVIEWS = [
  { name: "Ananya R.", location: "Bengaluru", rating: 5, text: "Genuinely didn't expect packaging this nice for the price. The earbuds sound better than ones I've paid double for." },
  { name: "Kabir M.", location: "Delhi", rating: 5, text: "Ordered the desk lamp on a whim, now it's the first thing I show people who visit. Delivery was quicker than promised too." },
  { name: "Sneha P.", location: "Mumbai", rating: 4, text: "Quality feels premium, not dropshippy at all. The crossbody bag strap adjustment is exactly what I needed." },
  { name: "Rohit V.", location: "Pune", rating: 5, text: "Customer support actually replied within the hour when I asked about sizing. Rare these days." },
  { name: "Ishita K.", location: "Hyderabad", rating: 5, text: "The bottle keeps water cold way past the 24 hours they claim. Already ordered a second one for the office." },
  { name: "Aditya S.", location: "Chennai", rating: 4, text: "Fast delivery, honest product photos — what's in the box matched what I saw on site. Will shop again." }
];

const CATEGORIES = [
  { name: "Trending", img: "https://picsum.photos/seed/nexora-cat-trending/600/700" },
  { name: "Tech & Gadgets", img: "https://picsum.photos/seed/nexora-cat-tech/600/700" },
  { name: "Lifestyle", img: "https://picsum.photos/seed/nexora-cat-lifestyle/600/700" },
  { name: "Home Essentials", img: "https://picsum.photos/seed/nexora-cat-home/600/700" },
  { name: "Accessories", img: "https://picsum.photos/seed/nexora-cat-accessories/600/700" },
  { name: "Viral Finds", img: "https://picsum.photos/seed/nexora-cat-viral/600/700" }
];

function formatINR(n) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function discountPct(price, mrp) {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}

function starString(rating) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return "★".repeat(full) + (half ? "½" : "") + "☆".repeat(5 - full - (half ? 1 : 0));
}
