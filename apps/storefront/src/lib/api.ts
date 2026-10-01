import type { ApiEnvelope } from '@mitti/types';
export async function serverApi<T>(path: string): Promise<T> {
  const res = await fetch(`${process.env.API_URL || 'http://localhost:4000'}/${path}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('The shop is taking a moment. Please try again shortly.');
  const body = (await res.json()) as ApiEnvelope<T>;
  return body.data;
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
    credentials: 'same-origin',
  });
  const result = await res.json();
  if (!res.ok) throw new Error(result.error?.message || 'Please try again');
  return result.data;
}
export const track = (type: string, productId?: string) => {
  void api('events', { method: 'POST', body: JSON.stringify({ type, productId }) }).catch(() => {});
};
