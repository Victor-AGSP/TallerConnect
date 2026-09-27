import type { LoginRequestDto, LoginResponseDto } from '@/dto/auth.dto';
import { mapLoginResponse } from '@/mappers/auth.mapper';
import type { AuthResponse, LoginCredentials } from '@/models/auth.model';
import type { User } from '@/models/user.model';
import { authResponseSchema } from '@/schemas/auth.schema';
import { apiClient } from '@/services/api/client';

const USE_MOCK_AUTH = process.env.EXPO_PUBLIC_USE_MOCK_AUTH !== 'false';

const DEMO_USERS: Array<{ email: string; user: User }> = [
  {
    email: 'cliente@demo.local',
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
    user: {
      id: 'demo-admin-001',
      name: 'Administrador Demo',
      email: 'admin@demo.local',
      role: 'administrador',
      phone: '+56 9 3333 3333',
    },
  },
];

async function mockLogin(credentials: LoginCredentials): Promise<AuthResponse> {
  await new Promise((resolve) => setTimeout(resolve, 700));
  const email = credentials.email.trim().toLowerCase();
  const demoUser = DEMO_USERS.find((item) => item.email === email);
  if (!demoUser || credentials.password !== '123456') {
    throw new Error('Correo o contraseña incorrectos.');
  }

  return authResponseSchema.parse({
    user: demoUser.user,
    token: `demo-token-${demoUser.user.id}`,
  });
}

export class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
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
