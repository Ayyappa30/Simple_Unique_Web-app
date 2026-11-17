import { NextResponse } from "next/server";
import { OrderError } from "@/server/orders/repository";
import { ShippingError } from "./shiprocket";

/** Turns a shipping or order error into a JSON response with a message the admin can act on. */
export function shippingErrorResponse(error: unknown, action: string) {
  if (error instanceof OrderError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof ShippingError) {
    const status = error.kind === "rejected" ? 422 : 503;
    return NextResponse.json({ error: error.message }, { status });
  }
  console.error(`Failed to ${action}`, error);
  return NextResponse.json({ error: `Could not ${action}. Please try again.` }, { status: 503 });
}
