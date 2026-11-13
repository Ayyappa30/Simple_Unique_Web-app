import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/server/auth/require-admin";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const FOLDER = "simple-unique/products";

// Admin only: uploads one product image to Cloudinary and returns its public https URL.
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (admin instanceof NextResponse) return admin;

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: "Image uploads are not configured. Set the CLOUDINARY_* variables in .env." }, { status: 503 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image file to upload." }, { status: 400 });
  if (!ALLOWED_TYPES.includes(file.type)) return NextResponse.json({ error: "Only JPG, PNG or WebP images are allowed." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image must be 5 MB or smaller." }, { status: 400 });

  // Signed upload: sha1 of the sorted params + secret. The secret never leaves the server.
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHash("sha1").update(`folder=${FOLDER}&timestamp=${timestamp}${apiSecret}`).digest("hex");
  const body = new FormData();
  body.set("file", file);
  body.set("api_key", apiKey);
  body.set("timestamp", timestamp);
  body.set("folder", FOLDER);
  body.set("signature", signature);

  try {
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || typeof result.secure_url !== "string") {
      console.error("Cloudinary upload failed", response.status, result?.error?.message);
      return NextResponse.json({ error: "The image host rejected the upload. Check your Cloudinary settings." }, { status: 502 });
    }
    return NextResponse.json({ data: { url: result.secure_url } }, { status: 201 });
  } catch (error) {
    console.error("Cloudinary upload error", error);
    return NextResponse.json({ error: "Could not reach the image host. Try again." }, { status: 502 });
  }
}
