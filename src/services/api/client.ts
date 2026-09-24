import axios from 'axios';

export const apiClient = axios.create({
  /**
   * El backend del proyecto utiliza un API Gateway
   * como punto de entrada.
   *
   * Para desarrollo local:
   *
   * http://localhost:8000/api
   */
  baseURL:
    process.env.EXPO_PUBLIC_API_URL ??
    'http://localhost:8000/api',

  timeout: 10000,

  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});