import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { ROUTES } from '../../router';
import { cn } from '../../lib/utils';
import { FocusTrap, useFocusManagement } from '../common/Accessibility';

export function Navigation() {
  const location = useLocation();
  const { user, role, isAuthenticated, isLoading } = useAuthStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { saveFocus, restoreFocus } = useFocusManagement();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        restoreFocus();
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [isMobileMenuOpen, restoreFocus]);

  const handleMobileMenuToggle = () => {
    if (!isMobileMenuOpen) {
      saveFocus();
    } else {
      restoreFocus();
    }
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

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
            <div className="hidden md:flex items-center space-x-6">
              <div className="w-20 h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-24 h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
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
                  'px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
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
                  className="text-sm text-gray-600 hover:text-gray-900 px-2 py-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                to={ROUTES.LOGIN}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 min-h-[44px] transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 min-h-[44px] min-w-[44px]"
              onClick={handleMobileMenuToggle}
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle navigation menu"
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <FocusTrap 
          isActive={isMobileMenuOpen}
          onEscape={() => setIsMobileMenuOpen(false)}
        >
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t border-gray-200">
              {visibleNavItems.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={cn(
                    'block px-3 py-3 rounded-md text-base font-medium transition-colors motion-reduce:transition-none min-h-[44px] flex items-center',
                    location.pathname === item.href ||
                      location.pathname.startsWith(item.href)
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              
              {/* Mobile User Menu */}
              {isAuthenticated() && (
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="px-3 py-2">
                    <div className="text-sm text-gray-600 mb-1">
                      {user?.email}
                    </div>
                    <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-800 capitalize">
                      {role.replace('_', ' ')}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      restoreFocus();
                      // Sign out functionality will be implemented in Phase 2
                      console.log('Sign out clicked');
                    }}
                    className="block w-full text-left px-3 py-3 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 min-h-[44px] flex items-center transition-colors motion-reduce:transition-none"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </FocusTrap>
      )}

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