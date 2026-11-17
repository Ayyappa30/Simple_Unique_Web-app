import { after } from "next/server";
import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { sendOrderEmail, type OrderEmailKind } from "@/server/email/order-emails";
import { ordersRepository, OrderError } from "@/server/orders/repository";
import {
  assignAwb, cancelShiprocketOrder, createShiprocketOrder, generateLabel, isShiprocketConfigured, isShippingWebhookConfigured,
  listPickupLocations, requestPickup, ShippingError, trackAwb,
} from "./shiprocket";
import { canAdvance, eventFingerprint, FINISHED, fromTracking, targetStatus, type ShipmentUpdate } from "./status";

export { ShippingError, isShiprocketConfigured, isShippingWebhookConfigured };

const number = (name: string, fallback: number) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

/** "2026-11-17 10:20" in India time, the format Shiprocket expects. */
function istDateTime(date: Date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

const inFlight = new Set<string>();
const EMAIL_FOR: Partial<Record<OrderStatus, OrderEmailKind>> = { SHIPPED: "shipped", DELIVERED: "delivered", RETURNING: "returning", RETURNED: "returned" };

async function recordEvent(orderId: string, status: string, activity: string) {
  const at = new Date();
  await prisma.shipmentEvent.createMany({
    data: [{ orderId, fingerprint: eventFingerprint({ status, activity, at }), status, activity, occurredAt: at }],
    skipDuplicates: true,
  });
}

/**
 * Books the courier for an order, one step at a time: create the order in Shiprocket, get a courier and AWB, schedule the pickup,
 * make the label. Every step is saved as it succeeds, so if one fails (for example an empty Shiprocket wallet) the admin fixes
 * the cause and presses the button again: it carries on from where it stopped and never books twice.
 */
export async function shipOrder(orderId: string) {
  if (!isShiprocketConfigured()) throw new ShippingError("Shiprocket is not configured. Add the SHIPROCKET_* values to .env and restart the server.", "not-configured");
  if (inFlight.has(orderId)) throw new OrderError("This order is already being booked. Please wait a moment.", 409);
  inFlight.add(orderId);
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true, orderNumber: true, status: true, createdAt: true, paymentMethod: true, paymentStatus: true, totalInPaise: true,
        customerName: true, customerEmail: true, customerPhone: true, shipStreet: true, shipCity: true, shipState: true, shipPincode: true,
        shiprocketOrderId: true, shiprocketShipmentId: true, trackingNumber: true, carrier: true, labelUrl: true,
        items: { select: { quantity: true, unitPriceInPaise: true, product: { select: { name: true, sku: true } } } },
      },
    });
    if (!order) throw new OrderError("Order not found.", 404);
    if (order.status !== "PENDING" && order.status !== "PROCESSING") throw new OrderError("Only orders that haven't shipped yet can be booked with a courier.", 409);
    if (order.paymentMethod === "razorpay" && order.paymentStatus !== "PAID") throw new OrderError("This order is waiting for online payment. Book the courier once it is paid.", 409);

    let { shiprocketShipmentId: shipmentId, trackingNumber, labelUrl } = order;
    try {
      if (!shipmentId) {
        const units = order.items.reduce((total, item) => total + item.quantity, 0);
        const created = await createShiprocketOrder({
          orderNumber: order.orderNumber,
          orderDate: istDateTime(order.createdAt),
          pickupLocation: process.env.SHIPROCKET_PICKUP_LOCATION!,
          customer: { name: order.customerName, email: order.customerEmail, phone: order.customerPhone },
          address: { street: order.shipStreet, city: order.shipCity, state: order.shipState, pincode: order.shipPincode },
          items: order.items.map((item) => ({ name: item.product.name, sku: item.product.sku, units: item.quantity, sellingPrice: item.unitPriceInPaise / 100 })),
          paymentMethod: order.paymentMethod === "cod" ? "COD" : "Prepaid",
          amountToCollect: order.totalInPaise / 100,
          weightKg: number("SHIPPING_WEIGHT_KG", 0.25) + 0.05 * Math.max(0, units - 1),
          lengthCm: number("SHIPPING_LENGTH_CM", 15),
          breadthCm: number("SHIPPING_BREADTH_CM", 12),
          heightCm: number("SHIPPING_HEIGHT_CM", 5),
        });
        shipmentId = created.shipmentId;
        // A tracking number typed in by hand earlier is cleared: from here on it comes from the courier.
        await prisma.order.update({ where: { id: order.id }, data: { shiprocketOrderId: created.shiprocketOrderId, shiprocketShipmentId: shipmentId, trackingNumber: null, carrier: null, status: "PROCESSING" } });
        trackingNumber = null;
      }
      if (!trackingNumber) {
        const awb = await assignAwb(shipmentId);
        await prisma.order.update({ where: { id: order.id }, data: { trackingNumber: awb.awb, carrier: awb.courier, shipmentStatus: "AWB ASSIGNED", shipmentStatusId: 1, shipmentError: null } });
        await recordEvent(order.id, "BOOKED", `Booked with ${awb.courier ?? "the courier"}`);
      }
      await requestPickup(shipmentId);
      await recordEvent(order.id, "PICKUP SCHEDULED", "Pickup scheduled");
      if (!labelUrl) {
        labelUrl = await generateLabel(shipmentId);
        await prisma.order.update({ where: { id: order.id }, data: { labelUrl } });
      }
      await prisma.order.update({ where: { id: order.id }, data: { shipmentError: null } });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not book the courier.";
      await prisma.order.update({ where: { id: order.id }, data: { shipmentError: message.slice(0, 400) } }).catch(() => {});
      throw error;
    }
    return (await ordersRepository.findForAdmin(orderId))!;
  } finally {
    inFlight.delete(orderId);
  }
}

