import type { ComponentType, PropsWithChildren, ReactElement } from 'react';
import { render, type RenderOptions } from '@testing-library/react-native';
import {
  renderRouter,
  type MockContextConfig,
  type RenderRouterOptions,
} from 'expo-router/testing-library';

import type { AuthState } from '@/stores/authStore';
import { useAuthStore } from '@/stores/authStore';

import { TestProviders } from './TestProviders';

type Provider = ComponentType<PropsWithChildren>;

type SharedRenderOptions = {
  wrapper?: Provider;
  initialAuthState?: Partial<AuthState>;
};

export type RenderWithProvidersOptions = Omit<RenderOptions, 'wrapper'> &
  SharedRenderOptions;

export type RenderRouterWithProvidersOptions = Omit<
  RenderRouterOptions,
  'wrapper'
> & SharedRenderOptions;

function composeProviders(wrapper?: Provider): Provider {
  const Wrapper = wrapper;

  return function Providers({ children }: PropsWithChildren) {
    const content = Wrapper ? <Wrapper>{children}</Wrapper> : children;

    return <TestProviders>{content}</TestProviders>;
  };
}

function applyAuthState(initialAuthState?: Partial<AuthState>) {
  if (initialAuthState) {
    useAuthStore.setState(initialAuthState);
  }
}

/** Renders a component with shared test providers and optional auth state. */
export function renderWithProviders(
  ui: ReactElement,
  { wrapper, initialAuthState, ...options }: RenderWithProvidersOptions = {},
) {
  applyAuthState(initialAuthState);

  return render(ui, {
    ...options,
    wrapper: composeProviders(wrapper),
  });
}

/** Renders file-system routes with Expo Router and the shared test providers. */
export function renderRouterWithProviders(
  routes: MockContextConfig = './src/app',
  {
    wrapper,
    initialAuthState,
    ...options
  }: RenderRouterWithProvidersOptions = {},
) {
  applyAuthState(initialAuthState);

  return renderRouter(routes, {
    ...options,
    wrapper: composeProviders(wrapper),
  });
}
