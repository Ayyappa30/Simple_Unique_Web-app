import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { updateProductSchema } from "@/server/products/admin-schemas";
import { adminProductsRepository, ProductError } from "@/server/products/repository";

export async function PATCH(request: Request, ctx: RouteContext<"/api/v1/admin/products/[id]">) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  const { id } = await ctx.params;
  const parsed = updateProductSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check the product details." }, { status: 400 });
  try {
    return NextResponse.json({ data: await adminProductsRepository.update(id, parsed.data) });
  } catch (error) {
    if (error instanceof ProductError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Failed to update product", error);
    return NextResponse.json({ error: "Could not save the product. Please try again." }, { status: 503 });
  }
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/v1/admin/products/[id]">) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  const { id } = await ctx.params;
  try {
    await adminProductsRepository.archive(id);
    return NextResponse.json({ data: { ok: true } });
  } catch (error) {
    if (error instanceof ProductError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Failed to delete product", error);
    return NextResponse.json({ error: "Could not remove the product. Please try again." }, { status: 503 });
  }
}
