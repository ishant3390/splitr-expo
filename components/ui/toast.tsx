import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { View, Text, Pressable, Animated, useColorScheme } from "react-native";
import { X, CheckCircle2, AlertTriangle, Info } from "lucide-react-native";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

const ICON_MAP = {
  success: { Icon: CheckCircle2, color: "#10b981" },
  error: { Icon: AlertTriangle, color: "#ef4444" },
  info: { Icon: Info, color: "#0d9488" },
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-20)).current;
  const { Icon, color } = ICON_MAP[toast.type];
  const bgMap = isDark ? BG_MAP_DARK : BG_MAP_LIGHT;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -20, duration: 200, useNativeDriver: true }),
      ]).start(onDismiss);
    }, 3500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateY }],
        backgroundColor: bgMap[toast.type],
        borderWidth: 1,
        borderColor: color + "30",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 8,
        flexDirection: "row",
        alignItems: "center",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      <Icon size={18} color={color} />
      <Text
        style={{
          flex: 1,
          marginLeft: 10,
          fontSize: 14,
          color: isDark ? "#f1f5f9" : "#1e293b",
          fontFamily: "Inter_500Medium",
        }}
        numberOfLines={3}
      >
        {toast.message}
      </Text>
      <Pressable onPress={onDismiss} hitSlop={8}>
        <X size={16} color="#94a3b8" />
      </Pressable>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const show = useCallback((message: string, type: ToastType) => {
    const id = nextId.current++;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ctx: ToastContextValue = {
    success: useCallback((msg) => show(msg, "success"), [show]),
    error: useCallback((msg) => show(msg, "error"), [show]),
    info: useCallback((msg) => show(msg, "info"), [show]),
  };

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <View
        pointerEvents="box-none"
        style={{
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
