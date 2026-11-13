export type OrderStatus = "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

/** Shape returned by the orders API (amounts in paise). */
export type ApiOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: string;
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED";
  customer: { name: string; email: string; phone: string };
  shipping: { street: string; city: string; state: string; pincode: string };
  subtotalInPaise: number;
  discountInPaise: number;
  shippingInPaise: number;
  totalInPaise: number;
  trackingNumber: string | null;
  carrier: string | null;
  createdAt: string;
  items: { productId: string; name: string; slug: string; quantity: number; unitPriceInPaise: number }[];
};

export const statusLabel = (status: OrderStatus) => status.charAt(0) + status.slice(1).toLowerCase();
export const ORDER_NUMBER_PATTERN = /^SU-\d{4}-[A-Z0-9]{10}$/;

/** "Cash on delivery", "Cash on delivery · Paid", "Online · Paid" or "Online · Awaiting payment". */
export const paymentLabel = (order: Pick<ApiOrder, "paymentMethod" | "paymentStatus" | "status">) => {
  const method = order.paymentMethod === "cod" ? "Cash on delivery" : "Online";
  if (order.paymentStatus === "PAID") return `${method} · Paid`;
  if (order.paymentStatus === "REFUNDED") return `${method} · Refunded`;
  if (order.paymentMethod !== "cod" && order.status !== "CANCELLED") return `${method} · Awaiting payment`;
  return method;
};
