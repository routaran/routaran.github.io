// Re-export all stores from a central location
export { useAuthStore } from './authStore';
export { useAppStore } from './appStore';

// Store types for testing and external usage
export type { AuthState } from './authStore';
export type { AppState } from './appStore';