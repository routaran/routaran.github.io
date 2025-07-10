import { useState, useCallback, useMemo } from "react";
import { useToast } from "./useToast";
import { useAuthStore } from "../stores/authStore";
import {
  updateMatchScore,
  canUpdateMatchScore,
  validateScoreUpdate,
} from "../lib/supabase/scores";
import {
  validateMatchScore,
  determineWinner,
  getCommonScores,
  DEFAULT_SCORE_CONFIG,
  type ScoreValidationConfig,
} from "../lib/validation/scoreValidation";
import type { Match, WinCondition } from "../types/database";

export interface UseScoreEntryProps {
  match: Match;
  playDateId: string;
  winCondition: WinCondition;
  targetScore: number;
  onScoreUpdated?: (match: Match) => void;
  onClose?: () => void;
}

export interface ScoreEntryState {
  team1Score: number;
  team2Score: number;
  isSubmitting: boolean;
  errors: string[];
  warnings: string[];
  canEdit: boolean;
  isValid: boolean;
  winner: 1 | 2 | null;
  hasChanges: boolean;
}

export interface ScoreEntryActions {
  setTeam1Score: (score: number) => void;
  setTeam2Score: (score: number) => void;
  setScores: (team1: number, team2: number) => void;
  submitScore: () => Promise<void>;
  resetScore: () => void;
  validateCurrentScore: () => void;
  applyCommonScore: (scoreSet: { team1: number; team2: number }) => void;
}

export function useScoreEntry({
  match,
  playDateId,
  winCondition,
  targetScore,
  onScoreUpdated,
  onClose,
}: UseScoreEntryProps): ScoreEntryState & ScoreEntryActions {
  const { showToast } = useToast();
  const { user } = useAuthStore();

  // Create validation config
  const validationConfig: ScoreValidationConfig = useMemo(
    () => ({
      ...DEFAULT_SCORE_CONFIG,
      winCondition,
      targetScore,
    }),
    [winCondition, targetScore]
  );

  // Initialize state
  const [team1Score, setTeam1ScoreState] = useState<number>(
    match.team1_score || 0
  );
  const [team2Score, setTeam2ScoreState] = useState<number>(
    match.team2_score || 0
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [canEdit, setCanEdit] = useState(false);

  // Derived state
  const isValid = errors.length === 0;
  const winner = determineWinner(team1Score, team2Score);
  const hasChanges =
    team1Score !== (match.team1_score || 0) ||
    team2Score !== (match.team2_score || 0);

  // Check permissions when component mounts or user changes
  React.useEffect(() => {
    if (user) {
      canUpdateMatchScore(match.id, user.id).then((result) => {
        setCanEdit(result.canUpdate);
        if (!result.canUpdate && result.reason) {
          setErrors([result.reason]);
        }
      });
    }
  }, [match.id, user]);

  // Validate scores whenever they change
  const validateCurrentScore = useCallback(() => {
    if (!hasChanges) {
      setErrors([]);
      setWarnings([]);
      return;
    }

    const validation = validateScoreUpdate(
      { team1: match.team1_score, team2: match.team2_score },
      { team1: team1Score, team2: team2Score },
      validationConfig
    );

    setErrors(validation.errors);
    setWarnings(validation.warnings);
  }, [
    team1Score,
    team2Score,
    match.team1_score,
    match.team2_score,
    validationConfig,
    hasChanges,
  ]);

  // Validate on score changes
  React.useEffect(() => {
    validateCurrentScore();
  }, [validateCurrentScore]);

  // Score setters with validation
  const setTeam1Score = useCallback((score: number) => {
    if (score < 0 || score > 30) return; // Basic bounds check
    setTeam1ScoreState(score);
  }, []);

  const setTeam2Score = useCallback((score: number) => {
    if (score < 0 || score > 30) return; // Basic bounds check
    setTeam2ScoreState(score);
  }, []);

  const setScores = useCallback(
    (team1: number, team2: number) => {
      setTeam1Score(team1);
      setTeam2Score(team2);
    },
    [setTeam1Score, setTeam2Score]
  );

  // Submit score
  const submitScore = useCallback(async () => {
    if (!canEdit) {
      showToast({
        title: "Permission Denied",
        description: "You do not have permission to update this score",
        variant: "destructive",
      });
      return;
    }

    if (!isValid) {
      showToast({
        title: "Invalid Score",
        description: errors.join(", "),
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateMatchScore(
        {
          matchId: match.id,
          team1Score,
          team2Score,
          currentVersion: match.version,
          playDateId,
        },
        validationConfig
      );

      // Show warnings if any
      if (result.warnings.length > 0) {
        showToast({
          title: "Score Updated",
          description: `Score saved with warnings: ${result.warnings.join(", ")}`,
          variant: "warning",
        });
      } else {
        showToast({
          title: "Score Updated",
          description: "Match score has been saved successfully",
          variant: "success",
        });
      }

      // Call callbacks
      onScoreUpdated?.(result.match);
      onClose?.();
    } catch (error) {
      console.error("Failed to update score:", error);
      showToast({
        title: "Update Failed",
        description:
          error instanceof Error ? error.message : "Failed to update score",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canEdit,
    isValid,
    errors,
    match.id,
    match.version,
    team1Score,
    team2Score,
    playDateId,
    validationConfig,
    onScoreUpdated,
    onClose,
    showToast,
  ]);

  // Reset score
  const resetScore = useCallback(() => {
    setTeam1ScoreState(match.team1_score || 0);
    setTeam2ScoreState(match.team2_score || 0);
    setErrors([]);
    setWarnings([]);
  }, [match.team1_score, match.team2_score]);

  // Apply common score
  const applyCommonScore = useCallback(
    (scoreSet: { team1: number; team2: number }) => {
      setTeam1Score(scoreSet.team1);
      setTeam2Score(scoreSet.team2);
    },
    [setTeam1Score, setTeam2Score]
  );

  return {
    // State
    team1Score,
    team2Score,
    isSubmitting,
    errors,
    warnings,
    canEdit,
    isValid,
    winner,
    hasChanges,

    // Actions
    setTeam1Score,
    setTeam2Score,
    setScores,
    submitScore,
    resetScore,
    validateCurrentScore,
    applyCommonScore,
  };
}

// Hook for getting common scores
export function useCommonScores(targetScore: number) {
  return useMemo(() => getCommonScores(targetScore), [targetScore]);
}

// Hook for keyboard shortcuts
export function useScoreKeyboard(
  actions: Pick<
    ScoreEntryActions,
    "setTeam1Score" | "setTeam2Score" | "submitScore" | "resetScore"
  >,
  team1Score: number,
  team2Score: number,
  isEnabled: boolean = true
) {
  React.useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (event.target instanceof HTMLInputElement) return;

      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          actions.setTeam1Score(Math.max(0, team1Score - 1));
          break;
        case "ArrowRight":
          event.preventDefault();
          actions.setTeam1Score(Math.min(30, team1Score + 1));
          break;
        case "ArrowDown":
          event.preventDefault();
          actions.setTeam2Score(Math.max(0, team2Score - 1));
          break;
        case "ArrowUp":
          event.preventDefault();
          actions.setTeam2Score(Math.min(30, team2Score + 1));
          break;
        case "Enter":
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            actions.submitScore();
          }
          break;
        case "Escape":
          event.preventDefault();
          actions.resetScore();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [actions, team1Score, team2Score, isEnabled]);
}

// Re-export React for convenience
import React from "react";
