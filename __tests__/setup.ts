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

// Mock expo-image-picker
jest.mock("expo-image-picker", () => ({
  launchCameraAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: [] })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: true, assets: [] })),
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
    setColorScheme: jest.fn(),
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

// Mock react-native-gesture-handler
jest.mock("react-native-gesture-handler", () => {
  const RN = require("react-native");
  function chainableGesture(): any {
    const g: any = {};
    const methods = [
      "activeOffsetX", "failOffsetY", "onUpdate", "onEnd", "onStart",
      "numberOfTaps", "minPointers", "maxPointers", "enabled",
    ];
    for (const m of methods) g[m] = () => g;
    return g;
  }
  const GestureMock = {
    Pan: () => chainableGesture(),
    Pinch: () => chainableGesture(),
    Tap: () => chainableGesture(),
    Simultaneous: (..._gestures: any[]) => chainableGesture(),
    Race: (..._gestures: any[]) => chainableGesture(),
    Exclusive: (..._gestures: any[]) => chainableGesture(),
  };
  return {
    Gesture: GestureMock,
    GestureDetector: ({ children }: { children: React.ReactNode }) => children,
    GestureHandlerRootView: RN.View,
    Swipeable: RN.View,
    DrawerLayout: RN.View,
    State: {},
    PanGestureHandler: RN.View,
    BaseButton: RN.View,
    Directions: {},
  };
});

// Mock react-native-keyboard-controller
jest.mock("react-native-keyboard-controller", () => {
  const RN = require("react-native");
  return {
    KeyboardAvoidingView: RN.KeyboardAvoidingView,
    KeyboardProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock react-native-reanimated
jest.mock("react-native-reanimated", () => {
  const RN = require("react-native");
  function chainableAnim(): any {
    const obj: any = {};
    const methods = ["duration", "delay", "springify", "damping", "stiffness", "mass", "overshootClamping", "restDisplacementThreshold", "restSpeedThreshold", "withInitialValues", "build"];
    for (const m of methods) obj[m] = () => obj;
    return obj;
  }
  return {
    __esModule: true,
    default: {
      View: RN.View,
      Text: RN.Text,
      Image: RN.Image,
      ScrollView: RN.ScrollView,
      createAnimatedComponent: (comp: any) => comp,
    },
    FadeIn: chainableAnim(),
    FadeInDown: chainableAnim(),
    FadeInUp: chainableAnim(),
    FadeInRight: chainableAnim(),
    FadeInLeft: chainableAnim(),
    FadeOut: chainableAnim(),
    SlideInDown: { springify: () => ({ damping: () => ({ stiffness: () => ({}) }) }) },
    SlideOutDown: { springify: () => ({ damping: () => ({ stiffness: () => ({}) }) }) },
    useAnimatedStyle: (fn: any) => (typeof fn === "function" ? fn() : {}),
    useSharedValue: (v: any) => ({ value: v }),
    useDerivedValue: (fn: any) => ({ value: typeof fn === "function" ? fn() : fn }),
    withTiming: (v: any) => v,
    withSpring: (v: any) => v,
    withRepeat: (v: any) => v,
    withDelay: (_d: any, v: any) => v,
    withSequence: (...args: any[]) => args[0],
    runOnJS: (fn: any) => fn,
    useReducedMotion: () => false,
    useAnimatedReaction: () => {
      // No-op in tests — components should handle display updates
      // via useEffect for the test environment where withTiming resolves instantly
    },
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

// Mock expo-linear-gradient
jest.mock("expo-linear-gradient", () => {
  const RN = require("react-native");
  return {
    LinearGradient: RN.View,
  };
});

// Mock @react-navigation/native
jest.mock("@react-navigation/native", () => ({
  useFocusEffect: (cb: () => void) => cb(),
  useIsFocused: () => true,
}));

// Mock expo-notifications
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: "ExponentPushToken[test-token]" })),
  setBadgeCountAsync: jest.fn(),
  getBadgeCountAsync: jest.fn(() => Promise.resolve(0)),
  setNotificationChannelAsync: jest.fn(),
  setNotificationCategoryAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  removeNotificationSubscription: jest.fn(),
  useLastNotificationResponse: jest.fn(() => null),
  AndroidImportance: { MAX: 5, HIGH: 4, DEFAULT: 3, LOW: 2, MIN: 1 },
}));

// Mock expo-device
jest.mock("expo-device", () => ({
  isDevice: true,
  modelName: "Test Device",
}));

