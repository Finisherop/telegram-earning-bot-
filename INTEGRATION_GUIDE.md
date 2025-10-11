# Quick Integration Guide

## To integrate the new services with existing code:

### 1. Update imports in existing files:

Replace old imports:
```typescript
// Old
import { db, realtimeDb } from './firebase';
import { updateUser, safeUpdateUser } from './firebaseService';

// New  
import { getFirebaseServices } from './firebaseSingleton';
import { atomicCoinUpdate, safeUserUpdate } from './atomicFirebaseService';
import { getTelegramUserSafe } from './telegramUserSafe';
import { syncTelegramUserToFirebase } from './telegramUserSync';
```

### 2. Replace coin operations:

```typescript
// Old (unsafe)
await updateUser(userId, { coins: currentCoins + reward });

// New (atomic)
await atomicCoinUpdate({
  userId,
  coinsDelta: reward,
  xpDelta: Math.floor(reward / 10),
  reason: 'task_completion'
});
```

### 3. Replace user data capture:

```typescript
// Old (can fail)
const user = window.Telegram.WebApp.initDataUnsafe?.user;

// New (always works)
const user = getTelegramUserSafe();
const userId = getUserIdForFirebase(user);
```

### 4. Add to your main app component:

```typescript
import AppInitializer from '@/components/AppInitializer';

export default function App() {
  return (
    <AppInitializer>
      {/* Your existing app content */}
    </AppInitializer>
  );
}
```

### 5. Use new real-time listeners:

```typescript
// Replace old subscriptions
import { subscribeToUser } from '@/lib/realtimeListeners';

const unsubscribe = subscribeToUser(userId, (user) => {
  setUser(user);
});
```

## All services are backward compatible and can be integrated gradually!