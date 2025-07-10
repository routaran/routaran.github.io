import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./useAuth";
import { useToast } from "../contexts/ToastContext";
import { useRealtimeSubscription } from "./useRealtimeSubscription";
import type {
  PlayDate,
  PlayDateWithDetails,
  PlayDateInsert,
  PlayDateUpdate,
  Player,
  PlayerInsert,
} from "../types/database";
import * as playDatesApi from "../lib/supabase/playDates";
import * as playersApi from "../lib/supabase/players";

export function usePlayDate(playDateId?: string) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [playDate, setPlayDate] = useState<PlayDateWithDetails | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [isProjectOwner, setIsProjectOwner] = useState(false);

  // Subscribe to real-time updates for play date
  useRealtimeSubscription({
    table: "play_dates",
    filter: playDateId ? `id=eq.${playDateId}` : undefined,
    onInsert: (payload) => {
      if (payload.new.id === playDateId) {
        loadPlayDate();
      }
    },
    onUpdate: (payload) => {
      if (payload.new.id === playDateId) {
        loadPlayDate();
      }
    },
    onDelete: (payload) => {
      if (payload.old.id === playDateId) {
        showToast("Play date has been deleted", "error");
        navigate("/play-dates");
      }
    },
  });

  // Subscribe to player updates
  useRealtimeSubscription({
    table: "players",
    filter: playDateId ? `play_date_id=eq.${playDateId}` : undefined,
    onInsert: () => loadPlayDate(),
    onUpdate: () => loadPlayDate(),
    onDelete: () => loadPlayDate(),
  });

  // Subscribe to match updates
  useRealtimeSubscription({
    table: "matches",
    filter: playDateId ? `play_date_id=eq.${playDateId}` : undefined,
    onUpdate: () => loadPlayDate(),
  });

  const loadPlayDate = useCallback(async () => {
    if (!playDateId) return;

    try {
      setLoading(true);
      const data = await playDatesApi.getPlayDateById(playDateId);
      setPlayDate(data);

      // Check permissions
      if (user) {
        setIsOrganizer(data.organizer_id === user.id);

        // Check if user is project owner
        const projectOwner = await playersApi.getProjectOwner();
        setIsProjectOwner(projectOwner?.email === user.email);

        // Check if play date can be edited
        const editable = await playDatesApi.canEditPlayDate(playDateId);
        setCanEdit(editable && (isOrganizer || isProjectOwner));
      } else {
        setIsOrganizer(false);
        setIsProjectOwner(false);
        setCanEdit(false);
      }
    } catch (error) {
      console.error("Error loading play date:", error);
      showToast("Failed to load play date", "error");
    } finally {
      setLoading(false);
    }
  }, [playDateId, user, showToast, isOrganizer, isProjectOwner]);

  useEffect(() => {
    if (playDateId) {
      loadPlayDate();
    }
  }, [playDateId, loadPlayDate]);

  const createPlayDate = async (
    data: PlayDateInsert,
    players: PlayerInsert[]
  ) => {
    if (!user) {
      showToast("You must be logged in to create a play date", "error");
      return;
    }

    try {
      setLoading(true);

      // Create play date
      const newPlayDate = await playDatesApi.createPlayDate({
        ...data,
        organizer_id: user.id,
      });

      // Create or find players (players are global, not tied to play dates)
      const createdPlayers = await playersApi.createPlayers(players);

      // Generate schedule (this should create partnerships and matches)
      await playDatesApi.generateScheduleForPlayDate(
        newPlayDate.id,
        createdPlayers
      );

      showToast("Play date created successfully", "success");
      navigate(`/play-dates/${newPlayDate.id}`);

      return newPlayDate;
    } catch (error) {
      console.error("Error creating play date:", error);
      showToast("Failed to create play date", "error");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updatePlayDate = async (data: PlayDateUpdate) => {
    if (!playDateId || !canEdit) {
      showToast("You cannot edit this play date", "error");
      return;
    }

    try {
      setLoading(true);
      const updated = await playDatesApi.updatePlayDate(playDateId, data);
      setPlayDate((prev) => (prev ? { ...prev, ...updated } : null));
      showToast("Play date updated successfully", "success");
      return updated;
    } catch (error) {
      console.error("Error updating play date:", error);
      showToast("Failed to update play date", "error");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deletePlayDate = async () => {
    if (!playDateId || !canEdit) {
      showToast("You cannot delete this play date", "error");
      return;
    }

    try {
      setLoading(true);
      await playDatesApi.deletePlayDate(playDateId);
      showToast("Play date deleted successfully", "success");
      navigate("/play-dates");
    } catch (error) {
      console.error("Error deleting play date:", error);
      showToast("Failed to delete play date", "error");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const regenerateSchedule = async () => {
    if (!playDateId || !canEdit) {
      showToast("You cannot regenerate the schedule", "error");
      return;
    }

    try {
      setLoading(true);
      await playDatesApi.generateScheduleForPlayDate(playDateId);
      await loadPlayDate();
      showToast("Schedule regenerated successfully", "success");
    } catch (error: any) {
      console.error("Error regenerating schedule:", error);
      showToast(error.message || "Failed to regenerate schedule", "error");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const exportToJson = async () => {
    if (!playDateId || !playDate) return;

    try {
      setLoading(true);
      const exportData = await playDatesApi.exportPlayDateToJson(playDateId);

      // Create and download JSON file
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${playDate.date}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast("Play date exported successfully", "success");
    } catch (error) {
      console.error("Error exporting play date:", error);
      showToast("Failed to export play date", "error");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const addPlayer = async (player: PlayerInsert) => {
    if (!playDateId || !canEdit) {
      showToast("You cannot add players to this play date", "error");
      return;
    }

    try {
      setLoading(true);
      const newPlayer = await playersApi.createPlayer({
        ...player,
        play_date_id: playDateId,
      });

      // Reload play date to get updated players list
      await loadPlayDate();
      showToast("Player added successfully", "success");
      return newPlayer;
    } catch (error) {
      console.error("Error adding player:", error);
      showToast("Failed to add player", "error");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updatePlayer = async (
    playerId: string,
    data: { name: string; email: string }
  ) => {
    if (!canEdit) {
      showToast("You cannot update players in this play date", "error");
      return;
    }

    try {
      setLoading(true);
      const updated = await playersApi.updatePlayer(playerId, data);
      await loadPlayDate();
      showToast("Player updated successfully", "success");
      return updated;
    } catch (error) {
      console.error("Error updating player:", error);
      showToast("Failed to update player", "error");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const deletePlayer = async (playerId: string) => {
    if (!canEdit) {
      showToast("You cannot delete players from this play date", "error");
      return;
    }

    try {
      setLoading(true);
      await playersApi.deletePlayer(playerId);
      await loadPlayDate();
      showToast("Player deleted successfully", "success");
    } catch (error) {
      console.error("Error deleting player:", error);
      showToast("Failed to delete player", "error");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    playDate,
    loading,
    canEdit,
    isOrganizer,
    isProjectOwner,
    createPlayDate,
    updatePlayDate,
    deletePlayDate,
    regenerateSchedule,
    exportToJson,
    addPlayer,
    updatePlayer,
    deletePlayer,
    reload: loadPlayDate,
  };
}
