import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { Navigation } from './Navigation';
import { useAuthStore } from '../../stores/authStore';
import { auth } from '../../lib/supabase';
import { ToastProvider } from '../../contexts/ToastContext';
import { RealtimeProvider } from '../../contexts/RealtimeContext';
import { ConnectionStatus } from '../ConnectionStatus';
import { SkipLink, AccessibilityChecker } from '../common/Accessibility';

export function RootLayout() {
  const { setAuth, setLoading, setInitialized, isInitialized } = useAuthStore();

  useEffect(() => {
    // Initialize auth state
    const initAuth = async () => {
      try {
        setLoading(true);
        
        // Get initial session
        const { session } = await auth.getSession();
        const { user } = await auth.getUser();
        
        setAuth(user, session);
        
        // Listen for auth changes
        const {
          data: { subscription },
        } = auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state changed:', event, session);
          setAuth(session?.user ?? null, session);
          
          if (event === 'SIGNED_OUT') {
            // Clear any cached data when user signs out
            // This will be expanded when we add more stores
          }
        });

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
        setInitialized(true);
      }
    };

    if (!isInitialized) {
      initAuth();
    }
  }, [setAuth, setLoading, setInitialized, isInitialized]);

  return (
    <ToastProvider>
      <RealtimeProvider autoConnect>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <SkipLink href="#main-content">Skip to main content</SkipLink>
          <AccessibilityChecker />
          
          <header className="sticky top-0 z-50">
            <Navigation />
          </header>
          
          <main 
            id="main-content" 
            className="flex-1 w-full mx-auto px-4 py-6 max-w-7xl sm:px-6 lg:px-8"
            role="main"
            aria-label="Main content"
          >
            <div className="w-full">
              <Outlet />
            </div>
          </main>
          
          <footer 
            className="bg-white border-t border-gray-200 py-4 mt-auto"
            role="contentinfo"
          >
            <div className="container mx-auto px-4 text-center">
              <p className="text-sm text-gray-600">
                © {new Date().getFullYear()} Pickleball Tracker. Built with React + Supabase.
              </p>
            </div>
          </footer>
          
          {/* Connection status indicator */}
          <ConnectionStatus 
            position="bottom-right"
            autoHide
            autoHideDelay={3000}
          />
        </div>
      </RealtimeProvider>
    </ToastProvider>
  );
}