import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance, Platform } from "react-native";

export const THEME_STORAGE_KEY = "@splitr/dark_mode";

export type ThemePreference = "system" | "light" | "dark";

/**
 * Read the persisted theme preference from AsyncStorage.
 * Returns "system" if no value or an invalid value is stored.
 */
export async function getStoredTheme(): Promise<ThemePreference> {
  try {
    const value = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    if (value === "light" || value === "dark") return value;
    return "system";
  } catch {
    return "system";
  }
}

/**
 * Apply a theme preference: updates NativeWind color scheme and native
 * Appearance on native platforms, then persists to storage. On web, only
 * persists — NativeWind is configured with darkMode:"media" (required for
 * native dark mode to work), and calling setColorScheme in "media" mode
 * throws. The OS prefers-color-scheme drives the web scheme.
 */
export async function applyTheme(
  next: ThemePreference,
  setColorScheme: (scheme: "system" | "light" | "dark") => void,
): Promise<void> {
  if (Platform.OS !== "web") {
    setColorScheme(next);
    Appearance.setColorScheme(next === "system" ? null : next);
  }
  try {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Storage write failed — preference won't survive restart but UI is correct
  }
}

/**
 * Restore persisted theme on app startup.
 * Call once from the root layout effect.
 */
export async function restoreTheme(
  setColorScheme: (scheme: "system" | "light" | "dark") => void,
): Promise<ThemePreference> {
  const stored = await getStoredTheme();
  if (Platform.OS !== "web") {
    setColorScheme(stored);
    Appearance.setColorScheme(stored === "system" ? null : stored);
  }
  return stored;
}
