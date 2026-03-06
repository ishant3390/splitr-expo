// Global test setup

// Mock expo-haptics
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "Light", Medium: "Medium", Heavy: "Heavy" },
  NotificationFeedbackType: { Success: "Success", Error: "Error", Warning: "Warning" },
}));

// Mock expo-clipboard
jest.mock("expo-clipboard", () => ({
  setStringAsync: jest.fn(),
  getStringAsync: jest.fn(),
}));

// Mock expo-image — return a simple string component to avoid NativeWind babel issues
jest.mock("expo-image", () => ({
  Image: "Image",
}));

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  Link: "Link",
}));

// Mock @clerk/clerk-expo
jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({
    getToken: jest.fn(() => Promise.resolve("mock-token")),
    signOut: jest.fn(),
    isSignedIn: true,
  }),
  useUser: () => ({
    user: {
      fullName: "Test User",
      primaryEmailAddress: { emailAddress: "test@example.com" },
      imageUrl: "https://example.com/avatar.png",
    },
  }),
}));

// Mock nativewind
jest.mock("nativewind", () => ({
  useColorScheme: () => ({
    colorScheme: "light",
    toggleColorScheme: jest.fn(),
  }),
}));

// Mock react-native-css-interop to prevent NativeWind babel issues
jest.mock("react-native-css-interop", () => ({
  cssInterop: jest.fn(),
  remapProps: jest.fn(),
}));

// Mock react-native-svg (used by lucide-react-native)
jest.mock("react-native-svg", () => ({
  __esModule: true,
  default: "Svg",
  Svg: "Svg",
  Circle: "Circle",
  Ellipse: "Ellipse",
  G: "G",
  Text: "Text",
  TSpan: "TSpan",
  TextPath: "TextPath",
  Path: "Path",
  Polygon: "Polygon",
  Polyline: "Polyline",
  Line: "Line",
  Rect: "Rect",
  Use: "Use",
  Image: "Image",
  Symbol: "Symbol",
  Defs: "Defs",
  LinearGradient: "LinearGradient",
  RadialGradient: "RadialGradient",
  Stop: "Stop",
  ClipPath: "ClipPath",
  Pattern: "Pattern",
  Mask: "Mask",
}));

// Mock react-native-reanimated
jest.mock("react-native-reanimated", () => {
  const RN = require("react-native");
  return {
    __esModule: true,
    default: {
      View: RN.View,
      Text: RN.Text,
      Image: RN.Image,
      ScrollView: RN.ScrollView,
      createAnimatedComponent: (comp: any) => comp,
    },
    FadeInDown: { delay: () => ({ duration: () => ({ springify: () => ({}) }) }) },
    FadeInRight: { delay: () => ({ duration: () => ({ springify: () => ({}) }) }) },
    useAnimatedStyle: () => ({}),
    useSharedValue: (v: any) => ({ value: v }),
    withTiming: (v: any) => v,
    withSpring: (v: any) => v,
  };
});

// Mock react-native-safe-area-context
jest.mock("react-native-safe-area-context", () => {
  const RN = require("react-native");
  return {
    SafeAreaView: RN.View,
    SafeAreaProvider: RN.View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

// Mock @react-navigation/native
jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (cb: () => void) => cb(),
}));
