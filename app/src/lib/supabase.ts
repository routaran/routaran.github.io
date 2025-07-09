import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Please check your .env file.'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // Use PKCE flow for better security
  },
  realtime: {
    params: {
      eventsPerSecond: 10, // Optimize for real-time performance
    },
  },
});

// Auth helpers
export const auth = {
  signIn: async (email: string) => {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getSession: async () => {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  },

  getUser: async () => {
    const { data, error } = await supabase.auth.getUser();
    return { user: data.user, error };
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback);
  },
};

// Database helpers with error handling
export const db = {
  // Play Dates
  getPlayDates: async () => {
    const { data, error } = await supabase
      .from('play_dates')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw new Error(`Failed to fetch play dates: ${error.message}`);
    return data;
  },

  getPlayDate: async (id: string) => {
    const { data, error } = await supabase
      .from('play_dates')
      .select(`
        *,
        players (*),
        partnerships (*),
        matches (*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw new Error(`Failed to fetch play date: ${error.message}`);
    return data;
  },

  // Players
  getPlayers: async (playDateId: string) => {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .eq('play_date_id', playDateId)
      .order('name');
    
    if (error) throw new Error(`Failed to fetch players: ${error.message}`);
    return data;
  },

  // Matches
  getMatches: async (playDateId: string) => {
    const { data, error } = await supabase
      .from('matches')
      .select(`
        *,
        partnership1:partnerships!partnership1_id (*),
        partnership2:partnerships!partnership2_id (*)
      `)
      .eq('play_date_id', playDateId)
      .order('round_number', { ascending: true })
      .order('court_number', { ascending: true });
    
    if (error) throw new Error(`Failed to fetch matches: ${error.message}`);
    return data;
  },

  updateMatchScore: async (
    matchId: string, 
    team1Score: number, 
    team2Score: number, 
    currentVersion: number
  ) => {
    const { data, error } = await supabase
      .from('matches')
      .update({
        team1_score: team1Score,
        team2_score: team2Score,
        version: currentVersion + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', matchId)
      .eq('version', currentVersion) // Optimistic locking
      .select()
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('Match was updated by another user. Please refresh and try again.');
      }
      throw new Error(`Failed to update match score: ${error.message}`);
    }
    return data;
  },

  // Rankings
  getRankings: async (playDateId: string) => {
    const { data, error } = await supabase
      .from('match_results')
      .select('*')
      .eq('play_date_id', playDateId)
      .order('games_won', { ascending: false })
      .order('points_for', { ascending: false });
    
    if (error) throw new Error(`Failed to fetch rankings: ${error.message}`);
    return data;
  },
};

// Real-time subscriptions
export const realtime = {
  subscribeToMatches: (playDateId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`matches:${playDateId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `play_date_id=eq.${playDateId}`,
        },
        callback
      )
      .subscribe();
  },

  subscribeToRankings: (playDateId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`rankings:${playDateId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_results',
          filter: `play_date_id=eq.${playDateId}`,
        },
        callback
      )
      .subscribe();
  },

  unsubscribe: (channel: any) => {
    return supabase.removeChannel(channel);
  },
};

export default supabase;