// Thin client for the Shiprocket external API (https://apidocs.shiprocket.in). Server-side only.
// Credentials are an "API user" created in Shiprocket (Settings > API > Configure > Create API User), not your normal login.

export class ShippingError extends Error {
  constructor(message: string, readonly kind: "not-configured" | "rejected" | "unavailable" = "rejected", readonly httpStatus?: number) {
    super(message);
  }
}

const baseUrl = () => (process.env.SHIPROCKET_BASE_URL ?? "https://apiv2.shiprocket.in/v1/external").replace(/\/$/, "");

export const isShiprocketConfigured = () => Boolean(process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD && process.env.SHIPROCKET_PICKUP_LOCATION);
export const isShippingWebhookConfigured = () => Boolean(process.env.SHIPROCKET_WEBHOOK_TOKEN);

// The login token is valid for 10 days. Keep it in memory (re-login after a restart) and refresh a day early.
let cachedToken: { value: string; expiresAt: number } | null = null;
const TOKEN_LIFETIME_MS = 9 * 24 * 60 * 60_000;

async function login(): Promise<string> {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  if (!email || !password) throw new ShippingError("Shiprocket is not configured. Set SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD and SHIPROCKET_PICKUP_LOCATION in .env.", "not-configured");
  let response: Response;
  try {
    response = await fetch(`${baseUrl()}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new ShippingError("Could not reach Shiprocket. Please try again.", "unavailable");
  }
  const body = (await response.json().catch(() => ({}))) as { token?: string; message?: string };
  if (!response.ok || !body.token) {
    throw new ShippingError(`Shiprocket rejected the login (${response.status}). Check SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD: they must be an API user, not your normal login.`, "rejected", response.status);
  }
  cachedToken = { value: body.token, expiresAt: Date.now() + TOKEN_LIFETIME_MS };
  return body.token;
}

async function token(forceRefresh = false) {
  if (!forceRefresh && cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;
  return login();
}

/** Shiprocket explains problems in `message` and/or an `errors` map of field -> messages. */
function explain(body: unknown, fallback: string): string {
  if (!body || typeof body !== "object") return fallback;
  const { message, errors } = body as { message?: unknown; errors?: unknown };
  const parts: string[] = [];
  if (typeof message === "string" && message) parts.push(message);
  if (errors && typeof errors === "object") {
    for (const [field, value] of Object.entries(errors as Record<string, unknown>)) {
      const text = Array.isArray(value) ? value.join(", ") : String(value);
      parts.push(`${field}: ${text}`);
    }
  }
  return parts.length ? parts.join(" | ").slice(0, 400) : fallback;
}

async function call<T>(path: string, init: { method?: "GET" | "POST"; body?: unknown; query?: Record<string, string | number | undefined> } = {}): Promise<T> {
  const url = new URL(`${baseUrl()}${path}`);
  for (const [key, value] of Object.entries(init.query ?? {})) if (value !== undefined) url.searchParams.set(key, String(value));

  const send = async (bearer: string) => fetch(url, {
    method: init.method ?? "GET",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${bearer}` },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    signal: AbortSignal.timeout(25_000),
  });

  let response: Response;
  try {
    response = await send(await token());
    if (response.status === 401) response = await send(await token(true)); // token expired or revoked: log in again once
  } catch (error) {
    if (error instanceof ShippingError) throw error;
    throw new ShippingError("Could not reach Shiprocket. Please try again.", "unavailable");
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const kind = response.status >= 500 || response.status === 429 ? "unavailable" : "rejected";
    throw new ShippingError(explain(body, `Shiprocket returned ${response.status}.`), kind, response.status);
  }
  return body as T;
}

// ---------- Endpoints ----------

export type CreateShipmentInput = {
  orderNumber: string;
  orderDate: string; // "yyyy-mm-dd hh:mm"
  pickupLocation: string;
  customer: { name: string; email: string; phone: string };
  address: { street: string; city: string; state: string; pincode: string };
  items: { name: string; sku: string; units: number; sellingPrice: number }[]; // prices in rupees
  paymentMethod: "COD" | "Prepaid";
  amountToCollect: number; // rupees: the full amount the customer pays, shipping included and discount taken off
  weightKg: number;
  lengthCm: number;
  breadthCm: number;
  heightCm: number;
};

