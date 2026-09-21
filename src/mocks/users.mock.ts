import { User } from '@/models';

export const mockUsers: User[] = [
  {
    id: 'usr-001',
    name: 'Javier Monsalvez',
    email: 'jmonsalvez@tallerconnect.cl',
    role: 'cliente',
    phone: '+56912345678',
    createdAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'usr-002',
    name: 'Victor Sepulveda',
    email: 'vsepulveda@tallerconnect.cl',
    role: 'mecanico',
    phone: '+56987654321',
    createdAt: '2026-02-01T09:30:00.000Z',
  },
  {
    id: 'usr-003',
    name: 'Juan LLanca',
    email: 'jllanca@tallerconnect.cl',
    role: 'administrador',
    phone: '+56911223344',
    createdAt: '2025-12-01T08:00:00.000Z',
  },
];

export const mockUserByRole: Record<User['role'], User> = {
  cliente: mockUsers[0],
  mecanico: mockUsers[1],
  administrador: mockUsers[2],
};