import { createHash } from "node:crypto";
import type { OrderStatus } from "@prisma/client";
import type { TrackingActivity, TrackingResult } from "./shiprocket";

// Shiprocket shipment status ids (from their API docs). Only the ones that change what we tell the customer are listed;
// everything else (pickup scheduled, delayed, lost...) is still recorded in the tracking timeline.
const SHIPPED_IDS = new Set([6, 17, 18, 21, 22, 38, 39, 42, 51]); // shipped, out for delivery, in transit, undelivered (retrying), delayed, at destination hub, misrouted, picked up, handed to courier
const RETURNING_IDS = new Set([9, 14, 40, 41, 46]); // RTO initiated / acknowledged / NDR / out for delivery / in transit
const DELIVERED_ID = 7;
const RETURNED_ID = 10; // RTO delivered: the parcel is back with us

/** The order status a Shiprocket status maps to, or null when it should only be recorded. */
export function targetStatus(statusId: number | undefined, label?: string): OrderStatus | null {
  if (statusId !== undefined) {
    if (statusId === DELIVERED_ID) return "DELIVERED";
    if (statusId === RETURNED_ID) return "RETURNED";
    if (RETURNING_IDS.has(statusId)) return "RETURNING";
    if (SHIPPED_IDS.has(statusId)) return "SHIPPED";
    return null;
  }
  // No id (rare): fall back to the wording.
  const text = (label ?? "").toLowerCase();
  if (/rto.*deliver/.test(text)) return "RETURNED";
  if (/rto/.test(text)) return "RETURNING";
  if (/^delivered$/.test(text)) return "DELIVERED";
  if (/out for delivery|in transit|picked up|shipped/.test(text)) return "SHIPPED";
  return null;
}

/** Orders only move forward. A late or repeated message can never send an order backwards. */
const RANK: Record<OrderStatus, number> = { PENDING: 0, PROCESSING: 1, SHIPPED: 2, RETURNING: 3, DELIVERED: 4, RETURNED: 4, CANCELLED: 99 };
export const FINISHED: OrderStatus[] = ["CANCELLED", "DELIVERED", "RETURNED"];
export const canAdvance = (from: OrderStatus, to: OrderStatus) => !FINISHED.includes(from) && RANK[to] > RANK[from];

export type ShipmentEventInput = { statusId?: number; status: string; activity?: string; location?: string; at: Date };
export type ShipmentUpdate = {
  awb?: string;
  shiprocketOrderId?: string;
  orderNumber?: string;
  courier?: string;
  trackUrl?: string;
  statusId?: number;
  statusLabel?: string;
  deliveredAt?: Date;
  events: ShipmentEventInput[];
};

export const eventFingerprint = (event: ShipmentEventInput) =>
  createHash("sha1").update(`${event.at.toISOString()}|${event.status}|${event.activity ?? ""}`).digest("hex").slice(0, 24);

/** Shiprocket times are India time without a zone ("2023-05-19 11:59:16"). */
function parseIst(value: string | undefined | null): Date | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (match) {
    const date = new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6] ?? "00"}+05:30`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  // The webhook's current_timestamp looks like "23 05 2023 11:43:52" (day month year).
  const dmy = value.trim().match(/^(\d{2}) (\d{2}) (\d{4}) (\d{2}):(\d{2}):(\d{2})$/);
  if (dmy) {
    const date = new Date(`${dmy[3]}-${dmy[2]}-${dmy[1]}T${dmy[4]}:${dmy[5]}:${dmy[6]}+05:30`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

const text = (value: unknown, max = 300) => (typeof value === "string" && value.trim() ? value.trim().slice(0, max) : undefined);

function scanToEvent(scan: TrackingActivity): ShipmentEventInput | null {
  const at = parseIst(scan.date);
  if (!at) return null;
  const id = Number(scan["sr-status"]);
  const label = text(scan["sr-status-label"]);
  const known = Number.isInteger(id) && label && label !== "NA";
  return {
    statusId: known ? id : undefined,
    status: known ? label : text(scan.status, 60) ?? "UPDATE",
    activity: text(scan.activity),
    location: text(scan.location, 160),
    at,
  };
}

type WebhookBody = {
  awb?: unknown; courier_name?: unknown; shipment_status?: unknown; shipment_status_id?: unknown; current_status?: unknown;
  current_timestamp?: unknown; order_id?: unknown; sr_order_id?: unknown; scans?: unknown;
};

/** Turns Shiprocket's tracking webhook body into our own shape. Returns null when it isn't a tracking message. */
export function fromWebhook(raw: unknown): ShipmentUpdate | null {
  if (!raw || typeof raw !== "object") return null;
  const body = raw as WebhookBody;
  const awb = text(body.awb, 60) ?? (typeof body.awb === "number" ? String(body.awb) : undefined);
  const srOrderId = typeof body.sr_order_id === "number" || typeof body.sr_order_id === "string" ? String(body.sr_order_id) : undefined;
  if (!awb && !srOrderId) return null;
  const statusId = Number.isInteger(Number(body.shipment_status_id)) && body.shipment_status_id !== null && body.shipment_status_id !== "" ? Number(body.shipment_status_id) : undefined;
  const statusLabel = text(body.shipment_status, 60) ?? text(body.current_status, 60);
  const scans = Array.isArray(body.scans) ? (body.scans as TrackingActivity[]) : [];
  const events = scans.map(scanToEvent).filter((e): e is ShipmentEventInput => e !== null);
  // If there are no scans, keep at least the headline status so it still shows in the timeline.
  if (events.length === 0 && statusLabel) events.push({ statusId, status: statusLabel, at: parseIst(text(body.current_timestamp)) ?? new Date() });
  const delivered = statusId === DELIVERED_ID ? events.find((e) => e.statusId === DELIVERED_ID)?.at : undefined;
  return {
    awb,
    shiprocketOrderId: srOrderId,
    orderNumber: text(body.order_id, 80)?.split("_")[0],
    courier: text(body.courier_name, 80),
    statusId,
    statusLabel,
    deliveredAt: delivered,
    events,
  };
}

/** Turns the tracking API's answer (used by "refresh") into the same shape. */
export function fromTracking(result: TrackingResult, awb: string): ShipmentUpdate {
  const data = result.tracking_data;
  const track = data?.shipment_track?.[0];
  const events = (data?.shipment_track_activities ?? []).map(scanToEvent).filter((e): e is ShipmentEventInput => e !== null);
  const statusId = typeof data?.shipment_status === "number" ? data.shipment_status : undefined;
  return {
    awb,
    courier: text(track?.courier_name, 80),
    trackUrl: text(data?.track_url, 500),
    statusId,
    statusLabel: text(track?.current_status, 60),
    deliveredAt: parseIst(track?.delivered_date) ?? undefined,
    events,
  };
}
