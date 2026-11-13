import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { createProductSchema } from "@/server/products/admin-schemas";
import { adminProductsRepository, ProductError } from "@/server/products/repository";

export async function GET() {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  try {
    const data = await adminProductsRepository.list();
    return NextResponse.json({ data, meta: { count: data.length } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Failed to list admin products", error);
    return NextResponse.json({ error: "The product database is temporarily unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  const parsed = createProductSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check the product details." }, { status: 400 });
  try {
    const product = await adminProductsRepository.create(parsed.data);
    return NextResponse.json({ data: product }, { status: 201 });
  } catch (error) {
    if (error instanceof ProductError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Failed to create product", error);
    return NextResponse.json({ error: "Could not save the product. Please try again." }, { status: 503 });
  }
}
