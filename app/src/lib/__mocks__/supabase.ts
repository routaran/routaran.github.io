import { vi } from 'vitest';

// Mock Supabase client
export const supabase = {
  auth: {
    signInWithOtp: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    getUser: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
  from: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
};

// Mock auth helpers
export const auth = {
  signIn: vi.fn(),
  signOut: vi.fn(),
  getSession: vi.fn(),
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
};

// Mock database helpers
export const db = {
  getPlayDates: vi.fn(),
  getPlayDate: vi.fn(),
  getPlayers: vi.fn(),
  getMatches: vi.fn(),
  updateMatchScore: vi.fn(),
  updateMatchScoreWithValidation: vi.fn(),
  getRankings: vi.fn(),
  from: vi.fn(),
};

// Mock real-time helpers
export const realtime = {
  subscribeToMatches: vi.fn(),
  subscribeToRankings: vi.fn(),
  unsubscribe: vi.fn(),
};

export default supabase;