import React from "react";
import { View, Text, Pressable } from "react-native";
import { Avatar } from "@/components/ui/avatar";
import { getInitials, getMemberAvatarUrl } from "@/lib/utils";
import type { GroupMemberDto } from "@/lib/types";
import { palette } from "@/lib/tokens";

interface AvatarStripProps {
  members: GroupMemberDto[];
  maxVisible?: number;
  onPress?: () => void;
  size?: "sm" | "md";
}

const OVERLAP = -8;
const SIZES = {
  sm: { avatar: "sm" as const, pill: "text-[10px]", container: 32 },
  md: { avatar: "sm" as const, pill: "text-xs", container: 32 },
};

export function AvatarStrip({ members, maxVisible = 5, onPress, size = "md" }: AvatarStripProps) {
  const s = SIZES[size];
  const visible = members.slice(0, maxVisible);
  const overflow = members.length - maxVisible;

  const content = (
    <View className="flex-row items-center">
      {visible.map((member, i) => {
        const name = member.user?.name ?? member.guestUser?.name ?? member.displayName ?? "?";
        return (
          <View
            key={member.id}
            style={{
              marginLeft: i === 0 ? 0 : OVERLAP,
              zIndex: visible.length - i,
              borderRadius: s.container / 2,
              borderWidth: 2,
              borderColor: palette.white,
            }}
          >
            <Avatar
              src={getMemberAvatarUrl(member.user)}
              fallback={getInitials(name)}
              size={s.avatar}
            />
          </View>
        );
      })}
      {overflow > 0 && (
        <View
          style={{ marginLeft: OVERLAP, zIndex: 0 }}
          className="w-8 h-8 rounded-full bg-muted items-center justify-center"
        >
          <Text className={`font-sans-semibold text-muted-foreground ${s.pill}`}>
            +{overflow}
          </Text>
        </View>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} accessibilityLabel={`${members.length} members`}>
        {content}
      </Pressable>
    );
  }

  return content;
}
