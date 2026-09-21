import { apiClient } from '@/services/api/client';
import type { AuthResponse, LoginCredentials } from '@/models/auth.model';
import { authResponseSchema } from '@/schemas/auth.schema';

export class AuthService {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await apiClient.post<unknown>('/auth/login', credentials);

    return authResponseSchema.parse(response.data);
  }
}

export const authService = new AuthService();
