import React, { useRef } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { Trash2, Pencil } from "lucide-react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { fontSize as fs, fontFamily as ff, palette, radius } from "@/lib/tokens";

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete?: () => void;
  onEdit?: () => void;
}

/**
 * iOS-style swipeable row with Edit and Delete actions.
 * Swipe left to reveal action buttons.
 */
export function SwipeableRow({ children, onDelete, onEdit }: SwipeableRowProps) {
  const swipeRef = useRef<Swipeable>(null);

  const close = () => swipeRef.current?.close();

  const renderRightActions = () => (
    <Animated.View entering={FadeIn.duration(200)} style={styles.actionsContainer}>
      {onEdit && (
        <Pressable
          onPress={() => { close(); onEdit(); }}
          style={[styles.action, styles.editAction]}
          accessibilityRole="button"
          accessibilityLabel="Edit"
        >
          <Pencil size={18} color={palette.white} />
          <Text style={styles.actionText}>Edit</Text>
        </Pressable>
      )}
      {onDelete && (
        <Pressable
          onPress={() => { close(); onDelete(); }}
          style={[styles.action, styles.deleteAction]}
          accessibilityRole="button"
          accessibilityLabel="Delete"
        >
          <Trash2 size={18} color={palette.white} />
          <Text style={styles.actionText}>Delete</Text>
        </Pressable>
      )}
    </Animated.View>
  );

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
    >
      {children}
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  actionsContainer: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  action: {
    width: 72,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  editAction: {
    backgroundColor: palette.teal600,
    borderTopLeftRadius: radius.DEFAULT,
    borderBottomLeftRadius: radius.DEFAULT,
  },
  deleteAction: {
    backgroundColor: palette.red500,
    borderTopRightRadius: radius.DEFAULT,
    borderBottomRightRadius: radius.DEFAULT,
  },
  actionText: {
    color: palette.white,
    fontSize: fs.xs,
    fontFamily: ff.semibold,
  },
});
