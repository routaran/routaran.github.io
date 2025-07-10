import { render } from "@testing-library/react";
import type { RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";

// Custom render function for testing with providers
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      {/* Future providers will be added here:
          - AuthProvider
          - ThemeProvider
          - QueryClient
          - Router
      */}
      {children}
    </div>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper">
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from "@testing-library/react";
export { customRender as render };

// Common test utilities
export const createMockUser = (overrides = {}) => ({
  id: "test-user-id",
  email: "test@example.com",
  name: "Test User",
  role: "player",
  ...overrides,
});

export const createMockPlayDate = (overrides = {}) => ({
  id: "test-play-date-id",
  name: "Test Tournament",
  date: "2024-01-15",
  players: [],
  matches: [],
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

export const createMockMatch = (overrides = {}) => ({
  id: "test-match-id",
  partnership1_id: "partnership-1",
  partnership2_id: "partnership-2",
  team1_score: null,
  team2_score: null,
  court_number: 1,
  round_number: 1,
  version: 1,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

// Mock API responses
export const mockApiResponse = function <T>(data: T, delay = 0): Promise<T> {
  return new Promise<T>((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
};

export const mockApiError = (
  message = "API Error",
  delay = 0
): Promise<never> => {
  return new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(message)), delay);
  });
};
