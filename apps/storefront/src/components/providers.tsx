'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Cart, Identity } from '@mitti/types';
import { api } from '@/lib/api';
type UiContext = {
  bagOpen: boolean;
  setBagOpen: (open: boolean) => void;
  toast: string;
  notify: (message: string) => void;
};
const Context = createContext<UiContext>(null!);
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 30000, retry: 1 } } }),
  );
  const [bagOpen, setBagOpen] = useState(false),
    [toast, setToast] = useState('');
  function notify(message: string) {
    setToast(message);
    setTimeout(() => setToast(''), 4000);
  }
  return (
    <QueryClientProvider client={queryClient}>
      <Context.Provider value={{ bagOpen, setBagOpen, toast, notify }}>
        {children}
        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
      </Context.Provider>
    </QueryClientProvider>
  );
}
export const useUi = () => useContext(Context);
export const useCart = () => useQuery({ queryKey: ['cart'], queryFn: () => api<Cart>('cart') });
export const useIdentity = () =>
  useQuery({
    queryKey: ['identity'],
    queryFn: () => api<Identity>('auth/me').catch(() => null),
    retry: false,
  });
export const useRefresh = () => {
  const client = useQueryClient();
  return (key: string) => client.invalidateQueries({ queryKey: [key] });
};
