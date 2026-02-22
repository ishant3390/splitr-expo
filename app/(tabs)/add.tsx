import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAuth } from "@clerk/clerk-expo";
import {
  ScanLine,
  ChevronDown,
  Plus,
  Utensils,
  Car,
  Home,
  Gamepad2,
  ShoppingBag,
  MoreHorizontal,
  Check,
} from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { groupsApi } from "@/lib/api";
import { categoryLabels, getInitials, cn } from "@/lib/utils";
import type { ExpenseCategory } from "@/lib/types";

const categories: { id: ExpenseCategory; icon: typeof Utensils; label: string }[] = [
  { id: "food", icon: Utensils, label: "Food" },
  { id: "transport", icon: Car, label: "Transport" },
  { id: "accommodation", icon: Home, label: "Stays" },
  { id: "entertainment", icon: Gamepad2, label: "Fun" },
  { id: "shopping", icon: ShoppingBag, label: "Shop" },
  { id: "other", icon: MoreHorizontal, label: "Other" },
];

export default function AddExpenseScreen() {
  const router = useRouter();
  const { getToken } = useAuth();

  const [groups, setGroups] = useState<any[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory>("food");
  const [splitWith, setSplitWith] = useState<string[]>([]);
  const [showGroupPicker, setShowGroupPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load groups on mount
  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken();
        const data = await groupsApi.list(token!);
        const list = Array.isArray(data) ? data : [];
        setGroups(list);
        if (list.length > 0) setSelectedGroup(list[0]);
      } catch {
        setGroups([]);
      } finally {
        setGroupsLoading(false);
      }
    };
    load();
  }, []);

  // Load members when selected group changes
  useEffect(() => {
    if (!selectedGroup) return;
    const load = async () => {
      setMembersLoading(true);
      try {
        const token = await getToken();
        const data = await groupsApi.listMembers(selectedGroup.id, token!);
        const list = Array.isArray(data) ? data : [];
        setMembers(list);
        setSplitWith(list.map((m: any) => m.id));
      } catch {
        setMembers([]);
        setSplitWith([]);
      } finally {
        setMembersLoading(false);
      }
    };
    load();
  }, [selectedGroup?.id]);

  const handleToggleMember = (memberId: string) => {
    setSplitWith((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSubmit = async () => {
    if (!amount || !description) {
      Alert.alert("Missing Info", "Please enter an amount and description.");
      return;
    }
    if (!selectedGroup) {
      Alert.alert("No Group", "Please select a group.");
      return;
    }
    if (splitWith.length === 0) {
      Alert.alert("No Members", "Please select at least one member to split with.");
      return;
    }

    setSubmitting(true);
    try {
      const token = await getToken();
      await groupsApi.createExpense(
        selectedGroup.id,
        {
          description: description.trim(),
          amount: parseFloat(amount),
          category: selectedCategory,
          splitAmong: splitWith,
        },
        token!
      );
      Alert.alert("Expense Added", `"${description}" added to ${selectedGroup.name}`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not add expense");
    } finally {
      setSubmitting(false);
    }
  };

  const perPerson =
    amount && splitWith.length > 0
      ? (parseFloat(amount) / splitWith.length).toFixed(2)
      : "0.00";

  if (groupsLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center" edges={["top"]}>
        <ActivityIndicator color="#0d9488" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 py-3 border-b border-border">
          <Pressable onPress={() => router.back()}>
            <Text className="text-base font-sans-medium text-muted-foreground">Cancel</Text>
          </Pressable>
          <Text className="text-lg font-sans-semibold text-foreground">Add Expense</Text>
          <Pressable onPress={handleSubmit} disabled={submitting}>
            <Text className="text-base font-sans-semibold text-primary">
              {submitting ? "Saving..." : "Save"}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="px-5 py-6 gap-6"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Scan receipt button */}
          <Button
            variant="outline"
            onPress={() => router.push("/receipt-scanner")}
            className="flex-row items-center justify-center gap-3 bg-accent/10 border-accent"
          >
            <ScanLine size={20} color="#14b8a6" />
            <Text className="text-base font-sans-medium text-accent">
              Scan Receipt Instead
            </Text>
          </Button>

          {/* Amount */}
          <View className="items-center py-4">
            <Text className="text-sm text-muted-foreground font-sans mb-2">Amount</Text>
            <View className="flex-row items-baseline">
              <Text className="text-4xl font-sans-bold text-foreground">$</Text>
              <Input
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                className="text-4xl font-sans-bold text-foreground bg-transparent border-0 p-0 min-w-[120px] text-center"
              />
            </View>
          </View>

          {/* Description */}
          <Input
            label="Description"
            placeholder="What was this for?"
            value={description}
            onChangeText={setDescription}
          />

          {/* Category */}
          <View>
            <Text className="text-sm font-sans-medium text-foreground mb-2">Category</Text>
            <View className="flex-row flex-wrap gap-2">
              {categories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "flex-row items-center gap-2 px-3 py-2 rounded-xl border",
                      isSelected ? "bg-primary border-primary" : "bg-card border-border"
                    )}
                  >
                    <Icon size={16} color={isSelected ? "#ffffff" : "#64748b"} />
                    <Text
                      className={cn(
                        "text-sm font-sans-medium",
                        isSelected ? "text-primary-foreground" : "text-foreground"
                      )}
                    >
                      {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Group selector */}
          <View>
            <Text className="text-sm font-sans-medium text-foreground mb-2">Group</Text>
            {groups.length === 0 ? (
              <Card className="p-4 items-center">
                <Text className="text-sm text-muted-foreground font-sans">
                  No groups yet.{" "}
                  <Text
                    className="text-primary font-sans-semibold"
                    onPress={() => router.push("/create-group")}
                  >
                    Create one
                  </Text>
                </Text>
              </Card>
            ) : (
              <>
                <Pressable onPress={() => setShowGroupPicker(!showGroupPicker)}>
                  <Card className="p-3.5 flex-row items-center justify-between">
                    <Text className="font-sans-medium text-card-foreground">
                      {selectedGroup?.name ?? "Select a group"}
                    </Text>
                    <ChevronDown size={20} color="#64748b" />
                  </Card>
                </Pressable>
                {showGroupPicker && (
                  <Card className="mt-2 p-2 gap-1">
                    {groups.map((group) => (
                      <Pressable
                        key={group.id}
                        onPress={() => {
                          setSelectedGroup(group);
                          setShowGroupPicker(false);
                        }}
                        className={cn(
                          "px-3 py-2.5 rounded-lg",
                          group.id === selectedGroup?.id ? "bg-primary" : "bg-transparent"
                        )}
                      >
                        <Text
                          className={cn(
                            "font-sans-medium",
                            group.id === selectedGroup?.id
                              ? "text-primary-foreground"
                              : "text-card-foreground"
                          )}
                        >
                          {group.name}
                        </Text>
                      </Pressable>
                    ))}
                    <Pressable
                      onPress={() => {
                        setShowGroupPicker(false);
                        router.push("/create-group");
                      }}
                      className="flex-row items-center gap-2 px-3 py-2.5 rounded-lg"
                    >
                      <Plus size={16} color="#14b8a6" />
                      <Text className="font-sans-medium text-accent">Create New Group</Text>
                    </Pressable>
                  </Card>
                )}
              </>
            )}
          </View>

          {/* Split with */}
          {selectedGroup && (
            <View>
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-sm font-sans-medium text-foreground">
                  Split with ({splitWith.length})
                </Text>
                <Text className="text-sm text-primary font-sans-semibold">
                  ${perPerson}/person
                </Text>
              </View>
              {membersLoading ? (
                <ActivityIndicator color="#0d9488" />
              ) : (
                <View className="gap-2">
                  {members.map((member: any) => {
                    const isChecked = splitWith.includes(member.id);
                    return (
                      <Pressable
                        key={member.id}
                        onPress={() => handleToggleMember(member.id)}
                      >
                        <Card
                          className={cn(
                            "p-3 flex-row items-center gap-3",
                            isChecked && "border-primary/30 bg-primary/5"
                          )}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => handleToggleMember(member.id)}
                          />
                          <Avatar
                            src={member.imageUrl ?? member.avatar}
                            fallback={getInitials(member.name)}
                            size="sm"
                          />
                          <Text className="flex-1 text-sm font-sans-medium text-card-foreground">
                            {member.name}
                          </Text>
                          {isChecked && amount && (
                            <Text className="text-sm font-sans-semibold text-primary">
                              ${perPerson}
                            </Text>
                          )}
                        </Card>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
