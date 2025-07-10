import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from './components/layout/RootLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { PlayDateCreatePage } from './pages/PlayDateCreatePage';
import { PlayDateDetailPage } from './pages/PlayDateDetailPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { RankingsPage } from './pages/RankingsPage';

// Page imports (these will be created in Phase 2)
const ScoreEntryPage = () => <div>Score Entry Page</div>;
const MatchDetailsPage = () => <div>Match Details Page</div>;
const ProfilePage = () => <div>Profile Page</div>;
const AuditLogPage = () => <div>Audit Log Page</div>;
const NotFoundPage = () => <div>404 - Page Not Found</div>;

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <ErrorBoundary />,
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'login',
        element: <LoginPage />,
      },
      {
        path: 'auth/callback',
        element: <AuthCallbackPage />,
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'play-dates',
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },
          {
            path: 'create',
            element: (
              <ProtectedRoute>
                <PlayDateCreatePage />
              </ProtectedRoute>
            ),
          },
          {
            path: ':id',
            element: (
              <ProtectedRoute>
                <PlayDateDetailPage />
              </ProtectedRoute>
            ),
          },
          {
            path: ':id/score-entry',
            element: (
              <ProtectedRoute>
                <ScoreEntryPage />
              </ProtectedRoute>
            ),
          },
          {
            path: ':id/rankings',
            element: <RankingsPage />, // Public access for visitors
          },
          {
            path: ':id/matches/:matchId',
            element: <MatchDetailsPage />, // Public access for visitors
          },
        ],
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin',
        children: [
          {
            path: 'audit-log',
            element: (
              <ProtectedRoute requiredRole="project_owner">
                <AuditLogPage />
              </ProtectedRoute>
            ),
          },
        ],
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
], {
  basename: import.meta.env.VITE_BASE_URL || '/',
});

// Route paths for easy reference
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  PLAY_DATES: {
    CREATE: '/play-dates/create',
    DETAIL: (id: string) => `/play-dates/${id}`,
    SCORE_ENTRY: (id: string) => `/play-dates/${id}/score-entry`,
    RANKINGS: (id: string) => `/play-dates/${id}/rankings`,
    MATCH_DETAILS: (id: string, matchId: string) => `/play-dates/${id}/matches/${matchId}`,
  },
  PROFILE: '/profile',
  ADMIN: {
    AUDIT_LOG: '/admin/audit-log',
  },
} as const;