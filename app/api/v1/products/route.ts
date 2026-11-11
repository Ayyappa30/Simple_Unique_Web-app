import { NextResponse } from "next/server";
import { z } from "zod";
import { listProducts } from "@/server/products/product-service";

const querySchema = z.object({
  category: z.string().trim().min(1).max(64).optional(),
  material: z.string().trim().min(1).optional(),
  q: z.string().trim().max(80).optional(),
  maxPrice: z.coerce.number().positive().max(1_000_000).optional(),
  inStock: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  sort: z.enum(["popular", "price-low", "price-high", "newest"]).default("popular"),
  limit: z.coerce.number().int().min(1).max(48).default(24),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    category: url.searchParams.get("category") ?? undefined,
    material: url.searchParams.get("material") ?? undefined,
    q: url.searchParams.get("q") ?? undefined,
    maxPrice: url.searchParams.get("maxPrice") ?? undefined,
    inStock: url.searchParams.get("inStock") ?? undefined,
    sort: url.searchParams.get("sort") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid query parameters", details: parsed.error.flatten() }, { status: 400 });
  }
  try {
    const products = await listProducts(parsed.data);
    return NextResponse.json(
      { data: products, meta: { count: products.length, limit: parsed.data.limit } },
      { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" } },
    );
  } catch (error) {
    console.error("Failed to load product catalog", error);
    return NextResponse.json({ error: "The product catalog is temporarily unavailable." }, { status: 503 });
  }
}
