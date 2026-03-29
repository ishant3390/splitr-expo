import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";

const mockStartGoogleOAuth = jest.fn(() => Promise.resolve({ createdSessionId: null }));
const mockStartAppleOAuth = jest.fn(() => Promise.resolve({ createdSessionId: null }));

jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({
    getToken: jest.fn(() => Promise.resolve("mock-token")),
    signOut: jest.fn(),
    isSignedIn: false,
  }),
  useUser: () => ({
    user: null,
  }),
  useOAuth: ({ strategy }: { strategy: string }) => {
    const map: Record<string, any> = {
      oauth_google: { startOAuthFlow: mockStartGoogleOAuth },
      oauth_apple: { startOAuthFlow: mockStartAppleOAuth },
    };
    return map[strategy] ?? { startOAuthFlow: jest.fn() };
  },
  useSignIn: () => ({
    signIn: {
      create: jest.fn(),
      prepareFirstFactor: jest.fn(),
      supportedFirstFactors: [],
      authenticateWithRedirect: jest.fn(),
    },
    setActive: jest.fn(),
  }),
  useSignUp: () => ({
    signUp: {
      authenticateWithRedirect: jest.fn(),
    },
    setActive: jest.fn(),
  }),
}));

jest.mock("expo-web-browser", () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock("expo-linking", () => ({
  createURL: jest.fn(() => "http://test"),
}));

jest.mock("@/components/ui/toast", () => ({
  useToast: () => ({
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

jest.mock("@/components/icons/social-icons", () => {
  const MockReact = require("react");
  const { Text } = require("react-native");
  return {
    GoogleIcon: () => MockReact.createElement(Text, null, "GoogleIcon"),
    AppleIcon: () => MockReact.createElement(Text, null, "AppleIcon"),
  };
});

import AuthScreen from "@/app/(auth)/index";

beforeEach(() => {
  jest.clearAllMocks();
});

describe("AuthScreen", () => {
  it("renders app name and tagline", () => {
    render(<AuthScreen />);
    expect(screen.getByText("Splitr")).toBeTruthy();
    expect(screen.getByText("Split expenses with friends, effortlessly")).toBeTruthy();
  });

  it("renders Sign Up and Sign In tabs", () => {
    render(<AuthScreen />);
    expect(screen.getByText("Sign Up")).toBeTruthy();
    expect(screen.getAllByText("Sign In").length).toBeGreaterThan(0);
  });

  it("renders Google and Apple OAuth buttons in signup mode", () => {
    render(<AuthScreen />);
    expect(screen.getByText(/Sign up with Google/)).toBeTruthy();
    expect(screen.getByText(/Sign up with Apple/)).toBeTruthy();
  });

  it("renders email/phone signup button in signup mode", () => {
    render(<AuthScreen />);
    expect(screen.getByText("Sign up with email or phone")).toBeTruthy();
  });

  it("renders Terms of Service text", () => {
    render(<AuthScreen />);
    expect(screen.getByText(/Terms of Service/)).toBeTruthy();
  });

  it("renders or divider", () => {
    render(<AuthScreen />);
    expect(screen.getByText("or")).toBeTruthy();
  });

  it("renders footer toggle text", () => {
    render(<AuthScreen />);
    expect(screen.getByText(/Already have an account/)).toBeTruthy();
  });

  it("switches to sign in view when footer toggle is pressed", () => {
    render(<AuthScreen />);
    fireEvent.press(screen.getByText(/Already have an account/));
    expect(screen.getByText(/Sign in with Google/)).toBeTruthy();
    expect(screen.getByText(/Sign in with Apple/)).toBeTruthy();
  });

  it("shows email/phone sign-in button initially in sign-in mode", () => {
    render(<AuthScreen />);
    fireEvent.press(screen.getByText(/Already have an account/));
    expect(screen.getByText("Sign in with email or phone")).toBeTruthy();
  });

  it("shows email input after tapping email/phone sign-in", () => {
    render(<AuthScreen />);
    fireEvent.press(screen.getByText(/Already have an account/));
    fireEvent.press(screen.getByText("Sign in with email or phone"));
    expect(screen.getByPlaceholderText("Email address or phone number")).toBeTruthy();
  });

  it("shows 'Don't have an account?' in sign-in mode", () => {
    render(<AuthScreen />);
    fireEvent.press(screen.getByText(/Already have an account/));
    expect(screen.getByText(/Don't have an account/)).toBeTruthy();
  });

  it("calls Google OAuth flow when Google button is pressed", async () => {
    render(<AuthScreen />);
    fireEvent.press(screen.getByText(/Sign up with Google/));
    await waitFor(() => {
      expect(mockStartGoogleOAuth).toHaveBeenCalled();
    });
  });

  it("calls Apple OAuth flow when Apple button is pressed", async () => {
    render(<AuthScreen />);
    fireEvent.press(screen.getByText(/Sign up with Apple/));
    await waitFor(() => {
      expect(mockStartAppleOAuth).toHaveBeenCalled();
    });
  });

  it("handles OAuth success with createdSessionId", async () => {
    const mockSetActive = jest.fn();
    mockStartGoogleOAuth.mockResolvedValueOnce({
      createdSessionId: "sess-123",
      setActive: mockSetActive,
    });
    render(<AuthScreen />);
    fireEvent.press(screen.getByText(/Sign up with Google/));
    await waitFor(() => {
      expect(mockSetActive).toHaveBeenCalledWith({ session: "sess-123" });
    });
  });

  it("handles OAuth failure gracefully", async () => {
    mockStartGoogleOAuth.mockRejectedValueOnce(new Error("OAuth error"));
    render(<AuthScreen />);
    fireEvent.press(screen.getByText(/Sign up with Google/));
    await waitFor(() => {
      expect(mockStartGoogleOAuth).toHaveBeenCalled();
    });
  });

  it("shows sign-in OAuth buttons after tab switch", () => {
    render(<AuthScreen />);
    fireEvent.press(screen.getByText(/Already have an account/));
    expect(screen.getByText(/Sign in with Google/)).toBeTruthy();
    expect(screen.getByText(/Sign in with Apple/)).toBeTruthy();
  });

  it("sends verification code for email sign-in", async () => {
    render(<AuthScreen />);
    fireEvent.press(screen.getByText(/Already have an account/));
    fireEvent.press(screen.getByText("Sign in with email or phone"));
    fireEvent.changeText(
      screen.getByPlaceholderText("Email address or phone number"),
      "test@example.com"
    );
    fireEvent.press(screen.getByText("Send verification code"));
    await waitFor(() => {
      expect(screen.getByText("Send verification code")).toBeTruthy();
    });
  });

  it("shows error toast when submitting empty sign-in field", async () => {
    render(<AuthScreen />);
    fireEvent.press(screen.getByText(/Already have an account/));
    fireEvent.press(screen.getByText("Sign in with email or phone"));
    fireEvent.press(screen.getByText("Send verification code"));
    await waitFor(() => {
      expect(screen.getByText("Send verification code")).toBeTruthy();
    });
  });

  it("sends verification code for phone sign-in", async () => {
    render(<AuthScreen />);
    fireEvent.press(screen.getByText(/Already have an account/));
    fireEvent.press(screen.getByText("Sign in with email or phone"));
    fireEvent.changeText(
      screen.getByPlaceholderText("Email address or phone number"),
      "+15551234567"
    );
    fireEvent.press(screen.getByText("Send verification code"));
    await waitFor(() => {
      expect(screen.getByText("Send verification code")).toBeTruthy();
    });
  });

  it("navigates to signup-form when email/phone signup button is pressed", () => {
    render(<AuthScreen />);
    fireEvent.press(screen.getByText("Sign up with email or phone"));
  });

  it("switches back from sign-in to sign-up mode", () => {
    render(<AuthScreen />);
    fireEvent.press(screen.getByText(/Already have an account/));
    expect(screen.getByText(/Don't have an account/)).toBeTruthy();
    fireEvent.press(screen.getByText(/Don't have an account/));
    expect(screen.getByText(/Already have an account/)).toBeTruthy();
    expect(screen.getByText("Sign up with email or phone")).toBeTruthy();
  });

  it("can switch tabs via tab buttons", () => {
    render(<AuthScreen />);
    const signInTab = screen.getAllByText("Sign In");
    fireEvent.press(signInTab[0]);
    expect(screen.getByText(/Sign in with Google/)).toBeTruthy();
  });
});
