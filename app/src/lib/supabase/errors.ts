/**
 * Custom error classes for Supabase operations
 */

export class SupabaseError extends Error {
  constructor(
    message: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SupabaseError';
  }
}

export class AuthError extends SupabaseError {
  constructor(message: string, code?: string, details?: any) {
    super(message, code, details);
    this.name = 'AuthError';
  }
}

export class DatabaseError extends SupabaseError {
  constructor(message: string, code?: string, details?: any) {
    super(message, code, details);
    this.name = 'DatabaseError';
  }
}

export class RealtimeError extends SupabaseError {
  constructor(message: string, code?: string, details?: any) {
    super(message, code, details);
    this.name = 'RealtimeError';
  }
}

export class ValidationError extends SupabaseError {
  constructor(message: string, code?: string, details?: any) {
    super(message, code, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends SupabaseError {
  constructor(message: string, code?: string, details?: any) {
    super(message, code, details);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends SupabaseError {
  constructor(message: string, code?: string, details?: any) {
    super(message, code, details);
    this.name = 'ConflictError';
  }
}

export class NetworkError extends SupabaseError {
  constructor(message: string, code?: string, details?: any) {
    super(message, code, details);
    this.name = 'NetworkError';
  }
}

export class RateLimitError extends SupabaseError {
  constructor(message: string, code?: string, details?: any) {
    super(message, code, details);
    this.name = 'RateLimitError';
  }
}

// Error handler utility
export function handleSupabaseError(error: any): SupabaseError {
  if (error instanceof SupabaseError) {
    return error;
  }

  const message = error?.message || 'An unknown error occurred';
  const code = error?.code || 'UNKNOWN_ERROR';

  // Map common Supabase error codes to specific error types
  if (code === 'PGRST116' || code === '404') {
    return new NotFoundError(message, code, error);
  }

  if (code === '409' || code === 'PGRST201') {
    return new ConflictError(message, code, error);
  }

  if (code === '429') {
    return new RateLimitError(message, code, error);
  }

  if (code.startsWith('AUTH_')) {
    return new AuthError(message, code, error);
  }

  if (code.startsWith('PGRST')) {
    return new DatabaseError(message, code, error);
  }

  if (error?.name === 'NetworkError' || code === 'NETWORK_ERROR') {
    return new NetworkError(message, code, error);
  }

  return new SupabaseError(message, code, error);
}