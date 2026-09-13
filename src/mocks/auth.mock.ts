import { AuthResponse, User } from '@/models';
import { mockUsers } from './users.mock';

export const mockAuthResponses: Record<User['role'], AuthResponse> = {
  cliente: {
    user: mockUsers[0],
    token: 'mock-token-cliente',
    refreshToken: 'mock-refresh-cliente',
  },
  mecanico: {
    user: mockUsers[1],
    token: 'mock-token-mecanico',
    refreshToken: 'mock-refresh-mecanico',
  },
  administrador: {
    user: mockUsers[2],
    token: 'mock-token-administrador',
    refreshToken: 'mock-refresh-administrador',
  },
};