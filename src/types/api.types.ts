/**
 * Respuesta genérica provisional del lado móvil.
 * No representa el contrato definitivo del backend: se revisará
 * cuando el contrato esté disponible.
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
}