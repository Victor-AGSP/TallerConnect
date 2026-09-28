import type { StoreApi } from 'zustand/vanilla';

import { useAuthStore } from '@/stores/authStore';

/** Restores a Zustand store to the state it had when it was created. */
export function resetStore<T>(store: StoreApi<T>) {
  store.setState(store.getInitialState(), true);
}

/** Resets the app stores that are currently shared across the test suite. */
export function resetStores() {
  resetStore(useAuthStore);
  useAuthStore.setState({ isLoading: false });
}
