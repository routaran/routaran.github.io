import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { ScoreEntryForm } from "../ScoreEntryForm";
import { TestWrapper } from "../../../test/utils";
import type { Match } from "../../../types/database";

// Mock the hooks
const mockUseScoreEntry = vi.fn();

vi.mock("../../../hooks/useScoreEntry", () => ({
  useScoreEntry: mockUseScoreEntry,
  useCommonScores: vi.fn(() => [
    { team1: 11, team2: 0, label: "11-0" },
    { team1: 11, team2: 9, label: "11-9" },
  ]),
  useScoreKeyboard: vi.fn(),
}));

vi.mock("../../../hooks/useToast", () => ({
  useToast: vi.fn(() => ({
    showToast: vi.fn(),
  })),
}));

const mockMatch: Match = {
  id: "match-1",
  play_date_id: "playdate-1",
  partnership1_id: "partnership-1",
  partnership2_id: "partnership-2",
  team1_score: null,
  team2_score: null,
  court_number: 1,
  round_number: 1,
  scheduled_at: null,
  version: 1,
  created_at: "2023-01-01T00:00:00Z",
  updated_at: "2023-01-01T00:00:00Z",
  updated_by: null,
  partnership1: {
    id: "partnership-1",
    play_date_id: "playdate-1",
    player1_id: "player-1",
    player2_id: "player-2",
    created_at: "2023-01-01T00:00:00Z",
    player1: {
      id: "player-1",
      play_date_id: "playdate-1",
      name: "Player 1",
      email: "player1@example.com",
      project_owner: false,
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
    },
    player2: {
      id: "player-2",
      play_date_id: "playdate-1",
      name: "Player 2",
      email: "player2@example.com",
      project_owner: false,
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
    },
  },
  partnership2: {
    id: "partnership-2",
    play_date_id: "playdate-1",
    player1_id: "player-3",
    player2_id: "player-4",
    created_at: "2023-01-01T00:00:00Z",
    player1: {
      id: "player-3",
      play_date_id: "playdate-1",
      name: "Player 3",
      email: "player3@example.com",
      project_owner: false,
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
    },
    player2: {
      id: "player-4",
      play_date_id: "playdate-1",
      name: "Player 4",
      email: "player4@example.com",
      project_owner: false,
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
    },
  },
};

const mockScoreEntry = {
  team1Score: 0,
  team2Score: 0,
  isSubmitting: false,
  errors: [],
  warnings: [],
  canEdit: true,
  isValid: true,
  winner: null,
  hasChanges: false,
  setTeam1Score: vi.fn(),
  setTeam2Score: vi.fn(),
  setScores: vi.fn(),
  submitScore: vi.fn(),
  resetScore: vi.fn(),
  validateCurrentScore: vi.fn(),
  applyCommonScore: vi.fn(),
};

