# Nonce Refresh Implementation

This implementation provides automatic nonce refresh functionality for WordPress REST API authentication.

## Overview

WordPress nonces expire after a certain period for security purposes. This implementation automatically refreshes the nonce every 30 minutes to ensure uninterrupted API access.

## Components

### 1. `useNonceRefresh` Hook
- **Location**: `src/hooks/useNonceRefresh.tsx`
- **Purpose**: Manages automatic nonce refresh
- **Features**:
  - Refreshes nonce every 30 minutes
  - Checks if immediate refresh is needed on app start
  - Prevents multiple simultaneous refresh attempts
  - Provides manual refresh capability

### 2. Auth Store Updates
- **Location**: `src/stores/authStore.ts`
- **Changes**:
  - Added `lastNonceRefresh` timestamp tracking
  - Updated `setNonce` to record refresh time
  - Enhanced persistence to include refresh timestamp

### 3. API Client Enhancement
- **Location**: `src/api/apiClient.ts`
- **Features**:
  - Response interceptor to detect nonce-related errors
  - Logs warnings for nonce validation failures

### 4. Utility Functions
- **Location**: `src/utils/nonceUtils.ts`
- **Functions**:
  - `refreshNonceManually()`: Manual nonce refresh
  - `getTimeUntilNextRefresh()`: Time until next scheduled refresh
  - `isNonceDueForRefresh()`: Check if refresh is due

### 5. Debug Component (Optional)
- **Location**: `src/components/debug/NonceStatus.tsx`
- **Purpose**: Visual indicator of nonce status for debugging

## Usage

### Automatic Refresh
The nonce refresh is automatically enabled by importing the hook in `App.tsx`:

```tsx
import { useNonceRefresh } from './hooks/useNonceRefresh';

function App() {
  useNonceRefresh(); // Enables automatic refresh
  // ... rest of component
}
```

### Manual Refresh
You can manually refresh the nonce from any component:

```tsx
import { refreshNonceManually } from '../utils/nonceUtils';

const handleManualRefresh = async () => {
  const success = await refreshNonceManually();
  if (success) {
    console.log('Nonce refreshed successfully');
  }
};
```

### Debug Information
To display nonce status for debugging:

```tsx
import { NonceStatus } from '../components/debug/NonceStatus';

// In your component
<NonceStatus className="fixed bottom-4 right-4" />
```

## Configuration

### Timing Constants
- **Refresh Interval**: 30 minutes (1,800,000 ms)
- **Refresh Threshold**: 25 minutes (triggers immediate refresh if nonce is older)

These can be adjusted in `useNonceRefresh.tsx` and `nonceUtils.ts`.

## Error Handling

- Failed refresh attempts are logged to console
- Refresh mechanism prevents concurrent refresh attempts
- API errors related to nonce validation are detected and logged
- The system gracefully handles cases where the user is not authenticated

## Security Considerations

- Nonces are refreshed proactively (at 25 minutes instead of waiting for 30-minute expiry)
- Failed requests due to expired nonces will be logged for monitoring
- The refresh mechanism only operates when the user is authenticated
- All nonce operations use secure WordPress REST API endpoints

## Monitoring

Console logs provide information about:
- When refresh intervals are started/stopped
- Successful nonce refreshes
- Failed refresh attempts
- Nonce validation errors from API calls

The `NonceStatus` component can be used during development to visually monitor nonce refresh activity.
