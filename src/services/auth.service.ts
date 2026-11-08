import axios from 'axios';

import type {
  AuthResponse,
  LoginCredentials,
} from '@/models/auth.model';

import type {
  User,
} from '@/models/user.model';

import {
  apiClient,
} from '@/services/api/client';

import type {
  LoginResponseDto,
  UserResponseDto,
} from '@/dto/auth.dto';

import {
  mapLoginResponse,
  mapUserResponse,
} from '@/mappers/auth.mapper';

import {
  normalizeApiError,
} from '@/services/api/interceptors';

/**
 * ============================================================
 * CONFIGURACIÓN
 * ============================================================
 *
 * Por defecto se utiliza el backend REAL.
 *
 * Para utilizar usuarios demo:
 *
 * EXPO_PUBLIC_USE_MOCK_AUTH=true
 */
const USE_MOCK_AUTH =
  process.env.EXPO_PUBLIC_USE_MOCK_AUTH === 'true';

/**
 * ============================================================
 * USUARIOS DEMO
 * ============================================================
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
 * ============================================================
 * MOCK LOGIN
 * ============================================================
 */

async function mockLogin(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  await new Promise<void>(
    (resolve) => {
      setTimeout(
        resolve,
        700
      );
    }
  );

  const email =
    credentials.email
      .trim()
      .toLowerCase();

  const demoUser =
    DEMO_USERS.find(
      (item) =>
        item.email ===
        email
    );

  if (
    !demoUser ||
    demoUser.password !==
      credentials.password
  ) {
    throw new Error(
      'Correo o contraseña incorrectos.'
    );
  }

  return {
    user: demoUser.user,

    token:
      `demo-token-${demoUser.user.id}`,
  };
}

/**
 * ============================================================
 * LOGIN REAL
 * ============================================================
 */

async function apiLogin(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  try {
    const loginResponse =
      await apiClient.post<LoginResponseDto>(
        '/auth/login',
        {
          email:
            credentials.email
              .trim()
              .toLowerCase(),

          password:
            credentials.password,
        }
      );

    const token =
      loginResponse.data
        .access_token;

    if (!token) {
      throw new Error(
        'El servidor no entregó un token de acceso.'
      );
    }

    if (loginResponse.data.user) {
      return mapLoginResponse(loginResponse.data);
    }

    const meResponse =
      await apiClient.get<UserResponseDto>(
        '/auth/me',
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

    const user =
      mapUserResponse(
        meResponse.data
      );

    return {
      user,
      token,
    };
  } catch (error: unknown) {
    // Preserve application and storage errors; only Axios failures need
    // Gateway normalization before presenting a message to the user.
    if (!axios.isAxiosError(error) && error instanceof Error) {
      throw error;
    }
    if (
      error instanceof Error &&
      error.message === 'El servidor no entregó un token de acceso.'
    ) {
      throw error;
    }

    const normalized = normalizeApiError(error);
    const message =
      normalized.status === 401 &&
      (!axios.isAxiosError(error) || !error.response?.data?.detail)
        ? 'Correo o contraseña incorrectos.'
        : normalized.message;

    throw new Error(
      message || 'No se pudo iniciar sesión.'
    );
  }
}

/**
 * ============================================================
 * OBTENER USUARIO ACTUAL
 * ============================================================
 */

export async function getCurrentUser(): Promise<User> {
  try {
    const response =
      await apiClient.get<UserResponseDto>(
        '/auth/me'
      );

    return mapUserResponse(
      response.data
    );
  } catch (error: unknown) {
    const normalized = normalizeApiError(error);
    throw new Error(
      normalized.message || 'No se pudo validar la sesión.'
    );
  }
}

/**
 * ============================================================
 * LOGIN
 * ============================================================
 */

export async function login(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  if (USE_MOCK_AUTH) {
    return mockLogin(
      credentials
    );
  }

  return apiLogin(
    credentials
  );
}

/**
 * ============================================================
 * AUTH SERVICE
 * ============================================================
 *
 * Esta clase mantiene la interfaz que utiliza Develop:
 *
 * authService.login(...)
 *
 * Además mantenemos las funciones exportadas arriba para
 * compatibilidad con código que venía de Javier.
 */
export class AuthService {
  async login(
    credentials: LoginCredentials
  ): Promise<AuthResponse> {
    return login(
      credentials
    );
  }

  async getCurrentUser(): Promise<User> {
    return getCurrentUser();
  }
}

export const authService =
  new AuthService();
