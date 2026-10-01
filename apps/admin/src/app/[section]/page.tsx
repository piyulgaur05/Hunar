import { notFound } from 'next/navigation';
import { Operations } from '@/components/operations';
export default async function Section({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (
    ![
      'orders',
      'customers',
      'inventory',
      'collections',
      'reviews',
      'promotions',
      'content',
      'media',
      'analytics',
      'settings',
      'users',
      'audit',
    ].includes(section)
  )
    notFound();
  return <Operations section={section} />;
}
