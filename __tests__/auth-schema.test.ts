import { mockAuthResponses, mockUsers } from '@/mocks';
import {
  authResponseSchema,
  loginSchema,
  userSchema,
} from '@/schemas/auth.schema';

describe('Validación Zod con fixtures iniciales', () => {
  describe('userSchema', () => {
    it.each(mockUsers.map((user) => [user.role, user] as const))(
      'acepta el usuario mock con rol %s',
      (_role, user) => {
        expect(userSchema.safeParse(user).success).toBe(true);
      },
    );

    it('acepta un usuario sin los campos opcionales', () => {
      const { id, name, email, role } = mockUsers[0];

      expect(userSchema.safeParse({ id, name, email, role }).success).toBe(true);
    });

    it('rechaza un rol que no existe en la app', () => {
      const result = userSchema.safeParse({ ...mockUsers[0], role: 'supervisor' });

      expect(result.success).toBe(false);
    });

    it('rechaza un correo con formato inválido', () => {
      const result = userSchema.safeParse({ ...mockUsers[0], email: 'correo-invalido' });

      expect(result.success).toBe(false);
    });
  });

  describe('authResponseSchema', () => {
    it.each(Object.entries(mockAuthResponses))(
      'acepta la respuesta de autenticación mock de %s',
      (_role, response) => {
        expect(authResponseSchema.safeParse(response).success).toBe(true);
      },
    );

    it('acepta una respuesta sin refreshToken', () => {
      const { user, token } = mockAuthResponses.cliente;

      expect(authResponseSchema.safeParse({ user, token }).success).toBe(true);
    });

    it('rechaza una respuesta con token vacío', () => {
      const result = authResponseSchema.safeParse({ ...mockAuthResponses.cliente, token: '' });

      expect(result.success).toBe(false);
    });

    it('rechaza una respuesta cuyo usuario es inválido', () => {
      const result = authResponseSchema.safeParse({
        ...mockAuthResponses.cliente,
        user: { ...mockAuthResponses.cliente.user, role: 'supervisor' },
      });

      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('acepta credenciales con el correo de un usuario mock', () => {
      const result = loginSchema.safeParse({
        email: mockUsers[0].email,
        password: 'clave123',
      });

      expect(result.success).toBe(true);
    });

    it('elimina los espacios alrededor del correo', () => {
      const result = loginSchema.safeParse({
        email: `  ${mockUsers[0].email}  `,
        password: 'clave123',
      });

      expect(result.success).toBe(true);
      expect(result.data?.email).toBe(mockUsers[0].email);
    });

    it('rechaza un correo vacío con el mensaje esperado', () => {
      const result = loginSchema.safeParse({ email: '', password: 'clave123' });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe('El correo es obligatorio');
    });

    it('rechaza una contraseña de menos de 6 caracteres', () => {
      const result = loginSchema.safeParse({ email: mockUsers[0].email, password: '123' });

      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toBe(
        'La contraseña debe tener al menos 6 caracteres',
      );
    });
  });
});