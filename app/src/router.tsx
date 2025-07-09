import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from './components/layout/RootLayout';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Page imports (these will be created in Phase 2)
const LoginPage = () => <div>Login Page</div>;
const DashboardPage = () => <div>Dashboard Page</div>;
const PlayDateCreatePage = () => <div>Create Play Date Page</div>;
const PlayDateDetailPage = () => <div>Play Date Detail Page</div>;
const ScoreEntryPage = () => <div>Score Entry Page</div>;
const RankingsPage = () => <div>Rankings Page</div>;
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
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'play-dates',
        children: [
          {
            path: 'create',
            element: <PlayDateCreatePage />,
          },
          {
            path: ':id',
            element: <PlayDateDetailPage />,
          },
          {
            path: ':id/score-entry',
            element: <ScoreEntryPage />,
          },
          {
            path: ':id/rankings',
            element: <RankingsPage />,
          },
          {
            path: ':id/matches/:matchId',
            element: <MatchDetailsPage />,
          },
        ],
      },
      {
        path: 'profile',
        element: <ProfilePage />,
      },
      {
        path: 'admin',
        children: [
          {
            path: 'audit-log',
            element: <AuditLogPage />,
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