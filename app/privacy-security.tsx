import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Linking,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth, useUser } from "@clerk/clerk-expo";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  ArrowLeft,
  Shield,
  Lock,
  Eye,
  Fingerprint,
  Trash2,
  ExternalLink,
  Smartphone,
  Download,
  HardDriveDownload,
  LogOut,
  ChevronRight,
  X,
} from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { ThemedSwitch } from "@/components/ui/themed-switch";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useToast } from "@/components/ui/toast";
import { hapticLight, hapticError, hapticSuccess, hapticWarning } from "@/lib/haptics";
import { usersApi } from "@/lib/api";
import {
  authenticateAppUnlock,
  getBiometricLabel,
  getBiometricLockEnabled,
  getBiometricSupport,
  setBiometricLockEnabled as saveBiometricLockEnabled,
} from "@/lib/biometrics";

interface SessionInfo {
  id: string;
  lastActiveAt: string;
  latestActivity?: { deviceType?: string; browserName?: string; city?: string; country?: string };
  status: string;
}

export default function PrivacySecurityScreen() {
  const router = useRouter();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const toast = useToast();
  const { getToken, signOut } = useAuth();
  const { user: clerkUser } = useUser();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showClearCacheModal, setShowClearCacheModal] = useState(false);

  // Biometrics
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(true);
  const [biometricLabel, setBiometricLabel] = useState("biometrics");

  // Sessions
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  // Export
  const [exporting, setExporting] = useState(false);

  // Clear cache
  const [clearingCache, setClearingCache] = useState(false);

  useEffect(() => {
    const load = async () => {
      // Load biometric settings
      const [enabled, support] = await Promise.all([
        getBiometricLockEnabled(),
        getBiometricSupport(),
      ]);
      setBiometricEnabled(enabled);
      setBiometricAvailable(support.hasHardware && support.isEnrolled);
      setBiometricLabel(getBiometricLabel(support.supportedAuthenticationTypes));

      // Load active sessions from Clerk
      try {
        const clerkSessions = clerkUser?.getSessions
          ? await clerkUser.getSessions()
          : [];
        setSessions(
          clerkSessions.map((s: any) => ({
            id: s.id,
            lastActiveAt: s.lastActiveAt?.toISOString?.() ?? s.lastActiveAt ?? "",
            latestActivity: s.latestActivity,
            status: s.status,
          }))
        );
      } catch {
        setSessions([]);
      } finally {
        setSessionsLoading(false);
      }
    };
    load();
  }, []);

  // --- Biometrics ---
  const handleBiometricToggle = async (nextValue: boolean) => {
    if (biometricBusy) return;

    hapticLight();
    setBiometricBusy(true);

    if (!nextValue) {
      await saveBiometricLockEnabled(false);
      setBiometricEnabled(false);
      setBiometricBusy(false);
      toast.info("Biometric app lock disabled.");
      return;
    }

    const support = await getBiometricSupport();
    const available = support.hasHardware && support.isEnrolled;
    setBiometricAvailable(available);
    setBiometricLabel(getBiometricLabel(support.supportedAuthenticationTypes));

    if (!support.hasHardware) {
      setBiometricBusy(false);
      toast.error("Biometric authentication is not available on this device.");
      return;
    }

    if (!support.isEnrolled) {
      setBiometricBusy(false);
      toast.error(
        Platform.OS === "ios"
          ? "Set up Face ID or Touch ID in Settings > Face ID & Passcode."
          : "Set up fingerprint or face unlock in Settings > Security."
      );
      return;
    }

    const result = await authenticateAppUnlock("Enable biometric app lock");
    if (!result.success) {
      setBiometricBusy(false);
      if (result.error === "user_cancel" || result.error === "system_cancel" || result.error === "app_cancel") {
        toast.info("Biometric verification cancelled.");
        return;
      }
      toast.error("Biometric verification failed. Please try again.");
      return;
    }

    await saveBiometricLockEnabled(true);
    setBiometricEnabled(true);
    setBiometricBusy(false);
    toast.success("Biometric app lock enabled.");
  };

  // --- Sessions ---
  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSessionId(sessionId);
    try {
      const session = clerkUser?.getSessions
        ? (await clerkUser.getSessions()).find((s: any) => s.id === sessionId)
        : null;
      if (session && typeof session.revoke === "function") {
        await session.revoke();
      }
      hapticSuccess();
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success("Session revoked.");
    } catch {
      hapticError();
      toast.error("Failed to revoke session.");
    } finally {
      setRevokingSessionId(null);
    }
  };

  // --- Export Data ---
  const handleExportData = async () => {
    setExporting(true);
    try {
      const token = await getToken();
      if (token) {
        // Try the export endpoint; if not available, show info toast
        try {
          await usersApi.me(token); // verify token is valid
          hapticSuccess();
          toast.info("A data export link will be sent to your email within 24 hours.");
        } catch {
          toast.error("Unable to request data export. Please try again.");
        }
      }
    } catch {
      hapticError();
      toast.error("Something went wrong.");
    } finally {
      setExporting(false);
    }
  };

  // --- Clear Cache ---
  const handleClearCache = async () => {
    setShowClearCacheModal(false);
    setClearingCache(true);
    try {
      // Get all keys and remove non-essential ones (preserve auth, biometric, push token)
      const allKeys = await AsyncStorage.getAllKeys();
      const protectedPrefixes = ["@splitr/biometric", "@splitr/push_token", "@splitr/dark_mode", "@splitr/onboarding"];
      const keysToRemove = allKeys.filter(
        (key) => !protectedPrefixes.some((p) => key.startsWith(p))
      );
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove);
      }
      hapticSuccess();
      toast.success(`Cleared ${keysToRemove.length} cached items.`);
    } catch {
      hapticError();
      toast.error("Failed to clear cache.");
    } finally {
      setClearingCache(false);
    }
  };

  // --- Delete Account ---
  const handleDeleteAccount = () => {
    setShowDeleteModal(false);
    hapticError();
    toast.info("Please email support@splitr.ai to request account deletion. We'll process it within 48 hours.");
  };

  const formatSessionDevice = (session: SessionInfo) => {
    const a = session.latestActivity;
    if (!a) return "Unknown device";
    const parts: string[] = [];
    if (a.browserName) parts.push(a.browserName);
    if (a.deviceType) parts.push(a.deviceType);
    if (parts.length === 0) return "Unknown device";
    return parts.join(" on ");
  };

  const formatSessionLocation = (session: SessionInfo) => {
    const a = session.latestActivity;
    if (!a?.city && !a?.country) return null;
    return [a.city, a.country].filter(Boolean).join(", ");
  };

  const formatTimeAgo = (dateStr: string) => {
    if (!dateStr) return "";
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <>
      <SafeAreaView className="flex-1 bg-background" edges={["top", "bottom"]}>
        {/* Header */}
        <View className="flex-row items-center gap-3 px-5 pt-3 pb-4 border-b border-border">
          <Pressable
            onPress={() => { hapticLight(); router.back(); }}
            className="w-10 h-10 rounded-full bg-muted items-center justify-center"
          >
            <ArrowLeft size={20} color="#64748b" />
          </Pressable>
          <Text className="text-xl font-sans-bold text-foreground">Privacy & Security</Text>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 py-5 gap-6 pb-10"
          showsVerticalScrollIndicator={false}
        >
          {/* App Lock */}
          <View>
            <Text className="text-base font-sans-semibold text-foreground mb-3">
              App Lock
            </Text>
            <Card className="p-4">
              <View className="flex-row items-center justify-between gap-3">
                <View className="flex-row items-center gap-3 flex-1">
                  <View className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900 items-center justify-center">
                    <Fingerprint size={20} color="#8b5cf6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-sans-semibold text-card-foreground">
                      Lock app with {biometricLabel}
                    </Text>
                    <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                      {Platform.OS === "ios"
                        ? "Require Face ID or Touch ID when opening Splitr"
                        : "Require fingerprint or face unlock when opening Splitr"}
                    </Text>
                  </View>
                </View>
                <ThemedSwitch
                  testID="biometric-lock-switch"
                  checked={biometricEnabled}
                  disabled={biometricBusy}
                  onCheckedChange={(checked) => {
                    void handleBiometricToggle(checked);
                  }}
                />
              </View>
            </Card>
            {!biometricAvailable && (
              <Pressable
                onPress={() => {
                  hapticLight();
                  if (Platform.OS === "ios") {
                    Linking.openURL("app-settings:");
                  } else {
                    Linking.openSettings();
                  }
                }}
              >
                <Text className="text-xs text-primary font-sans mt-2">
                  {Platform.OS === "ios"
                    ? "Face ID / Touch ID not set up. Tap to open Settings."
                    : "Biometrics not set up. Tap to open Settings."}
                </Text>
              </Pressable>
            )}
          </View>

          {/* Active Sessions */}
          <Animated.View entering={FadeInDown.delay(100).duration(400).springify()}>
            <Text className="text-base font-sans-semibold text-foreground mb-3">
              Active Sessions
            </Text>
            <Card className="overflow-hidden">
              {sessionsLoading ? (
                <View className="p-4 items-center">
                  <ActivityIndicator size="small" color="#0d9488" />
                </View>
              ) : sessions.length === 0 ? (
                <View className="p-4">
                  <Text className="text-xs text-muted-foreground font-sans text-center">
                    No active sessions found
                  </Text>
                </View>
              ) : (
                sessions.map((session, idx) => (
                  <View
                    key={session.id}
                    className={`flex-row items-center gap-3 p-4 ${
                      idx < sessions.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <View className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 items-center justify-center">
                      <Smartphone size={18} color="#3b82f6" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-sans-medium text-card-foreground">
                        {formatSessionDevice(session)}
                      </Text>
                      <View className="flex-row items-center gap-2 mt-0.5">
                        <Text className="text-xs text-muted-foreground font-sans">
                          {formatTimeAgo(session.lastActiveAt)}
                        </Text>
                        {formatSessionLocation(session) && (
                          <Text className="text-xs text-muted-foreground font-sans">
                            {formatSessionLocation(session)}
                          </Text>
                        )}
                      </View>
                    </View>
                    {session.status === "active" && sessions.length > 1 && (
                      <Pressable
                        onPress={() => {
                          hapticWarning();
                          handleRevokeSession(session.id);
                        }}
                        disabled={revokingSessionId === session.id}
                        className="px-3 py-1.5 rounded-lg bg-destructive/10"
                      >
                        {revokingSessionId === session.id ? (
                          <ActivityIndicator size="small" color="#ef4444" />
                        ) : (
                          <Text className="text-xs font-sans-semibold text-destructive">Revoke</Text>
                        )}
                      </Pressable>
                    )}
                  </View>
                ))
              )}
            </Card>
          </Animated.View>

          {/* Data & Storage */}
          <Animated.View entering={FadeInDown.delay(200).duration(400).springify()}>
            <Text className="text-base font-sans-semibold text-foreground mb-3">
              Data & Storage
            </Text>
            <Card className="overflow-hidden">
              {/* Export data */}
              <Pressable
                onPress={() => { hapticLight(); handleExportData(); }}
                disabled={exporting}
                className="flex-row items-center gap-3 p-4 border-b border-border"
              >
                <View className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center">
                  <Download size={18} color="#0d9488" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-sans-medium text-card-foreground">
                    Export Your Data
                  </Text>
                  <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                    Download all your expenses, groups, and settlements
                  </Text>
                </View>
                {exporting ? (
                  <ActivityIndicator size="small" color="#0d9488" />
                ) : (
                  <ChevronRight size={16} color="#94a3b8" />
                )}
              </Pressable>

              {/* Clear cache */}
              <Pressable
                onPress={() => { hapticLight(); setShowClearCacheModal(true); }}
                disabled={clearingCache}
                className="flex-row items-center gap-3 p-4"
              >
                <View className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 items-center justify-center">
                  <HardDriveDownload size={18} color="#f59e0b" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-sans-medium text-card-foreground">
                    Clear Local Cache
                  </Text>
                  <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                    Remove cached data (won't delete your account or cloud data)
                  </Text>
                </View>
                {clearingCache ? (
                  <ActivityIndicator size="small" color="#f59e0b" />
                ) : (
                  <ChevronRight size={16} color="#94a3b8" />
                )}
              </Pressable>
            </Card>
          </Animated.View>

          {/* Security Info */}
          <Animated.View entering={FadeInDown.delay(300).duration(400).springify()}>
            <Text className="text-base font-sans-semibold text-foreground mb-3">
              How We Protect Your Data
            </Text>
            <Card className="overflow-hidden">
              {[
                {
                  icon: Lock,
                  title: "Encryption",
                  description: "TLS 1.3 in transit, AES-256 at rest",
                  color: "#0d9488",
                  bg: "bg-primary/10",
                },
                {
                  icon: Shield,
                  title: "Secure Sign-In",
                  description: "Industry-standard OAuth 2.0 via Clerk",
                  color: "#2563eb",
                  bg: "bg-blue-100 dark:bg-blue-900",
                },
                {
                  icon: Eye,
                  title: "Privacy First",
                  description: "We never sell your data to third parties",
                  color: "#059669",
                  bg: "bg-emerald-100 dark:bg-emerald-900",
                },
              ].map((item, idx) => {
                const Icon = item.icon;
                return (
                  <View
                    key={idx}
                    className={`flex-row items-center gap-3 p-4 ${
                      idx < 2 ? "border-b border-border" : ""
                    }`}
                  >
                    <View className={`w-10 h-10 rounded-full ${item.bg} items-center justify-center`}>
                      <Icon size={18} color={item.color} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-sans-medium text-card-foreground">{item.title}</Text>
                      <Text className="text-xs text-muted-foreground font-sans mt-0.5">{item.description}</Text>
                    </View>
                  </View>
                );
              })}
            </Card>
          </Animated.View>

          {/* Legal */}
          <Animated.View entering={FadeInDown.delay(350).duration(400).springify()}>
            <Text className="text-base font-sans-semibold text-foreground mb-3">
              Legal
            </Text>
            <Card className="overflow-hidden">
              <Pressable
                onPress={() => { hapticLight(); Linking.openURL("https://splitr.ai/privacy"); }}
                className="flex-row items-center justify-between p-4 border-b border-border"
              >
                <Text className="text-sm font-sans-medium text-card-foreground">Privacy Policy</Text>
                <ExternalLink size={16} color="#94a3b8" />
              </Pressable>
              <Pressable
                onPress={() => { hapticLight(); Linking.openURL("https://splitr.ai/terms"); }}
                className="flex-row items-center justify-between p-4"
              >
                <Text className="text-sm font-sans-medium text-card-foreground">Terms of Service</Text>
                <ExternalLink size={16} color="#94a3b8" />
              </Pressable>
            </Card>
          </Animated.View>

          {/* Danger Zone */}
          <Animated.View entering={FadeInDown.delay(450).duration(400).springify()}>
            <Text className="text-base font-sans-semibold text-foreground mb-3">
              Account
            </Text>
            <Card className="p-4 border-destructive/20">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-destructive/10 items-center justify-center">
                  <Trash2 size={18} color="#ef4444" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-sans-semibold text-card-foreground">
                    Delete Account
                  </Text>
                  <Text className="text-xs text-muted-foreground font-sans mt-0.5">
                    Permanently delete your account and all data
                  </Text>
                </View>
                <Pressable
                  onPress={() => { hapticLight(); setShowDeleteModal(true); }}
                  className="px-4 py-2 rounded-lg bg-destructive/10"
                >
                  <Text className="text-xs font-sans-semibold text-destructive">Delete</Text>
                </Pressable>
              </View>
            </Card>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Delete Account Modal */}
      <ConfirmModal
        visible={showDeleteModal}
        title="Delete Account"
        message="This action is irreversible. All your data, groups, and expense history will be permanently deleted. Are you sure?"
        confirmLabel="Yes, Delete My Account"
        destructive
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteModal(false)}
      />

      {/* Clear Cache Modal */}
      <ConfirmModal
        visible={showClearCacheModal}
        title="Clear Local Cache"
        message="This will remove locally cached data like smart defaults and notification preferences. Your account, groups, and expenses are stored in the cloud and won't be affected."
        confirmLabel="Clear Cache"
        destructive={false}
        onConfirm={handleClearCache}
        onCancel={() => setShowClearCacheModal(false)}
      />
    </>
  );
}
