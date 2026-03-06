import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";
import EditProfileScreen from "@/app/edit-profile";

jest.mock("@/components/ui/toast", () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

const mockMe = jest.fn(() =>
  Promise.resolve({
    name: "Test User",
    phone: "+1234567890",
    defaultCurrency: "USD",
    email: "test@example.com",
  })
);
const mockUpdateMe = jest.fn(() => Promise.resolve({}));

jest.mock("@/lib/api", () => ({
  usersApi: {
    me: (...args: any[]) => mockMe(...args),
    updateMe: (...args: any[]) => mockUpdateMe(...args),
  },
}));

beforeEach(() => {
  mockMe.mockReset().mockResolvedValue({
    name: "Test User",
    phone: "+1234567890",
    defaultCurrency: "USD",
    email: "test@example.com",
  });
  mockUpdateMe.mockReset().mockResolvedValue({});
});

describe("EditProfileScreen", () => {
  it("renders header", async () => {
    render(<EditProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText("Edit Profile")).toBeTruthy();
    });
  });

  it("renders name field", async () => {
    render(<EditProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText("Name")).toBeTruthy();
    });
  });

  it("renders email info", async () => {
    render(<EditProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText("Email")).toBeTruthy();
      expect(
        screen.getByText("Email is managed by your auth provider")
      ).toBeTruthy();
    });
  });

  it("renders phone field", async () => {
    render(<EditProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText("Phone")).toBeTruthy();
    });
  });

  it("renders currency selector", async () => {
    render(<EditProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText("Default Currency")).toBeTruthy();
    });
  });

  it("renders save button", async () => {
    render(<EditProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText("Save Changes")).toBeTruthy();
    });
  });

  it("loads user data from API", async () => {
    render(<EditProfileScreen />);
    await waitFor(() => {
      expect(mockMe).toHaveBeenCalled();
    });
  });
});
