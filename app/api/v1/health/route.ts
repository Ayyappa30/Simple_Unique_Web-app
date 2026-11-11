import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ status: "ok", service: "simple-unique-api", version: "v1" });
}
