import React from "react";
import { Platform } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import PrivacySecurityScreen from "@/app/privacy-security";

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
const mockToastInfo = jest.fn();

const mockGetBiometricLockEnabled = jest.fn(() => Promise.resolve(false));
const mockGetBiometricSupport = jest.fn(() =>
  Promise.resolve({
    hasHardware: true,
    isEnrolled: true,
    supportedAuthenticationTypes: [1],
  })
);
const mockGetBiometricLabel = jest.fn(() => "fingerprint");
const mockAuthenticateAppUnlock = jest.fn(() => Promise.resolve({ success: true }));
const mockSetBiometricLockEnabled = jest.fn(() => Promise.resolve());

jest.mock("@/components/ui/toast", () => ({
  useToast: () => ({
    success: mockToastSuccess,
    error: mockToastError,
    info: mockToastInfo,
  }),
}));

jest.mock("@/lib/haptics", () => ({
  hapticLight: jest.fn(),
  hapticError: jest.fn(),
  hapticSuccess: jest.fn(),
  hapticWarning: jest.fn(),
}));

jest.mock("@/lib/biometrics", () => ({
  getBiometricLockEnabled: () => mockGetBiometricLockEnabled(),
  getBiometricSupport: () => mockGetBiometricSupport(),
  getBiometricLabel: (types: number[]) => mockGetBiometricLabel(types),
  authenticateAppUnlock: (prompt: string) => mockAuthenticateAppUnlock(prompt),
  setBiometricLockEnabled: (enabled: boolean) => mockSetBiometricLockEnabled(enabled),
}));

jest.mock("@/lib/api", () => ({
  usersApi: {
    me: jest.fn(() => Promise.resolve({ id: "u1", name: "Test" })),
  },
}));

describe("PrivacySecurityScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBiometricLockEnabled.mockResolvedValue(false);
    mockGetBiometricSupport.mockResolvedValue({
      hasHardware: true,
      isEnrolled: true,
      supportedAuthenticationTypes: [1],
    });
    mockGetBiometricLabel.mockReturnValue("fingerprint");
    mockAuthenticateAppUnlock.mockResolvedValue({ success: true });
    mockSetBiometricLockEnabled.mockResolvedValue(undefined);
  });

  it("renders privacy and app lock sections", async () => {
    render(<PrivacySecurityScreen />);
    expect(screen.getByText("Privacy & Security")).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText("Lock app with fingerprint")).toBeTruthy();
    });
  });

  it("renders data & storage and legal sections", async () => {
    render(<PrivacySecurityScreen />);
    await waitFor(() => {
      expect(screen.getByText("Data & Storage")).toBeTruthy();
      expect(screen.getByText("Export Your Data")).toBeTruthy();
      expect(screen.getByText("Clear Local Cache")).toBeTruthy();
      expect(screen.getByText("Legal")).toBeTruthy();
      expect(screen.getByText("Privacy Policy")).toBeTruthy();
      expect(screen.getByText("Terms of Service")).toBeTruthy();
    });
  });

  it("renders active sessions section", async () => {
    render(<PrivacySecurityScreen />);
    await waitFor(() => {
      expect(screen.getByText("Active Sessions")).toBeTruthy();
    });
  });

  it("enables biometric lock after successful authentication", async () => {
    render(<PrivacySecurityScreen />);

    const toggle = await screen.findByTestId("biometric-lock-switch");
    fireEvent(toggle, "valueChange", true);

    await waitFor(() => {
      expect(mockAuthenticateAppUnlock).toHaveBeenCalledWith("Enable biometric app lock");
      expect(mockSetBiometricLockEnabled).toHaveBeenCalledWith(true);
      expect(mockToastSuccess).toHaveBeenCalledWith("Biometric app lock enabled.");
    });
  });

  it("disables biometric lock without auth prompt", async () => {
    mockGetBiometricLockEnabled.mockResolvedValue(true);
    render(<PrivacySecurityScreen />);

    const toggle = await screen.findByTestId("biometric-lock-switch");
    fireEvent(toggle, "valueChange", false);

    await waitFor(() => {
      expect(mockAuthenticateAppUnlock).not.toHaveBeenCalled();
      expect(mockSetBiometricLockEnabled).toHaveBeenCalledWith(false);
      expect(mockToastInfo).toHaveBeenCalledWith("Biometric app lock disabled.");
    });
  });

  it("shows an error when biometrics are not enrolled", async () => {
    mockGetBiometricSupport.mockResolvedValue({
      hasHardware: true,
      isEnrolled: false,
      supportedAuthenticationTypes: [1],
    });

    render(<PrivacySecurityScreen />);

    const toggle = await screen.findByTestId("biometric-lock-switch");
    fireEvent(toggle, "valueChange", true);

    await waitFor(() => {
      expect(mockAuthenticateAppUnlock).not.toHaveBeenCalled();
      expect(mockSetBiometricLockEnabled).not.toHaveBeenCalled();
      expect(mockToastError).toHaveBeenCalled();
      // Platform-specific message
      const errorMsg = mockToastError.mock.calls[0][0];
      expect(errorMsg).toMatch(/Set up|fingerprint|face/i);
    });
  });

  it("renders delete account section", async () => {
    render(<PrivacySecurityScreen />);
    await waitFor(() => {
      expect(screen.getByText("Delete Account")).toBeTruthy();
    });
  });
});
