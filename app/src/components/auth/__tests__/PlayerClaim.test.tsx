import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlayerClaim } from "../PlayerClaim";
import { db } from "../../../lib/supabase";

// Mock dependencies
vi.mock("../../../lib/supabase", () => ({
  db: {
    supabase: {
      from: vi.fn(),
    },
  },
}));

vi.mock("../../../hooks/useAuth", () => ({
  useAuth: () => ({
    claimPlayer: vi.fn(),
  }),
}));

vi.mock("../../../hooks/useToast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const mockPlayers = [
  {
    id: "1",
    name: "Alice Johnson",
    email: "alice@example.com",
    claim_user_id: null,
  },
  { id: "2", name: "Bob Smith", email: "bob@example.com", claim_user_id: null },
  {
    id: "3",
    name: "Charlie Brown",
    email: "charlie@example.com",
    claim_user_id: null,
  },
];

describe("PlayerClaim", () => {
  const mockOnSuccess = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    vi.mocked(db.supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            data: null,
            error: null,
          }),
        }),
      }),
    } as any);

    render(<PlayerClaim onSuccess={mockOnSuccess} />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("renders player selection when players are available", async () => {
    vi.mocked(db.supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockPlayers,
            error: null,
          }),
        }),
      }),
    } as any);

    render(<PlayerClaim onSuccess={mockOnSuccess} />);

    await waitFor(() => {
      expect(screen.getByText(/welcome! who are you\?/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /claim player/i })
    ).toBeInTheDocument();

    // Check if all players are in the select
    const selectElement = screen.getByLabelText(/your name/i);
    mockPlayers.forEach((player) => {
      expect(selectElement).toHaveTextContent(player.name);
    });
  });

  it("auto-selects player when only one is available", async () => {
    const singlePlayer = [mockPlayers[0]];

    vi.mocked(db.supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: singlePlayer,
            error: null,
          }),
        }),
      }),
    } as any);

    render(<PlayerClaim onSuccess={mockOnSuccess} />);

    await waitFor(() => {
      const selectElement = screen.getByLabelText(
        /your name/i
      ) as HTMLSelectElement;
      expect(selectElement.value).toBe(singlePlayer[0].id);
    });
  });

  it("shows empty state when no players are available", async () => {
    vi.mocked(db.supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
    } as any);

    render(<PlayerClaim onSuccess={mockOnSuccess} />);

    await waitFor(() => {
      expect(screen.getByText(/no players available/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/all players have been claimed/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/contact your tournament organizer/i)
    ).toBeInTheDocument();
  });

  it("disables claim button when no player is selected", async () => {
    vi.mocked(db.supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockPlayers,
            error: null,
          }),
        }),
      }),
    } as any);

    render(<PlayerClaim onSuccess={mockOnSuccess} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /claim player/i })
      ).toBeInTheDocument();
    });

    const claimButton = screen.getByRole("button", { name: /claim player/i });
    const selectElement = screen.getByLabelText(
      /your name/i
    ) as HTMLSelectElement;

    // Initially no player selected
    expect(selectElement.value).toBe("");
    expect(claimButton).toBeDisabled();
  });

  it("enables claim button when player is selected", async () => {
    vi.mocked(db.supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockPlayers,
            error: null,
          }),
        }),
      }),
    } as any);

    render(<PlayerClaim onSuccess={mockOnSuccess} />);

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /claim player/i })
      ).toBeInTheDocument();
    });

    const selectElement = screen.getByLabelText(/your name/i);
    const claimButton = screen.getByRole("button", { name: /claim player/i });

    await user.selectOptions(selectElement, mockPlayers[0].id);

    expect(claimButton).not.toBeDisabled();
  });

  it("handles error when loading players fails", async () => {
    const error = new Error("Failed to load players");

    vi.mocked(db.supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error,
          }),
        }),
      }),
    } as any);

    render(<PlayerClaim onSuccess={mockOnSuccess} />);

    await waitFor(() => {
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
    });
  });

  it("has proper accessibility attributes", async () => {
    vi.mocked(db.supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockPlayers,
            error: null,
          }),
        }),
      }),
    } as any);

    render(<PlayerClaim onSuccess={mockOnSuccess} />);

    await waitFor(() => {
      expect(screen.getByLabelText(/your name/i)).toBeInTheDocument();
    });

    const selectElement = screen.getByLabelText(/your name/i);
    expect(selectElement).toHaveAttribute(
      "aria-label",
      "Select your player name"
    );
  });
});
