import React, { useState, useEffect } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { Users, Check, AlertCircle, Archive } from "lucide-react-native";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GroupAvatar } from "@/components/ui/group-avatar";
import { inviteApi } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { hapticSuccess, hapticError } from "@/lib/haptics";
import type { GroupInvitePreviewDto } from "@/lib/types";

function getErrorMessage(err: any): { code: string | null; message: string } {
  const msg = err?.message ?? "";
  if (msg.includes("ERR-301") || msg.includes("409"))
    return { code: "ALREADY_MEMBER", message: "You're already in this group." };
  if (msg.includes("ERR-300") || msg.includes("404"))
    return { code: "NOT_FOUND", message: "This invite link is invalid." };
  if (msg.includes("ERR-401"))
    return { code: "EXPIRED", message: "This invite link has expired." };
  if (msg.includes("ERR-402"))
    return { code: "ARCHIVED", message: "This group has been archived." };
  return { code: null, message: "Failed to join group. Try again." };
}

export default function JoinGroupScreen() {
  const router = useRouter();
  const { code } = useLocalSearchParams<{ code: string }>();
  const { getToken, isSignedIn } = useAuth();
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
    } catch (err: any) {
      hapticError();
      const parsed = getErrorMessage(err);
      if (parsed.code === "ALREADY_MEMBER" && preview) {
        toast.info(parsed.message);
        router.replace(`/(tabs)/groups/${preview.groupId}`);
      } else {
        toast.error(parsed.message);
      }
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color="#0d9488" size="large" />
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
            borderRadius: 20,
            backgroundColor: "#ef444420",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <AlertCircle size={32} color="#ef4444" />
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
            borderRadius: 24,
            backgroundColor: isArchived ? "#94a3b820" : "#0d948815",
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 2,
            borderColor: isArchived ? "#94a3b840" : "#0d948830",
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
          <Users size={16} color="#64748b" />
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
              backgroundColor: "#f59e0b15",
              borderRadius: 12,
              paddingHorizontal: 16,
              paddingVertical: 10,
              width: "100%",
            }}
          >
            <Archive size={16} color="#f59e0b" />
            <Text style={{ flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: "#92400e" }}>
              This group is no longer active
            </Text>
          </View>
        )}

        {/* Join button */}
        {joined ? (
          <View className="flex-row items-center gap-2 py-3">
            <Check size={20} color="#10b981" />
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
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text className="text-base font-sans-semibold text-primary-foreground">
                {isArchived
                  ? "Group Archived"
                  : isSignedIn
                  ? "Join Group"
                  : "Sign in to Join"}
              </Text>
            )}
          </Button>
        )}
      </Card>
    </SafeAreaView>
  );
}
