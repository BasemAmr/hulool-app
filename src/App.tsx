import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { useEffect } from 'react';
import { router } from './router';
import { ToastProvider } from './hooks/useToast';
import { useNonceRefresh } from './hooks/useNonceRefresh';
import { initializeBackgrounds } from './utils/backgroundUtils';

const queryClient = new QueryClient();

function App() {
  // Initialize nonce refresh mechanism
  useNonceRefresh();

  useEffect(() => {
    // Initialize page backgrounds on app load
    initializeBackgrounds();
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