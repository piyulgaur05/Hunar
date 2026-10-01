export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  position: number;
}
export interface Variant {
  id: string;
  sku: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  active: boolean;
  inventory: { available: number; reserved: number; sold: number; lowStockThreshold: number } | null;
}
export interface CustomizationField {
  id: string;
  key: string;
  label: string;
  type: string;
  required: boolean;
  maxLength: number;
  options: string[];
  priceAdjustment: number;
}
export interface Product {
  id: string;
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  status: string;
  artisan: string;
  origin: string;
  materials: string;
  care: string;
  dimensions: string;
  categoryId: string;
  category: { id: string; name: string; slug: string };
  images: ProductImage[];
  variants: Variant[];
  customizations: CustomizationField[];
  featured: boolean;
  reviews: { id: string; rating: number; title: string; body: string; user: { name: string } }[];
  seoTitle?: string;
  seoDescription?: string;
}
export interface Taxonomy {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
}
export interface CmsSection {
  id: string;
  type: string;
  title: string;
  content: Record<string, string>;
  position: number;
  enabled: boolean;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
}
export interface Identity {
  id: string;
  email: string;
  name: string;
  verifiedAt: string | null;
  permissions: string[];
}
export interface CartLine {
  id: string;
  variantId: string;
  quantity: number;
  customization: Record<string, string>;
  giftWrap: boolean;
  variant: Variant & { product: Product };
}
export interface Cart {
  id: string;
  items: CartLine[];
  subtotal: number;
}
export interface Address {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}
export interface Order {
  id: string;
  number: string;
  email: string;
  status: string;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  createdAt: string;
  items: {
    id: string;
    title: string;
    variantName: string;
    image: string;
    quantity: number;
    unitPrice: number;
    customization: Record<string, string>;
    giftWrap: boolean;
  }[];
  addresses: Address[];
  events: { id: string; type: string; createdAt: string }[];
  payments: { provider: string; providerOrderId: string; status: string }[];
  shipments: { trackingNumber: string; trackingUrl?: string }[];
}
export interface ApiEnvelope<T> {
  data: T;
  meta?: { total?: number; page?: number; pages?: number };
  error: null | { code: string; message: string };
}
