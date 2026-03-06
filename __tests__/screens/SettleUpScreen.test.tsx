import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      canGoBack: jest.fn(() => true),
    }),
    useLocalSearchParams: () => ({ groupId: "g1" }),
    useFocusEffect: (cb: () => void) => {
      React.useEffect(() => { cb(); }, []);
    },
    useSegments: () => [],
    Link: "Link",
  };
});

jest.mock("@/components/ui/toast", () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

const mockGetGroup = jest.fn(() =>
  Promise.resolve({ id: "g1", name: "Trip", defaultCurrency: "USD" })
);
const mockListMembers = jest.fn(() =>
  Promise.resolve([
    { id: "m1", user: { id: "u1", name: "Alice" }, displayName: "Alice" },
    { id: "m2", user: { id: "u2", name: "Bob" }, displayName: "Bob" },
  ])
);
const mockSuggestions = jest.fn(() =>
  Promise.resolve([
    { fromMemberId: "m1", toMemberId: "m2", amountCents: 5000 },
  ])
);
const mockListSettlements = jest.fn(() => Promise.resolve([]));

jest.mock("@/lib/api", () => ({
  settlementsApi: {
    suggestions: (...args: any[]) => mockSuggestions(...args),
    list: (...args: any[]) => mockListSettlements(...args),
    create: jest.fn(() => Promise.resolve({ id: "s1" })),
    delete: jest.fn(() => Promise.resolve()),
  },
  groupsApi: {
    get: (...args: any[]) => mockGetGroup(...args),
    listMembers: (...args: any[]) => mockListMembers(...args),
  },
}));

import SettleUpScreen from "@/app/settle-up";

beforeEach(() => {
  mockGetGroup.mockReset().mockResolvedValue({ id: "g1", name: "Trip", defaultCurrency: "USD" });
  mockListMembers.mockReset().mockResolvedValue([
    { id: "m1", user: { id: "u1", name: "Alice" }, displayName: "Alice" },
    { id: "m2", user: { id: "u2", name: "Bob" }, displayName: "Bob" },
  ]);
  mockSuggestions.mockReset().mockResolvedValue([
    { fromMemberId: "m1", toMemberId: "m2", amountCents: 5000 },
  ]);
  mockListSettlements.mockReset().mockResolvedValue([]);
});

describe("SettleUpScreen", () => {
  it("renders header", async () => {
    render(<SettleUpScreen />);
    await waitFor(() => {
      expect(screen.getByText("Settle Up")).toBeTruthy();
    });
  });

  it("renders Suggested and History tabs", async () => {
    render(<SettleUpScreen />);
    await waitFor(() => {
      expect(screen.getByText("Suggested")).toBeTruthy();
      expect(screen.getByText(/History/)).toBeTruthy();
    });
  });

  it("loads group data", async () => {
    render(<SettleUpScreen />);
    await waitFor(() => {
      expect(mockGetGroup).toHaveBeenCalledWith("g1", "mock-token");
    });
  });

  it("loads suggestions", async () => {
    render(<SettleUpScreen />);
    await waitFor(() => {
      expect(mockSuggestions).toHaveBeenCalled();
    });
  });

  it("shows all settled state when no suggestions", async () => {
    mockSuggestions.mockResolvedValue([]);
    render(<SettleUpScreen />);
    await waitFor(() => {
      expect(screen.getByText(/All settled/)).toBeTruthy();
    });
  });
});
