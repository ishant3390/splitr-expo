import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import { ArrowLeft, X, UserPlus, Users, Mail } from "lucide-react-native";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { groupsApi } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { CreateGroupRequest, AddGuestMemberRequest } from "@/lib/types";
import { getInitials } from "@/lib/utils";

export default function CreateGroupScreen() {
  const router = useRouter();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/(tabs)/groups"));
  const { getToken } = useAuth();
  const toast = useToast();

  const [groupName, setGroupName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handleInviteByEmail = () => {
    if (!inviteEmail.trim() || !/\S+@\S+\.\S+/.test(inviteEmail)) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (invitedEmails.includes(inviteEmail.trim())) {
      toast.error("This email has already been added.");
      return;
    }
    setInvitedEmails((prev) => [...prev, inviteEmail.trim()]);
    setInviteEmail("");
  };

  const handleCreate = async () => {
    if (!groupName.trim()) {
      toast.error("Please give your group a name.");
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();

      // Create the group
      const group = await groupsApi.create({ name: groupName.trim() } as CreateGroupRequest, token!);

      // Invite members by email as guests
      await Promise.all(
        invitedEmails.map((email) =>
          groupsApi.addGuestMember(group.id, { name: email, email } as AddGuestMemberRequest, token!)
        )
      );

      toast.success(`"${groupName}" created successfully`);
      goBack();
    } catch (err: any) {
      toast.error("Something went wrong. Try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
          <Button variant="ghost" size="icon" onPress={goBack}>
            <ArrowLeft size={24} color="#0f172a" />
          </Button>
          <Text className="text-lg font-sans-semibold text-foreground">Create Group</Text>
          <Button variant="ghost" size="sm" onPress={handleCreate} disabled={submitting}>
            {submitting ? (
              <ActivityIndicator size="small" color="#0d9488" />
            ) : (
              <Text className="text-base font-sans-semibold text-primary">Create</Text>
            )}
          </Button>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 py-6 gap-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Group name */}
          <Input
            label="Group Name"
            placeholder="e.g., Beach Trip 2026"
            value={groupName}
            onChangeText={setGroupName}
          />

          {/* Invited emails */}
          {invitedEmails.length > 0 && (
            <View>
              <View className="flex-row items-center gap-2 mb-3">
                <Users size={18} color="#0d9488" />
                <Text className="text-sm font-sans-semibold text-foreground">
                  Invited ({invitedEmails.length})
                </Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {invitedEmails.map((email, idx) => (
                  <View
                    key={`inv-${idx}`}
                    className="flex-row items-center gap-1.5 bg-accent/10 rounded-full px-3 py-1.5"
                  >
                    <Mail size={12} color="#14b8a6" />
                    <Text
                      className="text-xs font-sans-medium text-accent"
                      numberOfLines={1}
                    >
                      {email}
                    </Text>
                    <Pressable
                      onPress={() =>
                        setInvitedEmails((prev) => prev.filter((_, i) => i !== idx))
                      }
                    >
                      <X size={14} color="#64748b" />
                    </Pressable>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Invite by email */}
          <View>
            <View className="flex-row items-center gap-2 mb-2">
              <UserPlus size={18} color="#0d9488" />
              <Text className="text-sm font-sans-semibold text-foreground">
                Invite members by email
              </Text>
            </View>
            <View className="flex-row gap-2">
              <Input
                placeholder="friend@example.com"
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                containerClassName="flex-1"
              />
              <Button
                variant="default"
                size="md"
                onPress={handleInviteByEmail}
                disabled={!inviteEmail.trim()}
              >
                <Text className="text-sm font-sans-semibold text-primary-foreground">
                  Add
                </Text>
              </Button>
            </View>
            <Text className="text-xs text-muted-foreground font-sans mt-2 leading-5">
              They will be added as guests and can join with a full account later.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
