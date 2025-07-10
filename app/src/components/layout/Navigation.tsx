import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useIsRealtimeConnected } from "../../contexts/RealtimeContext";
import { cn } from "../../lib/utils";
import { FocusTrap, useFocusManagement } from "../common/Accessibility";
import { User, Crown, LogOut, Wifi, WifiOff } from "lucide-react";
import { ROUTES } from "../../router";

export function Navigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, player, isAuthenticated, isInitialized, signOut } = useAuth();
  const isRealtimeConnected = useIsRealtimeConnected();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { saveFocus, restoreFocus } = useFocusManagement();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
        restoreFocus();
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => document.removeEventListener("keydown", handleEscapeKey);
  }, [isMobileMenuOpen, restoreFocus]);

  const handleMobileMenuToggle = () => {
    if (!isMobileMenuOpen) {
      saveFocus();
    } else {
      restoreFocus();
    }
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      requiresAuth: false,
    },
    {
      href: "/play-dates",
      label: "Play Dates",
      requiresAuth: false,
    },
    {
      href: "/profile",
      label: "Profile",
      requiresAuth: true,
    },
  ];

  // Add admin items for project owners
  if (player?.project_owner) {
    navItems.push({
      href: "/admin",
      label: "Admin",
      requiresAuth: true,
    });
  }

  const visibleNavItems = navItems.filter((item) => {
    if (item.requiresAuth && !isAuthenticated) return false;
    return true;
  });

  if (!isInitialized) {
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
                  "px-3 py-2 rounded-md text-sm font-medium transition-colors min-h-[44px] flex items-center focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2",
                  location.pathname === item.href ||
                    location.pathname.startsWith(item.href)
                    ? "bg-primary-100 text-primary-700"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                )}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600 hidden sm:block">
                  {player?.name || user?.email}
                </span>

                {/* Role Badge */}
                {player && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
                      player.project_owner
                        ? "bg-purple-100 text-purple-800"
                        : "bg-blue-100 text-blue-800"
                    )}
                  >
                    {player.project_owner ? (
                      <>
                        <Crown className="w-3 h-3" />
                        Owner
                      </>
                    ) : (
                      <>
                        <User className="w-3 h-3" />
                        Player
                      </>
                    )}
                  </span>
                )}

                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 min-h-[44px]"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 min-h-[44px] transition-colors"
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
                    "block px-3 py-3 rounded-md text-base font-medium transition-colors motion-reduce:transition-none min-h-[44px] flex items-center",
                    location.pathname === item.href ||
                      location.pathname.startsWith(item.href)
                      ? "bg-primary-100 text-primary-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                  )}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}

              {/* Mobile User Menu */}
              {isAuthenticated && (
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="px-3 py-2">
                    <div className="text-sm text-gray-600 mb-2">
                      {player?.name || user?.email}
                    </div>
                    {player && (
                      <div
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
                          player.project_owner
                            ? "bg-purple-100 text-purple-800"
                            : "bg-blue-100 text-blue-800"
                        )}
                      >
                        {player.project_owner ? (
                          <>
                            <Crown className="w-3 h-3" />
                            Owner
                          </>
                        ) : (
                          <>
                            <User className="w-3 h-3" />
                            Player
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      restoreFocus();
                      handleSignOut();
                    }}
                    className="block w-full text-left px-3 py-3 rounded-md text-base font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 min-h-[44px] flex items-center gap-2 transition-colors motion-reduce:transition-none"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </FocusTrap>
      )}

      {/* Connection Status Indicator */}
      <div
        className={cn(
          "border-t px-4 py-1 transition-colors",
          isRealtimeConnected
            ? "bg-green-50 border-green-100"
            : "bg-yellow-50 border-yellow-100"
        )}
      >
        <div className="container mx-auto">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              {isRealtimeConnected ? (
                <>
                  <Wifi className="w-3 h-3 text-green-600" />
                  <span className="text-green-700">Real-time Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3 text-yellow-600" />
                  <span className="text-yellow-700">
                    Real-time Disconnected
                  </span>
                </>
              )}
            </div>
            <span className="text-gray-600">Pickleball Tracker</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
