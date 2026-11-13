export type Product = {
  id: string;
  slug: string;
  name: string;
  category: "necklaces" | "piercings" | "bracelets" | "earrings" | "sets";
  price: number;
  mrp: number;
  image: string;
  material: string;
  stock: number;
  tag: string;
  description: string;
  createdAt: string;
};

export const seedProducts: Product[] = [
  { id: "sunbeam-chain", slug: "sunbeam-chain", name: "The Sunbeam Chain", category: "necklaces", price: 1299, mrp: 1799, image: "photo-1599643478518-a784e5dc4c8f", material: "18K Gold Plated", stock: 18, tag: "Bestseller", description: "A delicate golden chain with a soft, everyday glow. Finished with a long-lasting anti-tarnish coating.", createdAt: "2026-10-20" },
  { id: "everyday-hoops", slug: "everyday-gold-hoops", name: "Everyday Gold Hoops", category: "earrings", price: 899, mrp: 1199, image: "photo-1535632066927-ab7c9ab60908", material: "Stainless Steel Anti-Tarnish", stock: 24, tag: "New", description: "Lightweight hoops made for all-day wear, with a secure click closure and a polished finish.", createdAt: "2026-11-02" },
  { id: "solstice-bracelet", slug: "solstice-bracelet", name: "Solstice Bracelet", category: "bracelets", price: 1099, mrp: 1499, image: "photo-1611591437281-460bfbe1220a", material: "18K Gold Plated", stock: 12, tag: "Customer favourite", description: "A fine chain bracelet with a subtle sun charm. Adjustable length for a comfortable fit.", createdAt: "2026-09-11" },
  { id: "orbit-pendant", slug: "orbit-pendant-set", name: "Orbit Pendant Set", category: "sets", price: 1599, mrp: 2199, image: "photo-1611652022419-a9419f74343d", material: "18K Gold Plated", stock: 9, tag: "Just in", description: "A matching pendant and earring set designed to make getting ready feel effortless.", createdAt: "2026-10-28" },
  { id: "luna-layered", slug: "luna-layered-necklace", name: "Luna Layered Necklace", category: "necklaces", price: 1499, mrp: 1999, image: "photo-1617038220319-276d3cfab638", material: "Stainless Steel Anti-Tarnish", stock: 0, tag: "Low stock", description: "Two fine chains, one easy layered look. Water-resistant finish for everyday styling.", createdAt: "2026-08-04" },
  { id: "tiny-star", slug: "tiny-star-piercing", name: "Tiny Star Piercing", category: "piercings", price: 599, mrp: 799, image: "photo-1611652022419-a9419f74343d", material: "Stainless Steel Anti-Tarnish", stock: 31, tag: "Everyday", description: "A petite star stud made with skin-friendly stainless steel and a smooth flat back.", createdAt: "2026-07-16" },
  { id: "pearl-drop", slug: "pearl-drop-earrings", name: "Pearl Drop Earrings", category: "earrings", price: 999, mrp: 1399, image: "photo-1611652022419-a9419f74343d", material: "18K Gold Plated", stock: 14, tag: "Bestseller", description: "A modern take on a classic pearl drop, finished with a comfortable lightweight hook.", createdAt: "2026-09-29" },
  { id: "stacking-set", slug: "stacking-ring-set", name: "Stacking Ring Set", category: "sets", price: 1199, mrp: 1599, image: "photo-1605100804763-247f67b3557e", material: "Stainless Steel Anti-Tarnish", stock: 20, tag: "Gift pick", description: "Three slim stacking rings with a polished finish. Wear them together or mix and match.", createdAt: "2026-06-12" },
];

export const productImageUrl = (id: string, width = 760) => {
  // Uploaded images are full Cloudinary URLs: ask Cloudinary for a resized, optimised copy.
  if (id.startsWith("https://res.cloudinary.com/")) {
    return id.replace("/image/upload/", `/image/upload/c_limit,w_${width},q_auto,f_auto/`);
  }
  // Full Unsplash URLs (as stored in the database) just need the requested width.
  if (id.startsWith("https://images.unsplash.com/")) {
    const url = new URL(id);
    url.searchParams.set("w", String(width));
    url.searchParams.set("q", "82");
    return url.toString();
  }
  return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=82`;
};

// Search: every word typed must appear somewhere in the piece's name, category, material, tag or description.
// "rings" matches "ring", and punctuation is ignored, so "anti tarnish" finds "Anti-Tarnish".
const searchWords = (text: string) =>
  text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean)
    .map((word) => (word.length > 3 && word.endsWith("s") ? word.slice(0, -1) : word));

export const matchesSearch = (product: Product, query: string) => {
  const words = searchWords(query);
  if (words.length === 0) return true;
  const haystack = ` ${[product.name, product.category, product.material, product.tag, product.description].join(" ").toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
  return words.every((word) => haystack.includes(word));
};

export const formatPrice = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
