import type { PropsWithChildren } from 'react';
import type { Metrics } from 'react-native-safe-area-context';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';

const testMetrics: Metrics = {
  frame: { x: 0, y: 0, width: 320, height: 640 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

export function TestProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics ?? testMetrics}>
      {children}
    </SafeAreaProvider>
  );
}
