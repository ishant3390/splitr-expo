import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
import {
  hapticLight,
  hapticMedium,
  hapticHeavy,
  hapticSuccess,
  hapticError,
  hapticWarning,
  hapticSelection,
} from "@/lib/haptics";

describe("haptics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("on iOS", () => {
    beforeAll(() => {
      Platform.OS = "ios";
    });

    it("hapticLight calls impactAsync with Light", () => {
      hapticLight();
      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Light
      );
    });

    it("hapticMedium calls impactAsync with Medium", () => {
      hapticMedium();
      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Medium
      );
    });

    it("hapticHeavy calls impactAsync with Heavy", () => {
      hapticHeavy();
      expect(Haptics.impactAsync).toHaveBeenCalledWith(
        Haptics.ImpactFeedbackStyle.Heavy
      );
    });

    it("hapticSuccess calls notificationAsync with Success", () => {
      hapticSuccess();
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Success
      );
    });

    it("hapticError calls notificationAsync with Error", () => {
      hapticError();
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Error
      );
    });

    it("hapticWarning calls notificationAsync with Warning", () => {
      hapticWarning();
      expect(Haptics.notificationAsync).toHaveBeenCalledWith(
        Haptics.NotificationFeedbackType.Warning
      );
    });

    it("hapticSelection calls selectionAsync", () => {
      hapticSelection();
      expect(Haptics.selectionAsync).toHaveBeenCalled();
    });
  });

  describe("on Android", () => {
    beforeAll(() => {
      Platform.OS = "android";
    });

    afterAll(() => {
      Platform.OS = "ios"; // restore
    });

    it("hapticLight does not call haptics", () => {
      hapticLight();
      expect(Haptics.impactAsync).not.toHaveBeenCalled();
    });

    it("hapticSuccess does not call haptics", () => {
      hapticSuccess();
      expect(Haptics.notificationAsync).not.toHaveBeenCalled();
    });

    it("hapticSelection does not call haptics", () => {
      hapticSelection();
      expect(Haptics.selectionAsync).not.toHaveBeenCalled();
    });
  });
});
