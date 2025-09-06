import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { useEffect } from 'react';
import { router } from './router';
import { ToastProvider } from './hooks/useToast';
import { useNonceRefresh } from './hooks/useNonceRefresh';
import { initializeBackgrounds } from './utils/backgroundUtils';
import { initializeSounds } from './utils/soundUtils';

// Configure QueryClient with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // Data is considered fresh for 1 minute by default
      refetchOnWindowFocus: false, // Do NOT refetch on window focus by default
      refetchOnMount: true, // Still refetch on component mount if staleTime has passed
      // cacheTime: 5 * 60 * 1000, // Default is 5 minutes, can increase if you have very static data not being invalidated
    },
    mutations: {
      // You can add default options for mutations here too, e.g., onError, onSuccess
    }
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