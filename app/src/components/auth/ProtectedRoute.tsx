import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../stores/authStore';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ROUTES } from '../../router';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiresPlayer?: boolean;
  roles?: string[];
  requiredRole?: string;
}

export function ProtectedRoute({ children, requiresPlayer = true, roles, requiredRole }: ProtectedRouteProps) {
  const location = useLocation();
  const { isAuthenticated, isLoading, isInitialized, player } = useAuth();
  const { role } = useAuthStore();

  // Show loading while auth is initializing
  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // Check if user has claimed a player (if required)
  if (requiresPlayer && !player) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // Check role-based access (support both roles array and requiredRole)
  const requiredRoles = requiredRole ? [requiredRole] : roles;
  if (requiredRoles && requiredRoles.length > 0 && !requiredRoles.includes(role)) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return <>{children}</>;
}

// Export a higher-order component for easier route protection
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options?: {
    requiresPlayer?: boolean;
    roles?: string[];
  }
) {
  return (props: P) => (
    <ProtectedRoute {...options}>
      <Component {...props} />
    </ProtectedRoute>
  );
}