import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";
import CreateGroupScreen from "@/app/create-group";

jest.mock("@/components/ui/toast", () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

jest.mock("react-native-qrcode-svg", () => "QRCode");

const mockGetMe = jest.fn(() =>
  Promise.resolve({ defaultCurrency: "USD" })
);
const mockCreate = jest.fn(() =>
  Promise.resolve({
    id: "g1",
    name: "Test Group",
    inviteCode: "abc123",
  })
);

jest.mock("@/lib/api", () => ({
  usersApi: {
    me: (...args: any[]) => mockGetMe(...args),
  },
  groupsApi: {
    create: (...args: any[]) => mockCreate(...args),
  },
}));

beforeEach(() => {
  mockGetMe.mockReset().mockResolvedValue({ defaultCurrency: "USD" });
  mockCreate.mockReset().mockResolvedValue({
    id: "g1",
    name: "Test Group",
    inviteCode: "abc123",
  });
});

describe("CreateGroupScreen", () => {
  it("renders header", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("New Group")).toBeTruthy();
    });
  });

  it("renders group type selector", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Trip")).toBeTruthy();
      expect(screen.getByText("Couple")).toBeTruthy();
      expect(screen.getByText("Party")).toBeTruthy();
    });
  });

  it("renders currency selector", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("USD")).toBeTruthy();
      expect(screen.getByText("EUR")).toBeTruthy();
      expect(screen.getByText("INR")).toBeTruthy();
    });
  });

  it("renders Add People section", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Add People")).toBeTruthy();
    });
  });

  it("renders Create Group button", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("Create Group")).toBeTruthy();
    });
  });

  it("shows group name input", async () => {
    render(<CreateGroupScreen />);
    await waitFor(() => {
      expect(screen.getByText("What's this group for?")).toBeTruthy();
    });
  });
});
