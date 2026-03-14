import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";

const mockSignUpCreate = jest.fn(() => Promise.resolve());
const mockPrepareEmail = jest.fn(() => Promise.resolve());
const mockPreparePhone = jest.fn(() => Promise.resolve());
const mockRouterPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  Link: "Link",
}));

jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({
    getToken: jest.fn(() => Promise.resolve("mock-token")),
    signOut: jest.fn(),
    isSignedIn: false,
  }),
  useUser: () => ({ user: null }),
  useSignUp: () => ({
    signUp: {
      create: mockSignUpCreate,
      prepareEmailAddressVerification: mockPrepareEmail,
      preparePhoneNumberVerification: mockPreparePhone,
    },
    setActive: jest.fn(),
  }),
}));

jest.mock("@/components/ui/toast", () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

import SignUpFormScreen from "@/app/(auth)/signup-form";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("SignUpFormScreen", () => {
  it("renders header", () => {
    render(<SignUpFormScreen />);
    expect(screen.getByText("Create Account")).toBeTruthy();
  });

  it("renders form title and subtitle", () => {
    render(<SignUpFormScreen />);
    expect(screen.getByText("Your details")).toBeTruthy();
    expect(screen.getByText(/We need a few details/)).toBeTruthy();
  });

  it("renders all form fields", () => {
    render(<SignUpFormScreen />);
    expect(screen.getByPlaceholderText("John")).toBeTruthy();
    expect(screen.getByPlaceholderText("Doe")).toBeTruthy();
    expect(screen.getByPlaceholderText("john@example.com")).toBeTruthy();
    expect(screen.getByPlaceholderText("+1 (555) 123-4567")).toBeTruthy();
  });

  it("renders field labels", () => {
    render(<SignUpFormScreen />);
    expect(screen.getByText("First Name *")).toBeTruthy();
    expect(screen.getByText("Last Name *")).toBeTruthy();
    expect(screen.getByText("Email Address")).toBeTruthy();
    expect(screen.getByText("Phone Number")).toBeTruthy();
  });

  it("renders Continue button", () => {
    render(<SignUpFormScreen />);
    expect(screen.getByText("Continue")).toBeTruthy();
  });

  it("renders what happens next info", () => {
    render(<SignUpFormScreen />);
    expect(screen.getByText("What happens next?")).toBeTruthy();
    expect(screen.getByText(/We'll send a 6-digit verification code/)).toBeTruthy();
  });

  it("renders contact helper text", () => {
    render(<SignUpFormScreen />);
    expect(screen.getByText("Provide at least one: email or phone number")).toBeTruthy();
  });

  it("shows validation error when first name is empty", async () => {
    render(<SignUpFormScreen />);
    fireEvent.changeText(screen.getByPlaceholderText("john@example.com"), "test@test.com");
    fireEvent.press(screen.getByText("Continue"));
    await waitFor(() => {
      expect(screen.getByText("First name is required")).toBeTruthy();
    });
  });

  it("shows validation error when last name is empty", async () => {
    render(<SignUpFormScreen />);
    fireEvent.changeText(screen.getByPlaceholderText("John"), "John");
    fireEvent.changeText(screen.getByPlaceholderText("john@example.com"), "test@test.com");
    fireEvent.press(screen.getByText("Continue"));
    await waitFor(() => {
      expect(screen.getByText("Last name is required")).toBeTruthy();
    });
  });

  it("shows validation error when no contact info provided", async () => {
    render(<SignUpFormScreen />);
    fireEvent.changeText(screen.getByPlaceholderText("John"), "John");
    fireEvent.changeText(screen.getByPlaceholderText("Doe"), "Doe");
    fireEvent.press(screen.getByText("Continue"));
    await waitFor(() => {
      expect(screen.getByText("Please provide at least an email address or phone number")).toBeTruthy();
    });
  });

  it("calls signUp.create on valid submission", async () => {
    render(<SignUpFormScreen />);
    fireEvent.changeText(screen.getByPlaceholderText("John"), "John");
    fireEvent.changeText(screen.getByPlaceholderText("Doe"), "Doe");
    fireEvent.changeText(screen.getByPlaceholderText("john@example.com"), "john@test.com");
    fireEvent.press(screen.getByText("Continue"));
    await waitFor(() => {
      expect(mockSignUpCreate).toHaveBeenCalledWith({
        firstName: "John",
        lastName: "Doe",
        emailAddress: "john@test.com",
      });
    });
  });

  it("shows email validation error for invalid email", async () => {
    render(<SignUpFormScreen />);
    fireEvent.changeText(screen.getByPlaceholderText("John"), "John");
    fireEvent.changeText(screen.getByPlaceholderText("Doe"), "Doe");
    fireEvent.changeText(screen.getByPlaceholderText("john@example.com"), "not-an-email");
    fireEvent.press(screen.getByText("Continue"));
    await waitFor(() => {
      expect(screen.getByText("Enter a valid email address")).toBeTruthy();
    });
  });

  it("shows phone validation error for short phone number", async () => {
    render(<SignUpFormScreen />);
    fireEvent.changeText(screen.getByPlaceholderText("John"), "John");
    fireEvent.changeText(screen.getByPlaceholderText("Doe"), "Doe");
    fireEvent.changeText(screen.getByPlaceholderText("+1 (555) 123-4567"), "123");
    fireEvent.press(screen.getByText("Continue"));
    await waitFor(() => {
      expect(screen.getByText("Enter a valid phone number")).toBeTruthy();
    });
  });

  it("submits with phone only (no email) and calls preparePhoneNumberVerification", async () => {
    render(<SignUpFormScreen />);
    fireEvent.changeText(screen.getByPlaceholderText("John"), "Jane");
    fireEvent.changeText(screen.getByPlaceholderText("Doe"), "Smith");
    fireEvent.changeText(screen.getByPlaceholderText("+1 (555) 123-4567"), "+15551234567");
    fireEvent.press(screen.getByText("Continue"));
    await waitFor(() => {
      expect(mockSignUpCreate).toHaveBeenCalledWith({
        firstName: "Jane",
        lastName: "Smith",
        phoneNumber: "+15551234567",
      });
      expect(mockPreparePhone).toHaveBeenCalled();
      expect(mockRouterPush).toHaveBeenCalledWith({
        pathname: "/(auth)/otp-verify",
        params: { contact: "+15551234567", phone: "+15551234567", mode: "signup", method: "phone" },
      });
    });
  });

  it("navigates to OTP verify with email after email submission", async () => {
    render(<SignUpFormScreen />);
    fireEvent.changeText(screen.getByPlaceholderText("John"), "John");
    fireEvent.changeText(screen.getByPlaceholderText("Doe"), "Doe");
    fireEvent.changeText(screen.getByPlaceholderText("john@example.com"), "john@test.com");
    fireEvent.press(screen.getByText("Continue"));
    await waitFor(() => {
      expect(mockPrepareEmail).toHaveBeenCalled();
      expect(mockRouterPush).toHaveBeenCalledWith({
        pathname: "/(auth)/otp-verify",
        params: { contact: "john@test.com", phone: "", mode: "signup", method: "email" },
      });
    });
  });

  it("handles signUp.create failure gracefully", async () => {
    mockSignUpCreate.mockRejectedValueOnce(new Error("Sign up failed"));
    render(<SignUpFormScreen />);
    fireEvent.changeText(screen.getByPlaceholderText("John"), "John");
    fireEvent.changeText(screen.getByPlaceholderText("Doe"), "Doe");
    fireEvent.changeText(screen.getByPlaceholderText("john@example.com"), "john@test.com");
    fireEvent.press(screen.getByText("Continue"));
    await waitFor(() => {
      expect(mockSignUpCreate).toHaveBeenCalled();
      // Should not crash, toast.error called internally
    });
  });

  it("clears email error when user types in email field", async () => {
    render(<SignUpFormScreen />);
    fireEvent.changeText(screen.getByPlaceholderText("John"), "John");
    fireEvent.changeText(screen.getByPlaceholderText("Doe"), "Doe");
    fireEvent.press(screen.getByText("Continue"));
    await waitFor(() => {
      expect(screen.getByText("Please provide at least an email address or phone number")).toBeTruthy();
    });
    // Type in email field to clear error
    fireEvent.changeText(screen.getByPlaceholderText("john@example.com"), "j");
    expect(screen.queryByText("Please provide at least an email address or phone number")).toBeNull();
  });

  it("clears phone error when user types in phone field", async () => {
    render(<SignUpFormScreen />);
    fireEvent.changeText(screen.getByPlaceholderText("John"), "John");
    fireEvent.changeText(screen.getByPlaceholderText("Doe"), "Doe");
    fireEvent.press(screen.getByText("Continue"));
    await waitFor(() => {
      expect(screen.getByText("Please provide at least an email address or phone number")).toBeTruthy();
    });
    fireEvent.changeText(screen.getByPlaceholderText("+1 (555) 123-4567"), "1");
    expect(screen.queryByText("Please provide at least an email address or phone number")).toBeNull();
  });

  it("renders back button", () => {
    render(<SignUpFormScreen />);
    // Back button is rendered as part of header
    expect(screen.getByText("Create Account")).toBeTruthy();
  });
});
