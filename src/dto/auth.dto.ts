/**
 * Cuerpo enviado a POST /api/auth/login.
 * Refleja el esquema `LoginSolicitud` de MS1.
 */
export interface LoginRequestDto {
  email: string;
  password: string;
}

/**
 * Cuerpo enviado a POST /api/auth/register.
 * Refleja el esquema `RegistroSolicitud` de MS1. `full_name` admite hasta 120 caracteres.
 */
export interface RegisterRequestDto {
  email: string;
  password: string;
  full_name: string;
}

/**
 * Usuario devuelto por GET /api/auth/me y en el campo `user` del login.
 * Refleja el esquema `UsuarioRespuesta` de MS1.
 * `roles` se recibe como texto libre; la conversión al rol de la app la hace el mapper.
 */
export interface UserResponseDto {
  id: number;
  email: string;
  full_name: string;
  roles: string[];
  is_active: boolean;
}

/**
 * Respuesta de POST /api/auth/login.
 * Refleja el esquema `TokenRespuesta` de MS1.
 */
export interface LoginResponseDto {
  access_token: string;
  token_type: string;
  user: UserResponseDto;
}