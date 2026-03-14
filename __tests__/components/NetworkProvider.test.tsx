import React from "react";
import { render, screen, act, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

// Unmock NetworkProvider so we test the real implementation
jest.unmock("@/components/NetworkProvider");

// Mock toast
const mockSuccess = jest.fn();
const mockError = jest.fn();
jest.mock("@/components/ui/toast", () => ({
  useToast: () => ({ success: mockSuccess, error: mockError, info: jest.fn() }),
  ToastProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock offline module
const mockGetQueuedExpenses = jest.fn(() => Promise.resolve([]));
const mockSyncQueuedExpenses = jest.fn(() =>
  Promise.resolve({ synced: [], failed: [] })
);
jest.mock("@/lib/offline", () => ({
  getQueuedExpenses: (...args: any[]) => mockGetQueuedExpenses(...args),
  syncQueuedExpenses: (...args: any[]) => mockSyncQueuedExpenses(...args),
}));

// Track NetInfo listener callback
let netInfoCallback: ((state: any) => void) | null = null;
jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: jest.fn((cb: any) => {
    netInfoCallback = cb;
    return jest.fn(); // unsubscribe
  }),
  fetch: jest.fn(() =>
    Promise.resolve({ isConnected: true, isInternetReachable: true })
  ),
}));

// lucide icon mock
jest.mock("lucide-react-native", () => ({
  WifiOff: "WifiOff",
}));

import { NetworkProvider, useNetwork } from "@/components/NetworkProvider";

function TestConsumer() {
  const { isOnline, pendingCount } = useNetwork();
  return (
    <>
      <Text testID="online">{isOnline ? "online" : "offline"}</Text>
      <Text testID="pending">{pendingCount}</Text>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  netInfoCallback = null;
  mockGetQueuedExpenses.mockResolvedValue([]);
  mockSyncQueuedExpenses.mockResolvedValue({ synced: [], failed: [] });
});

describe("NetworkProvider", () => {
  it("renders children", () => {
    render(
      <NetworkProvider>
        <Text>Hello</Text>
      </NetworkProvider>
    );
    expect(screen.getByText("Hello")).toBeTruthy();
  });

  it("provides default online state via useNetwork", () => {
    render(
      <NetworkProvider>
        <TestConsumer />
      </NetworkProvider>
    );
    expect(screen.getByTestId("online").props.children).toBe("online");
  });

  it("provides pending count via useNetwork", async () => {
    mockGetQueuedExpenses.mockResolvedValue([{ id: "1" }, { id: "2" }]);
    render(
      <NetworkProvider>
        <TestConsumer />
      </NetworkProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId("pending").props.children).toBe(2);
    });
  });

  it("shows offline banner when network is offline", async () => {
    render(
      <NetworkProvider>
        <TestConsumer />
      </NetworkProvider>
    );

    await act(async () => {
      netInfoCallback?.({ isConnected: false, isInternetReachable: false });
    });

    expect(screen.getByText("No internet connection")).toBeTruthy();
    expect(screen.getByTestId("online").props.children).toBe("offline");
  });

  it("hides offline banner when network comes back online", async () => {
    render(
      <NetworkProvider>
        <TestConsumer />
      </NetworkProvider>
    );

    await act(async () => {
      netInfoCallback?.({ isConnected: false, isInternetReachable: false });
    });
    expect(screen.getByText("No internet connection")).toBeTruthy();

    await act(async () => {
      netInfoCallback?.({ isConnected: true, isInternetReachable: true });
    });
    expect(screen.queryByText("No internet connection")).toBeNull();
  });

  it("auto-syncs queued expenses when coming back online", async () => {
    mockGetQueuedExpenses.mockResolvedValue([{ id: "1" }]);
    mockSyncQueuedExpenses.mockResolvedValue({
      synced: [{ id: "1" }],
      failed: [],
    });

    render(
      <NetworkProvider>
        <TestConsumer />
      </NetworkProvider>
    );

    // Wait for initial pending count load
    await waitFor(() => {
      expect(mockGetQueuedExpenses).toHaveBeenCalled();
    });

    // Simulate going offline then online
    await act(async () => {
      netInfoCallback?.({ isConnected: false, isInternetReachable: false });
    });
    await act(async () => {
      netInfoCallback?.({ isConnected: true, isInternetReachable: true });
    });

    await waitFor(() => {
      expect(mockSyncQueuedExpenses).toHaveBeenCalled();
    });
  });

  it("shows success toast when expenses are synced", async () => {
    mockGetQueuedExpenses.mockResolvedValue([{ id: "1" }]);
    mockSyncQueuedExpenses.mockResolvedValue({
      synced: [{ id: "1" }],
      failed: [],
    });

    render(
      <NetworkProvider>
        <TestConsumer />
      </NetworkProvider>
    );

    await waitFor(() => {
      expect(mockSyncQueuedExpenses).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockSuccess).toHaveBeenCalledWith("1 pending expense synced!");
    });
  });

  it("shows error toast when expenses fail to sync", async () => {
    mockGetQueuedExpenses.mockResolvedValue([{ id: "1" }, { id: "2" }]);
    mockSyncQueuedExpenses.mockResolvedValue({
      synced: [],
      failed: [{ id: "1" }, { id: "2" }],
    });

    render(
      <NetworkProvider>
        <TestConsumer />
      </NetworkProvider>
    );

    await waitFor(() => {
      expect(mockError).toHaveBeenCalledWith(
        "2 expenses failed to sync. Check pending items."
      );
    });
  });

  it("does not show banner when online", () => {
    render(
      <NetworkProvider>
        <TestConsumer />
      </NetworkProvider>
    );
    expect(screen.queryByText("No internet connection")).toBeNull();
  });

  it("useNetwork returns default values outside provider", () => {
    render(<TestConsumer />);
    expect(screen.getByTestId("online").props.children).toBe("online");
    expect(screen.getByTestId("pending").props.children).toBe(0);
  });
});
