import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card } from "../components/common/Card";
import { LoginForm } from "../components/auth/LoginForm";
import { PlayerClaim } from "../components/auth/PlayerClaim";
import { useAuthStore } from "../stores/authStore";
import { useAuth } from "../hooks/useAuth";
import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { logger } from "../lib/logger";

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, player, isLoading } = useAuthStore();
  const { checkPlayerClaim } = useAuth();
  const [showPlayerClaim, setShowPlayerClaim] = useState(false);
  const [hasCheckedClaim, setHasCheckedClaim] = useState(false);

  // Get redirect path from location state
  const from = (location.state as any)?.from?.pathname || "/";

  // Reset hasCheckedClaim when user changes
  useEffect(() => {
    if (!user) {
      setHasCheckedClaim(false);
      setShowPlayerClaim(false);
    }
  }, [user]);

  useEffect(() => {
    logger.info("Login page mounted", {
      component: "LoginPage",
      action: "mount",
      metadata: { redirectPath: from },
    });

    // Check if user is already authenticated
    if (user && !hasCheckedClaim) {
      setHasCheckedClaim(true);
      checkPlayerClaim()
        .then((hasClaim) => {
          if (hasClaim) {
            logger.info("User already authenticated with claim", {
              component: "LoginPage",
              action: "redirect",
              userId: user.id,
              metadata: { redirectPath: from },
            });
            navigate(from, { replace: true });
          } else {
            logger.info("User authenticated but needs to claim player", {
              component: "LoginPage",
              action: "showClaim",
              userId: user.id,
            });
            setShowPlayerClaim(true);
          }
        })
        .catch((error) => {
          logger.error(
            "Failed to check player claim",
            {
              component: "LoginPage",
              action: "checkPlayerClaim",
              userId: user.id,
            },
            error
          );
          // Show player claim screen anyway
          setShowPlayerClaim(true);
        });
    }
  }, [user, navigate, from, checkPlayerClaim]);

  const handleLoginSuccess = () => {
    logger.info("Login successful, checking for player claim", {
      component: "LoginPage",
      action: "loginSuccess",
      userId: user?.id,
    });
    // After successful login, check if user needs to claim a player
    setShowPlayerClaim(true);
  };

  const handleClaimSuccess = () => {
    logger.info("Player claim successful, redirecting", {
      component: "LoginPage",
      action: "claimSuccess",
      userId: user?.id,
      metadata: { redirectPath: from },
    });
    navigate(from, { replace: true });
  };

  if (isLoading || (user && !hasCheckedClaim)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Logo/Title */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Pickleball Tracker
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Sign in to manage your tournaments
          </p>
        </div>

        {/* Card Container */}
        <Card className="p-8">
          {!user ? (
            <LoginForm onSuccess={handleLoginSuccess} />
          ) : showPlayerClaim ? (
            <PlayerClaim onSuccess={handleClaimSuccess} />
          ) : (
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                Setting up your account...
              </p>
            </div>
          )}
        </Card>

        {/* Help Text */}
        <div className="text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            New to Pickleball Tracker?{" "}
            <span className="font-medium text-gray-900 dark:text-white">
              Enter your email above to get started
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
