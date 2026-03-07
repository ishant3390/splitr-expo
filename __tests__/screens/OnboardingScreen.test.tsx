import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import OnboardingScreen, { ONBOARDING_KEY } from "@/app/onboarding";

const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock("@/lib/haptics", () => ({
  hapticLight: jest.fn(),
  hapticSuccess: jest.fn(),
}));

const AsyncStorage = require("@react-native-async-storage/async-storage");

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

  it("renders four step indicator dots", () => {
    render(<OnboardingScreen />);
    expect(screen.getByTestId("onboarding-dot-0")).toBeTruthy();
    expect(screen.getByTestId("onboarding-dot-1")).toBeTruthy();
    expect(screen.getByTestId("onboarding-dot-2")).toBeTruthy();
    expect(screen.getByTestId("onboarding-dot-3")).toBeTruthy();
  });

  it("advances to the next step on pressing Next", () => {
    render(<OnboardingScreen />);
    expect(screen.getByText("Welcome to Splitr")).toBeTruthy();

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
    // Advance to last step
    fireEvent.press(screen.getByTestId("onboarding-next"));
    fireEvent.press(screen.getByTestId("onboarding-next"));
    fireEvent.press(screen.getByTestId("onboarding-next"));

    expect(screen.queryByTestId("onboarding-skip")).toBeNull();
  });

  it("completes onboarding on skip and navigates to tabs", async () => {
    render(<OnboardingScreen />);
    fireEvent.press(screen.getByTestId("onboarding-skip"));

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(ONBOARDING_KEY, "true");
      expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
    });
  });

  it("completes onboarding on Get Started (last step)", async () => {
    render(<OnboardingScreen />);
    // Advance to last step
    fireEvent.press(screen.getByTestId("onboarding-next"));
    fireEvent.press(screen.getByTestId("onboarding-next"));
    fireEvent.press(screen.getByTestId("onboarding-next"));

    fireEvent.press(screen.getByTestId("onboarding-next"));

    await waitFor(() => {
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(ONBOARDING_KEY, "true");
      expect(mockReplace).toHaveBeenCalledWith("/(tabs)");
    });
  });

  it("exports ONBOARDING_KEY constant", () => {
    expect(ONBOARDING_KEY).toBe("@splitr/onboarding_complete");
  });
});
