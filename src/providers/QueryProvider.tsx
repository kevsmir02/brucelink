import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Retry once before surfacing an error — device may drop a packet
      retry: 1,
      // Show cached data for 30 s before considering it stale
      staleTime: 30_000,
      // Don't re-fetch when the window regains focus (native app, not browser)
      refetchOnWindowFocus: false,
    },
  },
});

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

export { queryClient };
