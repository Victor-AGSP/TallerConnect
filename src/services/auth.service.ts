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
 * TIPOS DEL BACKEND
 * ============================================================
 */

/**
 * Usuario entregado por:
 *
 * GET /api/auth/me
 */
interface BackendUser {
  id: number;
  email: string;
  full_name: string;
  roles: string[];
  is_active: boolean;
}

/**
 * Respuesta REAL de:
 *
 * POST /api/auth/login
 *
 * El backend actualmente entrega el token.
 * Los datos del usuario se obtienen posteriormente mediante
 * GET /api/auth/me.
 */
interface BackendLoginResponse {
  access_token: string;
  token_type?: string;
}

/**
 * ============================================================
 * UTILIDADES
 * ============================================================
 */

function getErrorMessage(
  error: unknown,
  fallback: string
): string {
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error) {
      return error.message;
    }

    return fallback;
  }

  const status = error.response?.status;

  const detail =
    error.response?.data?.detail;

  if (typeof detail === 'string') {
    return detail;
  }

  if (Array.isArray(detail)) {
    const firstMessage =
      detail[0]?.msg;

    if (typeof firstMessage === 'string') {
      return firstMessage;
    }
  }

  if (status === 400) {
    return 'La solicitud no es válida.';
  }

  if (status === 401) {
    return 'Correo o contraseña incorrectos.';
  }

  if (status === 403) {
    return 'No tienes permisos para realizar esta acción.';
  }

  if (status === 404) {
    return 'El servicio solicitado no está disponible.';
  }

  if (status && status >= 500) {
    return 'El servidor presentó un problema. Inténtalo nuevamente.';
  }

  if (error.code === 'ECONNABORTED') {
    return 'La solicitud tardó demasiado. Verifica tu conexión.';
  }

  if (!error.response) {
    return 'No fue posible conectarse con el servidor.';
  }

  return fallback;
}

/**
 * ============================================================
 * MAPEAR USUARIO DEL BACKEND
 * ============================================================
 *
 * Convierte el modelo del backend al modelo utilizado
 * internamente por TallerConnect.
 */
function mapBackendUser(
  backendUser: BackendUser
): User {
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

  return {
    id: String(backendUser.id),

    name: backendUser.full_name,

    email: backendUser.email,

    role,
  };
}

/**
 * ============================================================
 * MOCK LOGIN
 * ============================================================
 */

async function mockLogin(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 700);
  });

  const email =
    credentials.email
      .trim()
      .toLowerCase();

  const demoUser =
    DEMO_USERS.find(
      (item) =>
        item.email === email
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
 *
 * Flujo real:
 *
 * 1. POST /api/auth/login
 * 2. Backend devuelve access_token
 * 3. GET /api/auth/me usando ese token
 * 4. Se convierte el usuario al modelo interno
 */
async function apiLogin(
  credentials: LoginCredentials
): Promise<AuthResponse> {
  try {
    /**
     * --------------------------------------------------------
     * PASO 1: LOGIN
     * --------------------------------------------------------
     */
    const loginResponse =
      await apiClient.post<BackendLoginResponse>(
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
      loginResponse.data.access_token;

    if (!token) {
      throw new Error(
        'El servidor no entregó un token de acceso.'
      );
    }

    /**
     * --------------------------------------------------------
     * PASO 2: OBTENER USUARIO
     * --------------------------------------------------------
     *
     * El token todavía no está guardado en storage porque
     * estamos dentro del login.
     *
     * Por eso enviamos el Authorization manualmente en esta
     * petición.
     */
    const meResponse =
      await apiClient.get<BackendUser>(
        '/auth/me',
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

    const user =
      mapBackendUser(
        meResponse.data
      );

    /**
     * --------------------------------------------------------
     * RESULTADO
     * --------------------------------------------------------
     */
    return {
      user,

      token,
    };
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        'No se pudo iniciar sesión.'
      )
    );
  }
}

/**
 * ============================================================
 * OBTENER USUARIO ACTUAL
 * ============================================================
 *
 * GET /api/auth/me
 *
 * En este caso el interceptor de apiClient agrega
 * automáticamente el JWT almacenado.
 */
export async function getCurrentUser(): Promise<User> {
  try {
    const response =
      await apiClient.get<BackendUser>(
        '/auth/me'
      );

    return mapBackendUser(
      response.data
    );
  } catch (error) {
    throw new Error(
      getErrorMessage(
        error,
        'No se pudo validar la sesión.'
      )
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
    return mockLogin(credentials);
  }

  return apiLogin(credentials);
}