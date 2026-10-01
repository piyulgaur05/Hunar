import type { ApiEnvelope } from '@mitti/types';
export async function request<T>(path: string, options: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const response = await fetch(`/api/${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
    credentials: 'same-origin',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Request failed');
  return data;
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  return (await request<T>(path, options)).data;
}
