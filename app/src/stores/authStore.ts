import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type { User, Session } from "@supabase/supabase-js";
import type { UserRole, Player } from "../types/database";
import { logger } from "../lib/logger";

interface AuthState {
  // State
  user: User | null;
  session: Session | null;
  player: Player | null;
  role: UserRole;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setAuth: (user: User | null, session: Session | null) => void;
  setPlayer: (player: Player | null) => void;
  setRole: (role: UserRole) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  reset: () => void;

  // Computed
  isAuthenticated: () => boolean;
  canCreatePlayDate: () => boolean;
  canManagePlayDate: (playDateCreatorId?: string) => boolean;
  canUpdateScore: (matchPlayerId?: string) => boolean;
}

const initialState = {
  user: null,
  session: null,
  player: null,
  role: "visitor" as UserRole,
  isLoading: true,
  isInitialized: false,
};

export const useAuthStore = create<AuthState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        setAuth: (user, session) => {
          logger.info("Auth state updated", {
            component: "authStore",
            action: "setAuth",
            userId: user?.id,
            metadata: { hasUser: !!user, hasSession: !!session },
          });
          set({ user, session }, false, "setAuth");
        },

        setPlayer: (player) => {
          logger.info("Player state updated", {
            component: "authStore",
            action: "setPlayer",
            userId: get().user?.id,
            metadata: {
              hasPlayer: !!player,
              playerName: player?.name,
              isProjectOwner: player?.is_project_owner,
            },
          });
          set({ player }, false, "setPlayer");

          // Update role based on player data
          if (player) {
            const role: UserRole = player.is_project_owner
              ? "project_owner"
              : "player";
            get().setRole(role);
          }
        },

        setRole: (role) => {
          logger.info("Role updated", {
            component: "authStore",
            action: "setRole",
            userId: get().user?.id,
            metadata: { role },
          });
          set({ role }, false, "setRole");
        },

        setLoading: (isLoading) => {
          set({ isLoading }, false, "setLoading");
        },

        setInitialized: (isInitialized) => {
          set({ isInitialized }, false, "setInitialized");
        },

        reset: () => {
          logger.info("Auth store reset", {
            component: "authStore",
            action: "reset",
            userId: get().user?.id,
          });
          set(initialState, false, "reset");
        },

        // Computed properties
        isAuthenticated: () => {
          return !!get().user && !!get().session;
        },

        canCreatePlayDate: () => {
          const { role, isAuthenticated } = get();
          return (
            isAuthenticated() &&
            (role === "project_owner" || role === "organizer")
          );
        },

        canManagePlayDate: (playDateCreatorId?: string) => {
          const { role, user, isAuthenticated } = get();

          if (!isAuthenticated()) return false;

          // Project owners can manage all play dates
          if (role === "project_owner") return true;

          // Organizers can only manage their own play dates
          if (role === "organizer" && user && playDateCreatorId) {
            return user.id === playDateCreatorId;
          }

          return false;
        },

        canUpdateScore: (matchPlayerId?: string) => {
          const { role, player, isAuthenticated } = get();

          if (!isAuthenticated()) return false;

          // Project owners and organizers can update any score
          if (role === "project_owner" || role === "organizer") return true;

          // Players can only update scores for matches they're in
          if (role === "player" && player && matchPlayerId) {
            const canUpdate = player.id === matchPlayerId;
            logger.debug("Score update permission check", {
              component: "authStore",
              action: "canUpdateScore",
              userId: get().user?.id,
              matchId: matchPlayerId,
              metadata: { role, canUpdate },
            });
            return canUpdate;
          }

          return false;
        },
      }),
      {
        name: "auth-store",
        partialize: (state) => ({
          // Only persist non-sensitive data
          role: state.role,
          isInitialized: state.isInitialized,
        }),
      }
    ),
    {
      name: "auth-store",
    }
  )
);