/** Called before an order is cancelled: calls the courier booking off, so nobody turns up for a parcel we no longer have. */
export async function cancelCourierBooking(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { status: true, shiprocketOrderId: true } });
  if (!order?.shiprocketOrderId || FINISHED.includes(order.status)) return;
  if (order.status === "SHIPPED" || order.status === "RETURNING") throw new OrderError("The courier already has this parcel, so it can't be cancelled. It will be delivered or returned to you.", 409);
  if (!isShiprocketConfigured()) throw new ShippingError("This order is booked with Shiprocket but Shiprocket isn't configured here, so the booking can't be cancelled. Cancel it in the Shiprocket dashboard first.", "not-configured");
  try {
    await cancelShiprocketOrder(order.shiprocketOrderId);
  } catch (error) {
    // Already cancelled on their side is fine.
    if (error instanceof ShippingError && /cancel/i.test(error.message) && /already/i.test(error.message)) return;
    throw error;
  }
}

async function findOrderFor(update: ShipmentUpdate) {
  const select = { id: true, orderNumber: true, status: true, paymentMethod: true, paymentStatus: true, carrier: true, trackingNumber: true, items: { select: { productId: true, quantity: true } } } satisfies Prisma.OrderSelect;
  if (update.awb) {
    const byAwb = await prisma.order.findFirst({ where: { trackingNumber: update.awb }, select });
    if (byAwb) return byAwb;
  }
  if (update.shiprocketOrderId) {
    const bySr = await prisma.order.findFirst({ where: { shiprocketOrderId: update.shiprocketOrderId }, select });
    if (bySr) return bySr;
  }
  if (update.orderNumber) return prisma.order.findUnique({ where: { orderNumber: update.orderNumber }, select });
  return null;
}

/**
 * Applies a tracking update from the Shiprocket webhook or from "refresh". Safe to receive any number of times and in any
 * order: scans are de-duplicated, orders only ever move forward, and each change (and its customer email) happens once.
 */
