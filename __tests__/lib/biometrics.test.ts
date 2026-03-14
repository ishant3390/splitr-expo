jest.unmock("@/lib/biometrics");

jest.mock("expo-local-authentication", () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([1])),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  BIOMETRIC_LOCK_KEY,
  authenticateAppUnlock,
  getBiometricLabel,
  getBiometricLockEnabled,
  getBiometricSupport,
  setBiometricLockEnabled,
} from "@/lib/biometrics";

describe("biometrics.ts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([1]);
    (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });
  });

  it("returns false when biometric lock preference is not saved", async () => {
    expect(await getBiometricLockEnabled()).toBe(false);
  });

  it("returns true when biometric lock preference is enabled", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("true");
    expect(await getBiometricLockEnabled()).toBe(true);
  });

  it("persists biometric lock preference", async () => {
    await setBiometricLockEnabled(true);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(BIOMETRIC_LOCK_KEY, "true");
  });

  it("returns biometric support details", async () => {
    const support = await getBiometricSupport();
    expect(support).toEqual({
      hasHardware: true,
      isEnrolled: true,
      supportedAuthenticationTypes: [1],
    });
  });

  it("returns expected biometric label", () => {
    expect(getBiometricLabel([LocalAuthentication.AuthenticationType.FINGERPRINT])).toBe("fingerprint");
    expect(["Face ID", "face recognition"]).toContain(
      getBiometricLabel([LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION])
    );
  });

  it("authenticates with expected prompt options", async () => {
    await authenticateAppUnlock("Unlock Splitr");
    expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith({
      promptMessage: "Unlock Splitr",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });
  });

  it("returns 'iris' label for IRIS authentication type", () => {
    expect(getBiometricLabel([LocalAuthentication.AuthenticationType.IRIS])).toBe("iris");
  });

  it("returns 'biometrics' label for empty authentication types", () => {
    expect(getBiometricLabel([])).toBe("biometrics");
  });

  it("persists biometric lock disabled", async () => {
    await setBiometricLockEnabled(false);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(BIOMETRIC_LOCK_KEY, "false");
  });
});
