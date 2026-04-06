import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { useEffect } from 'react';
import { router } from '@/app/router';
import { ToastProvider } from '@/shared/hooks/useToast';
import { useNonceRefresh } from '@/shared/hooks/useNonceRefresh';
import { initializeBackgrounds } from '@/shared/utils/backgroundUtils';
import { initializeSounds } from '@/shared/utils/soundUtils';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
    mutations: {}
  },
});

function App() {
  useNonceRefresh();

  useEffect(() => {
    initializeBackgrounds();
    initializeSounds();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
