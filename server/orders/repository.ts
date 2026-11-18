import { randomInt } from "node:crypto";
import { Prisma, type OrderStatus } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import { FINISHED } from "@/server/shipping/status";
import { priceOrder } from "./pricing";

export class OrderError extends Error {
  constructor(message: string, readonly status: 400 | 404 | 409) {
    super(message);
  }
}

const orderSelect = {
  id: true,
  orderNumber: true,
  status: true,
  paymentMethod: true,
  paymentStatus: true,
  customerName: true,
  customerEmail: true,
  customerPhone: true,
  shipStreet: true,
  shipCity: true,
  shipState: true,
  shipPincode: true,
  subtotalInPaise: true,
  discountInPaise: true,
  shippingInPaise: true,
  totalInPaise: true,
  trackingNumber: true,
  carrier: true,
  shiprocketShipmentId: true,
  labelUrl: true,
  trackUrl: true,
  shipmentStatus: true,
  shipmentError: true,
  shippedAt: true,
  deliveredAt: true,
  returnedAt: true,
  codCollectedAt: true,
  codRemittedAt: true,
  shipmentEvents: { select: { status: true, activity: true, location: true, occurredAt: true }, orderBy: { occurredAt: "desc" as const }, take: 25 },
  createdAt: true,
  items: {
    select: { id: true, productId: true, quantity: true, unitPriceInPaise: true, product: { select: { name: true, slug: true } } },
    orderBy: { id: "asc" as const },
  },
} satisfies Prisma.OrderSelect;

type OrderRecord = Prisma.OrderGetPayload<{ select: typeof orderSelect }>;

/** `admin` adds the courier label, booking errors and cash-collection dates, which customers must never see. */
export function toOrderView(order: OrderRecord, admin = false) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    customer: { name: order.customerName, email: order.customerEmail, phone: order.customerPhone },
    shipping: { street: order.shipStreet, city: order.shipCity, state: order.shipState, pincode: order.shipPincode },
    subtotalInPaise: order.subtotalInPaise,
    discountInPaise: order.discountInPaise,
    shippingInPaise: order.shippingInPaise,
    totalInPaise: order.totalInPaise,
    trackingNumber: order.trackingNumber,
    carrier: order.carrier,
    shipment: {
      status: order.shipmentStatus,
      // Shiprocket's public tracking page, used when the courier's own link isn't known.
      trackUrl: order.trackUrl ?? (order.shiprocketShipmentId && order.trackingNumber ? `https://shiprocket.co/tracking/${encodeURIComponent(order.trackingNumber)}` : null),
      shippedAt: order.shippedAt?.toISOString() ?? null,
      deliveredAt: order.deliveredAt?.toISOString() ?? null,
      returnedAt: order.returnedAt?.toISOString() ?? null,
      events: order.shipmentEvents.map((event) => ({ status: event.status, activity: event.activity, location: event.location, at: event.occurredAt.toISOString() })),
      admin: admin
        ? { booked: Boolean(order.shiprocketShipmentId), labelUrl: order.labelUrl, error: order.shipmentError, codCollectedAt: order.codCollectedAt?.toISOString() ?? null, codRemittedAt: order.codRemittedAt?.toISOString() ?? null }
        : undefined,
    },
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((item) => ({
      productId: item.productId,
      name: item.product.name,
      slug: item.product.slug,
      quantity: item.quantity,
      unitPriceInPaise: item.unitPriceInPaise,
    })),
  };
}
export type OrderView = ReturnType<typeof toOrderView>;

// Unambiguous characters (no 0/O/1/I). 10 characters ≈ 50 bits, so a guest's order number can't be guessed.
const ORDER_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function newOrderNumber() {
  let code = "";
  for (let i = 0; i < 10; i++) code += ORDER_ALPHABET[randomInt(ORDER_ALPHABET.length)];
  return `SU-${new Date().getFullYear()}-${code}`;
}

export type PlaceOrderInput = {
  userId?: string;
  customer: { name: string; phone: string; email: string };
  address: { street: string; city: string; state: string; pincode: string };
  items: { productId: string; quantity: number }[];
  coupon?: string;
  paymentMethod: "cod" | "razorpay";
};

