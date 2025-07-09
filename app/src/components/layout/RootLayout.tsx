import { Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { Navigation } from './Navigation';
import { useAuthStore } from '../../stores/authStore';
import { auth } from '../../lib/supabase';

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
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}