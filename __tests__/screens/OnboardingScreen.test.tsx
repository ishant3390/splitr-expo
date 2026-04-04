import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import OnboardingScreen, { ONBOARDING_KEY } from "@/app/onboarding";

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockGetToken = jest.fn(() => Promise.resolve("test-token"));
jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));

jest.mock("@/lib/haptics", () => ({
  hapticLight: jest.fn(),
  hapticSuccess: jest.fn(),
  hapticSelection: jest.fn(),
}));

jest.mock("@/lib/api", () => ({
  usersApi: {
    updateMe: jest.fn(() => Promise.resolve({})),
  },
}));

const AsyncStorage = require("@react-native-async-storage/async-storage");
const { usersApi } = require("@/lib/api");

describe("OnboardingScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the first step with welcome content", () => {
    render(<OnboardingScreen />);
    expect(screen.getByText("Welcome to Splitr")).toBeTruthy();
    expect(screen.getByText("Next")).toBeTruthy();
    expect(screen.getByTestId("onboarding-skip")).toBeTruthy();
  });

  it("renders five step indicator dots", () => {
    render(<OnboardingScreen />);
    expect(screen.getByTestId("onboarding-dot-0")).toBeTruthy();
    expect(screen.getByTestId("onboarding-dot-1")).toBeTruthy();
    expect(screen.getByTestId("onboarding-dot-2")).toBeTruthy();
    expect(screen.getByTestId("onboarding-dot-3")).toBeTruthy();
    expect(screen.getByTestId("onboarding-dot-4")).toBeTruthy();
  });

  it("shows currency step as step 2 with currency chips", () => {
    render(<OnboardingScreen />);
    fireEvent.press(screen.getByTestId("onboarding-next"));

    expect(screen.getByText("Your Currency")).toBeTruthy();
    expect(screen.getByTestId("currency-USD")).toBeTruthy();
    expect(screen.getByTestId("currency-GBP")).toBeTruthy();
    expect(screen.getByTestId("currency-INR")).toBeTruthy();
    expect(screen.getByTestId("currency-EUR")).toBeTruthy();
  });

  it("allows selecting a different currency", () => {
    render(<OnboardingScreen />);
    fireEvent.press(screen.getByTestId("onboarding-next"));

    fireEvent.press(screen.getByTestId("currency-GBP"));
    // Continues to work — currency is stored in state
    fireEvent.press(screen.getByTestId("onboarding-next"));
    expect(screen.getByText("Create a Group")).toBeTruthy();
  });

  it("advances through all steps to the last", () => {
    render(<OnboardingScreen />);
    expect(screen.getByText("Welcome to Splitr")).toBeTruthy();

    fireEvent.press(screen.getByTestId("onboarding-next"));
    expect(screen.getByText("Your Currency")).toBeTruthy();

    fireEvent.press(screen.getByTestId("onboarding-next"));
    expect(screen.getByText("Create a Group")).toBeTruthy();

    fireEvent.press(screen.getByTestId("onboarding-next"));
    expect(screen.getByText("Add Expenses")).toBeTruthy();

    fireEvent.press(screen.getByTestId("onboarding-next"));
    expect(screen.getByText("Settle Up")).toBeTruthy();
    expect(screen.getByText("Get Started")).toBeTruthy();
  });

  it("hides skip button on the last step", () => {
    render(<OnboardingScreen />);
    // Advance to last step (5 steps, 4 presses)
    fireEvent.press(screen.getByTestId("onboarding-next"));
    fireEvent.press(screen.getByTestId("onboarding-next"));
    fireEvent.press(screen.getByTestId("onboarding-next"));
    fireEvent.press(screen.getByTestId("onboarding-next"));

    expect(screen.queryByTestId("onboarding-skip")).toBeNull();
  });

  it("completes onboarding on skip and saves currency", async () => {
    render(<OnboardingScreen />);
    fireEvent.press(screen.getByTestId("onboarding-skip"));

    await waitFor(() => {
      expect(usersApi.updateMe).toHaveBeenCalledWith(
        { defaultCurrency: "USD" },
        "test-token"
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(ONBOARDING_KEY, "true");
      expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
    });
  });

  it("completes onboarding on Get Started and saves selected currency", async () => {
    render(<OnboardingScreen />);
    // Go to currency step and select GBP
    fireEvent.press(screen.getByTestId("onboarding-next"));
    fireEvent.press(screen.getByTestId("currency-GBP"));

    // Advance to last step
    fireEvent.press(screen.getByTestId("onboarding-next"));
    fireEvent.press(screen.getByTestId("onboarding-next"));
    fireEvent.press(screen.getByTestId("onboarding-next"));

    // Tap Get Started
    fireEvent.press(screen.getByTestId("onboarding-next"));

    await waitFor(() => {
      expect(usersApi.updateMe).toHaveBeenCalledWith(
        { defaultCurrency: "GBP" },
        "test-token"
      );
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(ONBOARDING_KEY, "true");
      expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
    });
  });

  it("exports ONBOARDING_KEY constant", () => {
    expect(ONBOARDING_KEY).toBe("@splitr/onboarding_complete");
  });
});
