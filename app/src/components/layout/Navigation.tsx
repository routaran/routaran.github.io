import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { ROUTES } from '../../router';
import { cn } from '../../lib/utils';

export function Navigation() {
  const location = useLocation();
  const { user, role, isAuthenticated, isLoading } = useAuthStore();

  const navItems = [
    {
      href: ROUTES.DASHBOARD,
      label: 'Dashboard',
      requiresAuth: true,
    },
    {
      href: ROUTES.PLAY_DATES.CREATE,
      label: 'Create Tournament',
      requiresAuth: true,
      roles: ['project_owner', 'organizer'],
    },
    {
      href: ROUTES.PROFILE,
      label: 'Profile',
      requiresAuth: true,
    },
    {
      href: ROUTES.ADMIN.AUDIT_LOG,
      label: 'Audit Log',
      requiresAuth: true,
      roles: ['project_owner'],
    },
  ];

  const visibleNavItems = navItems.filter((item) => {
    if (item.requiresAuth && !isAuthenticated()) return false;
    if (item.roles && !item.roles.includes(role)) return false;
    return true;
  });

  if (isLoading) {
    return (
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="w-6 h-6 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-32 h-4 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <Link to={ROUTES.HOME} className="flex items-center space-x-2">
              <svg
                className="w-6 h-6 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              <span className="text-lg font-semibold text-gray-900">
                Pickleball Tracker
              </span>
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            {visibleNavItems.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  location.pathname === item.href ||
                    location.pathname.startsWith(item.href)
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {isAuthenticated() ? (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600 hidden sm:block">
                  {user?.email}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 capitalize">
                  {role.replace('_', ' ')}
                </span>
                <button
                  onClick={() => {
                    // Sign out functionality will be implemented in Phase 2
                    console.log('Sign out clicked');
                  }}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                to={ROUTES.LOGIN}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Connection Status Indicator */}
      <div className="bg-primary-50 border-t border-primary-100 px-4 py-1">
        <div className="container mx-auto">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-primary-700">Connected</span>
            </div>
            <span className="text-primary-600">
              {import.meta.env.VITE_APP_NAME} v{import.meta.env.VITE_APP_VERSION}
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}