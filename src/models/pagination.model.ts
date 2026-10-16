/**
 * Lista paginada entregada por los servicios que admiten `desde` y `limite`.
 * `total` es la cantidad total de elementos, no solo los de esta página.
 */
export interface PaginatedList<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}