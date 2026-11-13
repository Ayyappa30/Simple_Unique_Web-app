import type { Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";

export type ProductSort = "popular" | "price-low" | "price-high" | "newest";

export type ProductFilters = {
  category?: string;
  material?: string;
  q?: string;
  /** API/display currency is rupees; the database stores integer paise. */
  maxPrice?: number;
  inStock?: boolean;
  sort: ProductSort;
  limit: number;
};

const productSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
  priceInPaise: true,
  mrpInPaise: true,
  stock: true,
  material: true,
  tags: true,
  createdAt: true,
  category: { select: { id: true, name: true, slug: true } },
  images: {
    select: { id: true, url: true, alt: true, position: true },
    orderBy: [{ position: "asc" as const }, { id: "asc" as const }],
  },
} satisfies Prisma.ProductSelect;

type ProductRecord = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

function buildWhere(filters: ProductFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {
    isActive: true,
    archivedAt: null,
  };

  if (filters.category) where.category = { is: { slug: filters.category } };
  if (filters.material) where.material = filters.material;
  if (filters.inStock === true) where.stock = { gt: 0 };
  if (filters.inStock === false) where.stock = 0;
  if (filters.maxPrice !== undefined) {
    where.priceInPaise = { lte: Math.round(filters.maxPrice * 100) };
  }

  const query = filters.q?.trim();
  if (query) {
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { sku: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      { material: { contains: query, mode: "insensitive" } },
      { category: { is: { name: { contains: query, mode: "insensitive" } } } },
    ];
  }

  return where;
}

function buildOrderBy(sort: ProductSort): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "price-low":
      return [{ priceInPaise: "asc" }, { id: "asc" }];
    case "price-high":
      return [{ priceInPaise: "desc" }, { id: "asc" }];
    case "newest":
      return [{ createdAt: "desc" }, { id: "asc" }];
    case "popular":
    default:
      // Popularity is based on how often a product appears in order items.
      return [{ orderItems: { _count: "desc" } }, { createdAt: "desc" }, { id: "asc" }];
  }
}

function toProductSummary(product: ProductRecord) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    category: product.category.slug,
    categoryName: product.category.name,
    priceInPaise: product.priceInPaise,
    mrpInPaise: product.mrpInPaise,
    material: product.material,
    stock: product.stock,
    inStock: product.stock > 0,
    tag: product.tags[0] ?? "Everyday",
    tags: product.tags,
    createdAt: product.createdAt.toISOString(),
    imageUrl: product.images[0]?.url ?? null,
    images: product.images.map(({ url, alt, position }) => ({ url, alt, position })),
  };
}

export const productsRepository = {
  async list(filters: ProductFilters) {
    const products = await prisma.product.findMany({
      where: buildWhere(filters),
      orderBy: buildOrderBy(filters.sort),
      take: filters.limit,
      select: productSelect,
    });

    return products.map(toProductSummary);
  },
};

export type ProductSummary = ReturnType<typeof toProductSummary>;

// ---------- Admin (write) side ----------

const adminSelect = {
  ...productSelect,
  sku: true,
  isActive: true,
  updatedAt: true,
} satisfies Prisma.ProductSelect;

type AdminRecord = Prisma.ProductGetPayload<{ select: typeof adminSelect }>;

function toAdminProduct(product: AdminRecord) {
  return { ...toProductSummary(product), sku: product.sku, isActive: product.isActive, updatedAt: product.updatedAt };
}

export type AdminProduct = ReturnType<typeof toAdminProduct>;

export class ProductError extends Error {
  constructor(message: string, readonly status: 400 | 404 | 409) {
    super(message);
  }
}

const slugify = (name: string) => name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "product";

async function uniqueSlug(tx: Prisma.TransactionClient, name: string) {
  const base = slugify(name);
  for (let n = 1; n < 50; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (!(await tx.product.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
  throw new ProductError("Could not generate a unique URL for this product name.", 409);
}

async function nextSku(tx: Prisma.TransactionClient, categorySlug: string) {
  const prefix = `SU-${categorySlug.slice(0, 3).toUpperCase()}-`;
  const count = await tx.product.count({ where: { sku: { startsWith: prefix } } });
  for (let n = count + 1; n < count + 50; n++) {
    const sku = `${prefix}${String(n).padStart(4, "0")}`;
    if (!(await tx.product.findUnique({ where: { sku }, select: { id: true } }))) return sku;
  }
  throw new ProductError("Could not generate a SKU.", 409);
}

export type NewProduct = {
  name: string; description: string; category: string; priceInPaise: number; mrpInPaise: number;
  stock: number; material: string; image: string; isActive: boolean;
};

export const adminProductsRepository = {
  /** All non-archived products, including hidden (inactive) ones. */
  async list() {
    const products = await prisma.product.findMany({ where: { archivedAt: null }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], select: adminSelect });
    return products.map(toAdminProduct);
  },

  async create(input: NewProduct) {
    return prisma.$transaction(async (tx) => {
      const category = await tx.category.findUnique({ where: { slug: input.category }, select: { id: true } });
      if (!category) throw new ProductError("Unknown category.", 400);
      const product = await tx.product.create({
        data: {
          sku: await nextSku(tx, input.category),
          slug: await uniqueSlug(tx, input.name),
          name: input.name,
          description: input.description,
          priceInPaise: input.priceInPaise,
          mrpInPaise: input.mrpInPaise,
          stock: input.stock,
          material: input.material,
          isActive: input.isActive,
          tags: ["New"],
          categoryId: category.id,
          images: { create: [{ url: input.image, alt: input.name, position: 0 }] },
        },
        select: adminSelect,
      });
      return toAdminProduct(product);
    });
  },

  async update(id: string, input: Partial<NewProduct>) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.product.findFirst({ where: { id, archivedAt: null }, select: { id: true, name: true, priceInPaise: true, mrpInPaise: true } });
      if (!existing) throw new ProductError("Product not found.", 404);
      const price = input.priceInPaise ?? existing.priceInPaise;
      const mrp = input.mrpInPaise ?? existing.mrpInPaise;
      if (mrp < price) throw new ProductError("MRP must be greater than or equal to the selling price.", 400);

      let categoryId: string | undefined;
      if (input.category) {
        const category = await tx.category.findUnique({ where: { slug: input.category }, select: { id: true } });
        if (!category) throw new ProductError("Unknown category.", 400);
        categoryId = category.id;
      }
      // The slug is kept stable on rename so existing product links keep working.
      const product = await tx.product.update({
        where: { id },
        data: {
          name: input.name, description: input.description, priceInPaise: input.priceInPaise, mrpInPaise: input.mrpInPaise,
          stock: input.stock, material: input.material, isActive: input.isActive, categoryId,
        },
        select: adminSelect,
      });
      if (input.image) {
        const primary = product.images[0];
        if (primary) await tx.productImage.update({ where: { id: primary.id }, data: { url: input.image, alt: input.name ?? existing.name } });
        else await tx.productImage.create({ data: { productId: id, url: input.image, alt: input.name ?? existing.name, position: 0 } });
        return toAdminProduct((await tx.product.findUniqueOrThrow({ where: { id }, select: adminSelect })));
      }
      return toAdminProduct(product);
    });
  },

  /** Soft delete: order items keep a foreign key to the product, so the row is archived and hidden instead of removed. */
  async archive(id: string) {
    const result = await prisma.product.updateMany({ where: { id, archivedAt: null }, data: { archivedAt: new Date(), isActive: false } });
    if (result.count === 0) throw new ProductError("Product not found.", 404);
  },
};
