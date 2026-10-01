import { ProductEditor } from '@/components/products/editor';
export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductEditor id={id} />;
}
