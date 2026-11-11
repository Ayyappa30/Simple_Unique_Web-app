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
