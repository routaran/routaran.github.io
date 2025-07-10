import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WinConditionSelector } from "../WinConditionSelector";

describe("WinConditionSelector", () => {
  const defaultProps = {
    winCondition: "first-to-target" as const,
    targetScore: 11,
    onWinConditionChange: vi.fn(),
    onTargetScoreChange: vi.fn(),
  };

  it("renders with initial values", () => {
    render(<WinConditionSelector {...defaultProps} />);

    expect(screen.getByLabelText("Win Condition")).toHaveValue(
      "first-to-target"
    );
    expect(screen.getByLabelText("Target Score")).toHaveValue(11);
  });

  it("shows correct description for first-to-target", () => {
    render(<WinConditionSelector {...defaultProps} />);

    expect(
      screen.getByText("First team to reach the target score wins")
    ).toBeInTheDocument();
  });

  it("shows correct description for win-by-2", () => {
    render(<WinConditionSelector {...defaultProps} winCondition="win-by-2" />);

    expect(
      screen.getByText("Must reach target score and lead by at least 2 points")
    ).toBeInTheDocument();
  });

  it("calls onWinConditionChange when selection changes", () => {
    render(<WinConditionSelector {...defaultProps} />);

    const select = screen.getByLabelText("Win Condition");
    fireEvent.change(select, { target: { value: "win-by-2" } });

    expect(defaultProps.onWinConditionChange).toHaveBeenCalledWith("win-by-2");
  });

  it("calls onTargetScoreChange when score changes", () => {
    render(<WinConditionSelector {...defaultProps} />);

    const input = screen.getByLabelText("Target Score");
    fireEvent.change(input, { target: { value: "15" } });

    expect(defaultProps.onTargetScoreChange).toHaveBeenCalledWith(15);
  });

  it("enforces min and max score values", () => {
    render(<WinConditionSelector {...defaultProps} />);

    const input = screen.getByLabelText("Target Score") as HTMLInputElement;
    expect(input.min).toBe("5");
    expect(input.max).toBe("21");
  });

  it("disables inputs when disabled prop is true", () => {
    render(<WinConditionSelector {...defaultProps} disabled />);

    expect(screen.getByLabelText("Win Condition")).toBeDisabled();
    expect(screen.getByLabelText("Target Score")).toBeDisabled();
  });

  it("displays target score range help text", () => {
    render(<WinConditionSelector {...defaultProps} />);

    expect(
      screen.getByText("Valid range: 5-21 points (default: 11)")
    ).toBeInTheDocument();
  });
});
