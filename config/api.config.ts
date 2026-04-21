/**
 * API Configuration
 * Centralized API URL management for environment-aware deployment
 */

/**
 * Get the API base URL from environment variables
 * In development mode, Vite proxy handles requests automatically
 * In production mode, use VITE_API_URL from environment
 */
const getApiBaseUrl = (): string => {
  // Vite environment variable (defined at build time)
  const viteApiUrl = import.meta.env.VITE_API_URL;

  if (viteApiUrl) {
    return `${viteApiUrl}/api`;
  }

  // Default for development (will be proxied by Vite)
  return '/api';
};

/**
 * API Base URL - use this for all API requests
 */
export const API_BASE_URL = getApiBaseUrl();

/**
 * Direct API URL (bypassing proxy) - for special cases
 */
export const DIRECT_API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:4000/api';

export default API_BASE_URL;