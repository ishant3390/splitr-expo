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
import { groups, currentUser } from "@/lib/mock-data";
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
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(groups[0]);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory>("food");
  const [splitWith, setSplitWith] = useState<string[]>(
    selectedGroup.members.map((m) => m.id)
  );
  const [showGroupPicker, setShowGroupPicker] = useState(false);

  const handleToggleMember = (memberId: string) => {
    setSplitWith((prev) =>
      prev.includes(memberId)
        ? prev.filter((id) => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSubmit = () => {
    if (!amount || !description) {
      Alert.alert("Missing Info", "Please enter an amount and description.");
      return;
    }
    Alert.alert(
      "Expense Added",
      `${description}: $${parseFloat(amount).toFixed(2)} split ${splitWith.length} ways in ${selectedGroup.name}`,
      [{ text: "OK", onPress: () => router.back() }]
    );
  };

  const perPerson = amount
    ? (parseFloat(amount) / splitWith.length).toFixed(2)
    : "0.00";

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
          <Pressable onPress={handleSubmit}>
            <Text className="text-base font-sans-semibold text-primary">Save</Text>
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
                      isSelected
                        ? "bg-primary border-primary"
                        : "bg-card border-border"
                    )}
                  >
                    <Icon
                      size={16}
                      color={isSelected ? "#ffffff" : "#64748b"}
                    />
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
            <Pressable onPress={() => setShowGroupPicker(!showGroupPicker)}>
              <Card className="p-3.5 flex-row items-center justify-between">
                <Text className="font-sans-medium text-card-foreground">
                  {selectedGroup.name}
                </Text>
                <ChevronDown
                  size={20}
                  color="#64748b"
                  style={{
                    transform: [{ rotate: showGroupPicker ? "180deg" : "0deg" }],
                  }}
                />
              </Card>
            </Pressable>
            {showGroupPicker && (
              <Card className="mt-2 p-2 gap-1">
                {groups.map((group) => (
                  <Pressable
                    key={group.id}
                    onPress={() => {
                      setSelectedGroup(group);
                      setSplitWith(group.members.map((m) => m.id));
                      setShowGroupPicker(false);
                    }}
                    className={cn(
                      "px-3 py-2.5 rounded-lg",
                      group.id === selectedGroup.id
                        ? "bg-primary"
                        : "bg-transparent"
                    )}
                  >
                    <Text
                      className={cn(
                        "font-sans-medium",
                        group.id === selectedGroup.id
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
          </View>

          {/* Split with */}
          <View>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-sans-medium text-foreground">
                Split with ({splitWith.length})
              </Text>
              <Text className="text-sm text-primary font-sans-semibold">
                ${perPerson}/person
              </Text>
            </View>
            <View className="gap-2">
              {selectedGroup.members.map((member) => {
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
                        src={member.avatar}
                        fallback={getInitials(member.name)}
                        size="sm"
                      />
                      <Text className="flex-1 text-sm font-sans-medium text-card-foreground">
                        {member.id === currentUser.id ? "You" : member.name}
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
