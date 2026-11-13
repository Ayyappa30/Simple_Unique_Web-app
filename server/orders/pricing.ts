// All amounts are integer paise. These rules mirror what the cart page shows.
export const FREE_SHIPPING_THRESHOLD = 149_900;
export const SHIPPING_FEE = 9_900;
const COUPONS = { UNIQUE10: { minSubtotal: 99_900, percent: 10, maxDiscount: 50_000 } } as const;

export function priceOrder(subtotal: number, coupon?: string) {
  const rule = COUPONS[(coupon ?? "").trim().toUpperCase() as keyof typeof COUPONS];
  // Rounded to whole rupees so the total matches the cart preview (prices here are whole rupees).
  const discount = rule && subtotal >= rule.minSubtotal ? Math.min(Math.round((subtotal * rule.percent) / 10_000) * 100, rule.maxDiscount) : 0;
  const shipping = subtotal - discount >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  return { subtotal, discount, shipping, total: subtotal - discount + shipping };
}
