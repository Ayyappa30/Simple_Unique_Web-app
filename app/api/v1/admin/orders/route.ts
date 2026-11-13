import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/require-admin";
import { releaseExpiredPayments } from "@/server/orders/payment-service";
import { ordersRepository } from "@/server/orders/repository";
import { orderStatusSchema } from "@/server/orders/schemas";

export async function GET(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;
  const rawStatus = new URL(request.url).searchParams.get("status");
  const status = rawStatus ? orderStatusSchema.safeParse(rawStatus) : null;
  if (status && !status.success) return NextResponse.json({ error: "Invalid status filter." }, { status: 400 });
  try {
    await releaseExpiredPayments().catch((error) => console.error("Could not release expired payments", error));
    const data = await ordersRepository.listAll(status?.data);
    return NextResponse.json({ data, meta: { count: data.length } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Failed to list admin orders", error);
    return NextResponse.json({ error: "Orders are temporarily unavailable." }, { status: 503 });
  }
}
