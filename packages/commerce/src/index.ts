export const currency = (amount: number, code = 'INR', locale = 'en-IN') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency: code, maximumFractionDigits: 0 }).format(
    amount / 100,
  );
export const orderTransitions: Record<string, readonly string[]> = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
  PROCESSING: ['PACKED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
  PACKED: ['SHIPPED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
  SHIPPED: ['OUT_FOR_DELIVERY', 'DELIVERED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'REFUNDED', 'PARTIALLY_REFUNDED'],
  DELIVERED: ['REFUNDED', 'PARTIALLY_REFUNDED'],
  CANCELLED: ['REFUNDED'],
  PARTIALLY_REFUNDED: ['REFUNDED'],
  REFUNDED: [],
};
export function assertTransition(from: string, to: string) {
  if (!orderTransitions[from]?.includes(to)) throw new Error(`Cannot move an order from ${from} to ${to}`);
}
export function calculateTotals(
  subtotal: number,
  coupon?: { percent: number; minimum: number; maxDiscount?: number | null },
  shippingPolicy = { flat: 9900, freeAbove: 250000 },
) {
  if (!Number.isSafeInteger(subtotal) || subtotal < 0) throw new Error('Invalid subtotal');
  if (coupon && subtotal < coupon.minimum) throw new Error('The order does not meet the coupon minimum');
  const discount = coupon
    ? Math.min(Math.floor((subtotal * coupon.percent) / 100), coupon.maxDiscount ?? subtotal)
    : 0;
  const shipping = subtotal - discount >= shippingPolicy.freeAbove ? 0 : shippingPolicy.flat;
  return { subtotal, discount, shipping, tax: 0, total: subtotal - discount + shipping };
}
export const GIFT_WRAP_PRICE = 7500;
export function personalizationPrice(
  fields: readonly {
    key: string;
    label: string;
    type: string;
    required: boolean;
    maxLength: number;
    options: unknown;
    priceAdjustment: number;
  }[],
  values: Record<string, string>,
) {
  let extra = 0;
  for (const key of Object.keys(values))
    if (!fields.some((f) => f.key === key)) throw new Error('Unknown personalization field');
  for (const field of fields) {
    const value = values[field.key]?.trim();
    if (field.required && !value) throw new Error(`${field.label} is required`);
    if (!value) continue;
    if (value.length > field.maxLength) throw new Error(`${field.label} is too long`);
    if (['select', 'radio'].includes(field.type) && !(field.options as string[]).includes(value))
      throw new Error(`Invalid ${field.label}`);
    if (field.type === 'checkbox' && !['true', 'false'].includes(value))
      throw new Error('Invalid checkbox value');
    if (field.type === 'image-upload' && !/^asset:[0-9a-f-]{36}$/.test(value))
      throw new Error('Choose an uploaded image');
    if (field.type !== 'checkbox' || value === 'true') extra += field.priceAdjustment;
  }
  return extra;
}
