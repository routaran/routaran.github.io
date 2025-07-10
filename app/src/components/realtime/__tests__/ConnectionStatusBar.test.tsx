import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  ConnectionStatusBar,
  SimpleConnectionStatusBar,
  InlineConnectionStatus,
} from "../ConnectionStatusBar";
import { useConnectionState } from "../../../hooks/useConnectionState";
import { useToast } from "../../../hooks/useToast";
import { TestProvider } from "../../../test/utils";

// Mock dependencies
vi.mock("../../../hooks/useConnectionState");
vi.mock("../../../hooks/useToast");

const mockUseConnectionState = useConnectionState as vi.MockedFunction<
  typeof useConnectionState
>;
const mockUseToast = useToast as vi.MockedFunction<typeof useToast>;

const mockShowToast = vi.fn();

describe("ConnectionStatusBar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockUseToast.mockReturnValue({
      showToast: mockShowToast,
    } as any);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockConnectionState = {
    connectionState: "connected" as const,
    isConnected: true,
    isReconnecting: false,
    metrics: {
      connectionAttempts: 5,
      successfulConnections: 4,
      failedConnections: 1,
      totalDisconnectedTime: 10000,
      currentConnectionDuration: 60000,
    },
    history: [
      {
        timestamp: new Date(),
        state: "connected" as const,
        duration: 1000,
      },
      {
        timestamp: new Date(Date.now() - 30000),
        state: "connecting" as const,
        duration: 2000,
      },
    ],
    reconnect: vi.fn(),
    resetMetrics: vi.fn(),
    getConnectionQuality: vi.fn(() => 85),
  };

  describe("basic rendering", () => {
    it("should render connection status", () => {
      mockUseConnectionState.mockReturnValue(mockConnectionState);

      render(
        <TestProvider>
          <ConnectionStatusBar />
        </TestProvider>
      );

      expect(screen.getByText("Connected to server")).toBeInTheDocument();
    });

    it("should render at top position by default", () => {
      mockUseConnectionState.mockReturnValue(mockConnectionState);

      const { container } = render(
        <TestProvider>
          <ConnectionStatusBar />
        </TestProvider>
      );

      expect(container.querySelector(".top-0")).toBeInTheDocument();
    });

    it("should render at bottom position when specified", () => {
      mockUseConnectionState.mockReturnValue(mockConnectionState);

      const { container } = render(
        <TestProvider>
          <ConnectionStatusBar position="bottom" />
        </TestProvider>
      );

      expect(container.querySelector(".bottom-0")).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      mockUseConnectionState.mockReturnValue(mockConnectionState);

      const { container } = render(
        <TestProvider>
          <ConnectionStatusBar className="custom-class" />
        </TestProvider>
      );

      expect(container.firstChild).toHaveClass("custom-class");
    });
  });

  describe("connection states", () => {
    it("should render connecting state", () => {
      mockUseConnectionState.mockReturnValue({
        ...mockConnectionState,
        connectionState: "connecting",
        isConnected: false,
      });

      render(
        <TestProvider>
          <ConnectionStatusBar />
        </TestProvider>
      );

      expect(screen.getByText("Connecting to server...")).toBeInTheDocument();
    });

    it("should render disconnected state", () => {
      mockUseConnectionState.mockReturnValue({
        ...mockConnectionState,
        connectionState: "disconnected",
        isConnected: false,
      });

      render(
        <TestProvider>
          <ConnectionStatusBar />
        </TestProvider>
      );

      expect(screen.getByText("Disconnected from server")).toBeInTheDocument();
    });

    it("should render reconnecting state", () => {
      mockUseConnectionState.mockReturnValue({
        ...mockConnectionState,
        connectionState: "reconnecting",
        isConnected: false,
        isReconnecting: true,
      });

      render(
        <TestProvider>
          <ConnectionStatusBar />
        </TestProvider>
      );

      expect(screen.getByText("Reconnecting...")).toBeInTheDocument();
    });

    it("should render error state", () => {
      mockUseConnectionState.mockReturnValue({
        ...mockConnectionState,
        connectionState: "error",
        isConnected: false,
      });

      render(
        <TestProvider>
          <ConnectionStatusBar />
        </TestProvider>
      );

      expect(screen.getByText("Connection error")).toBeInTheDocument();
    });
  });

  describe("auto-hide functionality", () => {
    it("should auto-hide when connected by default", () => {
      mockUseConnectionState.mockReturnValue(mockConnectionState);

      const { container } = render(
        <TestProvider>
          <ConnectionStatusBar />
        </TestProvider>
      );

      expect(container.firstChild).toHaveClass("opacity-100");

      // Fast-forward time
      vi.advanceTimersByTime(5000);

      waitFor(() => {
        expect(container.firstChild).toHaveClass("opacity-0");
      });
    });

    it("should not auto-hide when disabled", () => {
      mockUseConnectionState.mockReturnValue(mockConnectionState);

      const { container } = render(
        <TestProvider>
          <ConnectionStatusBar autoHide={false} />
        </TestProvider>
      );

      expect(container.firstChild).toHaveClass("opacity-100");

      // Fast-forward time
      vi.advanceTimersByTime(10000);

      expect(container.firstChild).toHaveClass("opacity-100");
    });

    it("should respect custom auto-hide delay", () => {
      mockUseConnectionState.mockReturnValue(mockConnectionState);

      const { container } = render(
        <TestProvider>
          <ConnectionStatusBar autoHideDelay={2000} />
        </TestProvider>
      );

      expect(container.firstChild).toHaveClass("opacity-100");

      // Fast-forward less than delay
      vi.advanceTimersByTime(1000);
      expect(container.firstChild).toHaveClass("opacity-100");

      // Fast-forward past delay
      vi.advanceTimersByTime(1000);

      waitFor(() => {
        expect(container.firstChild).toHaveClass("opacity-0");
      });
    });

    it("should show when disconnected", () => {
      mockUseConnectionState.mockReturnValue({
        ...mockConnectionState,
        connectionState: "disconnected",
        isConnected: false,
      });

      const { container } = render(
        <TestProvider>
          <ConnectionStatusBar />
        </TestProvider>
      );

      expect(container.firstChild).toHaveClass("opacity-100");

      // Fast-forward time
      vi.advanceTimersByTime(10000);

      expect(container.firstChild).toHaveClass("opacity-100");
    });
  });

  describe("connection quality", () => {
    it("should show connection quality when enabled", () => {
      mockUseConnectionState.mockReturnValue(mockConnectionState);

      render(
        <TestProvider>
          <ConnectionStatusBar showQuality={true} />
        </TestProvider>
      );

      expect(screen.getByText("Quality:")).toBeInTheDocument();
      expect(screen.getByText("85%")).toBeInTheDocument();
    });

    it("should hide connection quality when disabled", () => {
      mockUseConnectionState.mockReturnValue(mockConnectionState);

      render(
        <TestProvider>
          <ConnectionStatusBar showQuality={false} />
        </TestProvider>
      );

      expect(screen.queryByText("Quality:")).not.toBeInTheDocument();
      expect(screen.queryByText("85%")).not.toBeInTheDocument();
    });
  });

  describe("metrics display", () => {
    it("should show metrics toggle when enabled", () => {
      mockUseConnectionState.mockReturnValue(mockConnectionState);

      render(
        <TestProvider>
          <ConnectionStatusBar showMetrics={true} />
        </TestProvider>
      );

      expect(screen.getByText("Show Details")).toBeInTheDocument();
    });

    it("should toggle metrics display", () => {
      mockUseConnectionState.mockReturnValue(mockConnectionState);

      render(
        <TestProvider>
          <ConnectionStatusBar showMetrics={true} />
        </TestProvider>
      );

      const toggleButton = screen.getByText("Show Details");
      fireEvent.click(toggleButton);

      expect(screen.getByText("Hide Details")).toBeInTheDocument();
      expect(screen.getByText("Attempts:")).toBeInTheDocument();
      expect(screen.getByText("5")).toBeInTheDocument();
      expect(screen.getByText("Successful:")).toBeInTheDocument();
      expect(screen.getByText("4")).toBeInTheDocument();
      expect(screen.getByText("Failed:")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    it("should show connection duration when connected", () => {
      mockUseConnectionState.mockReturnValue(mockConnectionState);

      render(
        <TestProvider>
          <ConnectionStatusBar showMetrics={true} />
        </TestProvider>
      );

      const toggleButton = screen.getByText("Show Details");
      fireEvent.click(toggleButton);

      expect(screen.getByText(/Connected for \d+s/)).toBeInTheDocument();
    });

    it("should show connection history", () => {
      mockUseConnectionState.mockReturnValue(mockConnectionState);

      render(
        <TestProvider>
          <ConnectionStatusBar showMetrics={true} />
        </TestProvider>
      );

      const toggleButton = screen.getByText("Show Details");
      fireEvent.click(toggleButton);

      expect(screen.getByText("Recent Activity:")).toBeInTheDocument();
      expect(screen.getByText("connected")).toBeInTheDocument();
      expect(screen.getByText("connecting")).toBeInTheDocument();
    });
  });

  describe("manual reconnect", () => {
    it("should show reconnect button when disconnected", () => {
      mockUseConnectionState.mockReturnValue({
        ...mockConnectionState,
        connectionState: "disconnected",
        isConnected: false,
      });

      render(
        <TestProvider>
          <ConnectionStatusBar />
        </TestProvider>
      );

      expect(screen.getByText("Reconnect")).toBeInTheDocument();
    });

    it("should hide reconnect button when connected", () => {
      mockUseConnectionState.mockReturnValue(mockConnectionState);

      render(
        <TestProvider>
          <ConnectionStatusBar />
        </TestProvider>
      );

      expect(screen.queryByText("Reconnect")).not.toBeInTheDocument();
    });

    it("should call reconnect function when clicked", () => {
      const mockReconnect = vi.fn();
      mockUseConnectionState.mockReturnValue({
        ...mockConnectionState,
        connectionState: "disconnected",
        isConnected: false,
        reconnect: mockReconnect,
      });

      render(
        <TestProvider>
          <ConnectionStatusBar />
        </TestProvider>
      );

      const reconnectButton = screen.getByText("Reconnect");
      fireEvent.click(reconnectButton);

      expect(mockReconnect).toHaveBeenCalled();
    });

    it("should show reconnecting state when reconnecting", () => {
      mockUseConnectionState.mockReturnValue({
        ...mockConnectionState,
        connectionState: "reconnecting",
        isConnected: false,
        isReconnecting: true,
      });

      render(
        <TestProvider>
          <ConnectionStatusBar />
        </TestProvider>
      );

      expect(screen.getByText("Reconnecting...")).toBeInTheDocument();
      expect(screen.queryByText("Reconnect")).not.toBeInTheDocument();
    });
  });

  describe("close button", () => {
    it("should show close button when auto-hide is enabled", () => {
      mockUseConnectionState.mockReturnValue(mockConnectionState);

      render(
        <TestProvider>
          <ConnectionStatusBar autoHide={true} />
        </TestProvider>
      );

      expect(screen.getByText("×")).toBeInTheDocument();
    });

    it("should hide close button when auto-hide is disabled", () => {
      mockUseConnectionState.mockReturnValue(mockConnectionState);

      render(
        <TestProvider>
          <ConnectionStatusBar autoHide={false} />
        </TestProvider>
      );

      expect(screen.queryByText("×")).not.toBeInTheDocument();
    });

    it("should hide component when close button is clicked", () => {
      mockUseConnectionState.mockReturnValue(mockConnectionState);

      const { container } = render(
        <TestProvider>
          <ConnectionStatusBar autoHide={true} />
        </TestProvider>
      );

      const closeButton = screen.getByText("×");
      fireEvent.click(closeButton);

      waitFor(() => {
        expect(container.firstChild).toHaveClass("opacity-0");
      });
    });
  });

  describe("toast notifications", () => {
    it("should show toast notifications when enabled", () => {
      mockUseConnectionState.mockReturnValue({
        ...mockConnectionState,
        connectionState: "disconnected",
        isConnected: false,
      });

      render(
        <TestProvider>
          <ConnectionStatusBar showToastNotifications={true} />
        </TestProvider>
      );

      // The toast notification is triggered by the useConnectionState hook
      // This test verifies that the prop is passed correctly
      expect(mockUseConnectionState).toHaveBeenCalledWith(
        expect.objectContaining({
          onConnectionLost: expect.any(Function),
          onConnectionRestored: expect.any(Function),
        })
      );
    });

    it("should not show toast notifications when disabled", () => {
      mockUseConnectionState.mockReturnValue(mockConnectionState);

      render(
        <TestProvider>
          <ConnectionStatusBar showToastNotifications={false} />
        </TestProvider>
      );

      expect(mockUseConnectionState).toHaveBeenCalledWith(
        expect.objectContaining({
          onConnectionLost: undefined,
          onConnectionRestored: undefined,
        })
      );
    });
  });

  describe("reset metrics", () => {
    it("should show reset metrics button in detailed view", () => {
      mockUseConnectionState.mockReturnValue(mockConnectionState);

      render(
        <TestProvider>
          <ConnectionStatusBar showMetrics={true} />
        </TestProvider>
      );

      const toggleButton = screen.getByText("Show Details");
      fireEvent.click(toggleButton);

      expect(screen.getByText("Reset Metrics")).toBeInTheDocument();
    });

    it("should call reset metrics function when clicked", () => {
      const mockResetMetrics = vi.fn();
      mockUseConnectionState.mockReturnValue({
        ...mockConnectionState,
        resetMetrics: mockResetMetrics,
      });

      render(
        <TestProvider>
          <ConnectionStatusBar showMetrics={true} />
        </TestProvider>
      );

      const toggleButton = screen.getByText("Show Details");
      fireEvent.click(toggleButton);

      const resetButton = screen.getByText("Reset Metrics");
      fireEvent.click(resetButton);

      expect(mockResetMetrics).toHaveBeenCalled();
    });
  });
});

describe("SimpleConnectionStatusBar", () => {
  it("should render with default simple settings", () => {
    mockUseConnectionState.mockReturnValue({
      ...mockConnectionState,
      connectionState: "connected",
      isConnected: true,
    });

    render(
      <TestProvider>
        <SimpleConnectionStatusBar />
      </TestProvider>
    );

    expect(screen.getByText("Connected to server")).toBeInTheDocument();
    expect(screen.queryByText("Quality:")).not.toBeInTheDocument();
    expect(screen.queryByText("Show Details")).not.toBeInTheDocument();
  });
});

describe("InlineConnectionStatus", () => {
  it("should render inline connection status", () => {
    mockUseConnectionState.mockReturnValue({
      ...mockConnectionState,
      connectionState: "connected",
      isConnected: true,
    });

    render(
      <TestProvider>
        <InlineConnectionStatus />
      </TestProvider>
    );

    expect(screen.getByText("Connected")).toBeInTheDocument();
  });

  it("should show quality when enabled", () => {
    mockUseConnectionState.mockReturnValue(mockConnectionState);

    render(
      <TestProvider>
        <InlineConnectionStatus showQuality={true} />
      </TestProvider>
    );

    expect(screen.getByText("(85%)")).toBeInTheDocument();
  });

  it("should hide quality when disabled", () => {
    mockUseConnectionState.mockReturnValue(mockConnectionState);

    render(
      <TestProvider>
        <InlineConnectionStatus showQuality={false} />
      </TestProvider>
    );

    expect(screen.queryByText("(85%)")).not.toBeInTheDocument();
  });

  it("should apply custom className", () => {
    mockUseConnectionState.mockReturnValue(mockConnectionState);

    const { container } = render(
      <TestProvider>
        <InlineConnectionStatus className="custom-inline" />
      </TestProvider>
    );

    expect(container.firstChild).toHaveClass("custom-inline");
  });
});