/** Creates the order in Shiprocket. Our order number is used as Shiprocket's order_id, so it is easy to find in their dashboard. */
export async function createShiprocketOrder(input: CreateShipmentInput) {
  const [first, ...rest] = input.customer.name.trim().split(/\s+/);
  const body = await call<{ order_id?: number; shipment_id?: number; status?: string }>("/orders/create/adhoc", {
    method: "POST",
    body: {
      order_id: input.orderNumber,
      order_date: input.orderDate,
      pickup_location: input.pickupLocation,
      billing_customer_name: first ?? input.customer.name,
      billing_last_name: rest.join(" "),
      billing_address: input.address.street,
      billing_city: input.address.city,
      billing_pincode: input.address.pincode,
      billing_state: input.address.state,
      billing_country: "India",
      billing_email: input.customer.email,
      billing_phone: input.customer.phone,
      shipping_is_billing: true,
      order_items: input.items.map((item) => ({ name: item.name, sku: item.sku, units: item.units, selling_price: item.sellingPrice })),
      payment_method: input.paymentMethod,
      // Shiprocket does not add these up for us. For cash on delivery the courier collects sub_total, so it is the full amount
      // payable; shipping and discount are already folded into it and are therefore sent as 0 to avoid counting them twice.
      shipping_charges: 0,
      total_discount: 0,
      sub_total: input.amountToCollect,
      length: input.lengthCm,
      breadth: input.breadthCm,
      height: input.heightCm,
      weight: input.weightKg,
    },
  });
  if (!body.order_id || !body.shipment_id) throw new ShippingError("Shiprocket did not return an order and shipment id.");
  return { shiprocketOrderId: String(body.order_id), shipmentId: String(body.shipment_id) };
}

/** Assigns a courier and AWB (tracking number). Without `courierId`, Shiprocket picks the courier from your account's rules. */
export async function assignAwb(shipmentId: string, courierId?: number) {
  const body = await call<{
    awb_assign_status?: number;
    message?: string;
    response?: { data?: { awb_code?: string; courier_name?: string; courier_company_id?: number; pickup_scheduled_date?: string } };
  }>("/courier/assign/awb", { method: "POST", body: { shipment_id: Number(shipmentId), ...(courierId ? { courier_id: courierId } : {}) } });
  const data = body.response?.data;
  if (body.awb_assign_status !== 1 || !data?.awb_code) {
    throw new ShippingError(body.message ?? "Shiprocket could not assign a courier. Check your Shiprocket wallet balance and that the PIN code is serviceable.");
  }
  return { awb: data.awb_code, courier: data.courier_name ?? null };
}

export async function requestPickup(shipmentId: string) {
  try {
    await call("/courier/generate/pickup", { method: "POST", body: { shipment_id: [Number(shipmentId)] } });
  } catch (error) {
    // Asking twice is harmless: Shiprocket answers that the pickup is already scheduled.
    if (error instanceof ShippingError && /already/i.test(error.message)) return;
    throw error;
  }
}

export async function generateLabel(shipmentId: string): Promise<string> {
  const body = await call<{ label_created?: number; label_url?: string }>("/courier/generate/label", { method: "POST", body: { shipment_id: [Number(shipmentId)] } });
  if (!body.label_url) throw new ShippingError("Shiprocket could not create the shipping label yet.");
  return body.label_url;
}

export type TrackingActivity = { date?: string; status?: string; activity?: string; location?: string; "sr-status"?: string; "sr-status-label"?: string };
export type TrackingResult = {
  tracking_data?: {
    track_status?: number;
    shipment_status?: number;
    shipment_track?: { awb_code?: string; courier_name?: string; current_status?: string; delivered_date?: string | null }[];
    shipment_track_activities?: TrackingActivity[];
    track_url?: string;
  };
};

/** Latest tracking for an AWB. Returns null when the courier has not reported anything yet. */
export async function trackAwb(awb: string): Promise<TrackingResult | null> {
  const result = await call<TrackingResult>(`/courier/track/awb/${encodeURIComponent(awb)}`);
  return result.tracking_data?.track_status === 1 ? result : null;
}

/** Cancels the booking in Shiprocket (only possible before the courier picks the parcel up). */
export async function cancelShiprocketOrder(shiprocketOrderId: string) {
  await call("/orders/cancel", { method: "POST", body: { ids: [Number(shiprocketOrderId)] } });
}

/** Used by the admin "check setup" panel. */
export async function listPickupLocations(): Promise<string[]> {
  const body = await call<{ data?: { shipping_address?: { pickup_location?: string }[] } }>("/settings/company/pickup");
  return (body.data?.shipping_address ?? []).map((a) => a.pickup_location ?? "").filter(Boolean);
}
