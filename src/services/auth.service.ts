import axios from 'axios';

import {
  AuthResponse,
  LoginCredentials,
} from '@/models/auth.model';

import { User } from '@/models/user.model';

import { apiClient } from '@/services/api/client';

/**
 * ============================================================
 * CONFIGURACIÓN
 * ============================================================
 *
 * Por defecto se utiliza el backend real.
 *
 * Para utilizar nuevamente los usuarios demo:
 *
 * EXPO_PUBLIC_USE_MOCK_AUTH=true
 */
const USE_MOCK_AUTH =
  process.env.EXPO_PUBLIC_USE_MOCK_AUTH === 'true';

/**
 * Usuarios disponibles para probar el sistema localmente.
 *
 * Todos utilizan la contraseña:
 *
 * 123456
 */
const DEMO_USERS: Array<{
  email: string;
  password: string;
  user: User;
}> = [
  {
    email: 'cliente@demo.local',
    password: '123456',
    user: {
      id: 'demo-cliente-001',
      name: 'Cliente Demo',
      email: 'cliente@demo.local',
      role: 'cliente',
      phone: '+56 9 1111 1111',
    },
  },
  {
    email: 'mecanico@demo.local',
    password: '123456',
    user: {
      id: 'demo-mecanico-001',
      name: 'Mecánico Demo',
      email: 'mecanico@demo.local',
      role: 'mecanico',
      phone: '+56 9 2222 2222',
    },
  },
  {
    email: 'admin@demo.local',
    password: '123456',
    user: {
      id: 'demo-admin-001',
      name: 'Administrador Demo',
      email: 'admin@demo.local',
      role: 'administrador',
      phone: '+56 9 3333 3333',
    },
  },
];

/**
 * Simula una pequeña latencia de red.
 *
 * Esto permite comprobar visualmente el estado "cargando"
 * del Login aunque todavía no exista backend.
 */
function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

/**
 * Autenticación local para desarrollo.
 */
async function mockLogin(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  await wait(700);

  const email = credentials.email.trim().toLowerCase();

  const demoUser = DEMO_USERS.find(
    (item) => item.email === email
  );

  if (!demoUser || demoUser.password !== credentials.password) {
    throw new Error('Correo o contraseña incorrectos.');
  }

  return {
    user: demoUser.user,
    token: `demo-token-${demoUser.user.id}`,
  };
}

/**
 * Autenticación contra el backend real.
 *
 * Esta función queda preparada para la siguiente etapa.
 */
async function apiLogin(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  const { apiClient } = await import('@/services/api/client');

  const response = await apiClient.post('/auth/login', {
    email: credentials.email.trim(),
    password: credentials.password,
  });

  const data = response.data;

  const backendUser = data.user;

  /**
   * El backend actualmente entrega roles[].
   *
   * Nuestro modelo interno utiliza un solo role.
   * Para esta primera integración tomamos el primer rol recibido.
   */
  const role = backendUser.roles?.[0];

  if (
    role !== 'cliente' &&
    role !== 'mecanico' &&
    role !== 'administrador'
  ) {
    throw new Error(
      'El usuario no tiene un rol válido para TallerConnect.'
    );
  }

  const user: User = {
    id: String(backendUser.id),
    name: backendUser.full_name,
    email: backendUser.email,
    role,
  };

  return {
    user,
    token: data.access_token,
  };
}

/**
 * Punto único de entrada para iniciar sesión.
 *
 * La pantalla Login solamente necesita llamar a esta función.
 */
export async function login(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  if (USE_MOCK_AUTH) {
    return mockLogin(credentials);
  }

    const request: LoginRequestDto = {
      email: credentials.email.trim(),
      password: credentials.password,
    };
    const response = await apiClient.post<LoginResponseDto>(
      '/auth/login',
      request,
    );

    return authResponseSchema.parse(mapLoginResponse(response.data));
  }
}

export const authService = new AuthService();