describe("ScoreEntryForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseScoreEntry.mockReturnValue(mockScoreEntry);
  });

  const defaultProps = {
    match: mockMatch,
    playDateId: "playdate-1",
    winCondition: "first-to-target" as const,
    targetScore: 11,
  };

  it("renders form with team names", () => {
    render(
      <TestWrapper>
        <ScoreEntryForm {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText("Player 1 & Player 2")).toBeInTheDocument();
    expect(screen.getByText("Player 3 & Player 4")).toBeInTheDocument();
    expect(screen.getByText("Team 1")).toBeInTheDocument();
    expect(screen.getByText("Team 2")).toBeInTheDocument();
  });

  it("renders win condition description", () => {
    render(
      <TestWrapper>
        <ScoreEntryForm {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText("First to 11")).toBeInTheDocument();
  });

  it("renders win-by-2 description", () => {
    render(
      <TestWrapper>
        <ScoreEntryForm {...defaultProps} winCondition="win-by-2" />
      </TestWrapper>
    );

    expect(screen.getByText("First to 11, win by 2")).toBeInTheDocument();
  });

  it("renders score input fields", () => {
    render(
      <TestWrapper>
        <ScoreEntryForm {...defaultProps} />
      </TestWrapper>
    );

    const scoreInputs = screen.getAllByRole("spinbutton");
    expect(scoreInputs).toHaveLength(2);
    expect(scoreInputs[0]).toHaveValue(0);
    expect(scoreInputs[1]).toHaveValue(0);
  });

  it("calls setTeam1Score when team 1 score changes", () => {
    render(
      <TestWrapper>
        <ScoreEntryForm {...defaultProps} />
      </TestWrapper>
    );

    const scoreInputs = screen.getAllByRole("spinbutton");
    fireEvent.change(scoreInputs[0], { target: { value: "11" } });

    expect(mockScoreEntry.setTeam1Score).toHaveBeenCalledWith(11);
  });

  it("calls setTeam2Score when team 2 score changes", () => {
    render(
      <TestWrapper>
        <ScoreEntryForm {...defaultProps} />
      </TestWrapper>
    );

    const scoreInputs = screen.getAllByRole("spinbutton");
    fireEvent.change(scoreInputs[1], { target: { value: "9" } });

    expect(mockScoreEntry.setTeam2Score).toHaveBeenCalledWith(9);
  });

  it("renders increment/decrement buttons", () => {
    render(
      <TestWrapper>
        <ScoreEntryForm {...defaultProps} />
      </TestWrapper>
    );

    const incrementButtons = screen.getAllByLabelText(/increment|plus/i);
    const decrementButtons = screen.getAllByLabelText(/decrement|minus/i);

    expect(incrementButtons).toHaveLength(2);
    expect(decrementButtons).toHaveLength(2);
  });

  it("calls increment functions when buttons clicked", () => {
    mockUseScoreEntry.mockReturnValue({
      ...mockScoreEntry,
      team1Score: 5,
      team2Score: 7,
    });

    render(
      <TestWrapper>
        <ScoreEntryForm {...defaultProps} />
      </TestWrapper>
    );

    const incrementButtons = screen.getAllByText("+");
    fireEvent.click(incrementButtons[0]);

    expect(mockScoreEntry.setTeam1Score).toHaveBeenCalledWith(6);
  });

  it("renders common score buttons", () => {
    render(
      <TestWrapper>
        <ScoreEntryForm {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText("11-0")).toBeInTheDocument();
    expect(screen.getByText("11-9")).toBeInTheDocument();
  });

  it("applies common score when clicked", () => {
    render(
      <TestWrapper>
        <ScoreEntryForm {...defaultProps} />
      </TestWrapper>
    );

    const commonScoreButton = screen.getByText("11-0");
    fireEvent.click(commonScoreButton);

    expect(mockScoreEntry.applyCommonScore).toHaveBeenCalledWith({
      team1: 11,
      team2: 0,
      label: "11-0",
    });
  });

  it("renders error messages", () => {
    mockUseScoreEntry.mockReturnValue({
      ...mockScoreEntry,
      errors: ["Winning team must reach 11 points"],
    });

    render(
      <TestWrapper>
        <ScoreEntryForm {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText("Invalid Score")).toBeInTheDocument();
    expect(
      screen.getByText("• Winning team must reach 11 points")
    ).toBeInTheDocument();
  });

  it("renders warning messages", () => {
    mockUseScoreEntry.mockReturnValue({
      ...mockScoreEntry,
      warnings: ["Score of 25 is unusually high"],
    });

    render(
      <TestWrapper>
        <ScoreEntryForm {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText("Warnings")).toBeInTheDocument();
    expect(
      screen.getByText("• Score of 25 is unusually high")
    ).toBeInTheDocument();
  });

  it("shows winner indicator", () => {
    mockUseScoreEntry.mockReturnValue({
      ...mockScoreEntry,
      winner: 1,
    });

    render(
      <TestWrapper>
        <ScoreEntryForm {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText("Team 1 Wins")).toBeInTheDocument();
  });

  it("renders save and reset buttons", () => {
    mockUseScoreEntry.mockReturnValue({
      ...mockScoreEntry,
      hasChanges: true,
    });

    render(
      <TestWrapper>
        <ScoreEntryForm {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText("Save Score")).toBeInTheDocument();
    expect(screen.getByText("Reset")).toBeInTheDocument();
  });

  it("calls submitScore when save button clicked", async () => {
    mockUseScoreEntry.mockReturnValue({
      ...mockScoreEntry,
      hasChanges: true,
    });

    render(
      <TestWrapper>
        <ScoreEntryForm {...defaultProps} />
      </TestWrapper>
    );

    const saveButton = screen.getByText("Save Score");
    fireEvent.click(saveButton);

    expect(mockScoreEntry.submitScore).toHaveBeenCalled();
  });

  it("calls resetScore when reset button clicked", () => {
    mockUseScoreEntry.mockReturnValue({
      ...mockScoreEntry,
      hasChanges: true,
    });

    render(
      <TestWrapper>
        <ScoreEntryForm {...defaultProps} />
      </TestWrapper>
    );

    const resetButton = screen.getByText("Reset");
    fireEvent.click(resetButton);

    expect(mockScoreEntry.resetScore).toHaveBeenCalled();
  });

  it("disables save button when invalid", () => {
    mockUseScoreEntry.mockReturnValue({
      ...mockScoreEntry,
      hasChanges: true,
      isValid: false,
    });

    render(
      <TestWrapper>
        <ScoreEntryForm {...defaultProps} />
      </TestWrapper>
    );

    const saveButton = screen.getByText("Save Score");
    expect(saveButton).toBeDisabled();
  });

  it("shows permission denied message when cannot edit", () => {
    mockUseScoreEntry.mockReturnValue({
      ...mockScoreEntry,
      canEdit: false,
    });

    render(
      <TestWrapper>
        <ScoreEntryForm {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText("Cannot Edit Score")).toBeInTheDocument();
    expect(
      screen.getByText("Only players in this match can update scores.")
    ).toBeInTheDocument();
  });

  it("shows keyboard help when info button clicked", () => {
    render(
      <TestWrapper>
        <ScoreEntryForm {...defaultProps} />
      </TestWrapper>
    );

    const infoButton = screen.getByRole("button", { name: /info/i });
    fireEvent.click(infoButton);

    expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
    expect(screen.getByText("← → : Team 1 score")).toBeInTheDocument();
    expect(screen.getByText("↑ ↓ : Team 2 score")).toBeInTheDocument();
  });

  it("shows current score when match has existing score", () => {
    const matchWithScore = {
      ...mockMatch,
      team1_score: 11,
      team2_score: 9,
    };

    render(
      <TestWrapper>
        <ScoreEntryForm {...defaultProps} match={matchWithScore} />
      </TestWrapper>
    );

    expect(screen.getByText("Current: 11-9")).toBeInTheDocument();
  });

  it("shows modified badge when changes exist", () => {
    mockUseScoreEntry.mockReturnValue({
      ...mockScoreEntry,
      hasChanges: true,
    });

    render(
      <TestWrapper>
        <ScoreEntryForm {...defaultProps} />
      </TestWrapper>
    );

    expect(screen.getByText("Modified")).toBeInTheDocument();
  });

  it("constrains score input to valid range", () => {
    render(
      <TestWrapper>
        <ScoreEntryForm {...defaultProps} />
      </TestWrapper>
    );

    const scoreInputs = screen.getAllByRole("spinbutton");

    // Try to enter a score above 30
    fireEvent.change(scoreInputs[0], { target: { value: "35" } });
    expect(mockScoreEntry.setTeam1Score).not.toHaveBeenCalledWith(35);

    // Try to enter a negative score
    fireEvent.change(scoreInputs[0], { target: { value: "-5" } });
    expect(mockScoreEntry.setTeam1Score).not.toHaveBeenCalledWith(-5);

    // Valid score should work
    fireEvent.change(scoreInputs[0], { target: { value: "15" } });
    expect(mockScoreEntry.setTeam1Score).toHaveBeenCalledWith(15);
  });
});
