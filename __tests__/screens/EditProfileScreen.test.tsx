import React from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react-native";
import EditProfileScreen from "@/app/edit-profile";

const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
jest.mock("@/components/ui/toast", () => ({
  useToast: () => mockToast,
}));

const mockRouterBack = jest.fn();
const mockRouterReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: mockRouterReplace,
    back: mockRouterBack,
    canGoBack: jest.fn(() => true),
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  Link: "Link",
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

const mockUploadMutate = jest.fn(() => Promise.resolve({ profileImageUrl: "https://cdn.splitr.ai/test.jpg" }));
const mockDeleteMutate = jest.fn(() => Promise.resolve());
jest.mock("@/lib/hooks", () => ({
  useUploadProfileImage: () => ({ mutateAsync: mockUploadMutate }),
  useDeleteProfileImage: () => ({ mutateAsync: mockDeleteMutate }),
}));

jest.mock("@/lib/query", () => ({
  invalidateAfterProfileUpdate: jest.fn(),
}));

jest.mock("@/lib/image-utils", () => ({
  pickImage: jest.fn(() => Promise.resolve(null)),
  validateImage: jest.fn(() => null),
  buildImageFormDataAsync: jest.fn(() => Promise.resolve(new FormData())),
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

  it("pre-fills form with user data from API", async () => {
    render(<EditProfileScreen />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test User")).toBeTruthy();
      expect(screen.getByDisplayValue("+1234567890")).toBeTruthy();
    });
  });

  it("shows error when name is empty on save", async () => {
    render(<EditProfileScreen />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test User")).toBeTruthy();
    });
    fireEvent.changeText(screen.getByDisplayValue("Test User"), "");
    fireEvent.press(screen.getByText("Save Changes"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Name cannot be empty.");
    });
  });

  it("shows error for invalid phone number on save", async () => {
    render(<EditProfileScreen />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("+1234567890")).toBeTruthy();
    });
    fireEvent.changeText(screen.getByDisplayValue("+1234567890"), "abc");
    fireEvent.press(screen.getByText("Save Changes"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Please enter a valid phone number.");
    });
  });

  it("calls updateMe and navigates back on successful save", async () => {
    render(<EditProfileScreen />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test User")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Save Changes"));
    await waitFor(() => {
      expect(mockUpdateMe).toHaveBeenCalledWith(
        { name: "Test User", phone: "+1234567890", defaultCurrency: "USD" },
        "mock-token"
      );
      expect(mockToast.success).toHaveBeenCalledWith("Your profile has been updated.");
    });
  });

  it("handles save failure gracefully", async () => {
    mockUpdateMe.mockRejectedValueOnce(new Error("Network error"));
    render(<EditProfileScreen />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test User")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("Save Changes"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Something went wrong. Try again later.");
    });
  });

  it("selects a different currency", async () => {
    render(<EditProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText("EUR")).toBeTruthy();
    });
    fireEvent.press(screen.getByText("EUR"));
    fireEvent.press(screen.getByText("Save Changes"));
    await waitFor(() => {
      expect(mockUpdateMe).toHaveBeenCalledWith(
        expect.objectContaining({ defaultCurrency: "EUR" }),
        "mock-token"
      );
    });
  });

  it("falls back to Clerk name when API fails", async () => {
    mockMe.mockRejectedValueOnce(new Error("API down"));
    render(<EditProfileScreen />);
    await waitFor(() => {
      expect(screen.getByDisplayValue("Test User")).toBeTruthy(); // Clerk fallback
    });
  });

  it("renders Add Photo text", async () => {
    render(<EditProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText("Add Photo")).toBeTruthy();
    });
  });

  it("renders Change Photo when profileImageUrl is set", async () => {
    mockMe.mockResolvedValueOnce({
      name: "Test User",
      phone: "+1234567890",
      defaultCurrency: "USD",
      email: "test@example.com",
      profileImageUrl: "https://cdn.splitr.ai/test.jpg",
    });
    render(<EditProfileScreen />);
    await waitFor(() => {
      expect(screen.getByText("Change Photo")).toBeTruthy();
    });
  });
});
