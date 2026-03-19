import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { useColorScheme } from "nativewind";
import { X, CheckCircle2, AlertTriangle, Info } from "lucide-react-native";
import { colors, fontSize as fs, fontFamily as ff, radius, palette } from "@/lib/tokens";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from "react-native-reanimated";

type ToastType = "success" | "error" | "info";

interface ToastAction {
  label: string;
  onPress: () => void;
}

interface Toast {
  id: number;
  message: string;
  type: ToastType;
  action?: ToastAction;
  duration?: number;
}

interface ToastContextValue {
  success: (message: string, options?: { action?: ToastAction; duration?: number }) => void;
  error: (message: string, options?: { action?: ToastAction; duration?: number }) => void;
  info: (message: string, options?: { action?: ToastAction; duration?: number }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const ICON_MAP = {
  success: { Icon: CheckCircle2, color: palette.emerald500 },
  error: { Icon: AlertTriangle, color: palette.red500 },
  info: { Icon: Info, color: palette.teal600 },
};

const BG_MAP_LIGHT = {
  success: "#ecfdf5",
  error: "#fef2f2",
  info: "#f0fdfa",
};

const BG_MAP_DARK = {
  success: "#064e3b",
  error: "#450a0a",
  info: "#042f2e",
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-20);
  const { Icon, color } = ICON_MAP[toast.type];
  const bgMap = isDark ? BG_MAP_DARK : BG_MAP_LIGHT;
  const duration = toast.duration ?? 3500;

  useEffect(() => {
    // Enter: ease-out (fast start, responsive)
    opacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.cubic) });
    translateY.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.cubic) });

    const timer = setTimeout(() => {
      // Exit: also ease-out (system response should feel snappy, not sluggish)
      opacity.value = withTiming(0, { duration: 180, easing: Easing.out(Easing.cubic) });
      translateY.value = withTiming(-20, { duration: 180, easing: Easing.out(Easing.cubic) }, () => {
        runOnJS(onDismiss)();
      });
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={[animatedStyle, {
        backgroundColor: bgMap[toast.type],
        borderWidth: 1,
        borderColor: color + "30",
        borderRadius: radius.lg,
        borderLeftWidth: 3,
        borderLeftColor: color,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 8,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: palette.black,
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 3,
      }]}
    >
      <Icon size={18} color={color} />
      <Text
        style={{
          flex: 1,
          marginLeft: 10,
          fontSize: fs.md,
          color: isDark ? c.foreground : c.secondaryForeground,
          fontFamily: ff.medium,
        }}
        numberOfLines={3}
      >
        {toast.message}
      </Text>
      {toast.action && (
        <Pressable
          onPress={() => { toast.action!.onPress(); onDismiss(); }}
          hitSlop={8}
          style={{
            marginLeft: 8,
            paddingHorizontal: 10,
            paddingVertical: 4,
            borderRadius: radius.sm,
            backgroundColor: color + "20",
          }}
        >
          <Text style={{ fontSize: fs.base, fontFamily: ff.semibold, color }}>{toast.action.label}</Text>
        </Pressable>
      )}
      <Pressable onPress={onDismiss} hitSlop={8} style={{ marginLeft: toast.action ? 4 : 0 }}>
        <X size={16} color={c.mutedForeground} />
      </Pressable>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const show = useCallback((message: string, type: ToastType, options?: { action?: ToastAction; duration?: number }) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, type, action: options?.action, duration: options?.duration }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ctx: ToastContextValue = {
    success: useCallback((msg, opts) => show(msg, "success", opts), [show]),
    error: useCallback((msg, opts) => show(msg, "error", opts), [show]),
    info: useCallback((msg, opts) => show(msg, "info", opts), [show]),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <View
        style={{
          pointerEvents: "box-none",
          position: "absolute",
          top: 60,
          left: 16,
          right: 16,
          zIndex: 9999,
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}
