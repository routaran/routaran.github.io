import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { PlayDate, Match, Player, MatchResult } from '../types/database';

interface AppState {
  // Current play date state
  currentPlayDate: PlayDate | null;
  players: Player[];
  matches: Match[];
  rankings: MatchResult[];
  
  // UI state
  isLoading: boolean;
  error: string | null;
  selectedMatch: Match | null;
  
  // Real-time connection state
  isConnected: boolean;
  lastUpdate: Date | null;
  
  // Actions
  setCurrentPlayDate: (playDate: PlayDate | null) => void;
  setPlayers: (players: Player[]) => void;
  setMatches: (matches: Match[]) => void;
  setRankings: (rankings: MatchResult[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSelectedMatch: (match: Match | null) => void;
  setConnected: (connected: boolean) => void;
  updateLastUpdate: () => void;
  reset: () => void;
  
  // Computed
  getMatchById: (id: string) => Match | undefined;
  getPlayerById: (id: string) => Player | undefined;
  getMatchesForRound: (round: number) => Match[];
  getCurrentRound: () => number;
  getTotalRounds: () => number;
  getCompletedMatches: () => Match[];
  getPendingMatches: () => Match[];
}

const initialState = {
  currentPlayDate: null,
  players: [],
  matches: [],
  rankings: [],
  isLoading: false,
  error: null,
  selectedMatch: null,
  isConnected: false,
  lastUpdate: null,
};

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      setCurrentPlayDate: (currentPlayDate) => {
        set({ currentPlayDate }, false, 'setCurrentPlayDate');
      },
      
      setPlayers: (players) => {
        set({ players }, false, 'setPlayers');
      },
      
      setMatches: (matches) => {
        set({ matches }, false, 'setMatches');
      },
      
      setRankings: (rankings) => {
        set({ rankings }, false, 'setRankings');
      },
      
      setLoading: (isLoading) => {
        set({ isLoading }, false, 'setLoading');
      },
      
      setError: (error) => {
        set({ error }, false, 'setError');
      },
      
      setSelectedMatch: (selectedMatch) => {
        set({ selectedMatch }, false, 'setSelectedMatch');
      },
      
      setConnected: (isConnected) => {
        set({ isConnected }, false, 'setConnected');
      },
      
      updateLastUpdate: () => {
        set({ lastUpdate: new Date() }, false, 'updateLastUpdate');
      },
      
      reset: () => {
        set(initialState, false, 'reset');
      },
      
      // Computed properties
      getMatchById: (id: string) => {
        return get().matches.find((match) => match.id === id);
      },
      
      getPlayerById: (id: string) => {
        return get().players.find((player) => player.id === id);
      },
      
      getMatchesForRound: (round: number) => {
        return get().matches.filter((match) => match.round_number === round);
      },
      
      getCurrentRound: () => {
        const matches = get().matches;
        if (matches.length === 0) return 1;
        
        // Find the first round with incomplete matches
        const rounds = [...new Set(matches.map(m => m.round_number))].sort();
        
        for (const round of rounds) {
          const roundMatches = matches.filter(m => m.round_number === round);
          const incompleteMatches = roundMatches.filter(m => 
            m.team1_score === null || m.team2_score === null
          );
          
          if (incompleteMatches.length > 0) {
            return round;
          }
        }
        
        // All matches complete, return last round + 1
        return Math.max(...rounds) + 1;
      },
      
      getTotalRounds: () => {
        const matches = get().matches;
        if (matches.length === 0) return 0;
        return Math.max(...matches.map(m => m.round_number));
      },
      
      getCompletedMatches: () => {
        return get().matches.filter(match => 
          match.team1_score !== null && match.team2_score !== null
        );
      },
      
      getPendingMatches: () => {
        return get().matches.filter(match => 
          match.team1_score === null || match.team2_score === null
        );
      },
    }),
    {
      name: 'app-store',
    }
  )
);