// Mock expo-constants
jest.mock("expo-constants", () => ({
  expoConfig: { extra: { eas: { projectId: "test-project-id" } } },
}));

// Mock expo-local-authentication
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

// Mock @/lib/notifications
jest.mock("@/lib/notifications", () => ({
  configureForegroundHandler: jest.fn(),
  setupAndroidChannels: jest.fn(),
  registerPushToken: jest.fn(() => Promise.resolve(null)),
  unregisterPushToken: jest.fn(() => Promise.resolve()),
  clearBadge: jest.fn(),
  getNotificationUrl: jest.fn(() => null),
  setupNotificationCategories: jest.fn(),
  getNotificationPermissionStatus: jest.fn(() => Promise.resolve(true)),
  requestNotificationPermission: jest.fn(() => Promise.resolve(true)),
  getNotificationPreferences: jest.fn(() => Promise.resolve({
    enabled: true,
    detailLevel: "privacy",
    expenses: true,
    settlements: true,
    groups: true,
    reminders: true,
  })),
  saveNotificationPreferences: jest.fn(() => Promise.resolve()),
  getExpoPushToken: jest.fn(() => Promise.resolve("ExponentPushToken[test-token]")),
  NOTIFICATION_CHANNELS: {
    expenses: { id: "expenses", name: "Expenses", importance: 5 },
    settlements: { id: "settlements", name: "Settlements", importance: 4 },
    groups: { id: "groups", name: "Groups", importance: 3 },
    reminders: { id: "reminders", name: "Reminders", importance: 3 },
  },
  NOTIFICATION_PREFS_KEY: "@splitr/notification_prefs",
  DEFAULT_NOTIFICATION_PREFS: {
    enabled: true,
    detailLevel: "privacy",
    expenses: true,
    settlements: true,
    groups: true,
    reminders: true,
  },
}));

// Mock @/components/NotificationProvider
jest.mock("@/components/NotificationProvider", () => ({
  NotificationProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock @react-native-community/netinfo
jest.mock("@react-native-community/netinfo", () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true, isInternetReachable: true })),
}));

// Mock @react-native-community/datetimepicker
jest.mock("@react-native-community/datetimepicker", () => {
  const RN = require("react-native");
  return {
    __esModule: true,
    default: RN.View,
  };
});

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

// Mock confetti component
jest.mock("@/components/ui/confetti", () => ({
  Confetti: () => null,
}));

// Mock image preview modal
jest.mock("@/components/ui/image-preview-modal", () => {
  const RN = require("react-native");
  return {
    ImagePreviewModal: ({ visible, imageUri, onClose }: { visible: boolean; imageUri: string | null; onClose: () => void }) => {
      if (!visible) return null;
      return RN.createElement(RN.View, { testID: "image-preview-modal" },
        RN.createElement(RN.Text, null, imageUri),
        RN.createElement(RN.Pressable, { onPress: onClose, accessibilityLabel: "Close image preview" })
      );
    },
  };
});

// Mock @tanstack/react-query
jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(() => ({ data: undefined, isLoading: false, error: null, refetch: jest.fn() })),
  useInfiniteQuery: jest.fn(() => ({
    data: { pages: [], pageParams: [] },
    isLoading: false,
    error: null,
    refetch: jest.fn(),
    fetchNextPage: jest.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
  })),
  useQueries: jest.fn(({ queries }: { queries: any[] }) =>
    queries.map(() => ({ data: undefined, isLoading: false, error: null }))
  ),
  useMutation: jest.fn(() => ({ mutateAsync: jest.fn(), isPending: false })),
  useQueryClient: jest.fn(() => ({ setQueryData: jest.fn(), invalidateQueries: jest.fn() })),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
  QueryClient: jest.fn(),
}));

// Mock expo-quick-actions
jest.mock("expo-quick-actions", () => ({
  setItems: jest.fn(() => Promise.resolve()),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  isSupported: jest.fn(() => Promise.resolve(false)),
  initial: undefined,
  maxCount: undefined,
}));

jest.mock("expo-quick-actions/router", () => ({
  useQuickActionRouting: jest.fn(),
  isRouterAction: jest.fn(() => false),
}));

// Mock @/lib/speech
jest.mock("@/lib/speech", () => ({
  isSpeechRecognitionAvailable: jest.fn(() => false),
  createSpeechRecognition: jest.fn(() => null),
}));
