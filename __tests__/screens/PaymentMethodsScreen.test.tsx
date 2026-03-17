import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";

const mockRouterBack = jest.fn();
const mockRouterPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockRouterBack, push: mockRouterPush }),
}));

const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
jest.mock("@/components/ui/toast", () => ({
  useToast: () => mockToast,
}));

const mockUpdateMe = jest.fn(() => Promise.resolve({}));
jest.mock("@/lib/api", () => ({
  usersApi: {
    updateMe: (...args: any[]) => mockUpdateMe(...args),
  },
}));

jest.mock("@/lib/query", () => ({
  invalidateAfterProfileUpdate: jest.fn(),
}));

let mockUserData: any = {
  id: "u1",
  name: "Alice",
  defaultCurrency: "USD",
  paymentHandles: { venmoUsername: "alice-w" },
};

jest.mock("@/lib/hooks", () => ({
  useUserProfile: () => ({ data: mockUserData }),
}));

import PaymentMethodsScreen from "@/app/payment-methods";

beforeEach(() => {
  jest.clearAllMocks();
  mockUserData = {
    id: "u1",
    name: "Alice",
    defaultCurrency: "USD",
    paymentHandles: { venmoUsername: "alice-w" },
  };
});

describe("PaymentMethodsScreen", () => {
  it("renders header with gradient hero", () => {
    render(<PaymentMethodsScreen />);
    expect(screen.getByText("Payment Methods")).toBeTruthy();
    expect(screen.getByText(/Add your handles/)).toBeTruthy();
  });

  it("shows USD region providers by default", () => {
    render(<PaymentMethodsScreen />);
    expect(screen.getByText("Venmo")).toBeTruthy();
    expect(screen.getByText("PayPal")).toBeTruthy();
    expect(screen.getByText("Cash App")).toBeTruthy();
    expect(screen.getByText("Zelle")).toBeTruthy();
  });

  it("shows INR region providers when currency is INR", () => {
    mockUserData = { ...mockUserData, defaultCurrency: "INR" };
    render(<PaymentMethodsScreen />);
    expect(screen.getByText("UPI")).toBeTruthy();
    expect(screen.getByText("PayPal")).toBeTruthy();
  });

  it("pre-fills existing payment handles", () => {
    render(<PaymentMethodsScreen />);
    const venmoInput = screen.getByDisplayValue("alice-w");
    expect(venmoInput).toBeTruthy();
  });

  it("shows 'Show all payment methods' toggle", () => {
    render(<PaymentMethodsScreen />);
    expect(screen.getByText("Show all payment methods")).toBeTruthy();
  });

  it("reveals other region providers on toggle", () => {
    render(<PaymentMethodsScreen />);
    fireEvent.press(screen.getByText("Show all payment methods"));
    expect(screen.getByText("Other Regions")).toBeTruthy();
    expect(screen.getByText("UPI")).toBeTruthy();
    expect(screen.getByText("Revolut")).toBeTruthy();
    expect(screen.getByText("Monzo")).toBeTruthy();
  });

  it("renders save button", () => {
    render(<PaymentMethodsScreen />);
    expect(screen.getByText("Save Payment Methods")).toBeTruthy();
  });

  it("calls updateMe on save", async () => {
    render(<PaymentMethodsScreen />);
    fireEvent.press(screen.getByText("Save Payment Methods"));
    await waitFor(() => {
      expect(mockUpdateMe).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentHandles: expect.objectContaining({ venmoUsername: "alice-w" }),
        }),
        "mock-token"
      );
      expect(mockToast.success).toHaveBeenCalledWith("Payment methods saved!");
    });
  });

  it("shows error toast on save failure", async () => {
    mockUpdateMe.mockRejectedValueOnce(new Error("fail"));
    render(<PaymentMethodsScreen />);
    fireEvent.press(screen.getByText("Save Payment Methods"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Failed to save payment methods.");
    });
  });

  it("validates invalid UPI format", async () => {
    mockUserData = { ...mockUserData, defaultCurrency: "INR", paymentHandles: {} };
    render(<PaymentMethodsScreen />);
    // Show all to get UPI
    const upiInput = screen.getByPlaceholderText("you@okicici");
    fireEvent.changeText(upiInput, "not-valid");
    fireEvent.press(screen.getByText("Save Payment Methods"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Please fix the errors above.");
    });
  });

  it("handles empty user handles gracefully", () => {
    mockUserData = { ...mockUserData, paymentHandles: undefined };
    render(<PaymentMethodsScreen />);
    expect(screen.getByText("Payment Methods")).toBeTruthy();
  });

  it("navigates back on back button press", () => {
    render(<PaymentMethodsScreen />);
    // Find the back button by accessibility role
    const backButtons = screen.getAllByRole("button");
    fireEvent.press(backButtons[0]);
    expect(mockRouterBack).toHaveBeenCalled();
  });
});
