import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";

export const BIOMETRIC_LOCK_KEY = "@splitr/biometric_lock";

export interface BiometricSupport {
  hasHardware: boolean;
  isEnrolled: boolean;
  supportedAuthenticationTypes: LocalAuthentication.AuthenticationType[];
}

export async function getBiometricLockEnabled(): Promise<boolean> {
  const storedValue = await AsyncStorage.getItem(BIOMETRIC_LOCK_KEY);
  return storedValue === "true";
}

export async function setBiometricLockEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(BIOMETRIC_LOCK_KEY, enabled ? "true" : "false");
}

export async function getBiometricSupport(): Promise<BiometricSupport> {
  const [hasHardware, isEnrolled, supportedAuthenticationTypes] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
    LocalAuthentication.supportedAuthenticationTypesAsync(),
  ]);

  return {
    hasHardware,
    isEnrolled,
    supportedAuthenticationTypes,
  };
}

export function getBiometricLabel(
  authenticationTypes: LocalAuthentication.AuthenticationType[]
): string {
  if (authenticationTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
    return Platform.OS === "ios" ? "Face ID" : "face recognition";
  }
  if (authenticationTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
    return "fingerprint";
  }
  if (authenticationTypes.includes(LocalAuthentication.AuthenticationType.IRIS)) {
    return "iris";
  }
  return "biometrics";
}

export async function authenticateAppUnlock(
  promptMessage: string
): Promise<LocalAuthentication.LocalAuthenticationResult> {
  return LocalAuthentication.authenticateAsync({
    promptMessage,
    cancelLabel: "Cancel",
    disableDeviceFallback: false,
  });
}
