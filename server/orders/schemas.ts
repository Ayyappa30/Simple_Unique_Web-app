import { z } from "zod";

export const placeOrderSchema = z.object({
  customer: z.object({
    name: z.string().trim().min(2, "Enter your full name").max(80),
    phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
    email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  }),
  address: z.object({
    street: z.string().trim().min(8, "Enter your complete street address").max(200),
    city: z.string().trim().min(2, "Enter your city").max(80),
    state: z.string().trim().min(2, "Enter your state").max(80),
    pincode: z.string().regex(/^[1-9][0-9]{5}$/, "Enter a valid 6-digit PIN code"),
  }),
  items: z.array(z.object({ productId: z.string().min(1).max(64), quantity: z.number().int().min(1).max(20) })).min(1).max(50),
  coupon: z.string().trim().max(32).optional(),
  paymentMethod: z.enum(["cod", "razorpay"]).default("cod"),
});

export const orderStatusSchema = z.enum(["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]);

export const updateOrderSchema = z
  .object({
    status: orderStatusSchema,
    trackingNumber: z.string().trim().max(80),
    carrier: z.string().trim().max(80),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: "Nothing to update." });

export const verifyPaymentSchema = z.object({
  orderNumber: z.string().regex(/^SU-\d{4}-[A-Z0-9]{10}$/),
  razorpay_order_id: z.string().min(1).max(64),
  razorpay_payment_id: z.string().min(1).max(64),
  razorpay_signature: z.string().min(1).max(256),
});

export const orderLookupSchema = z.object({
  numbers: z.array(z.string().regex(/^SU-\d{4}-[A-Z0-9]{10}$/)).max(20),
});
