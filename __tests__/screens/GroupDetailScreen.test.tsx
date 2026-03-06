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
    useLocalSearchParams: () => ({ id: "g1" }),
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

jest.mock("react-native-qrcode-svg", () => "QRCode");

const mockGetGroup = jest.fn(() =>
  Promise.resolve({
    id: "g1",
    name: "Trip to Paris",
    inviteCode: "abc123",
    defaultCurrency: "USD",
    memberCount: 2,
  })
);
const mockListMembers = jest.fn(() =>
  Promise.resolve([
    { id: "m1", user: { id: "u1", name: "Alice" }, displayName: "Alice" },
    { id: "m2", user: { id: "u2", name: "Bob" }, displayName: "Bob" },
  ])
);
const mockListExpenses = jest.fn(() =>
  Promise.resolve({ data: [] })
);

jest.mock("@/lib/api", () => ({
  groupsApi: {
    get: (...args: any[]) => mockGetGroup(...args),
    listMembers: (...args: any[]) => mockListMembers(...args),
    listExpenses: (...args: any[]) => mockListExpenses(...args),
    addMember: jest.fn(() => Promise.resolve({})),
    removeMember: jest.fn(() => Promise.resolve()),
  },
  contactsApi: {
    list: jest.fn(() => Promise.resolve([])),
  },
  inviteApi: {
    regenerate: jest.fn(() => Promise.resolve({ inviteCode: "new-code" })),
  },
}));

import GroupDetailScreen from "@/app/group/[id]";

beforeEach(() => {
  mockGetGroup.mockReset().mockResolvedValue({
    id: "g1",
    name: "Trip to Paris",
    inviteCode: "abc123",
    defaultCurrency: "USD",
    memberCount: 2,
  });
  mockListMembers.mockReset().mockResolvedValue([
    { id: "m1", user: { id: "u1", name: "Alice" }, displayName: "Alice" },
    { id: "m2", user: { id: "u2", name: "Bob" }, displayName: "Bob" },
  ]);
  mockListExpenses.mockReset().mockResolvedValue({ data: [] });
});

describe("GroupDetailScreen", () => {
  it("renders group name", async () => {
    render(<GroupDetailScreen />);
    await waitFor(() => {
      expect(screen.getAllByText("Trip to Paris").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("renders MEMBERS section", async () => {
    render(<GroupDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText(/MEMBERS/)).toBeTruthy();
    });
  });

  it("renders member names", async () => {
    render(<GroupDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeTruthy();
      expect(screen.getByText("Bob")).toBeTruthy();
    });
  });

  it("renders summary card", async () => {
    render(<GroupDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText("Total Spent")).toBeTruthy();
      expect(screen.getByText("Per Person (avg)")).toBeTruthy();
    });
  });

  it("renders Settle Up button", async () => {
    render(<GroupDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText("Settle Up")).toBeTruthy();
    });
  });

  it("shows empty expense state", async () => {
    render(<GroupDetailScreen />);
    await waitFor(() => {
      expect(screen.getByText("No expenses yet")).toBeTruthy();
    });
  });

  it("loads group data from API", async () => {
    render(<GroupDetailScreen />);
    await waitFor(() => {
      expect(mockGetGroup).toHaveBeenCalledWith("g1", "mock-token");
      expect(mockListMembers).toHaveBeenCalledWith("g1", "mock-token");
    });
  });
});
