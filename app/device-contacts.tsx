import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  SectionList,
  TextInput,
  Platform,
  StyleSheet,
} from "react-native";
import { useColorScheme } from "nativewind";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ArrowLeft, Search, Users, Phone, Mail, UserPlus, Check, AlertCircle } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GRADIENTS } from "@/lib/gradients";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/toast";
import { groupsApi } from "@/lib/api";
import { parseApiError, getUserMessage } from "@/lib/errors";
import { invalidateAfterMemberChange } from "@/lib/query";
import { getInitials } from "@/lib/utils";
import { hapticLight, hapticSuccess, hapticError } from "@/lib/haptics";
import {
  requestContactsPermission,
  readDeviceContacts,
  chunkAndMatch,
} from "@/lib/device-contacts";
import { colors, fontSize as fs, fontFamily as ff, radius, palette } from "@/lib/tokens";
import type { MatchedContact, UnmatchedContact } from "@/lib/types";

type RowStatus = "idle" | "loading" | "added" | "invited" | "error";

interface MatchedRow extends MatchedContact {
  _status: RowStatus;
}

interface UnmatchedRow extends UnmatchedContact {
  _status: RowStatus;
}

type SectionData =
  | { title: "On Splitr"; data: MatchedRow[] }
  | { title: "Invite to Splitr"; data: UnmatchedRow[] };

// Cap animation delay so large lists don't queue thousands of delayed animations (M7)
const MAX_ANIM_DELAY_MS = 600;
const animDelay = (index: number) => Math.min(50 + index * 30, MAX_ANIM_DELAY_MS);

// Extracted separator to avoid re-creating component on every render (L2)
function RowSeparator() {
  return (
    <View
      style={styles.separator}
    />
  );
}

