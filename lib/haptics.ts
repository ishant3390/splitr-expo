import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

/** Light tap — selections, toggles, checkbox changes */
export const hapticLight = () => {
  if (Platform.OS === "ios") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

/** Medium tap — button presses, card taps */
export const hapticMedium = () => {
  if (Platform.OS === "ios") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }
};

/** Heavy tap — destructive actions, settle up */
export const hapticHeavy = () => {
  if (Platform.OS === "ios") {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }
};

/** Success — expense added, settlement recorded */
export const hapticSuccess = () => {
  if (Platform.OS === "ios") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }
};

/** Error — validation failure */
export const hapticError = () => {
  if (Platform.OS === "ios") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }
};

/** Warning — delete confirmation */
export const hapticWarning = () => {
  if (Platform.OS === "ios") {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }
};

/** Selection changed — tab switches, picker changes */
export const hapticSelection = () => {
  if (Platform.OS === "ios") {
    Haptics.selectionAsync();
  }
};
