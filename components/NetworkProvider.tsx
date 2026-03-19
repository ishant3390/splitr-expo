/**
 * Network status provider + offline banner.
 *
 * Wraps the app to provide `useNetwork()` hook and shows a
 * non-dismissible banner when the device is offline.
 *
 * When connectivity is restored, auto-syncs any queued expenses.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { View, Text } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useAuth } from "@clerk/clerk-expo";
import { syncQueuedExpenses, getQueuedExpenses } from "@/lib/offline";
import { useToast } from "@/components/ui/toast";
import { WifiOff } from "lucide-react-native";
import { fontSize as fs, fontFamily as ff, palette } from "@/lib/tokens";

interface NetworkContextValue {
  isOnline: boolean;
  pendingCount: number;
  refreshPendingCount: () => Promise<void>;
}

const NetworkContext = createContext<NetworkContextValue>({
  isOnline: true,
  pendingCount: 0,
  refreshPendingCount: async () => {},
});

export function useNetwork() {
  return useContext(NetworkContext);
}

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const { getToken, isSignedIn } = useAuth();
  const toast = useToast();
  const isSyncing = useRef(false);

  const refreshPendingCount = useCallback(async () => {
    const queue = await getQueuedExpenses();
    setPendingCount(queue.length);
  }, []);

  // Subscribe to network changes
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected === true && state.isInternetReachable !== false;
      setIsOnline(online);
    });
    return () => unsubscribe();
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (!isOnline || !isSignedIn) return;

    const sync = async () => {
      if (isSyncing.current) return;
      isSyncing.current = true;

      try {
        const queue = await getQueuedExpenses();
        if (queue.length === 0) return;

        const token = await getToken();
        if (!token) return;

        const result = await syncQueuedExpenses(token);

        if (result.synced.length > 0) {
          toast.success(
            `${result.synced.length} pending expense${result.synced.length > 1 ? "s" : ""} synced!`
          );
        }
        if (result.failed.length > 0) {
          toast.error(
            `${result.failed.length} expense${result.failed.length > 1 ? "s" : ""} failed to sync. Check pending items.`
          );
        }

        await refreshPendingCount();
      } catch {
        // sync errors are non-fatal
      } finally {
        isSyncing.current = false;
      }
    };

    sync();
  }, [isOnline, isSignedIn]);

  // Check pending count on mount
  useEffect(() => {
    refreshPendingCount();
  }, []);

  return (
    <NetworkContext.Provider value={{ isOnline, pendingCount, refreshPendingCount }}>
      {!isOnline && (
        <View
          style={{
            backgroundColor: palette.red500,
            paddingVertical: 6,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <WifiOff size={14} color={palette.white} />
          <Text
            style={{
              color: palette.white,
              fontSize: fs.base,
              fontFamily: ff.medium,
            }}
          >
            No internet connection
          </Text>
        </View>
      )}
      {children}
    </NetworkContext.Provider>
  );
}
