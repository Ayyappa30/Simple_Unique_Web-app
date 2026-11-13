import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../server/auth/password";

const prisma = new PrismaClient();

const categories = [
  { slug: "necklaces", name: "Necklaces" },
  { slug: "piercings", name: "Body Piercings" },
  { slug: "bracelets", name: "Bracelets" },
  { slug: "earrings", name: "Earrings" },
  { slug: "sets", name: "Sets" },
] as const;

const products = [
  {
    sku: "SU-NEC-0001", slug: "sunbeam-chain", name: "The Sunbeam Chain", categorySlug: "necklaces",
    description: "A delicate golden chain with a soft, everyday glow. Finished with a long-lasting anti-tarnish coating.",
    priceInPaise: 129900, mrpInPaise: 179900, stock: 18, material: "18K Gold Plated", tags: ["Bestseller", "Anti-Tarnish"],
    image: "photo-1599643478518-a784e5dc4c8f",
  },
  {
    sku: "SU-EAR-0001", slug: "everyday-gold-hoops", name: "Everyday Gold Hoops", categorySlug: "earrings",
    description: "Lightweight hoops made for all-day wear, with a secure click closure and a polished finish.",
    priceInPaise: 89900, mrpInPaise: 119900, stock: 24, material: "Stainless Steel Anti-Tarnish", tags: ["New", "Anti-Tarnish"],
    image: "photo-1535632066927-ab7c9ab60908",
  },
  {
    sku: "SU-BRC-0001", slug: "solstice-bracelet", name: "Solstice Bracelet", categorySlug: "bracelets",
    description: "A fine chain bracelet with a subtle sun charm. Adjustable length for a comfortable fit.",
    priceInPaise: 109900, mrpInPaise: 149900, stock: 12, material: "18K Gold Plated", tags: ["Customer Favourite"],
    image: "photo-1611591437281-460bfbe1220a",
  },
  {
    sku: "SU-SET-0001", slug: "orbit-pendant-set", name: "Orbit Pendant Set", categorySlug: "sets",
    description: "A matching pendant and earring set designed to make getting ready feel effortless.",
    priceInPaise: 159900, mrpInPaise: 219900, stock: 9, material: "18K Gold Plated", tags: ["Just In", "Gift Pick"],
    image: "photo-1611652022419-a9419f74343d",
  },
  {
    sku: "SU-NEC-0002", slug: "luna-layered-necklace", name: "Luna Layered Necklace", categorySlug: "necklaces",
    description: "Two fine chains, one easy layered look. Water-resistant finish for everyday styling.",
    priceInPaise: 149900, mrpInPaise: 199900, stock: 0, material: "Stainless Steel Anti-Tarnish", tags: ["Low Stock"],
    image: "photo-1617038220319-276d3cfab638",
  },
  {
    sku: "SU-PIR-0001", slug: "tiny-star-piercing", name: "Tiny Star Piercing", categorySlug: "piercings",
    description: "A petite star stud made with skin-friendly stainless steel and a smooth flat back.",
    priceInPaise: 59900, mrpInPaise: 79900, stock: 31, material: "Stainless Steel Anti-Tarnish", tags: ["Everyday", "Anti-Tarnish"],
    image: "photo-1611652022419-a9419f74343d",
  },
  {
    sku: "SU-EAR-0002", slug: "pearl-drop-earrings", name: "Pearl Drop Earrings", categorySlug: "earrings",
    description: "A modern take on a classic pearl drop, finished with a comfortable lightweight hook.",
    priceInPaise: 99900, mrpInPaise: 139900, stock: 14, material: "18K Gold Plated", tags: ["Bestseller"],
    image: "photo-1611652022419-a9419f74343d",
  },
  {
    sku: "SU-SET-0002", slug: "stacking-ring-set", name: "Stacking Ring Set", categorySlug: "sets",
    description: "Three slim stacking rings with a polished finish. Wear them together or mix and match.",
    priceInPaise: 119900, mrpInPaise: 159900, stock: 20, material: "Stainless Steel Anti-Tarnish", tags: ["Gift Pick", "Anti-Tarnish"],
    image: "photo-1605100804763-247f67b3557e",
  },
] as const;

async function main() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error("DATABASE_URL must be set before running the catalog seed.");
  }

  await prisma.$transaction(async (tx) => {
    const categoryIds = new Map<string, string>();

    for (const category of categories) {
      const row = await tx.category.upsert({
        where: { slug: category.slug },
        create: category,
        // Do not overwrite category edits when this seed is run again.
        update: {},
        select: { id: true, slug: true },
      });
      categoryIds.set(row.slug, row.id);
    }

    for (const product of products) {
      const categoryId = categoryIds.get(product.categorySlug);
      if (!categoryId) throw new Error(`Missing seed category: ${product.categorySlug}`);

      const productRow = await tx.product.upsert({
        where: { slug: product.slug },
        create: {
          sku: product.sku,
          slug: product.slug,
          name: product.name,
          description: product.description,
          priceInPaise: product.priceInPaise,
          mrpInPaise: product.mrpInPaise,
          stock: product.stock,
          material: product.material,
          tags: [...product.tags],
          category: { connect: { id: categoryId } },
        },
        // This is intentionally create-only: rerunning the seed never resets live stock/prices.
        update: {},
        select: { id: true },
      });

      await tx.productImage.upsert({
        where: { id: `seed-image-${product.sku.toLowerCase()}` },
        create: {
          id: `seed-image-${product.sku.toLowerCase()}`,
          productId: productRow.id,
          url: `https://images.unsplash.com/${product.image}?auto=format&fit=crop&w=1200&q=85`,
          alt: product.name,
          position: 0,
        },
        // Keep any existing image edits untouched on reruns.
        update: {},
      });
    }
  }, { maxWait: 10_000, timeout: 30_000 });

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    // Create-only: never resets an existing admin's password or demotes/promotes other users.
    await prisma.user.upsert({
      where: { email: adminEmail },
      create: { name: "Store Admin", email: adminEmail, passwordHash: await hashPassword(adminPassword), role: "ADMIN" },
      update: {},
    });
    console.info(`Admin account ensured for ${adminEmail}.`);
  } else {
    console.info("ADMIN_EMAIL / ADMIN_PASSWORD not set: skipped admin account.");
  }

  console.info(`Catalog seed complete: checked ${categories.length} categories and ${products.length} products.`);
}

main()
  .catch((error: unknown) => {
    console.error("Catalog seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