export async function applyShipmentUpdate(update: ShipmentUpdate): Promise<string> {
  const order = await findOrderFor(update);
  if (!order) return "ignored: not one of our shipments";

  const changed = await prisma.$transaction(async (tx) => {
    if (update.events.length) {
      await tx.shipmentEvent.createMany({
        data: update.events.map((event) => ({ orderId: order.id, fingerprint: eventFingerprint(event), statusId: event.statusId ?? null, status: event.status, activity: event.activity ?? null, location: event.location ?? null, occurredAt: event.at })),
        skipDuplicates: true,
      });
    }
    const latest = await tx.shipmentEvent.findFirst({ where: { orderId: order.id, statusId: { not: null } }, orderBy: { occurredAt: "desc" } });
    const data: Prisma.OrderUpdateInput = {};
    if (latest) { data.shipmentStatus = latest.status; data.shipmentStatusId = latest.statusId; }
    if (update.courier && update.courier !== order.carrier) data.carrier = update.courier;
    if (update.trackUrl) data.trackUrl = update.trackUrl;
    if (!order.trackingNumber && update.awb) data.trackingNumber = update.awb;

    let moved: OrderStatus | null = null;
    const target = targetStatus(update.statusId, update.statusLabel);
    if (target && canAdvance(order.status, target)) {
      // Only the first of two simultaneous messages wins the move, so emails and stock changes can't double up.
      const claim = await tx.order.updateMany({ where: { id: order.id, status: order.status }, data: { status: target } });
      if (claim.count === 1) {
        moved = target;
        const now = new Date();
        if (target === "SHIPPED") data.shippedAt = now;
        if (target === "DELIVERED") {
          data.deliveredAt = update.deliveredAt ?? now;
          // The courier took the cash at the door.
          if (order.paymentMethod === "cod") { data.paymentStatus = "PAID"; data.codCollectedAt = now; }
        }
        if (target === "RETURNED") {
          data.returnedAt = now;
          for (const item of order.items) await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
        }
      }
    }
    if (Object.keys(data).length) await tx.order.update({ where: { id: order.id }, data });
    return moved;
  });

  if (!changed) return "recorded";
  if (changed === "RETURNED" && order.paymentMethod !== "cod" && order.paymentStatus === "PAID") {
    console.error(`[shipping] Order ${order.orderNumber} came back (RTO) and was paid online. Refund it in the Razorpay dashboard if your policy says so.`);
  }
  const kind = EMAIL_FOR[changed];
  if (kind) {
    const view = await ordersRepository.findByNumber(order.orderNumber);
    if (view) after(() => sendOrderEmail(kind, view));
  }
  return `moved to ${changed}`;
}

/** Pulls the latest tracking for one order from Shiprocket (for when the webhook can't reach this server, or to double-check). */
export async function refreshOrder(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { trackingNumber: true, shiprocketShipmentId: true } });
  if (!order) throw new OrderError("Order not found.", 404);
  if (!order.shiprocketShipmentId || !order.trackingNumber) throw new OrderError("This order isn't booked with Shiprocket yet.", 409);
  const tracking = await trackAwb(order.trackingNumber);
  if (tracking) await applyShipmentUpdate(fromTracking(tracking, order.trackingNumber));
  return (await ordersRepository.findForAdmin(orderId))!;
}

/** Refreshes every parcel that is still on its way. Returns how many were checked and how many changed. */
export async function refreshActiveShipments() {
  const orders = await prisma.order.findMany({
    where: { status: { in: ["PROCESSING", "SHIPPED", "RETURNING"] }, shiprocketShipmentId: { not: null }, trackingNumber: { not: null } },
    orderBy: { updatedAt: "asc" },
    take: 25,
    select: { id: true, orderNumber: true, trackingNumber: true },
  });
  let changed = 0;
  const failures: string[] = [];
  for (const order of orders) {
    try {
      const tracking = await trackAwb(order.trackingNumber!);
      if (!tracking) continue;
      const result = await applyShipmentUpdate(fromTracking(tracking, order.trackingNumber!));
      if (result.startsWith("moved")) changed++;
    } catch (error) {
      failures.push(`${order.orderNumber}: ${error instanceof Error ? error.message : "failed"}`);
    }
  }
  return { checked: orders.length, changed, failures };
}

/** For the admin "check setup" panel. */
export async function shippingSetupStatus() {
  const pickup = process.env.SHIPROCKET_PICKUP_LOCATION ?? "";
  const status = { configured: isShiprocketConfigured(), webhookToken: isShippingWebhookConfigured(), pickupLocation: pickup, connected: false, pickupFound: false, pickupLocations: [] as string[], problem: null as string | null };
  if (!status.configured) { status.problem = "Add SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD and SHIPROCKET_PICKUP_LOCATION to .env, then restart the server."; return status; }
  try {
    status.pickupLocations = await listPickupLocations();
    status.connected = true;
    status.pickupFound = status.pickupLocations.includes(pickup);
    if (!status.pickupFound) status.problem = `Shiprocket has no pickup location named “${pickup}”. Use one of the names listed here, exactly.`;
  } catch (error) {
    status.problem = error instanceof Error ? error.message : "Could not reach Shiprocket.";
  }
  return status;
}
