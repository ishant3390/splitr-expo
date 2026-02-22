import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Search, Plus, X, UserPlus, Users, Mail } from "lucide-react-native";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { currentUser } from "@/lib/mock-data";
import { getInitials } from "@/lib/utils";

// Mock friend list for demo
const friends = [
  { id: "2", name: "Sarah Johnson", email: "sarah@example.com" },
  { id: "3", name: "Mike Chen", email: "mike@example.com" },
  { id: "4", name: "Alex Rivera", email: "alex@example.com" },
  { id: "5", name: "Jordan Lee", email: "jordan@example.com" },
  { id: "6", name: "Emma Wilson", email: "emma@example.com" },
  { id: "7", name: "James Brown", email: "james@example.com" },
  { id: "8", name: "Maria Garcia", email: "maria@example.com" },
];

export default function CreateGroupScreen() {
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [search, setSearch] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<typeof friends>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);

  const filteredFriends = friends.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) &&
      !selectedMembers.find((m) => m.id === f.id)
  );

  const handleAddMember = (friend: (typeof friends)[0]) => {
    setSelectedMembers((prev) => [...prev, friend]);
    setSearch("");
  };

  const handleRemoveMember = (id: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const handleInviteByEmail = () => {
    if (!inviteEmail.trim() || !/\S+@\S+\.\S+/.test(inviteEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    setInvitedEmails((prev) => [...prev, inviteEmail.trim()]);
    setInviteEmail("");
  };

  const handleCreate = () => {
    if (!groupName.trim()) {
      Alert.alert("Name Required", "Please give your group a name.");
      return;
    }
    if (selectedMembers.length === 0 && invitedEmails.length === 0) {
      Alert.alert("Add Members", "Please add at least one member or invite someone.");
      return;
    }

    Alert.alert(
      "Group Created",
      `"${groupName}" with ${selectedMembers.length + invitedEmails.length + 1} members`,
      [{ text: "OK", onPress: () => router.back() }]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-border">
          <Button variant="ghost" size="icon" onPress={() => router.back()}>
            <ArrowLeft size={24} color="#0f172a" />
          </Button>
          <Text className="text-lg font-sans-semibold text-foreground">Create Group</Text>
          <Button
            variant="ghost"
            size="sm"
            onPress={handleCreate}
          >
            <Text className="text-base font-sans-semibold text-primary">Create</Text>
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

          {/* Selected members */}
          <View>
            <View className="flex-row items-center gap-2 mb-3">
              <Users size={18} color="#0d9488" />
              <Text className="text-sm font-sans-semibold text-foreground">
                Members ({selectedMembers.length + 1})
              </Text>
            </View>

            <View className="flex-row flex-wrap gap-2 mb-3">
              {/* Current user chip */}
              <View className="flex-row items-center gap-1.5 bg-primary/10 rounded-full px-3 py-1.5">
                <Avatar
                  fallback={getInitials(currentUser.name)}
                  size="sm"
                  className="w-5 h-5"
                />
                <Text className="text-xs font-sans-medium text-primary">You</Text>
              </View>

              {selectedMembers.map((member) => (
                <View
                  key={member.id}
                  className="flex-row items-center gap-1.5 bg-secondary rounded-full px-3 py-1.5"
                >
                  <Text className="text-xs font-sans-medium text-foreground">
                    {member.name.split(" ")[0]}
                  </Text>
                  <Pressable onPress={() => handleRemoveMember(member.id)}>
                    <X size={14} color="#64748b" />
                  </Pressable>
                </View>
              ))}

              {invitedEmails.map((email, idx) => (
                <View
                  key={`inv-${idx}`}
                  className="flex-row items-center gap-1.5 bg-accent/10 rounded-full px-3 py-1.5"
                >
                  <Mail size={12} color="#14b8a6" />
                  <Text className="text-xs font-sans-medium text-accent" numberOfLines={1}>
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

          {/* Search friends */}
          <View>
            <Text className="text-sm font-sans-semibold text-foreground mb-2">
              Add from friends
            </Text>
            <View className="flex-row items-center bg-muted rounded-xl px-3 gap-2">
              <Search size={18} color="#94a3b8" />
              <Input
                placeholder="Search friends..."
                value={search}
                onChangeText={setSearch}
                className="flex-1 bg-transparent border-0 px-0"
              />
            </View>

            {(search ? filteredFriends : friends.filter((f) => !selectedMembers.find((m) => m.id === f.id))).length > 0 && (
              <View className="mt-2 gap-1.5">
                {(search
                  ? filteredFriends
                  : friends.filter((f) => !selectedMembers.find((m) => m.id === f.id))
                )
                  .slice(0, 5)
                  .map((friend) => (
                    <Pressable
                      key={friend.id}
                      onPress={() => handleAddMember(friend)}
                    >
                      <Card className="p-3 flex-row items-center gap-3">
                        <Avatar fallback={getInitials(friend.name)} size="sm" />
                        <View className="flex-1">
                          <Text className="text-sm font-sans-medium text-card-foreground">
                            {friend.name}
                          </Text>
                          <Text className="text-xs text-muted-foreground font-sans">
                            {friend.email}
                          </Text>
                        </View>
                        <Plus size={18} color="#0d9488" />
                      </Card>
                    </Pressable>
                  ))}
              </View>
            )}
          </View>

          {/* Invite by email */}
          <View>
            <View className="flex-row items-center gap-2 mb-2">
              <UserPlus size={18} color="#0d9488" />
              <Text className="text-sm font-sans-semibold text-foreground">
                Invite by email
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
                <Text className="text-sm font-sans-semibold text-primary-foreground">Invite</Text>
              </Button>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