export const ordersRepository = {
  /** Prices come from the database and stock is decremented atomically, so the browser can't set prices or oversell. */
  async place(input: PlaceOrderInput) {
    const lines = new Map<string, number>();
    for (const item of input.items) lines.set(item.productId, (lines.get(item.productId) ?? 0) + item.quantity);

    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        return await prisma.$transaction(async (tx) => {
          const products = await tx.product.findMany({
            where: { id: { in: [...lines.keys()] }, isActive: true, archivedAt: null },
            select: { id: true, name: true, priceInPaise: true },
          });
          if (products.length !== lines.size) throw new OrderError("A piece in your bag is no longer available. Please review your bag.", 409);

          for (const product of products) {
            const quantity = lines.get(product.id)!;
            const updated = await tx.product.updateMany({ where: { id: product.id, stock: { gte: quantity } }, data: { stock: { decrement: quantity } } });
            if (updated.count === 0) throw new OrderError(`Sorry, “${product.name}” is no longer available in that quantity. Please update your bag.`, 409);
          }

          const subtotal = products.reduce((sum, product) => sum + product.priceInPaise * lines.get(product.id)!, 0);
          const price = priceOrder(subtotal, input.coupon);
          const order = await tx.order.create({
            data: {
              orderNumber: newOrderNumber(),
              userId: input.userId,
              customerName: input.customer.name,
              customerEmail: input.customer.email,
              customerPhone: input.customer.phone,
              shipStreet: input.address.street,
              shipCity: input.address.city,
              shipState: input.address.state,
              shipPincode: input.address.pincode,
              subtotalInPaise: price.subtotal,
              discountInPaise: price.discount,
              shippingInPaise: price.shipping,
              totalInPaise: price.total,
              paymentMethod: input.paymentMethod,
              items: { create: products.map((product) => ({ productId: product.id, quantity: lines.get(product.id)!, unitPriceInPaise: product.priceInPaise })) },
            },
            select: orderSelect,
          });
          return toOrderView(order);
        });
      } catch (error) {
        // Order-number collision (astronomically unlikely): retry with a new number.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
        throw error;
      }
    }
    throw new OrderError("Could not create the order. Please try again.", 409);
  },

  async findByNumber(orderNumber: string) {
    const order = await prisma.order.findUnique({ where: { orderNumber }, select: orderSelect });
    return order ? toOrderView(order) : null;
  },

  /** Orders owned by the signed-in user plus any order numbers this device remembers (guest checkout). */
  async listMine(userId: string | undefined, numbers: string[]) {
    const or: Prisma.OrderWhereInput[] = [];
    if (userId) or.push({ userId });
    if (numbers.length) or.push({ orderNumber: { in: numbers } });
    if (!or.length) return [];
    const orders = await prisma.order.findMany({ where: { OR: or }, orderBy: { createdAt: "desc" }, take: 50, select: orderSelect });
    return orders.map((order) => toOrderView(order));
  },

  async findForAdmin(id: string) {
    const order = await prisma.order.findUnique({ where: { id }, select: orderSelect });
    return order ? toOrderView(order, true) : null;
  },

  async listAll(status?: OrderStatus) {
    const orders = await prisma.order.findMany({ where: status ? { status } : {}, orderBy: { createdAt: "desc" }, take: 200, select: orderSelect });
    return orders.map((order) => toOrderView(order, true));
  },

  async attachRazorpayOrder(id: string, razorpayOrderId: string) {
    await prisma.order.update({ where: { id }, data: { razorpayOrderId } });
  },

  /** What the payment code needs to know about an order (never sent to the browser as-is). */
  async paymentContext(orderNumber: string) {
    return prisma.order.findUnique({
      where: { orderNumber },
      select: { id: true, orderNumber: true, status: true, paymentMethod: true, paymentStatus: true, razorpayOrderId: true, totalInPaise: true, createdAt: true },
    });
  },

  /** Look an order up by the Razorpay order id (used by webhooks). */
  async paymentContextByRazorpayOrderId(razorpayOrderId: string) {
    return prisma.order.findUnique({
      where: { razorpayOrderId },
      select: { id: true, orderNumber: true, status: true, paymentMethod: true, paymentStatus: true, totalInPaise: true },
    });
  },

  /** Marks a fully refunded online payment as REFUNDED. Partial refunds are left alone. Returns whether anything changed. */
  async markRefunded(razorpayPaymentId: string, refundedInPaise: number) {
    const order = await prisma.order.findUnique({ where: { razorpayPaymentId }, select: { id: true, totalInPaise: true } });
    if (!order || refundedInPaise < order.totalInPaise) return false;
    const updated = await prisma.order.updateMany({ where: { id: order.id, paymentStatus: "PAID" }, data: { paymentStatus: "REFUNDED" } });
    return updated.count === 1;
  },

  /** Online orders still unpaid after `before`, oldest first. */
  async staleUnpaidOnline(before: Date) {
    return prisma.order.findMany({
      where: { paymentMethod: "razorpay", paymentStatus: "PENDING", status: "PENDING", createdAt: { lt: before } },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: { orderNumber: true },
    });
  },

  /** Idempotent: only the first call for an order flips it to PAID, so the confirmation email is sent once. */
  async markPaid(orderNumber: string, razorpayPaymentId: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({ where: { orderNumber }, select: { id: true } });
      if (!existing) throw new OrderError("Order not found.", 404);
      const claimed = await tx.order.updateMany({ where: { id: existing.id, paymentStatus: { not: "PAID" } }, data: { paymentStatus: "PAID", razorpayPaymentId } });
      const order = toOrderView(await tx.order.findUniqueOrThrow({ where: { id: existing.id }, select: orderSelect }));
      return { order, newlyPaid: claimed.count === 1 };
    });
  },

  async update(id: string, input: { status?: OrderStatus; trackingNumber?: string; carrier?: string; codRemitted?: boolean }) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.order.findUnique({ where: { id }, select: { id: true, status: true, paymentMethod: true, paymentStatus: true, trackingNumber: true, shiprocketShipmentId: true, codCollectedAt: true, items: { select: { productId: true, quantity: true } } } });
      if (!existing) throw new OrderError("Order not found.", 404);

      // An empty string clears the field.
      const data: Prisma.OrderUpdateInput = {
        trackingNumber: input.trackingNumber === undefined ? undefined : input.trackingNumber || null,
        carrier: input.carrier === undefined ? undefined : input.carrier || null,
      };
      if (input.codRemitted !== undefined) {
        // Marking that the courier has paid the collected cash into your bank account.
        if (existing.paymentMethod !== "cod" || !existing.codCollectedAt) throw new OrderError("Cash can only be marked as received for a cash-on-delivery order that has been delivered.", 409);
        data.codRemittedAt = input.codRemitted ? new Date() : null;
      }
      if (input.status && input.status !== existing.status) {
        if (FINISHED.includes(existing.status)) {
          throw new OrderError(`A ${existing.status.toLowerCase()} order can't be changed.`, 409);
        }
        // Once the courier has the parcel it can't be called off. It will either be delivered or come back (RTO).
        if (input.status === "CANCELLED" && existing.shiprocketShipmentId && (existing.status === "SHIPPED" || existing.status === "RETURNING")) {
          throw new OrderError("The courier already has this parcel, so it can't be cancelled. It will be delivered or returned to you.", 409);
        }
        // An online order that hasn't been paid yet must not be packed or shipped.
        if (existing.paymentMethod === "razorpay" && existing.paymentStatus !== "PAID" && input.status !== "CANCELLED" && input.status !== "PENDING") {
          throw new OrderError("This order is waiting for online payment. You can only cancel it until it is paid.", 409);
        }
        data.status = input.status;
        if (input.status === "CANCELLED" || input.status === "RETURNED") {
          // Put the reserved stock back exactly once (the guard above stops a second cancel or return).
          for (const item of existing.items) await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
        }
        if (input.status === "SHIPPED") data.shippedAt = new Date();
        if (input.status === "RETURNED") data.returnedAt = new Date();
        if (input.status === "DELIVERED") {
          data.deliveredAt = new Date();
          // Cash on delivery is collected when the order is delivered (online orders are already paid).
          if (existing.paymentMethod === "cod") { data.paymentStatus = "PAID"; data.codCollectedAt = new Date(); }
        }
      }
      const order = toOrderView(await tx.order.update({ where: { id }, data, select: orderSelect }), true);
      return { order, previousStatus: existing.status, previousTracking: existing.trackingNumber };
    });
  },
};
