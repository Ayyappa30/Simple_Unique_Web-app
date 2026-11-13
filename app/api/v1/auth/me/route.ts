import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/current-user";

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ data: user }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ data: null }, { status: 503 });
  }
}
