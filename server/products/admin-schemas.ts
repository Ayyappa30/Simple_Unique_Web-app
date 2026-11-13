import { z } from "zod";

export const CATEGORY_SLUGS = ["necklaces", "piercings", "bracelets", "earrings", "sets"] as const;
export const MATERIALS = ["18K Gold Plated", "Stainless Steel Anti-Tarnish"] as const;

/** Accepts an Unsplash photo id (`photo-123...`) or an https URL on a host the storefront can render. */
const imageSchema = z.string().trim().min(1).max(500).transform((value, ctx) => {
  if (/^photo-[\w-]+$/.test(value)) return `https://images.unsplash.com/${value}?auto=format&fit=crop&w=1200&q=85`;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && ["images.unsplash.com", "res.cloudinary.com"].includes(url.hostname)) return url.toString();
  } catch {
    // fall through to the issue below
  }
  ctx.addIssue({ code: "custom", message: "Image must be an uploaded image, a Cloudinary/Unsplash URL, or an Unsplash photo ID." });
  return z.NEVER;
});

const fields = {
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000),
  category: z.enum(CATEGORY_SLUGS),
  // Prices are integer paise, matching the public API and the database.
  priceInPaise: z.number().int().min(100).max(100_000_000),
  mrpInPaise: z.number().int().min(100).max(100_000_000),
  stock: z.number().int().min(0).max(100_000),
  material: z.enum(MATERIALS),
  image: imageSchema,
  isActive: z.boolean(),
};

// Defaults live on create only: `.partial()` on a defaulted field would reset it during updates.
export const createProductSchema = z.object({ ...fields, description: fields.description.default(""), isActive: fields.isActive.default(true) }).refine((p) => p.mrpInPaise >= p.priceInPaise, {
  message: "MRP must be greater than or equal to the selling price.",
  path: ["mrpInPaise"],
});

export const updateProductSchema = z.object(fields).partial().refine((p) => Object.keys(p).length > 0, { message: "Nothing to update." });
