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
    FadeIn: { duration: () => ({}) },
    FadeInDown: { delay: () => ({ duration: () => ({ springify: () => ({}) }) }), duration: () => ({ springify: () => ({}) }) },
    FadeInRight: { delay: () => ({ duration: () => ({ springify: () => ({}) }) }) },
    useAnimatedStyle: (fn: any) => (typeof fn === "function" ? fn() : {}),
    useSharedValue: (v: any) => ({ value: v }),
    useDerivedValue: (fn: any) => ({ value: typeof fn === "function" ? fn() : fn }),
    withTiming: (v: any) => v,
    withSpring: (v: any) => v,
    withRepeat: (v: any) => v,
    withSequence: (...args: any[]) => args[0],
    interpolateColor: () => "#000000",
    Easing: { out: () => ({}), cubic: {}, in: () => ({}), inOut: () => ({}) },
    createAnimatedComponent: (comp: any) => comp,
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

// Mock @react-native-community/netinfo
jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
}));

// Mock @react-native-async-storage/async-storage
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Mock @/components/NetworkProvider
jest.mock("@/components/NetworkProvider", () => ({
  useNetwork: () => ({ isOnline: true, pendingCount: 0, refreshPendingCount: jest.fn() }),
  NetworkProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock @tanstack/react-query
jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(() => ({ data: undefined, isLoading: false, error: null, refetch: jest.fn() })),
  useMutation: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
  useQueryClient: jest.fn(() => ({ setQueryData: jest.fn(), invalidateQueries: jest.fn() })),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
  QueryClient: jest.fn(),
}));
