import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { useColorScheme } from "nativewind";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { Users, Check, AlertCircle, Archive, UserPlus, LogIn } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GroupAvatar } from "@/components/ui/group-avatar";
import { inviteApi } from "@/lib/api";
import { parseApiError, getUserMessage } from "@/lib/errors";
import { useToast } from "@/components/ui/toast";
import { hapticSuccess, hapticError } from "@/lib/haptics";
import type { GroupInvitePreviewDto } from "@/lib/types";
import { colors, fontSize as fs, fontFamily as ff, radius, palette } from "@/lib/tokens";

export default function JoinGroupScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { getToken, isSignedIn } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);
  const toast = useToast();

  const [preview, setPreview] = useState<GroupInvitePreviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const loadPreview = async () => {
      try {
        const data = await inviteApi.preview(code);
        setPreview(data);
      } catch {
        setError("This invite link is invalid or has expired.");
      } finally {
        setLoading(false);
      }
    };
    loadPreview();
  }, [code]);

  const handleJoin = async () => {
    if (!isSignedIn) {
      router.push("/(auth)" as any);
      return;
    }

    setJoining(true);
    try {
      const token = await getToken();
      await inviteApi.join({ inviteCode: code }, token!);
      hapticSuccess();
      setJoined(true);
      toast.success(`Joined "${preview!.name}"!`);
      setTimeout(() => {
        router.replace(`/(tabs)/groups/${preview!.groupId}`);
      }, 1000);
    } catch (err: unknown) {
      hapticError();
      const apiErr = parseApiError(err);
      const errCode = apiErr?.code;
      if ((errCode === "ERR-301" || errCode === "ERR-409") && preview) {
        toast.info("You're already in this group.");
        router.replace(`/(tabs)/groups/${preview.groupId}`);
      } else if (errCode) {
        toast.error(getUserMessage(apiErr!));
      } else {
        toast.error("Failed to join group. Try again.");
      }
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={c.primary} size="large" />
        <Text className="text-sm text-muted-foreground font-sans mt-4">
          Loading invite...
        </Text>
      </SafeAreaView>
    );
  }

  if (error || !preview) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: radius.xl,
            backgroundColor: `${c.destructive}20`,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <AlertCircle size={32} color={c.destructive} />
        </View>
        <Text className="text-xl font-sans-bold text-foreground mb-2">
          Invalid Invite
        </Text>
        <Text className="text-sm text-muted-foreground font-sans text-center mb-6">
          {error ?? "This invite link is no longer valid."}
        </Text>
        <Button
          variant="outline"
          onPress={() => router.replace("/(tabs)")}
        >
          <Text className="text-base font-sans-semibold text-foreground">
            Go Home
          </Text>
        </Button>
      </SafeAreaView>
    );
  }

  const isArchived = preview.isArchived === true;

  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
      <Card className="w-full p-8 items-center gap-5">
        {/* Group avatar */}
        <View
          style={{
            width: 80,
            height: 80,
            borderRadius: radius["2xl"],
            backgroundColor: isArchived ? `${palette.slate400}20` : `${c.primary}15`,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: isArchived ? `${palette.slate400}40` : `${c.primary}30`,
          }}
        >
          <Text style={{ fontSize: 36 }}>{preview.emoji || "\uD83D\uDC65"}</Text>
        </View>

        {/* Group info */}
        <View className="items-center gap-3">
          <GroupAvatar name={preview.name} groupType={preview.groupType} size="lg" />
          <Text className="text-sm text-muted-foreground font-sans">
            You've been invited to join
          </Text>
          <Text className="text-xl font-sans-bold text-foreground text-center">
            {preview.name}
          </Text>
          {preview.groupType && (
            <Text className="text-sm text-muted-foreground font-sans capitalize">
              {preview.groupType}
            </Text>
          )}
        </View>

        {/* Member count */}
        <View className="flex-row items-center gap-2 px-4 py-2 rounded-full bg-muted">
          <Users size={16} color={c.mutedForeground} />
          <Text className="text-sm text-muted-foreground font-sans">
            {preview.memberCount} {preview.memberCount === 1 ? "member" : "members"}
          </Text>
        </View>

        {/* Archived warning */}
        {isArchived && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: `${c.warning}15`,
              borderRadius: radius.DEFAULT,
              paddingHorizontal: 16,
              paddingVertical: 10,
              width: "100%",
            }}
          >
            <Archive size={16} color={c.warning} />
            <Text style={{ flex: 1, fontSize: fs.base, fontFamily: ff.medium, color: "#92400e" }}>
              This group is no longer active
            </Text>
          </View>
        )}

        {/* Join button */}
        {joined ? (
          <View className="flex-row items-center gap-2 py-3">
            <Check size={20} color={c.success} />
            <Text className="text-base font-sans-semibold text-success">
              Joined!
            </Text>
          </View>
        ) : (
          <Button
            variant="default"
            onPress={handleJoin}
            disabled={joining || isArchived}
            className="w-full"
          >
            {joining ? (
              <ActivityIndicator size="small" color={palette.white} />
            ) : (
              <View className="flex-row items-center gap-2">
                {!isArchived && (
                  isSignedIn
                    ? <UserPlus size={18} color={palette.white} />
                    : <LogIn size={18} color={palette.white} />
                )}
                <Text className="text-base font-sans-semibold text-primary-foreground">
                  {isArchived
                    ? "Group Archived"
                    : isSignedIn
                    ? "Join Group"
                    : "Sign in to Join"}
                </Text>
              </View>
            )}
          </Button>
        )}
      </Card>
    </SafeAreaView>
  );
}
