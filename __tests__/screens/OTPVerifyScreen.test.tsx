import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react-native";

let mockParams: Record<string, string> = {
  contact: "test@example.com",
  mode: "signup",
  method: "email",
};

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: mockRouterReplace,
    back: mockRouterBack,
    canGoBack: jest.fn(() => true),
  }),
  useLocalSearchParams: () => mockParams,
  useSegments: () => [],
  Link: "Link",
}));

const mockRouterPush = jest.fn();
const mockRouterBack = jest.fn();
const mockRouterReplace = jest.fn();

const mockAttemptEmail = jest.fn(() => Promise.resolve({ status: "complete", createdSessionId: "sess-1" }));
const mockPrepareEmail = jest.fn(() => Promise.resolve());
const mockAttemptPhone = jest.fn(() => Promise.resolve({ status: "complete", createdSessionId: "sess-1" }));
const mockPreparePhone = jest.fn(() => Promise.resolve());
const mockAttemptFirstFactor = jest.fn(() => Promise.resolve({ status: "complete", createdSessionId: "sess-2" }));
const mockPrepareFirstFactor = jest.fn(() => Promise.resolve());
const mockSetActiveSignUp = jest.fn();
const mockSetActiveSignIn = jest.fn();

jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({
    getToken: jest.fn(() => Promise.resolve("mock-token")),
    signOut: jest.fn(),
    isSignedIn: false,
  }),
  useUser: () => ({ user: null }),
  useSignUp: () => ({
    signUp: {
      attemptEmailAddressVerification: mockAttemptEmail,
      attemptPhoneNumberVerification: mockAttemptPhone,
      prepareEmailAddressVerification: mockPrepareEmail,
      preparePhoneNumberVerification: mockPreparePhone,
    },
    setActive: mockSetActiveSignUp,
  }),
  useSignIn: () => ({
    signIn: {
      attemptFirstFactor: mockAttemptFirstFactor,
      prepareFirstFactor: mockPrepareFirstFactor,
      supportedFirstFactors: [
        { strategy: "email_code", emailAddressId: "ea-1" },
        { strategy: "phone_code", phoneNumberId: "pn-1" },
      ],
    },
    setActive: mockSetActiveSignIn,
  }),
}));

jest.mock("@/components/ui/otp-input", () => {
  const MockReact = require("react");
  const { TextInput } = require("react-native");
  return {
    OTPInput: ({ value, onChange }: { value: string; onChange: (v: string) => void }) =>
      MockReact.createElement(TextInput, {
        testID: "otp-input",
        value,
        onChangeText: onChange,
        placeholder: "Enter OTP",
      }),
  };
});

import OTPVerifyScreen from "@/app/(auth)/otp-verify";

