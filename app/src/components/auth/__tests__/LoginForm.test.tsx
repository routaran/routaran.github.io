import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "../LoginForm";
import { auth } from "../../../lib/supabase";

// Mock dependencies
vi.mock("../../../lib/supabase", () => ({
  auth: {
    signIn: vi.fn(),
  },
}));

vi.mock("../../../hooks/useToast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe("LoginForm", () => {
  const mockOnSuccess = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders login form with email input", () => {
    render(<LoginForm onSuccess={mockOnSuccess} />);

    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send magic link/i })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/we'll send you a secure link/i)
    ).toBeInTheDocument();
  });

  it("validates email format", async () => {
    render(<LoginForm onSuccess={mockOnSuccess} />);

    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole("button", {
      name: /send magic link/i,
    });

    // Test invalid email
    await user.type(emailInput, "invalid-email");
    await user.click(submitButton);

    expect(auth.signIn).not.toHaveBeenCalled();
  });

  it("disables submit button when email is empty", () => {
    render(<LoginForm onSuccess={mockOnSuccess} />);

    const submitButton = screen.getByRole("button", {
      name: /send magic link/i,
    });
    expect(submitButton).toBeDisabled();
  });

  it("enables submit button when email is entered", async () => {
    render(<LoginForm onSuccess={mockOnSuccess} />);

    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole("button", {
      name: /send magic link/i,
    });

    await user.type(emailInput, "test@example.com");
    expect(submitButton).not.toBeDisabled();
  });

  it("successfully sends magic link", async () => {
    vi.mocked(auth.signIn).mockResolvedValueOnce({ data: {}, error: null });

    render(<LoginForm onSuccess={mockOnSuccess} />);

    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole("button", {
      name: /send magic link/i,
    });

    await user.type(emailInput, "test@example.com");
    await user.click(submitButton);

    await waitFor(() => {
      expect(auth.signIn).toHaveBeenCalledWith("test@example.com");
    });

    // Should show success message
    expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    expect(screen.getByText(/we've sent a magic link/i)).toBeInTheDocument();
  });

  it("handles sign in error", async () => {
    const errorMessage = "Network error";
    vi.mocked(auth.signIn).mockResolvedValueOnce({
      data: null,
      error: new Error(errorMessage),
    });

    render(<LoginForm onSuccess={mockOnSuccess} />);

    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole("button", {
      name: /send magic link/i,
    });

    await user.type(emailInput, "test@example.com");
    await user.click(submitButton);

    await waitFor(() => {
      expect(auth.signIn).toHaveBeenCalledWith("test@example.com");
    });

    // Should not show success message
    expect(screen.queryByText(/check your email/i)).not.toBeInTheDocument();
  });

  it("shows loading state while sending", async () => {
    vi.mocked(auth.signIn).mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(() => resolve({ data: {}, error: null }), 100)
        )
    );

    render(<LoginForm onSuccess={mockOnSuccess} />);

    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole("button", {
      name: /send magic link/i,
    });

    await user.type(emailInput, "test@example.com");
    await user.click(submitButton);

    expect(screen.getByText(/sending.../i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  it("allows user to use different email after success", async () => {
    vi.mocked(auth.signIn).mockResolvedValueOnce({ data: {}, error: null });

    render(<LoginForm onSuccess={mockOnSuccess} />);

    const emailInput = screen.getByLabelText(/email address/i);
    const submitButton = screen.getByRole("button", {
      name: /send magic link/i,
    });

    await user.type(emailInput, "test@example.com");
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });

    // Click "Use a different email"
    const differentEmailButton = screen.getByText(/use a different email/i);
    await user.click(differentEmailButton);

    // Form should be reset
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toHaveValue("");
  });

  it("has proper accessibility attributes", () => {
    render(<LoginForm onSuccess={mockOnSuccess} />);

    const emailInput = screen.getByLabelText(/email address/i);
    expect(emailInput).toHaveAttribute("type", "email");
    expect(emailInput).toHaveAttribute("autoComplete", "email");
    expect(emailInput).toHaveAttribute("required");
  });
});
