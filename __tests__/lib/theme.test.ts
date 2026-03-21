import AsyncStorage from "@react-native-async-storage/async-storage";
import { Appearance, Platform } from "react-native";
import {
  THEME_STORAGE_KEY,
  getStoredTheme,
  applyTheme,
  restoreTheme,
} from "@/lib/theme";

// Appearance.setColorScheme is not mocked by default in RNTL
const mockSetColorScheme = jest.fn();
jest.spyOn(Appearance, "setColorScheme").mockImplementation(mockSetColorScheme);

beforeEach(() => {
  jest.clearAllMocks();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
});

describe("THEME_STORAGE_KEY", () => {
  it("equals the expected AsyncStorage key", () => {
    expect(THEME_STORAGE_KEY).toBe("@splitr/dark_mode");
  });
});

describe("getStoredTheme", () => {
  it("returns 'system' when no value stored", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    expect(await getStoredTheme()).toBe("system");
  });

  it("returns 'light' when light is stored", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("light");
    expect(await getStoredTheme()).toBe("light");
  });

  it("returns 'dark' when dark is stored", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("dark");
    expect(await getStoredTheme()).toBe("dark");
  });

  it("returns 'system' for invalid stored value", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("invalid");
    expect(await getStoredTheme()).toBe("system");
  });

  it("returns 'system' when AsyncStorage throws", async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error("fail"));
    expect(await getStoredTheme()).toBe("system");
  });
});

describe("applyTheme", () => {
  const setter = jest.fn();

  beforeEach(() => setter.mockClear());

  it("calls setColorScheme with the given value", async () => {
    await applyTheme("dark", setter);
    expect(setter).toHaveBeenCalledWith("dark");
  });

  it("persists the value to AsyncStorage", async () => {
    await applyTheme("light", setter);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, "light");
  });

  it("calls Appearance.setColorScheme(null) for system on non-web", async () => {
    const originalOS = Platform.OS;
    (Platform as any).OS = "ios";
    await applyTheme("system", setter);
    expect(mockSetColorScheme).toHaveBeenCalledWith(null);
    (Platform as any).OS = originalOS;
  });

  it("calls Appearance.setColorScheme with value for dark on non-web", async () => {
    const originalOS = Platform.OS;
    (Platform as any).OS = "ios";
    await applyTheme("dark", setter);
    expect(mockSetColorScheme).toHaveBeenCalledWith("dark");
    (Platform as any).OS = originalOS;
  });

  it("does NOT call Appearance.setColorScheme on web", async () => {
    const originalOS = Platform.OS;
    (Platform as any).OS = "web";
    await applyTheme("dark", setter);
    expect(mockSetColorScheme).not.toHaveBeenCalled();
    (Platform as any).OS = originalOS;
  });

  it("does not throw when AsyncStorage.setItem fails", async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error("quota"));
    await expect(applyTheme("dark", setter)).resolves.toBeUndefined();
    expect(setter).toHaveBeenCalledWith("dark");
  });
});

describe("restoreTheme", () => {
  const setter = jest.fn();

  beforeEach(() => setter.mockClear());

  it("restores system theme when nothing stored", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    const result = await restoreTheme(setter);
    expect(result).toBe("system");
    expect(setter).toHaveBeenCalledWith("system");
  });

  it("restores dark theme from storage", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("dark");
    const result = await restoreTheme(setter);
    expect(result).toBe("dark");
    expect(setter).toHaveBeenCalledWith("dark");
  });

  it("restores light theme from storage", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("light");
    const result = await restoreTheme(setter);
    expect(result).toBe("light");
    expect(setter).toHaveBeenCalledWith("light");
  });

  it("calls Appearance.setColorScheme on non-web for stored value", async () => {
    const originalOS = Platform.OS;
    (Platform as any).OS = "ios";
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("dark");
    await restoreTheme(setter);
    expect(mockSetColorScheme).toHaveBeenCalledWith("dark");
    (Platform as any).OS = originalOS;
  });

  it("does NOT call Appearance.setColorScheme on web", async () => {
    const originalOS = Platform.OS;
    (Platform as any).OS = "web";
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue("dark");
    await restoreTheme(setter);
    expect(mockSetColorScheme).not.toHaveBeenCalled();
    (Platform as any).OS = originalOS;
  });
});