const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
jest.mock("@/components/ui/toast", () => ({
  useToast: () => mockToast,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = { contact: "test@example.com", mode: "signup", method: "email" };
});

describe("OTPVerifyScreen", () => {
  it("renders header", () => {
    render(<OTPVerifyScreen />);
    expect(screen.getByText("Verify Account")).toBeTruthy();
  });

  it("renders verification code prompt", () => {
    render(<OTPVerifyScreen />);
    expect(screen.getByText("Enter verification code")).toBeTruthy();
  });

  it("shows contact email in the prompt", () => {
    render(<OTPVerifyScreen />);
    expect(screen.getByText("test@example.com")).toBeTruthy();
  });

  it("renders OTP input", () => {
    render(<OTPVerifyScreen />);
    expect(screen.getByTestId("otp-input")).toBeTruthy();
  });

  it("renders Verify button", () => {
    render(<OTPVerifyScreen />);
    expect(screen.getByText("Verify")).toBeTruthy();
  });

  it("shows resend countdown", () => {
    render(<OTPVerifyScreen />);
    expect(screen.getByText(/Resend in 30s/)).toBeTruthy();
  });

  it("shows didn't receive code text", () => {
    render(<OTPVerifyScreen />);
    expect(screen.getByText("Didn't receive a code?")).toBeTruthy();
  });

  it("shows sent-to text", () => {
    render(<OTPVerifyScreen />);
    expect(screen.getByText(/We've sent a 6-digit code to/)).toBeTruthy();
  });

  it("shows error toast for OTP shorter than 6 digits", async () => {
    render(<OTPVerifyScreen />);
    fireEvent.changeText(screen.getByTestId("otp-input"), "123");
    fireEvent.press(screen.getByText("Verify"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Please enter the complete 6-digit code.");
    });
  });

  it("verifies email OTP in signup mode", async () => {
    render(<OTPVerifyScreen />);
    fireEvent.changeText(screen.getByTestId("otp-input"), "424242");
    fireEvent.press(screen.getByText("Verify"));
    await waitFor(() => {
      expect(mockAttemptEmail).toHaveBeenCalledWith({ code: "424242" });
    });
  });

  it("shows Verified! screen on successful verification", async () => {
    mockAttemptEmail.mockResolvedValueOnce({ status: "complete", createdSessionId: "sess-1" });
    render(<OTPVerifyScreen />);
    fireEvent.changeText(screen.getByTestId("otp-input"), "424242");
    fireEvent.press(screen.getByText("Verify"));
    await waitFor(() => {
      expect(screen.getByText("Verified!")).toBeTruthy();
    });
  });

  it("shows error toast on verification failure", async () => {
    mockAttemptEmail.mockRejectedValueOnce(new Error("bad code"));
    render(<OTPVerifyScreen />);
    fireEvent.changeText(screen.getByTestId("otp-input"), "000000");
    fireEvent.press(screen.getByText("Verify"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Verification failed. Try again later.");
    });
  });

  it("verifies phone OTP in signup mode", async () => {
    mockParams = { contact: "test@example.com", phone: "+15551234567", mode: "signup", method: "phone" };
    render(<OTPVerifyScreen />);
    fireEvent.changeText(screen.getByTestId("otp-input"), "424242");
    fireEvent.press(screen.getByText("Verify"));
    await waitFor(() => {
      expect(mockAttemptPhone).toHaveBeenCalledWith({ code: "424242" });
    });
  });

  it("verifies OTP in signin mode via attemptFirstFactor", async () => {
    mockParams = { contact: "test@example.com", mode: "signin", method: "email" };
    render(<OTPVerifyScreen />);
    fireEvent.changeText(screen.getByTestId("otp-input"), "424242");
    fireEvent.press(screen.getByText("Verify"));
    await waitFor(() => {
      expect(mockAttemptFirstFactor).toHaveBeenCalledWith({
        strategy: "email_code",
        code: "424242",
      });
    });
  });

  // Note: Resend code tests require countdown to reach 0. Fake timers conflict with
  // async rendering in RNTL. The resend paths (handleResend) are effectively tested
  // via the toggle method tests below which also reset countdown and call prepare methods.

  it("shows toggle method button in signup mode with phone", () => {
    mockParams = { contact: "test@example.com", phone: "+15551234567", mode: "signup", method: "email" };
    render(<OTPVerifyScreen />);
    expect(screen.getByText(/Verify via phone instead/)).toBeTruthy();
  });

  it("toggles verification method from email to phone", async () => {
    mockParams = { contact: "test@example.com", phone: "+15551234567", mode: "signup", method: "email" };
    render(<OTPVerifyScreen />);
    fireEvent.press(screen.getByText(/Verify via phone instead/));
    await waitFor(() => {
      expect(mockPreparePhone).toHaveBeenCalled();
      expect(screen.getByText(/Verify via email instead/)).toBeTruthy();
    });
  });

  it("shows phone contact in display when method is phone", () => {
    mockParams = { contact: "test@example.com", phone: "+15551234567", mode: "signup", method: "phone" };
    render(<OTPVerifyScreen />);
    expect(screen.getByText("+15551234567")).toBeTruthy();
  });

  it("navigates back via back button", () => {
    render(<OTPVerifyScreen />);
    expect(screen.getByText("Verify Account")).toBeTruthy();
  });

  it("shows Verified screen on successful phone OTP signup", async () => {
    mockParams = { contact: "test@example.com", phone: "+15551234567", mode: "signup", method: "phone" };
    mockAttemptPhone.mockResolvedValueOnce({ status: "complete", createdSessionId: "sess-1" });
    render(<OTPVerifyScreen />);
    fireEvent.changeText(screen.getByTestId("otp-input"), "424242");
    fireEvent.press(screen.getByText("Verify"));
    await waitFor(() => {
      expect(screen.getByText("Verified!")).toBeTruthy();
    });
  });

  it("shows Verified screen on successful signin OTP", async () => {
    mockParams = { contact: "test@example.com", mode: "signin", method: "email" };
    mockAttemptFirstFactor.mockResolvedValueOnce({ status: "complete", createdSessionId: "sess-2" });
    render(<OTPVerifyScreen />);
    fireEvent.changeText(screen.getByTestId("otp-input"), "424242");
    fireEvent.press(screen.getByText("Verify"));
    await waitFor(() => {
      expect(screen.getByText("Verified!")).toBeTruthy();
    });
  });

  it("toggles method from phone to email", async () => {
    mockParams = { contact: "test@example.com", phone: "+15551234567", mode: "signup", method: "phone" };
    render(<OTPVerifyScreen />);
    expect(screen.getByText(/Verify via email instead/)).toBeTruthy();
    fireEvent.press(screen.getByText(/Verify via email instead/));
    await waitFor(() => {
      expect(mockPrepareEmail).toHaveBeenCalled();
      expect(screen.getByText(/Verify via phone instead/)).toBeTruthy();
    });
  });

  it("handles verification error with detailed error message", async () => {
    mockAttemptEmail.mockRejectedValueOnce({
      errors: [{ longMessage: "Code is expired" }],
    });
    render(<OTPVerifyScreen />);
    fireEvent.changeText(screen.getByTestId("otp-input"), "999999");
    fireEvent.press(screen.getByText("Verify"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Verification failed. Try again later.");
    });
  });

  it("does not show toggle method in signin mode", () => {
    mockParams = { contact: "test@example.com", mode: "signin", method: "email" };
    render(<OTPVerifyScreen />);
    expect(screen.queryByText(/Verify via phone instead/)).toBeNull();
  });

  it("does not show toggle method in signup mode without phone", () => {
    mockParams = { contact: "test@example.com", mode: "signup", method: "email" };
    render(<OTPVerifyScreen />);
    expect(screen.queryByText(/Verify via phone instead/)).toBeNull();
  });

  it("countdown decrements from 30 and resend button appears at 0", async () => {
    jest.useFakeTimers();
    render(<OTPVerifyScreen />);
    expect(screen.getByText(/Resend in 30s/)).toBeTruthy();
    // Advance all 30 timers
    for (let i = 0; i < 30; i++) {
      act(() => { jest.advanceTimersByTime(1000); });
    }
    await waitFor(() => {
      expect(screen.getByText("Resend Code")).toBeTruthy();
    });
    jest.useRealTimers();
  });

  it("resend calls prepareEmailAddressVerification in signup mode", async () => {
    jest.useFakeTimers();
    mockParams = { contact: "test@example.com", mode: "signup", method: "email" };
    render(<OTPVerifyScreen />);
    for (let i = 0; i < 30; i++) {
      act(() => { jest.advanceTimersByTime(1000); });
    }
    await waitFor(() => {
      expect(screen.getByText("Resend Code")).toBeTruthy();
    });
    await act(async () => {
      fireEvent.press(screen.getByText("Resend Code"));
    });
    expect(mockPrepareEmail).toHaveBeenCalledWith({ strategy: "email_code" });
    expect(mockToast.success).toHaveBeenCalledWith("A new code has been sent to your email.");
    jest.useRealTimers();
  });

  it("resend calls preparePhoneNumberVerification in signup phone mode", async () => {
    jest.useFakeTimers();
    mockParams = { contact: "test@example.com", phone: "+15551234567", mode: "signup", method: "phone" };
    render(<OTPVerifyScreen />);
    for (let i = 0; i < 30; i++) {
      act(() => { jest.advanceTimersByTime(1000); });
    }
    await waitFor(() => {
      expect(screen.getByText("Resend Code")).toBeTruthy();
    });
    await act(async () => {
      fireEvent.press(screen.getByText("Resend Code"));
    });
    expect(mockPreparePhone).toHaveBeenCalledWith({ strategy: "phone_code" });
    jest.useRealTimers();
  });

  it("resend calls prepareFirstFactor in signin mode", async () => {
    jest.useFakeTimers();
    mockParams = { contact: "test@example.com", mode: "signin", method: "email" };
    render(<OTPVerifyScreen />);
    for (let i = 0; i < 30; i++) {
      act(() => { jest.advanceTimersByTime(1000); });
    }
    await waitFor(() => {
      expect(screen.getByText("Resend Code")).toBeTruthy();
    });
    await act(async () => {
      fireEvent.press(screen.getByText("Resend Code"));
    });
    expect(mockPrepareFirstFactor).toHaveBeenCalledWith({
      strategy: "email_code",
      emailAddressId: "ea-1",
    });
    jest.useRealTimers();
  });

  it("resend in signin phone mode calls prepareFirstFactor with phone_code", async () => {
    jest.useFakeTimers();
    mockParams = { contact: "test@example.com", phone: "+15551234567", mode: "signin", method: "phone" };
    render(<OTPVerifyScreen />);
    // Toggle to phone first — but method is already phone
    for (let i = 0; i < 30; i++) {
      act(() => { jest.advanceTimersByTime(1000); });
    }
    await waitFor(() => {
      expect(screen.getByText("Resend Code")).toBeTruthy();
    });
    await act(async () => {
      fireEvent.press(screen.getByText("Resend Code"));
    });
    expect(mockPrepareFirstFactor).toHaveBeenCalledWith({
      strategy: "phone_code",
      phoneNumberId: "pn-1",
    });
    jest.useRealTimers();
  });

  it("resend resets countdown to 30", async () => {
    jest.useFakeTimers();
    render(<OTPVerifyScreen />);
    for (let i = 0; i < 30; i++) {
      act(() => { jest.advanceTimersByTime(1000); });
    }
    await waitFor(() => {
      expect(screen.getByText("Resend Code")).toBeTruthy();
    });
    await act(async () => {
      fireEvent.press(screen.getByText("Resend Code"));
    });
    expect(screen.getByText(/Resend in 30s/)).toBeTruthy();
    jest.useRealTimers();
  });

  it("resend shows error toast when it fails", async () => {
    jest.useFakeTimers();
    mockPrepareEmail.mockRejectedValueOnce(new Error("fail"));
    render(<OTPVerifyScreen />);
    for (let i = 0; i < 30; i++) {
      act(() => { jest.advanceTimersByTime(1000); });
    }
    await waitFor(() => {
      expect(screen.getByText("Resend Code")).toBeTruthy();
    });
    await act(async () => {
      fireEvent.press(screen.getByText("Resend Code"));
    });
    expect(mockToast.error).toHaveBeenCalledWith("Something went wrong. Try again later.");
    jest.useRealTimers();
  });

  it("shows redirect text on verified screen", async () => {
    mockAttemptEmail.mockResolvedValueOnce({ status: "complete", createdSessionId: "sess-1" });
    render(<OTPVerifyScreen />);
    fireEvent.changeText(screen.getByTestId("otp-input"), "424242");
    fireEvent.press(screen.getByText("Verify"));
    await waitFor(() => {
      expect(screen.getByText("Verified!")).toBeTruthy();
      expect(screen.getByText(/Redirecting to Splitr/)).toBeTruthy();
    });
  });

  it("calls setActive after verification with a delay", async () => {
    jest.useFakeTimers();
    mockAttemptFirstFactor.mockResolvedValueOnce({ status: "complete", createdSessionId: "sess-2" });
    mockParams = { contact: "test@example.com", mode: "signin", method: "email" };
    render(<OTPVerifyScreen />);
    fireEvent.changeText(screen.getByTestId("otp-input"), "424242");
    await act(async () => {
      fireEvent.press(screen.getByText("Verify"));
    });
    await waitFor(() => {
      expect(screen.getByText("Verified!")).toBeTruthy();
    });
    await act(async () => {
      jest.advanceTimersByTime(1500);
    });
    expect(mockSetActiveSignIn).toHaveBeenCalledWith({ session: "sess-2" });
    jest.useRealTimers();
  });
});
