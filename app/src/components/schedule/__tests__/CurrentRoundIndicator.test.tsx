import React from "react";
import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import { CurrentRoundIndicator } from "../CurrentRoundIndicator";

// Mock the Date constructor for consistent testing
const mockDate = new Date("2024-01-15T10:00:00Z");

describe("CurrentRoundIndicator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders current round information", () => {
    render(<CurrentRoundIndicator currentRound={2} totalRounds={5} />);

    expect(screen.getByText("Round 2 of 5")).toBeInTheDocument();
    expect(screen.getByText("Currently in progress")).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
  });

  it("calculates progress percentage correctly", () => {
    render(<CurrentRoundIndicator currentRound={3} totalRounds={8} />);

    // (3-1) / 8 * 100 = 25%
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("shows elapsed time from round start", () => {
    render(<CurrentRoundIndicator currentRound={1} totalRounds={3} />);

    expect(screen.getByText("0h 0m")).toBeInTheDocument();
  });

  it("estimates remaining time correctly", () => {
    render(
      <CurrentRoundIndicator
        currentRound={2}
        totalRounds={4}
        estimatedTimePerMatch={20}
      />
    );

    // Remaining rounds: 4 - 2 + 1 = 3
    // 3 * 20 = 60 minutes = 1h 0m
    expect(screen.getByText("~1h 0m")).toBeInTheDocument();
  });

  it("uses default estimated time per match", () => {
    render(<CurrentRoundIndicator currentRound={1} totalRounds={2} />);

    // Default is 15 minutes per match
    // Remaining rounds: 2 - 1 + 1 = 2
    // 2 * 15 = 30 minutes = 0h 30m
    expect(screen.getByText("~0h 30m")).toBeInTheDocument();
  });

  it("handles single round tournament", () => {
    render(<CurrentRoundIndicator currentRound={1} totalRounds={1} />);

    expect(screen.getByText("Round 1 of 1")).toBeInTheDocument();
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <CurrentRoundIndicator
        currentRound={1}
        totalRounds={3}
        className="custom-class"
      />
    );

    expect(container.firstChild).toHaveClass("custom-class");
  });

  it("shows mobile reminder on small screens", () => {
    render(<CurrentRoundIndicator currentRound={1} totalRounds={3} />);

    expect(
      screen.getByText("Check your schedule below for your next match")
    ).toBeInTheDocument();
  });

  it("updates time periodically", () => {
    render(<CurrentRoundIndicator currentRound={1} totalRounds={3} />);

    expect(screen.getByText("0h 0m")).toBeInTheDocument();

    // Advance time by 5 minutes
    vi.advanceTimersByTime(5 * 60 * 1000);

    expect(screen.getByText("0h 5m")).toBeInTheDocument();
  });

  it("handles large time durations correctly", () => {
    render(
      <CurrentRoundIndicator
        currentRound={1}
        totalRounds={2}
        estimatedTimePerMatch={90}
      />
    );

    // Remaining rounds: 2 - 1 + 1 = 2
    // 2 * 90 = 180 minutes = 3h 0m
    expect(screen.getByText("~3h 0m")).toBeInTheDocument();
  });

  it("shows appropriate progress for last round", () => {
    render(<CurrentRoundIndicator currentRound={5} totalRounds={5} />);

    // (5-1) / 5 * 100 = 80%
    expect(screen.getByText("80%")).toBeInTheDocument();
  });

  it("renders with accessibility attributes", () => {
    render(<CurrentRoundIndicator currentRound={2} totalRounds={4} />);

    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "25");
    expect(progressBar).toHaveAttribute("aria-valuemin", "0");
    expect(progressBar).toHaveAttribute("aria-valuemax", "100");
  });
});
