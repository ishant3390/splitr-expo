import React, { useRef, useEffect } from "react";
import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useColorScheme } from "nativewind";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { Users, User } from "lucide-react-native";
import { getInitials } from "@/lib/utils";
import type { ContactDto, GroupDto } from "@/lib/types";

interface MentionDropdownProps {
  type: "@" | "#";
  contacts?: ContactDto[];
  groups?: GroupDto[];
  onSelect: (item: ContactDto | GroupDto) => void;
  visible: boolean;
  selectedIndex?: number;
  isLoading?: boolean;
}

function ContactRow({
  contact,
  onPress,
  isDark,
  isSelected,
}: {
  contact: ContactDto;
  onPress: () => void;
  isDark: boolean;
  isSelected?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`Mention ${contact.name}`}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: isSelected
          ? isDark
            ? "rgba(13, 148, 136, 0.25)"
            : "rgba(13, 148, 136, 0.1)"
          : pressed
            ? isDark
              ? "#334155"
              : "#f1f5f9"
            : "transparent",
      })}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: isSelected
            ? isDark
              ? "rgba(13, 148, 136, 0.3)"
              : "rgba(13, 148, 136, 0.15)"
            : isDark
              ? "#1e293b"
              : "#e2e8f0",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontFamily: "Inter_600SemiBold",
            color: isSelected ? "#0d9488" : isDark ? "#94a3b8" : "#64748b",
          }}
        >
          {getInitials(contact.name)}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Text
            style={{
              fontSize: 14,
              fontFamily: "Inter_500Medium",
              color: isSelected
                ? "#0d9488"
                : isDark
                  ? "#f1f5f9"
                  : "#0f172a",
            }}
            numberOfLines={1}
          >
            {contact.name}
          </Text>
          {contact.isGuest && (
            <View
              style={{
                backgroundColor: isDark ? "#334155" : "#f1f5f9",
                borderRadius: 4,
                paddingHorizontal: 4,
                paddingVertical: 1,
              }}
            >
              <Text
                style={{
                  fontSize: 9,
                  fontFamily: "Inter_500Medium",
                  color: "#94a3b8",
                }}
              >
                Guest
              </Text>
            </View>
          )}
        </View>
        {contact.email && (
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Inter_400Regular",
              color: "#94a3b8",
              marginTop: 1,
            }}
            numberOfLines={1}
          >
            {contact.email}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function GroupRow({
  group,
  onPress,
  isDark,
  isSelected,
}: {
  group: GroupDto;
  onPress: () => void;
  isDark: boolean;
  isSelected?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={`Mention group ${group.name}`}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: isSelected
          ? isDark
            ? "rgba(13, 148, 136, 0.25)"
            : "rgba(13, 148, 136, 0.1)"
          : pressed
            ? isDark
              ? "#334155"
              : "#f1f5f9"
            : "transparent",
      })}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: isSelected
            ? isDark
              ? "rgba(13, 148, 136, 0.3)"
              : "rgba(13, 148, 136, 0.15)"
            : isDark
              ? "#1e293b"
              : "#e2e8f0",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ fontSize: 14 }}>
          {group.emoji || group.name.charAt(0)}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: 14,
            fontFamily: "Inter_500Medium",
            color: isSelected
              ? "#0d9488"
              : isDark
                ? "#f1f5f9"
                : "#0f172a",
          }}
          numberOfLines={1}
        >
          {group.name}
        </Text>
        {group.memberCount != null && (
          <Text
            style={{
              fontSize: 12,
              fontFamily: "Inter_400Regular",
              color: "#94a3b8",
              marginTop: 1,
            }}
          >
            {group.memberCount} member{group.memberCount !== 1 ? "s" : ""}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export function MentionDropdown({
  type,
  contacts,
  groups,
  onSelect,
  visible,
  selectedIndex = -1,
  isLoading = false,
}: MentionDropdownProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (selectedIndex >= 0 && listRef.current) {
      try {
        listRef.current.scrollToIndex({
          index: selectedIndex,
          animated: true,
          viewPosition: 0.5,
        });
      } catch {
        // ignore scroll failures
      }
    }
  }, [selectedIndex]);

  if (!visible) return null;

  const data = type === "@" ? contacts ?? [] : groups ?? [];

  if (data.length === 0) {
    return (
      <Animated.View
        entering={FadeIn.duration(150)}
        exiting={FadeOut.duration(100)}
        style={{
          backgroundColor: isDark ? "#1e293b" : "#ffffff",
          borderWidth: 1,
          borderColor: isDark ? "#334155" : "#e2e8f0",
          borderRadius: 12,
          marginHorizontal: 16,
          marginBottom: 4,
          paddingVertical: 12,
          paddingHorizontal: 16,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 4,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            justifyContent: "center",
          }}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#94a3b8" />
          ) : (
            <>
              {type === "@" ? (
                <User size={14} color="#94a3b8" />
              ) : (
                <Users size={14} color="#94a3b8" />
              )}
              <Text
                style={{
                  fontSize: 13,
                  fontFamily: "Inter_400Regular",
                  color: "#94a3b8",
                }}
              >
                {type === "@" ? "No contacts found" : "No groups found"}
              </Text>
            </>
          )}
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(100)}
      style={{
        backgroundColor: isDark ? "#1e293b" : "#ffffff",
        borderWidth: 1,
        borderColor: isDark ? "#334155" : "#e2e8f0",
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 4,
        maxHeight: 200,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 12,
          paddingTop: 8,
          paddingBottom: 4,
        }}
      >
        {type === "@" ? (
          <User size={11} color="#94a3b8" />
        ) : (
          <Users size={11} color="#94a3b8" />
        )}
        <Text
          style={{
            fontSize: 10,
            fontFamily: "Inter_600SemiBold",
            color: "#94a3b8",
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {type === "@" ? "People" : "Groups"}
        </Text>
      </View>
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(item) =>
          "isGuest" in item
            ? item.userId || item.guestUserId || item.name
            : item.id
        }
        keyboardShouldPersistTaps="handled"
        renderItem={({ item, index }) =>
          type === "@" ? (
            <ContactRow
              contact={item as ContactDto}
              onPress={() => onSelect(item)}
              isDark={isDark}
              isSelected={index === selectedIndex}
            />
          ) : (
            <GroupRow
              group={item as GroupDto}
              onPress={() => onSelect(item)}
              isDark={isDark}
              isSelected={index === selectedIndex}
            />
          )
        }
        onScrollToIndexFailed={() => {}}
      />
    </Animated.View>
  );
}
