import { UserRole } from '@/constants/roles';
import {
  LoginRequestDto,
  LoginResponseDto,
  UserResponseDto,
} from '@/dto/auth.dto';

/**
 * Usuarios con la forma exacta de `UsuarioRespuesta` (GET /api/auth/me).
 * Los ids y correos corresponden a los usuarios de prueba de la API;
 * los nombres de mecánico y administrador son simulados.
 */
export const userResponsePayloads: Record<UserRole, UserResponseDto> = {
  cliente: {
    id: 1,
    email: 'cliente@pruebas.cl',
    full_name: 'Cliente de Prueba',
    roles: ['cliente'],
    is_active: true,
  },
  mecanico: {
    id: 2,
    email: 'mecanico@pruebas.cl',
    full_name: 'Mecánico de Prueba',
    roles: ['mecanico'],
    is_active: true,
  },
  administrador: {
    id: 3,
    email: 'administrador@pruebas.cl',
    full_name: 'Administrador de Prueba',
    roles: ['administrador'],
    is_active: true,
  },
};

/**
 * Respuestas de login con la forma exacta de `TokenRespuesta` (POST /api/auth/login).
 * Los tokens son simulados y no son JWT válidos.
 */
export const loginResponsePayloads: Record<UserRole, LoginResponseDto> = {
  cliente: {
    access_token: 'token-simulado-cliente',
    token_type: 'bearer',
    user: userResponsePayloads.cliente,
  },
  mecanico: {
    access_token: 'token-simulado-mecanico',
    token_type: 'bearer',
    user: userResponsePayloads.mecanico,
  },
  administrador: {
    access_token: 'token-simulado-administrador',
    token_type: 'bearer',
    user: userResponsePayloads.administrador,
  },
};

/**
 * Cuerpo de login con la forma de `LoginSolicitud`.
 * La contraseña es simulada; las reales no deben quedar en el repositorio.
 */
export const loginRequestPayload: LoginRequestDto = {
  email: 'cliente@pruebas.cl',
  password: 'clave-simulada',
};

/**
 * Usuarios que cumplen el tipo del DTO, pero con roles que la app no reconoce.
 * Sirven para comprobar que el mapper los rechaza.
 */
type InvalidUserCase = 'unknownRole' | 'emptyRoles';

export const invalidUserResponsePayloads: Record<InvalidUserCase, UserResponseDto> = {
  unknownRole: {
    ...userResponsePayloads.cliente,
    roles: ['supervisor'],
  },
  emptyRoles: {
    ...userResponsePayloads.cliente,
    roles: [],
  },
};