export default function DeviceContactsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { getToken } = useAuth();
  const toast = useToast();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);

  // H3: Guard missing groupId
  useEffect(() => {
    if (!groupId) {
      toast.error("Missing group. Please try again.");
      router.back();
    }
  }, [groupId]);

  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [matched, setMatched] = useState<MatchedRow[]>([]);
  const [unmatched, setUnmatched] = useState<UnmatchedRow[]>([]);
  const [search, setSearch] = useState("");
  const [totalContacts, setTotalContacts] = useState(0);

  // Load contacts on mount
  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;

    const load = async () => {
      try {
        const permission = await requestContactsPermission();
        if (permission !== "granted") {
          if (!cancelled) setPermissionDenied(true);
          if (!cancelled) setLoading(false);
          return;
        }

        const contacts = await readDeviceContacts();
        if (!cancelled) setTotalContacts(contacts.length);

        if (contacts.length === 0) {
          if (!cancelled) setLoading(false);
          return;
        }

        // H2: Guard null token
        const token = await getToken();
        if (!token) {
          if (!cancelled) toast.error("Authentication error. Please sign in again.");
          if (!cancelled) setLoading(false);
          return;
        }

        const result = await chunkAndMatch(contacts, token);

        if (!cancelled) {
          setMatched(result.matched.map((m) => ({ ...m, _status: "idle" as RowStatus })));
          setUnmatched(result.unmatched.map((u) => ({ ...u, _status: "idle" as RowStatus })));
        }
      } catch {
        if (!cancelled) {
          toast.error("Failed to load contacts. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [groupId]);

  // Filtered sections
  const sections = useMemo((): SectionData[] => {
    const q = search.toLowerCase().trim();
    const filteredMatched = q
      ? matched.filter((m) => m.name.toLowerCase().includes(q))
      : matched;
    const filteredUnmatched = q
      ? unmatched.filter((u) => u.name.toLowerCase().includes(q))
      : unmatched;

    const result: SectionData[] = [];
    if (filteredMatched.length > 0) {
      result.push({ title: "On Splitr", data: filteredMatched });
    }
    if (filteredUnmatched.length > 0) {
      result.push({ title: "Invite to Splitr", data: filteredUnmatched });
    }
    return result;
  }, [matched, unmatched, search]);

  // --- Action handlers ---

  const updateMatchedStatus = (contactIndex: number, status: RowStatus) => {
    setMatched((prev) =>
      prev.map((m) => (m.contactIndex === contactIndex ? { ...m, _status: status } : m))
    );
  };

  const updateUnmatchedStatus = (contactIndex: number, status: RowStatus) => {
    setUnmatched((prev) =>
      prev.map((u) => (u.contactIndex === contactIndex ? { ...u, _status: status } : u))
    );
  };

  // H1: Matched contacts may have email, phone, or both.
  // Use email invite if available, phone invite if phone-only, guest add as fallback.
  const handleAddMatched = useCallback(async (contact: MatchedRow) => {
    if (contact._status === "added" || contact._status === "loading") return;
    updateMatchedStatus(contact.contactIndex, "loading");

    try {
      const token = await getToken();
      if (!token) { updateMatchedStatus(contact.contactIndex, "error"); return; }

      if (contact.email) {
        await groupsApi.inviteByEmail(groupId, { email: contact.email, name: contact.name }, token);
      } else if (contact.phone) {
        await groupsApi.inviteByPhone(groupId, { phone: contact.phone, name: contact.name }, token);
      } else {
        await groupsApi.addGuestMember(groupId, { name: contact.name }, token);
      }

      hapticSuccess();
      updateMatchedStatus(contact.contactIndex, "added");
      toast.success(`${contact.name} added to group`);
      invalidateAfterMemberChange(groupId);
    } catch (err: unknown) {
      const apiErr = parseApiError(err);
      if (apiErr?.code === "ERR-301") {
        updateMatchedStatus(contact.contactIndex, "added");
        toast.info(`${contact.name} is already a member`);
      } else {
        hapticError();
        updateMatchedStatus(contact.contactIndex, "error");
        toast.error(apiErr ? getUserMessage(apiErr) : "Failed to add member");
      }
    }
  }, [groupId, getToken, toast]);

  const handleInviteUnmatched = useCallback(async (contact: UnmatchedRow) => {
    if (contact._status === "invited" || contact._status === "loading") return;
    updateUnmatchedStatus(contact.contactIndex, "loading");

    try {
      const token = await getToken();
      if (!token) { updateUnmatchedStatus(contact.contactIndex, "error"); return; }

      if (contact.email) {
        await groupsApi.inviteByEmail(groupId, { email: contact.email, name: contact.name }, token);
      } else if (contact.phone) {
        await groupsApi.inviteByPhone(groupId, { phone: contact.phone, name: contact.name }, token);
      } else {
        await groupsApi.addGuestMember(groupId, { name: contact.name }, token);
      }

      hapticSuccess();
      updateUnmatchedStatus(contact.contactIndex, "invited");
      const verb = contact.email || contact.phone ? "Invite sent to" : "Added";
      toast.success(`${verb} ${contact.name}`);
      invalidateAfterMemberChange(groupId);
    } catch (err: unknown) {
      const apiErr = parseApiError(err);
      if (apiErr?.code === "ERR-301") {
        updateUnmatchedStatus(contact.contactIndex, "invited");
        toast.info(`${contact.name} is already a member`);
      } else {
        hapticError();
        updateUnmatchedStatus(contact.contactIndex, "error");
        toast.error(apiErr ? getUserMessage(apiErr) : "Failed to invite");
      }
    }
  }, [groupId, getToken, toast]);

  // --- Render helpers ---

  const renderMatchedRow = ({ item, index }: { item: MatchedRow; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(animDelay(index)).duration(250).springify()}
      style={styles.row}
    >
      <Avatar fallback={getInitials(item.name)} size="md" />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: fs.base, fontFamily: ff.semibold, color: c.foreground }}>
          {item.name}
        </Text>
        {item.email ? (
          <View style={styles.subtitleRow}>
            <Mail size={12} color={c.mutedForeground} />
            <Text style={{ fontSize: fs.xs, fontFamily: ff.regular, color: c.mutedForeground }}>
              {item.email}
            </Text>
          </View>
        ) : null}
      </View>
      {renderActionButton(item._status, "Add", item.name, () => handleAddMatched(item))}
    </Animated.View>
  );

  const renderUnmatchedRow = ({ item, index }: { item: UnmatchedRow; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(animDelay(index)).duration(250).springify()}
      style={styles.row}
    >
      <Avatar fallback={getInitials(item.name)} size="md" />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: fs.base, fontFamily: ff.semibold, color: c.foreground }}>
          {item.name}
        </Text>
        {item.phone ? (
          <View style={styles.subtitleRow}>
            <Phone size={12} color={c.mutedForeground} />
            <Text style={{ fontSize: fs.xs, fontFamily: ff.regular, color: c.mutedForeground }}>
              {item.phone}
            </Text>
          </View>
        ) : item.email ? (
          <View style={styles.subtitleRow}>
            <Mail size={12} color={c.mutedForeground} />
            <Text style={{ fontSize: fs.xs, fontFamily: ff.regular, color: c.mutedForeground }}>
              {item.email}
            </Text>
          </View>
        ) : null}
      </View>
      {renderActionButton(
        item._status,
        item.email || item.phone ? "Invite" : "Add",
        item.name,
        () => handleInviteUnmatched(item),
      )}
    </Animated.View>
  );

  // M6: error state now visually distinct (red outline + retry icon)
  // L9: accessibility label includes contact name
  const renderActionButton = (status: RowStatus, label: string, contactName: string, onPress: () => void) => {
    if (status === "loading") {
      return (
        <View style={[styles.actionPill, { backgroundColor: c.muted }]}>
          <ActivityIndicator size="small" color={c.primary} />
        </View>
      );
    }
    if (status === "added" || status === "invited") {
      return (
        <View style={[styles.actionPill, { backgroundColor: palette.emerald50 }]}>
          <Check size={14} color={palette.emerald600} strokeWidth={2.5} />
          <Text style={{ fontSize: fs.sm, fontFamily: ff.semibold, color: palette.emerald600 }}>
            {status === "added" ? "Added" : "Invited"}
          </Text>
        </View>
      );
    }
    if (status === "error") {
      return (
        <Pressable
          onPress={onPress}
          style={[styles.actionPill, { backgroundColor: "transparent", borderWidth: 1.5, borderColor: palette.red500 }]}
          accessibilityRole="button"
          accessibilityLabel={`Retry ${label.toLowerCase()} ${contactName}`}
        >
          <AlertCircle size={14} color={palette.red500} />
          <Text style={{ fontSize: fs.sm, fontFamily: ff.semibold, color: palette.red500 }}>
            Retry
          </Text>
        </Pressable>
      );
    }
    // idle
    const isInvite = label === "Invite";
    return (
      <Pressable
        onPress={onPress}
        style={[
          styles.actionPill,
          isInvite
            ? { backgroundColor: "transparent", borderWidth: 1.5, borderColor: c.primary }
            : { backgroundColor: c.primary },
        ]}
        accessibilityRole="button"
        accessibilityLabel={`${label} ${contactName}`}
      >
        <Text
          style={{
            fontSize: fs.sm,
            fontFamily: ff.semibold,
            color: isInvite ? c.primary : c.primaryForeground,
          }}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  const renderSectionHeader = ({ section }: { section: SectionData }) => (
    <View
      style={[styles.sectionHeader, { backgroundColor: c.background }]}
    >
      {section.title === "On Splitr" ? (
        <Users size={14} color={c.primary} />
      ) : (
        <UserPlus size={14} color={c.mutedForeground} />
      )}
      <Text
        style={{
          fontSize: fs.xs,
          fontFamily: ff.semibold,
          color: section.title === "On Splitr" ? c.primary : c.mutedForeground,
          textTransform: "uppercase",
          letterSpacing: 0.8,
        }}
      >
        {section.title}
      </Text>
      <Text
        style={{
          fontSize: fs.xs,
          fontFamily: ff.regular,
          color: c.mutedForeground,
        }}
      >
        ({section.data.length})
      </Text>
    </View>
  );

  const renderItem = ({ item, index, section }: { item: MatchedRow | UnmatchedRow; index: number; section: SectionData }) => {
    if (section.title === "On Splitr") {
      return renderMatchedRow({ item: item as MatchedRow, index });
    }
    return renderUnmatchedRow({ item: item as UnmatchedRow, index });
  };

  const renderEmpty = () => {
    if (loading) return null;

    if (permissionDenied) {
      return (
        <View style={styles.emptyContainer}>
          <Users size={48} color={c.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: c.foreground }]}>
            Contacts Access Needed
          </Text>
          <Text style={[styles.emptySubtitle, { color: c.mutedForeground }]}>
            Enable contacts access in your device settings to find friends on Splitr.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={[styles.emptyButton, { backgroundColor: c.primary }]}
            accessibilityRole="button"
          >
            <Text style={{ fontSize: fs.base, fontFamily: ff.semibold, color: c.primaryForeground }}>
              Go Back
            </Text>
          </Pressable>
        </View>
      );
    }

    if (search.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <Search size={48} color={c.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: c.foreground }]}>
            No matches
          </Text>
          <Text style={[styles.emptySubtitle, { color: c.mutedForeground }]}>
            No contacts match &quot;{search.trim()}&quot;
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Users size={48} color={c.mutedForeground} />
        <Text style={[styles.emptyTitle, { color: c.foreground }]}>
          No contacts found
        </Text>
        <Text style={[styles.emptySubtitle, { color: c.mutedForeground }]}>
          Your contacts list is empty or all contacts are already in this group.
        </Text>
      </View>
    );
  };

  if (!groupId) return null;

  return (
    <View className="flex-1 bg-background">
      {/* Hero */}
      <LinearGradient
        colors={
          (isDark ? GRADIENTS.heroTealDark : GRADIENTS.heroTeal) as unknown as string[]
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ overflow: "hidden", paddingTop: insets.top }}
      >
        {/* Watermark */}
        <View
          style={{
            position: "absolute",
            bottom: -30,
            right: -20,
            opacity: 0.06,
          }}
          pointerEvents="none"
        >
          <Users size={200} color={palette.white} strokeWidth={1} />
        </View>

        {/* Decorative orb */}
        <View
          style={{
            position: "absolute",
            top: -40,
            left: -40,
            width: 120,
            height: 120,
            borderRadius: radius.full,
            backgroundColor: "rgba(255,255,255,0.06)",
          }}
          pointerEvents="none"
        />

        {/* Navigation */}
        <View className="flex-row items-center px-4 pt-3 pb-2">
          <Pressable
            onPress={() => {
              hapticLight();
              router.back();
            }}
            className="w-10 h-10 items-center justify-center rounded-full"
            style={{ backgroundColor: "rgba(255,255,255,0.15)" }}
            accessibilityRole="button"
          >
            <ArrowLeft size={22} color={palette.white} strokeWidth={2.5} />
          </Pressable>
        </View>

        {/* Title */}
        <View className="px-5 pt-1 pb-5">
          <Text
            className="text-2xl font-sans-bold"
            style={{ color: palette.white }}
          >
            Add from Contacts
          </Text>
          <Text
            className="text-sm font-sans mt-1"
            style={{ color: "rgba(255,255,255,0.7)" }}
          >
            Find friends already on Splitr or send invites
          </Text>
        </View>
      </LinearGradient>

      {/* Search bar */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginHorizontal: 20,
          marginTop: 16,
          marginBottom: 4,
          paddingHorizontal: 14,
          paddingVertical: Platform.OS === "web" ? 10 : 8,
          borderRadius: radius.lg,
          backgroundColor: c.muted,
        }}
      >
        <Search size={18} color={c.mutedForeground} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search contacts..."
          placeholderTextColor={c.placeholder}
          style={{
            flex: 1,
            fontSize: fs.base,
            fontFamily: ff.regular,
            color: c.foreground,
            padding: 0,
          }}
          autoCorrect={false}
          autoCapitalize="none"
          testID="device-contacts-search"
        />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={c.primary} />
          <Text style={{ fontSize: fs.sm, fontFamily: ff.regular, color: c.mutedForeground, marginTop: 12 }}>
            Matching your contacts...
          </Text>
          {totalContacts > 0 && (
            <Text style={{ fontSize: fs.xs, fontFamily: ff.regular, color: c.mutedForeground, marginTop: 4 }}>
              {totalContacts} contacts found
            </Text>
          )}
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => `${item.contactIndex}`}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled
          ItemSeparatorComponent={RowSeparator}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  actionPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
    minWidth: 70,
    justifyContent: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,0,0,0.06)",
    marginLeft: 68,
    marginRight: 20,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: fs.lg,
    fontWeight: "600",
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: fs.sm,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
