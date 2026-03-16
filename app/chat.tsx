import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView as RNKeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  ScrollView,
} from "react-native";
import { useColorScheme } from "nativewind";
import {
  KeyboardAvoidingView as KBCKeyboardAvoidingView,
  KeyboardProvider,
} from "react-native-keyboard-controller";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  withSpring,
  FadeInRight,
  FadeInLeft,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  Home,
  Send,
  Bot,
  Users,
  Plus,
  CheckCircle2,
  Pencil,
  Clock,
  Square,
  RotateCcw,
  WifiOff,
  Camera,
  X,
  MessageSquarePlus,
  RefreshCw,
  Mic,
  ChevronDown,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ImagePreviewModal } from "@/components/ui/image-preview-modal";
import { chatStream, chatApi } from "@/lib/api";
import { useAuth } from "@clerk/clerk-expo";
import { cn, formatCents } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { hapticSuccess, hapticLight } from "@/lib/haptics";
import {
  isSpeechRecognitionAvailable,
  createSpeechRecognition,
  SpeechRecognitionHandle,
} from "@/lib/speech";
import { useNetwork } from "@/components/NetworkProvider";
import { useMergedContacts, useGroups } from "@/lib/hooks";
import { trackMention } from "@/lib/mention-recency";
import { MentionDropdown } from "@/components/ui/mention-dropdown";
import { ChatMarkdown } from "@/components/ui/chat-markdown";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import {
  detectTrigger,
  filterContacts,
  filterGroups,
  insertMention,
  replaceMentionsForWire,
  parseMentionsForDisplay,
} from "@/lib/mention-utils";
import { invalidateAfterExpenseChange, invalidateAfterGroupChange } from "@/lib/query";
import type {
  ChatActionRequired,
  ChatExpenseCreated,
  ChatExpensePreview,
  ChatGroupOption,
  ChatGroupPreview,
  ChatQuotaDto,
  ChatSSEEvent,
  MentionRecord,
  ContactDto,
  GroupDto,
} from "@/lib/types";

// ---- Keyboard wrapper (smooth native animations on iOS/Android, fallback on web) ----

function ChatKeyboardAvoidingView({ children }: { children: React.ReactNode }) {
  if (Platform.OS === "web") {
    return <View style={{ flex: 1 }}>{children}</View>;
  }
  return (
    <KeyboardProvider>
      <KBCKeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {children}
      </KBCKeyboardAvoidingView>
    </KeyboardProvider>
  );
}

// ---- Message types ----

let messageCounter = 0;
function nextId(prefix: string) {
  return `${prefix}-${Date.now()}-${++messageCounter}`;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  imageUri?: string;
  actionRequired?: ChatActionRequired;
  actionHandled?: boolean;
  createdExpense?: ChatExpenseCreated;
  failed?: boolean;
  failedText?: string;
  createdAt?: number;
  followUps?: string[];
  replyTo?: { id: string; content: string; role: "user" | "assistant" };
}

// ---- B26: Timestamp helpers ----

function formatMessageTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  // Within last minute — no timestamp
  if (diff < 60_000) return "";

  const date = new Date(timestamp);
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  const mm = minutes.toString().padStart(2, "0");
  const timeStr = `${h}:${mm} ${ampm}`;

  // Same day
  const today = new Date();
  if (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  ) {
    return timeStr;
  }

  // Older
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[date.getMonth()]} ${date.getDate()}, ${timeStr}`;
}

function shouldShowTimestamp(
  current: ChatMessage,
  previous: ChatMessage | undefined
): boolean {
  if (!current.createdAt) return false;
  if (!previous || !previous.createdAt) return true;
  return current.createdAt - previous.createdAt > 2 * 60_000; // > 2 minutes
}

// ---- B27: Typing Dots (iMessage-style) ----

function TypingDot({ delay: d }: { delay: number }) {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    translateY.value = withDelay(
      d,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 300 }),
          withTiming(0, { duration: 300 })
        ),
        -1,
        false
      )
    );
    opacity.value = withDelay(
      d,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(0.4, { duration: 300 })
        ),
        -1,
        false
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        { width: 8, height: 8, borderRadius: 4, backgroundColor: "#64748b" },
        animStyle,
      ]}
    />
  );
}

function TypingDotsIndicator({ label }: { label: string }) {
  return (
    <View className="px-4 py-2 items-start">
      <View className="flex-row items-start gap-2">
        <View className="w-7 h-7 rounded-full bg-gray-200 items-center justify-center mt-1">
          <Bot size={14} color="#64748b" />
        </View>
        <View>
          {/* iMessage-style typing bubble */}
          <View 
            style={{ 
              backgroundColor: "#f1f5f9",
              borderRadius: 18, 
              paddingHorizontal: 16, 
              paddingVertical: 12,
              minWidth: 60,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <TypingDot delay={0} />
              <TypingDot delay={200} />
              <TypingDot delay={400} />
            </View>
          </View>
          <Text className="text-[10px] text-muted-foreground font-sans mt-1 ml-1">
            {label}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ---- Animated Send Button ----

function SendButton({
  onSend,
  enabled,
  isDark,
}: {
  onSend: () => void;
  enabled: boolean;
  isDark: boolean;
}) {
  const scale = useSharedValue(1);
  const prevEnabled = useRef(enabled);

  useEffect(() => {
    // Spring pop when button becomes enabled or disabled
    if (prevEnabled.current !== enabled) {
      scale.value = withSequence(
        withSpring(enabled ? 1.2 : 0.85, { damping: 8, stiffness: 200 }),
        withSpring(1, { damping: 12, stiffness: 180 })
      );
      prevEnabled.current = enabled;
    }
  }, [enabled]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    // Quick scale down + up on send
    scale.value = withSequence(
      withSpring(0.8, { damping: 10, stiffness: 300 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );
    onSend();
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        disabled={!enabled}
        accessibilityLabel="Send message"
        accessibilityRole="button"
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: enabled
            ? "#0d9488"
            : isDark ? "#334155" : "#f1f5f9",
        }}
      >
        <Send size={18} color={enabled ? "#ffffff" : "#94a3b8"} />
      </Pressable>
    </Animated.View>
  );
}

// ---- AsyncStorage keys ----

const CHAT_MESSAGES_KEY = "@splitr/chat_messages";
const CHAT_CONVERSATION_ID_KEY = "@splitr/chat_conversation_id";

// ---- Default welcome message ----

function createWelcomeMessage(): ChatMessage {
  return {
    id: "welcome",
    role: "assistant",
    content:
      'Hi! I\'m your Splitr assistant. Tell me about an expense and I\'ll split it for you.\n\nTip: Use @ to mention people and # to mention groups for instant matching.\n\nFor example: "Split $50 for dinner with @Sarah and @Mike in #Beach Trip"',
    createdAt: Date.now(),
  };
}

// ---- Suggested prompts ----

const suggestedPrompts = [
  "Split $50 for dinner with @Sarah and @Mike",
  "Add $120 hotel expense in #Beach Trip",
  "How much do I owe in total?",
  "Who owes me money?",
];

// ---- B31: Bubble grouping helpers ----

type BubblePosition = "only" | "first" | "middle" | "last";

function getBubblePosition(
  msgs: ChatMessage[],
  index: number
): BubblePosition {
  const current = msgs[index];
  const prev = index > 0 ? msgs[index - 1] : null;
  const next = index < msgs.length - 1 ? msgs[index + 1] : null;
  const sameAsPrev = prev?.role === current.role;
  const sameAsNext = next?.role === current.role;

  if (sameAsPrev && sameAsNext) return "middle";
  if (sameAsPrev) return "last";
  if (sameAsNext) return "first";
  return "only";
}

// ---- B46: Reaction emoji options ----
const REACTION_EMOJIS = ["\u{1F44D}", "\u{2705}", "\u{2753}", "\u{1F602}", "\u{2764}\u{FE0F}"];

// ---- B33: Extracted MessageItem (React.memo) ----

interface MessageItemProps {
  item: ChatMessage;
  index: number;
  messages: ChatMessage[];
  isDark: boolean;
  loading: boolean;
  onRetry: (messageId: string, text: string) => void;
  onSelectGroup: (messageId: string, group: ChatGroupOption) => void;
  onConfirmExpense: (messageId: string) => void;
  onEditExpense: (preview: ChatExpensePreview, messageId: string) => void;
  onConfirmCreateGroup: (messageId: string) => void;
  onFollowUp?: (text: string) => void;
  onCopy?: (text: string) => void;
  onReply?: (message: ChatMessage) => void;
  onImagePress?: (uri: string) => void;
  previousMessage?: ChatMessage;
  showReactions?: boolean;
  reaction?: string;
  onShowReactions?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
}

const MessageItem = React.memo(
  function MessageItem({
    item,
    index,
    messages: allMessages,
    isDark,
    loading: isLoading,
    onRetry,
    onSelectGroup,
    onConfirmExpense,
    onEditExpense,
    onConfirmCreateGroup,
    onFollowUp,
    onCopy,
    onReply,
    onImagePress,
    previousMessage,
    showReactions: showReactionPicker,
    reaction,
    onShowReactions,
    onReact,
  }: MessageItemProps) {
    const isUser = item.role === "user";
    const position = getBubblePosition(allMessages, index);
    const showAvatar = !isUser && (position === "last" || position === "only");

    // B31: Vertical spacing based on grouping
    const verticalPadding = position === "middle" ? "py-0.5" : "py-1.5";

// ---- Bubble Tail Component (iMessage-style) ----

function BubbleTail({ isUser, position }: { isUser: boolean; position: BubblePosition }) {
  const isLastOrOnly = position === "only" || position === "last";
  
  if (position === "middle" || position === "first") return null;

  if (isUser) {
    return (
      <View
        style={{
          position: "absolute",
          right: -8,
          bottom: 8,
          width: 0,
          height: 0,
          borderTopWidth: 8,
          borderTopColor: "transparent",
          borderBottomWidth: 8,
          borderBottomColor: "transparent",
          borderLeftWidth: 10,
          borderLeftColor: "#0d9488",
        }}
      />
    );
  }

  return (
    <View
      style={{
        position: "absolute",
        left: -8,
        bottom: 8,
        width: 0,
        height: 0,
        borderTopWidth: 8,
        borderTopColor: "transparent",
        borderBottomWidth: 8,
        borderBottomColor: "transparent",
        borderRightWidth: 10,
        borderRightColor: "#f1f5f9",
      }}
    />
  );
}

    // B31: Border radius adjustments for grouped bubbles
    // iMessage style: user = blue bubbles, assistant = gray bubbles
    const getBubbleClasses = () => {
      if (isUser) {
        // iMessage blue for user bubbles
        const base = "bg-primary rounded-2xl";
        if (position === "only" || position === "last") return `${base} rounded-br-md`;
        return base;
      }
      // Light gray for assistant bubbles (iMessage style)
      const base = "bg-muted rounded-2xl";
      if (position === "only" || position === "last") return `${base} rounded-bl-md`;
      return base;
    };

    // B26: Timestamp
    const showTs = shouldShowTimestamp(item, previousMessage);
    const timeStr = item.createdAt ? formatMessageTime(item.createdAt) : "";

    // Message entrance animation — iMessage-style bounce effect
    const messageEntering = isUser
      ? FadeInRight.duration(250).springify().damping(12).stiffness(160)
      : FadeInLeft.duration(250).springify().damping(12).stiffness(160);

    // B45: Swipe-to-reply gesture
    const translateX = useSharedValue(0);
    const replyIconOpacity = useSharedValue(0);

    const triggerReply = useCallback(() => {
      onReply?.(item);
    }, [item, onReply]);

    const swipeGesture = useMemo(() =>
      Gesture.Pan()
        .activeOffsetX(20)
        .failOffsetY([-15, 15])
        .onUpdate((e) => {
          // Only allow right swipe, max 80px
          const x = Math.max(0, Math.min(e.translationX, 80));
          translateX.value = x;
          replyIconOpacity.value = x > 40 ? 1 : x / 40;
        })
        .onEnd((e) => {
          if (e.translationX > 50) {
            runOnJS(triggerReply)();
          }
          translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
          replyIconOpacity.value = withTiming(0, { duration: 150 });
        }),
    [triggerReply]);

    const swipeStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: translateX.value }],
    }));

    const replyIconStyle = useAnimatedStyle(() => ({
      opacity: replyIconOpacity.value,
      transform: [{ scale: replyIconOpacity.value }],
    }));

    // B49: Check if content has markdown formatting (native only — web has CSS specificity issues)
    const hasMarkdown = Platform.OS !== "web" && !isUser && item.content && (
      item.content.includes("**") ||
      item.content.includes("```") ||
      item.content.includes("`") ||
      /^\s*[-*]\s+/m.test(item.content) ||
      /^\s*\d+[.)]\s+/m.test(item.content)
    );

    return (
      <>
        {/* B26: Timestamp separator */}
        {showTs && timeStr ? (
          <Animated.View entering={FadeIn.duration(200)} className="items-center py-2">
            <Text className="text-[10px] text-muted-foreground font-sans">
              {timeStr}
            </Text>
          </Animated.View>
        ) : null}

        <Animated.View
          entering={messageEntering}
          className={cn("px-4", verticalPadding, isUser ? "items-end" : "items-start")}
          accessibilityLabel={item.content || undefined}
        >
          {/* B45: Reply icon behind the swipeable message */}
          <View style={{ position: "relative", width: "100%" }}>
            <Animated.View
              style={[
                {
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  justifyContent: "center",
                  paddingLeft: 4,
                },
                replyIconStyle,
              ]}
            >
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: isDark ? "#334155" : "#e2e8f0",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <RotateCcw size={14} color={isDark ? "#94a3b8" : "#64748b"} />
              </View>
            </Animated.View>

            <GestureDetector gesture={swipeGesture}>
          <Animated.View
            style={[{ alignItems: isUser ? "flex-end" : "flex-start" }, swipeStyle]}
          >
          <View
            className={cn("flex-row items-start gap-2", isUser ? "max-w-[85%]" : "max-w-[90%]")}
          >
            {/* B31: Only show bot avatar on last/only in consecutive group */}
            {!isUser && (
              <View
                className="w-7 h-7 items-center justify-center mt-1"
                style={{ opacity: showAvatar ? 1 : 0 }}
              >
                {showAvatar && (
                  <View className="w-7 h-7 rounded-full bg-gray-200 items-center justify-center">
                    <Bot size={14} color="#64748b" />
                  </View>
                )}
              </View>
            )}
            <View className="flex-shrink">
              {/* B45: Reply quote */}
              {item.replyTo && (
                <View
                  style={{
                    borderLeftWidth: 2,
                    borderLeftColor: "#0d9488",
                    paddingLeft: 8,
                    marginBottom: 4,
                    opacity: 0.7,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 11,
                      fontFamily: "Inter_500Medium",
                      color: "#0d9488",
                      marginBottom: 1,
                    }}
                  >
                    {item.replyTo.role === "user" ? "You" : "Assistant"}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={{
                      fontSize: 12,
                      fontFamily: "Inter_400Regular",
                      color: isDark ? "#94a3b8" : "#64748b",
                    }}
                  >
                    {item.replyTo.content}
                  </Text>
                </View>
              )}
              {/* Image attachment */}
              {item.imageUri && (
                <Pressable
                  onPress={() => onImagePress?.(item.imageUri!)}
                  accessibilityLabel="View image full screen"
                  accessibilityRole="button"
                >
                  <View className="rounded-2xl overflow-hidden mb-1" style={{ width: 200, height: 150 }}>
                    <Image
                      source={{ uri: item.imageUri }}
                      style={{ width: "100%", height: "100%" }}
                      contentFit="cover"
                    />
                  </View>
                </Pressable>
              )}
              {/* Only render bubble if there is content */}
              {item.content ? (
                <View>
                  {/* B46: Reaction picker */}
                  {showReactionPicker && (
                    <Animated.View
                      entering={FadeIn.duration(150)}
                      style={{
                        flexDirection: "row",
                        alignSelf: isUser ? "flex-end" : "flex-start",
                        backgroundColor: isDark ? "#334155" : "#ffffff",
                        borderRadius: 20,
                        paddingHorizontal: 6,
                        paddingVertical: 4,
                        marginBottom: 4,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.15,
                        shadowRadius: 6,
                        elevation: 4,
                        gap: 2,
                      }}
                      accessibilityLabel="Reaction picker"
                    >
                      {REACTION_EMOJIS.map((emoji) => (
                        <Pressable
                          key={emoji}
                          onPress={() => onReact?.(item.id, emoji)}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: reaction === emoji ? (isDark ? "#475569" : "#e2e8f0") : "transparent",
                          }}
                          accessibilityLabel={`React with ${emoji}`}
                          accessibilityRole="button"
                        >
                          <Text style={{ fontSize: 20 }}>{emoji}</Text>
                        </Pressable>
                      ))}
                      {/* Copy button for assistant messages */}
                      {!isUser && onCopy && (
                        <Pressable
                          onPress={() => {
                            onCopy(item.content);
                            onReact?.(item.id, "");
                          }}
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                          accessibilityLabel="Copy message"
                          accessibilityRole="button"
                        >
                          <Text style={{ fontSize: 20 }}>{"\u{1F4CB}"}</Text>
                        </Pressable>
                      )}
                    </Animated.View>
                  )}
                  <Pressable
                    onLongPress={() => onShowReactions?.(item.id)}
                    accessibilityLabel={item.content}
                    accessibilityHint="Long press to react"
                  >
                    <View className={cn(getBubbleClasses(), "px-4 py-3")}>
                      {/* B49: Markdown rendering for assistant messages (native only) */}
                      {hasMarkdown ? (
                        <ChatMarkdown content={item.content} isUser={false} />
                      ) : (
                      <Text
                        style={{
                          fontSize: 14,
                          lineHeight: 20,
                          fontFamily: "Inter_400Regular",
                          color: isUser ? "#ffffff" : "#000000",
                        }}
                      >
                        {parseMentionsForDisplay(item.content).map((seg, i) =>
                          seg.type === "mention" ? (
                            <Text
                              key={i}
                              style={{
                                color: isUser ? "#bbdefb" : "#0d9488",
                                fontFamily: "Inter_600SemiBold",
                              }}
                            >
                              {seg.mentionType}{seg.value}
                            </Text>
                          ) : (
                            <Text key={i}>{seg.value}</Text>
                          )
                        )}
                      </Text>
                      )}
                    </View>
                    {/* iMessage-style bubble tail */}
                    <BubbleTail isUser={isUser} position={position} />
                  </Pressable>
                  {/* B46: Reaction badge */}
                  {reaction ? (
                    <Animated.View
                      entering={FadeIn.duration(150)}
                      style={{
                        alignSelf: isUser ? "flex-end" : "flex-start",
                        backgroundColor: isDark ? "#334155" : "#f1f5f9",
                        borderRadius: 12,
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        marginTop: 2,
                      }}
                      accessibilityLabel={`Reaction: ${reaction}`}
                    >
                      <Text style={{ fontSize: 14 }}>{reaction}</Text>
                    </Animated.View>
                  ) : null}
                </View>
              ) : null}

              {/* H6: Retry button on failed messages */}
              {item.failed && item.failedText && (
                <Pressable
                  onPress={() => onRetry(item.id, item.failedText!)}
                  className="flex-row items-center gap-1.5 mt-1.5 px-1"
                  accessibilityLabel="Retry message"
                  accessibilityRole="button"
                >
                  <RotateCcw size={12} color="#ef4444" />
                  <Text className="text-xs text-red-500 font-sans-medium">
                    Tap to retry
                  </Text>
                </Pressable>
              )}

              {/* Action cards: select_group */}
              {item.actionRequired?.action === "select_group" &&
                item.actionRequired.options && (
                  <View className="mt-3 gap-2">
                    <View className="flex-row items-center gap-1.5">
                      <Users size={13} color="#64748b" />
                      <Text className="text-xs text-muted-foreground font-sans-medium">
                        Which group?
                      </Text>
                    </View>
                    {item.actionRequired.options.map((group) => (
                      <Pressable
                        key={group.groupId}
                        disabled={!!item.actionHandled || isLoading}
                        onPress={() => onSelectGroup(item.id, group)}
                        style={{ opacity: item.actionHandled ? 0.5 : 1 }}
                        accessibilityLabel={`Select group ${group.name}`}
                        accessibilityRole="button"
                      >
                        <Card className="p-3 border-primary/20">
                          <View className="flex-row items-center gap-2.5">
                            <View className="w-8 h-8 rounded-full bg-primary/10 items-center justify-center">
                              <Text className="text-sm">
                                {group.emoji || group.name.charAt(0)}
                              </Text>
                            </View>
                            <View className="flex-1">
                              <Text className="text-sm font-sans-medium text-foreground">
                                {group.name}
                              </Text>
                              <Text
                                className="text-xs text-muted-foreground font-sans"
                                numberOfLines={1}
                              >
                                {group.members.join(", ")}
                              </Text>
                            </View>
                            {group.lastActivity && (
                              <View className="flex-row items-center gap-1">
                                <Clock size={10} color="#94a3b8" />
                                <Text className="text-[10px] text-muted-foreground font-sans">
                                  {group.lastActivity}
                                </Text>
                              </View>
                            )}
                          </View>
                        </Card>
                      </Pressable>
                    ))}
                  </View>
                )}

              {/* Action cards: confirm_expense */}
              {item.actionRequired?.action === "confirm_expense" &&
                item.actionRequired.expensePreview && (
                  <Card className="mt-3 p-4 border-primary/30 bg-primary/5">
                    <Text className="text-sm font-sans-semibold text-foreground mb-3">
                      Confirm Expense
                    </Text>
                    <View className="gap-2 mb-3">
                      <View className="flex-row justify-between">
                        <Text className="text-xs text-muted-foreground font-sans">
                          Description
                        </Text>
                        <Text className="text-xs font-sans-medium text-foreground">
                          {item.actionRequired.expensePreview.description}
                        </Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-xs text-muted-foreground font-sans">Total</Text>
                        <Text className="text-sm font-sans-bold text-foreground">
                          {formatCents(item.actionRequired.expensePreview.totalAmountCents, item.actionRequired.expensePreview.currency)}
                        </Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-xs text-muted-foreground font-sans">Group</Text>
                        <Text className="text-xs font-sans-medium text-foreground">
                          {item.actionRequired.expensePreview.groupEmoji ? `${item.actionRequired.expensePreview.groupEmoji} ` : ""}
                          {item.actionRequired.expensePreview.groupName}
                        </Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-xs text-muted-foreground font-sans">
                          Paid by
                        </Text>
                        <Text className="text-xs font-sans-medium text-foreground">
                          {item.actionRequired.expensePreview.payerName}
                        </Text>
                      </View>
                      {/* Split breakdown */}
                      <View className="mt-1 pt-2 border-t border-border">
                        <Text className="text-xs text-muted-foreground font-sans mb-1.5">
                          Split ({item.actionRequired.expensePreview.splits.length}-way)
                        </Text>
                        {item.actionRequired.expensePreview.splits.map((split, idx) => (
                          <View key={idx} className="flex-row justify-between py-0.5">
                            <Text className="text-xs text-foreground font-sans">
                              {split.name}
                            </Text>
                            <Text className="text-xs text-foreground font-sans-medium">
                              {formatCents(split.amountCents, item.actionRequired!.expensePreview!.currency)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>

                    {!item.actionHandled && (
                      <View className="flex-row gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onPress={() => onEditExpense(item.actionRequired!.expensePreview!, item.id)}
                          accessibilityLabel="Edit expense"
                          accessibilityRole="button"
                        >
                          <Pencil size={14} color={isDark ? "#f1f5f9" : "#0f172a"} />
                          <Text className="text-sm font-sans-medium text-foreground ml-1">
                            Edit
                          </Text>
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onPress={() => onConfirmExpense(item.id)}
                          disabled={isLoading}
                          accessibilityLabel="Confirm expense"
                          accessibilityRole="button"
                        >
                          <CheckCircle2 size={14} color="#ffffff" />
                          <Text className="text-sm font-sans-medium text-primary-foreground ml-1">
                            Confirm
                          </Text>
                        </Button>
                      </View>
                    )}
                    {item.actionHandled && (
                      <View className="flex-row items-center justify-center gap-1.5 py-1">
                        <CheckCircle2 size={14} color="#10b981" />
                        <Text className="text-xs text-emerald-500 font-sans-medium">
                          Confirmed
                        </Text>
                      </View>
                    )}
                  </Card>
                )}

              {/* Action cards: confirm_create_group */}
              {item.actionRequired?.action === "confirm_create_group" &&
                item.actionRequired.groupPreview && (
                  <Card className="mt-3 p-4 border-primary/30 bg-primary/5">
                    <View className="flex-row items-center gap-2 mb-2">
                      <Plus size={16} color="#0d9488" />
                      <Text className="text-sm font-sans-semibold text-foreground">
                        Create new group?
                      </Text>
                    </View>
                    <View className="gap-1.5 mb-3">
                      <View className="flex-row justify-between">
                        <Text className="text-xs text-muted-foreground font-sans">Name</Text>
                        <Text className="text-xs font-sans-medium text-foreground">
                          {item.actionRequired.groupPreview.name}
                        </Text>
                      </View>
                      <View className="flex-row justify-between">
                        <Text className="text-xs text-muted-foreground font-sans">
                          Members
                        </Text>
                        <Text className="text-xs font-sans-medium text-foreground">
                          You, {item.actionRequired.groupPreview.memberNames.join(", ")}
                        </Text>
                      </View>
                    </View>
                    {!item.actionHandled && (
                      <Button
                        size="sm"
                        onPress={() => onConfirmCreateGroup(item.id)}
                        disabled={isLoading}
                        accessibilityLabel="Create group"
                        accessibilityRole="button"
                      >
                        <Plus size={14} color="#ffffff" />
                        <Text className="text-sm font-sans-medium text-primary-foreground ml-1">
                          Create Group
                        </Text>
                      </Button>
                    )}
                    {item.actionHandled && (
                      <View className="flex-row items-center justify-center gap-1.5 py-1">
                        <CheckCircle2 size={14} color="#10b981" />
                        <Text className="text-xs text-emerald-500 font-sans-medium">
                          Creating...
                        </Text>
                      </View>
                    )}
                  </Card>
                )}

              {/* Expense created card */}
              {item.createdExpense && (
                <Card className="mt-3 p-4 bg-emerald-500/10 border-emerald-500/30">
                  <View className="flex-row items-center gap-2 mb-2">
                    <CheckCircle2 size={18} color="#10b981" />
                    <Text className="text-sm font-sans-semibold text-foreground">
                      Expense Added!
                    </Text>
                  </View>
                  <View className="gap-1.5">
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-muted-foreground font-sans">
                        {item.createdExpense.description}
                      </Text>
                      <Text className="text-sm font-sans-bold text-foreground">
                        {formatCents(item.createdExpense.totalAmountCents, item.createdExpense.currency)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-muted-foreground font-sans">
                        Per person ({item.createdExpense.splitCount}-way)
                      </Text>
                      <Text className="text-xs font-sans-semibold text-foreground">
                        {formatCents(item.createdExpense.perPersonCents, item.createdExpense.currency)}
                      </Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-xs text-muted-foreground font-sans">Group</Text>
                      <Text className="text-xs font-sans-medium text-foreground">
                        {item.createdExpense.groupEmoji ? `${item.createdExpense.groupEmoji} ` : ""}
                        {item.createdExpense.groupName}
                      </Text>
                    </View>
                  </View>
                </Card>
              )}

              {/* B29: Follow-up suggestions */}
              {item.followUps && item.followUps.length > 0 && (
                <View className="mt-2 gap-1.5">
                  {item.followUps.map((fu, idx) => (
                    <Pressable
                      key={idx}
                      onPress={() => onFollowUp?.(fu)}
                      className="border border-border rounded-lg px-3 py-2 bg-card"
                      accessibilityLabel={fu}
                      accessibilityRole="button"
                    >
                      <Text className="text-xs text-foreground font-sans">
                        {fu}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          </View>
          </Animated.View>
            </GestureDetector>
          </View>
        </Animated.View>
      </>
    );
  },
  (prevProps, nextProps) =>
    prevProps.item === nextProps.item &&
    prevProps.index === nextProps.index &&
    prevProps.isDark === nextProps.isDark &&
    prevProps.loading === nextProps.loading &&
    prevProps.messages.length === nextProps.messages.length &&
    prevProps.messages[prevProps.index - 1]?.role === nextProps.messages[nextProps.index - 1]?.role &&
    prevProps.messages[prevProps.index + 1]?.role === nextProps.messages[nextProps.index + 1]?.role &&
    prevProps.showReactions === nextProps.showReactions &&
    prevProps.reaction === nextProps.reaction
);

// ---- Component ----

export default function ChatScreen() {
  const router = useRouter();
  const { receiptMessage } = useLocalSearchParams<{ receiptMessage?: string }>();
  const { getToken } = useAuth();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const { isOnline: isConnected } = useNetwork();
  const toast = useToast();
  const { data: contacts, isLoading: contactsLoading, refreshRecents } = useMergedContacts();
  const { data: allGroups } = useGroups();
  const goBack = () =>
    router.canGoBack() ? router.back() : router.replace("/(tabs)");

  const [messages, setMessages] = useState<ChatMessage[]>([createWelcomeMessage()]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [quota, setQuota] = useState<ChatQuotaDto | null>(null);
  const [hasStreaming, setHasStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ uri: string; base64: string } | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [mentionState, setMentionState] = useState<{
    trigger: "@" | "#";
    query: string;
    startIndex: number;
  } | null>(null);
  const [mentions, setMentions] = useState<MentionRecord[]>([]);
  const cursorPosRef = useRef(0);
  const sentImageRef = useRef(false);
  const listRef = useRef<FlatList>(null);
  const abortRef = useRef<(() => void) | null>(null);
  const sendingRef = useRef(false); // C5: double-send guard
  const mountedRef = useRef(true); // C1: unmount guard
  const isNearBottomRef = useRef(true); // H2: smart scroll
  const inputRef = useRef(""); // tracks latest input for handleSelectionChange
  const speechRef = useRef<SpeechRecognitionHandle | null>(null);

  // Pulsing animation for voice recording indicator
  const recordingPulse = useSharedValue(1);
  useEffect(() => {
    if (isRecording) {
      recordingPulse.value = withRepeat(
        withSequence(
          withTiming(0.5, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        true
      );
    } else {
      recordingPulse.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording]);
  const recordingPulseStyle = useAnimatedStyle(() => ({
    opacity: recordingPulse.value,
  }));
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(-1);
  const [replyTo, setReplyTo] = useState<{ id: string; content: string; role: "user" | "assistant" } | null>(null);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [messageReactions, setMessageReactions] = useState<Record<string, string>>({});
  const [showScrollButton, setShowScrollButton] = useState(false);
  const skipEnterRef = useRef(false); // skip onChangeText after Enter selects mention
  const filteredItemsRef = useRef<(ContactDto | GroupDto)[]>([]);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // B30: debounce save

  // B30: Load persisted messages on mount
  useEffect(() => {
    (async () => {
      try {
        const [savedMessages, savedConvId] = await Promise.all([
          AsyncStorage.getItem(CHAT_MESSAGES_KEY),
          AsyncStorage.getItem(CHAT_CONVERSATION_ID_KEY),
        ]);
        if (savedMessages && mountedRef.current) {
          const parsed = JSON.parse(savedMessages) as ChatMessage[];
          if (parsed.length > 0) {
            setMessages(parsed);
          }
        }
        if (savedConvId && mountedRef.current) {
          setConversationId(savedConvId);
        }
      } catch {
        // Persistence load is best-effort
      }
    })();
  }, []);

  // B30: Debounced save messages to AsyncStorage
  useEffect(() => {
    // Skip saving if any message is still streaming
    if (messages.some((m) => m.id === "streaming")) return;

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      AsyncStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(messages)).catch(() => {});
    }, 500);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [messages]);

  // B30: Persist conversationId
  useEffect(() => {
    if (conversationId) {
      AsyncStorage.setItem(CHAT_CONVERSATION_ID_KEY, conversationId).catch(() => {});
    }
  }, [conversationId]);

  // C1: Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.();
      abortRef.current = null;
      speechRef.current?.stop();
      speechRef.current = null;
    };
  }, []);

  // Reset arrow-key selection when mention query changes
  useEffect(() => {
    setMentionSelectedIndex(-1);
  }, [mentionState?.query, mentionState?.trigger]);

  // Fetch quota on mount
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token && mountedRef.current) {
          const q = await chatApi.quota(token);
          if (mountedRef.current) setQuota(q);
        }
      } catch {
        // Quota fetch is best-effort
      }
    })();
  }, []);

  const isQuotaExceeded = quota ? quota.dailyUsed >= quota.dailyLimit : false;

  // ---- Safe state setters (C1: guard against unmount) ----

  const safeSetMessages = useCallback(
    (updater: React.SetStateAction<ChatMessage[]>) => {
      if (mountedRef.current) setMessages(updater);
    },
    []
  );

  const safeSetLoading = useCallback((v: boolean) => {
    if (mountedRef.current) setLoading(v);
  }, []);

  // ---- Send message ----

  const sendMessage = useCallback(
    async (text: string, imageData?: { uri: string; base64: string }, opts?: { deterministic?: boolean }) => {
      // C5: Use ref for synchronous double-send guard
      if ((!text.trim() && !imageData) || sendingRef.current) return;
      sendingRef.current = true;

      const userMessage: ChatMessage = {
        id: nextId("user"),
        role: "user",
        content: text.trim(),
        imageUri: imageData?.uri,
        createdAt: Date.now(),
        ...(replyTo ? { replyTo } : {}),
      };

      safeSetMessages((prev) => [...prev, userMessage]);
      setInput("");
      setReplyTo(null);
      sentImageRef.current = !!imageData;
      setPendingImage(null);
      safeSetLoading(true);
      setHasStreaming(false);

      // C2: Handle null token
      const token = await getToken();
      if (!token) {
        safeSetMessages((prev) => [
          ...prev,
          {
            id: nextId("error"),
            role: "assistant",
            content: "Your session has expired. Please sign in again.",
            createdAt: Date.now(),
          },
        ]);
        safeSetLoading(false);
        sendingRef.current = false;
        return;
      }

      let assistantContent = "";
      let currentAction: ChatActionRequired | undefined;
      let currentExpense: ChatExpenseCreated | undefined;

      abortRef.current = chatStream(
        text.trim(),
        conversationId,
        token,
        (event: ChatSSEEvent) => {
          if (!mountedRef.current) return; // C1

          // Track conversationId
          if ("conversationId" in event && event.conversationId) {
            setConversationId(event.conversationId);
          }

          if (event.type === "thinking") {
            setIsThinking(true);
          } else if (event.type === "text_chunk") {
            setIsThinking(false);
            assistantContent += event.content;
            setHasStreaming(true);
            safeSetMessages((prev) => {
              const existing = prev.find((m) => m.id === "streaming");
              if (existing) {
                return prev.map((m) =>
                  m.id === "streaming"
                    ? { ...m, content: assistantContent }
                    : m
                );
              }
              return [
                ...prev,
                { id: "streaming", role: "assistant" as const, content: assistantContent },
              ];
            });
          } else if (event.type === "text") {
            // Fallback / finalizer — use full content if no chunks were received
            setIsThinking(false);
            if (!assistantContent) {
              assistantContent = event.content;
            }
            setHasStreaming(true);
            safeSetMessages((prev) => {
              const existing = prev.find((m) => m.id === "streaming");
              if (existing) {
                return prev.map((m) =>
                  m.id === "streaming"
                    ? { ...m, content: assistantContent }
                    : m
                );
              }
              return [
                ...prev,
                { id: "streaming", role: "assistant" as const, content: assistantContent },
              ];
            });
          } else if (event.type === "action_required") {
            currentAction = event.action;
            safeSetMessages((prev) => {
              const existing = prev.find((m) => m.id === "streaming");
              if (existing) {
                return prev.map((m) =>
                  m.id === "streaming"
                    ? { ...m, actionRequired: currentAction }
                    : m
                );
              }
              return [
                ...prev,
                {
                  id: "streaming",
                  role: "assistant" as const,
                  content: assistantContent,
                  actionRequired: currentAction,
                },
              ];
            });
          } else if (event.type === "expense_created") {
            currentExpense = event.expense;
            hapticSuccess();
            // C3: Invalidate React Query cache
            if (currentExpense.groupId) {
              invalidateAfterExpenseChange(currentExpense.groupId);
            }
            safeSetMessages((prev) => {
              const existing = prev.find((m) => m.id === "streaming");
              if (existing) {
                return prev.map((m) =>
                  m.id === "streaming"
                    ? { ...m, createdExpense: currentExpense }
                    : m
                );
              }
              return [
                ...prev,
                {
                  id: "streaming",
                  role: "assistant" as const,
                  content: assistantContent,
                  createdExpense: currentExpense,
                },
              ];
            });
          } else if (event.type === "quota") {
            setQuota({
              dailyUsed: event.dailyUsed,
              dailyLimit: event.dailyLimit,
              resetsAt: event.resetsAt,
              tier: quota?.tier ?? "free",
            });
          } else if (event.type === "quota_exceeded") {
            setQuota({
              dailyUsed: event.dailyUsed,
              dailyLimit: event.dailyLimit,
              resetsAt: event.resetsAt,
              tier: quota?.tier ?? "free",
            });
            safeSetMessages((prev) => [
              ...prev.filter((m) => m.id !== "streaming"),
              {
                id: nextId("quota"),
                role: "assistant" as const,
                content: event.message || "You've reached your daily AI chat limit.",
                createdAt: Date.now(),
              },
            ]);
            safeSetLoading(false);
            sendingRef.current = false;
          } else if (event.type === "error") {
            safeSetMessages((prev) => [
              ...prev.filter((m) => m.id !== "streaming"),
              {
                id: nextId("error"),
                role: "assistant" as const,
                content: event.message || "Something went wrong. Please try again.",
                createdAt: Date.now(),
              },
            ]);
            safeSetLoading(false);
            sendingRef.current = false;
          }
        },
        () => {
          if (!mountedRef.current) return; // C1
          safeSetMessages((prev) =>
            prev.map((m) =>
              m.id === "streaming"
                ? {
                    ...m,
                    id: nextId("assistant"),
                    createdAt: Date.now(),
                    // B29: Add follow-ups for expense_created messages
                    ...(m.createdExpense
                      ? {
                          followUps: [
                            "Add another expense",
                            "Check my balance",
                            `View ${m.createdExpense.groupName}`,
                          ],
                        }
                      : {}),
                  }
                : m
            )
          );
          safeSetLoading(false);
          setHasStreaming(false);
          setIsThinking(false);
          sendingRef.current = false;
        },
        (err) => {
          if (!mountedRef.current) return; // C1
          if (err.name === "AbortError") {
            safeSetLoading(false);
            setHasStreaming(false);
            setIsThinking(false);
            sendingRef.current = false;
            return;
          }
          // H6: Add failed message with retry capability
          safeSetMessages((prev) => [
            ...prev.filter((m) => m.id !== "streaming"),
            {
              id: nextId("error"),
              role: "assistant" as const,
              content: "Sorry, something went wrong. Please try again.",
              failed: true,
              failedText: text.trim(),
              createdAt: Date.now(),
            },
          ]);
          safeSetLoading(false);
          setHasStreaming(false);
          setIsThinking(false);
          sendingRef.current = false;
        },
        (imageData || opts?.deterministic)
          ? { image: imageData?.base64, deterministic: opts?.deterministic }
          : undefined
      );
    },
    [conversationId, quota]
  );

  const handleSend = useCallback(
    (text?: string) => {
      const img = pendingImage ?? undefined;
      const raw = text || input || (img ? "Split this receipt" : "");
      const wireText = mentions.length > 0 ? replaceMentionsForWire(raw, mentions) : raw;
      sendMessage(wireText, img);
      setMentions([]);
      setMentionState(null);
    },
    [input, sendMessage, pendingImage, mentions]
  );

  // B34: Auto-send receipt message when navigated from receipt scanner
  const receiptSentRef = useRef(false);
  useEffect(() => {
    if (receiptMessage && !receiptSentRef.current) {
      receiptSentRef.current = true;
      // Small delay to let mount + persisted messages load settle
      const timer = setTimeout(() => {
        sendMessage(receiptMessage);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [receiptMessage, sendMessage]);

  // ---- Mention handlers ----

  const handleInputChange = useCallback(
    (text: string) => {
      // Skip the onChangeText fired by Enter key when selecting a mention
      if (skipEnterRef.current) {
        skipEnterRef.current = false;
        return;
      }
      setInput(text);
      inputRef.current = text;
      // Use text.length as cursor position — onSelectionChange fires AFTER onChangeText on web
      cursorPosRef.current = text.length;
      const result = detectTrigger(text, text.length);
      if (result) {
        setMentionState({
          trigger: result.trigger,
          query: result.query,
          startIndex: result.startIndex,
        });
      } else {
        setMentionState(null);
      }
      // Clean up mentions that were edited away
      setMentions((prev) =>
        prev.filter((m) => text.includes(`${m.trigger}${m.displayName}`))
      );
    },
    []
  );

  const handleSelectionChange = useCallback(
    (e: { nativeEvent: { selection: { start: number; end: number } } }) => {
      cursorPosRef.current = e.nativeEvent.selection.end;
      // Use inputRef (always current) instead of input state (may be stale in closure)
      const result = detectTrigger(inputRef.current, cursorPosRef.current);
      if (result) {
        setMentionState({
          trigger: result.trigger,
          query: result.query,
          startIndex: result.startIndex,
        });
      } else {
        setMentionState(null);
      }
    },
    []
  );

  const handleMentionSelect = useCallback(
    (item: ContactDto | GroupDto) => {
      if (!mentionState) return;
      const isContact = "isGuest" in item;
      const displayName = item.name;
      const id = isContact
        ? (item as ContactDto).userId
          ? `userId:${(item as ContactDto).userId}`
          : `guestUserId:${(item as ContactDto).guestUserId}`
        : `groupId:${(item as GroupDto).id}`;

      const { newText, newCursorPos } = insertMention(
        inputRef.current,
        displayName,
        mentionState.trigger,
        mentionState.startIndex,
        cursorPosRef.current || inputRef.current.length
      );

      setInput(newText);
      inputRef.current = newText;
      cursorPosRef.current = newCursorPos;
      setMentions((prev) => [
        ...prev,
        { trigger: mentionState.trigger, displayName, id },
      ]);
      setMentionState(null);

      // Track recency for @ mentions
      if (isContact) {
        const c = item as ContactDto;
        trackMention({
          id,
          name: c.name,
          email: c.email,
          isGuest: c.isGuest,
          lastMentionedAt: new Date().toISOString(),
        }).then(refreshRecents);
      }
    },
    [mentionState, refreshRecents]
  );

  // Arrow key navigation for mention dropdown (web)
  const handleKeyPress = useCallback(
    (e: any) => {
      if (!mentionState) return;
      const items = filteredItemsRef.current;
      if (items.length === 0) return;

      const key = e.nativeEvent.key;
      if (key === "ArrowDown") {
        setMentionSelectedIndex((prev) =>
          prev < items.length - 1 ? prev + 1 : prev
        );
      } else if (key === "ArrowUp") {
        setMentionSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (
        (key === "Enter" || key === "Tab") &&
        mentionSelectedIndex >= 0 &&
        items[mentionSelectedIndex]
      ) {
        if (key === "Enter") skipEnterRef.current = true;
        handleMentionSelect(items[mentionSelectedIndex]);
      }
    },
    [mentionState, mentionSelectedIndex, handleMentionSelect]
  );

  // H1: Stop generation
  const handleStop = useCallback(() => {
    abortRef.current?.();
    abortRef.current = null;
    safeSetMessages((prev) =>
      prev.map((m) =>
        m.id === "streaming"
          ? { ...m, id: nextId("assistant"), createdAt: Date.now() }
          : m
      )
    );
    safeSetLoading(false);
    setHasStreaming(false);
    setIsThinking(false);
    sendingRef.current = false;
  }, []);

  // B30: New chat — clear messages, conversationId, and AsyncStorage
  const handleNewChat = useCallback(() => {
    abortRef.current?.();
    abortRef.current = null;
    setMessages([createWelcomeMessage()]);
    setConversationId(null);
    setInput("");
    setLoading(false);
    setHasStreaming(false);
    setIsThinking(false);
    sendingRef.current = false;
    AsyncStorage.multiRemove([CHAT_MESSAGES_KEY, CHAT_CONVERSATION_ID_KEY]).catch(() => {});
  }, []);

  // H6: Retry failed message
  const handleRetry = useCallback(
    (messageId: string, text: string) => {
      safeSetMessages((prev) => prev.filter((m) => m.id !== messageId));
      sendMessage(text);
    },
    [sendMessage]
  );

  // ---- Action handlers ----

  const handleSelectGroup = useCallback(
    (messageId: string, group: ChatGroupOption) => {
      hapticLight();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, actionHandled: true } : m
        )
      );
      sendMessage(`Use group "${group.name}"`);
    },
    [sendMessage]
  );

  const handleConfirmExpense = useCallback(
    (messageId: string) => {
      hapticSuccess();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, actionHandled: true } : m
        )
      );
      sendMessage("confirm", undefined, { deterministic: true });
    },
    [sendMessage]
  );

  const handleEditExpense = useCallback(
    (preview: ChatExpensePreview, messageId: string) => {
      hapticLight();
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, actionHandled: true } : m
        )
      );
      router.push({
        pathname: "/(tabs)/add",
        params: {
          amount: (preview.totalAmountCents / 100).toString(),
          description: preview.description,
          date: preview.expenseDate,
          groupId: preview.groupId,
          currency: preview.currency,
        },
      });
    },
    [router]
  );

  const handleConfirmCreateGroup = useCallback(
    (messageId: string) => {
      hapticSuccess();
      setMessages((prev) => {
        const msg = prev.find((m) => m.id === messageId);
        const groupName = msg?.actionRequired?.groupPreview?.name;
        return prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                actionHandled: true,
                // B29: follow-ups after group creation
                followUps: groupName
                  ? [
                      `Add expense to ${groupName}`,
                      "Invite members",
                      "Check my balance",
                    ]
                  : ["Add an expense", "Check my balance"],
              }
            : m
        );
      });
      sendMessage("confirm", undefined, { deterministic: true });
    },
    [sendMessage]
  );

  // ---- Image picker ----

  const handlePickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setPendingImage({ uri: result.assets[0].uri, base64: result.assets[0].base64 });
    }
  }, []);

  const handleTakePhoto = useCallback(async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") return;
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      base64: true,
    });
    if (!result.canceled && result.assets[0]?.base64) {
      setPendingImage({ uri: result.assets[0].uri, base64: result.assets[0].base64 });
    }
  }, []);

  // Voice input — Web Speech API on web, unavailable on native for now
  const handleVoiceInput = useCallback(() => {
    if (isRecording) {
      speechRef.current?.stop();
      speechRef.current = null;
      setIsRecording(false);
      return;
    }

    if (!isSpeechRecognitionAvailable()) {
      toast.info(
        Platform.OS === "web"
          ? "Voice input not supported in this browser"
          : "Voice input available on web only"
      );
      return;
    }

    const recognition = createSpeechRecognition({
      onResult: (transcript, _isFinal) => {
        setInput(transcript);
        inputRef.current = transcript;
      },
      onError: (error) => {
        if (error !== "aborted") {
          toast.error("Voice input failed. Try again.");
        }
        setIsRecording(false);
        speechRef.current = null;
      },
      onEnd: () => {
        setIsRecording(false);
        speechRef.current = null;
      },
    });

    if (recognition) {
      speechRef.current = recognition;
      setIsRecording(true);
      hapticLight();
      recognition.start();
    }
  }, [isRecording, toast]);

  // H2: Smart scroll — only auto-scroll if user is near bottom
  const handleScroll = useCallback((e: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom =
      contentSize.height - contentOffset.y - layoutMeasurement.height;
    isNearBottomRef.current = distanceFromBottom < 100;
    // B47: Show scroll-to-bottom FAB when scrolled up
    setShowScrollButton(distanceFromBottom > 300);
    // B46: Dismiss reaction picker on scroll
    setShowReactions(null);
  }, []);

  const handleContentSizeChange = useCallback(() => {
    if (isNearBottomRef.current) {
      listRef.current?.scrollToEnd({ animated: true });
    }
  }, []);

  // B47: Scroll to bottom handler
  const scrollToBottom = useCallback(() => {
    hapticLight();
    listRef.current?.scrollToEnd({ animated: true });
    setShowScrollButton(false);
  }, []);

  // ---- Render message (B33: delegates to memoized MessageItem) ----

  // B33: Memoized keyExtractor
  const keyExtractor = useCallback((item: ChatMessage) => item.id, []);

  // B28: Copy assistant message to clipboard
  const handleCopyMessage = useCallback(
    async (text: string) => {
      await Clipboard.setStringAsync(text);
      toast.success("Copied to clipboard");
    },
    [toast]
  );

  // B29: Follow-up tap handler
  const handleFollowUp = useCallback(
    (text: string) => {
      handleSend(text);
    },
    [handleSend]
  );

  // B45: Reply handler — set reply context
  const handleReply = useCallback((message: ChatMessage) => {
    setReplyTo({
      id: message.id,
      content: message.content.slice(0, 150),
      role: message.role,
    });
  }, []);

  // B46: Reaction handlers
  const handleShowReactions = useCallback(
    (messageId: string) => {
      hapticLight();
      setShowReactions((prev) => (prev === messageId ? null : messageId));
    },
    []
  );

  const handleReact = useCallback(
    (messageId: string, emoji: string) => {
      if (!emoji) {
        setShowReactions(null);
        return;
      }
      hapticLight();
      setMessageReactions((prev) => {
        const current = prev[messageId];
        if (current === emoji) {
          const next = { ...prev };
          delete next[messageId];
          return next;
        }
        return { ...prev, [messageId]: emoji };
      });
      setShowReactions(null);
    },
    []
  );

  const renderMessageItem = useCallback(
    ({ item, index }: { item: ChatMessage; index: number }) => (
      <MessageItem
        item={item}
        index={index}
        messages={messages}
        isDark={isDark}
        loading={loading}
        onRetry={handleRetry}
        onSelectGroup={handleSelectGroup}
        onConfirmExpense={handleConfirmExpense}
        onEditExpense={handleEditExpense}
        onConfirmCreateGroup={handleConfirmCreateGroup}
        onFollowUp={handleFollowUp}
        onCopy={handleCopyMessage}
        onReply={handleReply}
        onImagePress={setPreviewImage}
        previousMessage={index > 0 ? messages[index - 1] : undefined}
        showReactions={showReactions === item.id}
        reaction={messageReactions[item.id]}
        onShowReactions={handleShowReactions}
        onReact={handleReact}
      />
    ),
    [messages, isDark, loading, handleRetry, handleSelectGroup, handleConfirmExpense, handleEditExpense, handleConfirmCreateGroup, handleFollowUp, handleCopyMessage, handleReply, showReactions, messageReactions, handleShowReactions, handleReact]
  );

  // ---- Quota display ----

  // ---- Mention filtering ----
  const filteredMentionItems = mentionState
    ? mentionState.trigger === "@"
      ? filterContacts(contacts ?? [], mentionState.query)
      : filterGroups(allGroups ?? [], mentionState.query)
    : [];
  filteredItemsRef.current = filteredMentionItems;

  const quotaRemaining = quota ? quota.dailyLimit - quota.dailyUsed : null;
  const showQuotaInHeader = quotaRemaining !== null && quotaRemaining <= 5;

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border" style={{ paddingTop: Platform.OS === "web" ? 12 : 0 }}>
        <Pressable
          onPress={() => router.replace("/(tabs)")}
          accessibilityLabel="Go to home"
          accessibilityRole="button"
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isDark ? "#1e293b" : "#f1f5f9",
          }}
        >
          <Home size={20} color={isDark ? "#94a3b8" : "#64748b"} />
        </Pressable>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: "rgba(13, 148, 136, 0.1)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Bot size={20} color="#0d9488" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-sans-semibold text-foreground">
            Split Assistant
          </Text>
          <Text className="text-xs text-muted-foreground font-sans">
            {showQuotaInHeader
              ? quotaRemaining === 0
                ? "Daily limit reached"
                : `${quotaRemaining} message${quotaRemaining === 1 ? "" : "s"} left today`
              : "Powered by AI"}
          </Text>
        </View>
        {/* B30: New Chat button */}
        <Pressable
          onPress={handleNewChat}
          accessibilityLabel="Start new chat"
          accessibilityRole="button"
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MessageSquarePlus size={22} color={isDark ? "#94a3b8" : "#64748b"} />
        </Pressable>
      </View>

      <ChatKeyboardAvoidingView>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={keyExtractor}
          renderItem={renderMessageItem}
          contentContainerClassName="py-4"
          onScroll={handleScroll}
          scrollEventThrottle={100}
          onContentSizeChange={handleContentSizeChange}
          removeClippedSubviews={Platform.OS !== "web"}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={20}
          ListFooterComponent={
            loading && !hasStreaming ? (
              <TypingDotsIndicator
                label={
                  isThinking
                    ? sentImageRef.current
                      ? "Scanning receipt..."
                      : "AI is thinking..."
                    : "Thinking..."
                }
              />
            ) : null
          }
        />

        {/* B47: Scroll-to-bottom FAB */}
        {showScrollButton && (
          <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(100)}
            style={{
              position: "absolute",
              right: 16,
              bottom: 70,
              zIndex: 10,
            }}
          >
            <Pressable
              onPress={scrollToBottom}
              accessibilityLabel="Scroll to bottom"
              accessibilityRole="button"
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: isDark ? "#334155" : "#ffffff",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 4,
                elevation: 4,
                borderWidth: 1,
                borderColor: isDark ? "#475569" : "#e2e8f0",
              }}
            >
              <ChevronDown size={20} color={isDark ? "#f1f5f9" : "#0f172a"} />
            </Pressable>
          </Animated.View>
        )}

        {/* Suggested prompts */}
        {messages.length <= 1 && !isQuotaExceeded && (
          <View className="px-4 pb-2 gap-2">
            {suggestedPrompts.map((prompt, idx) => (
              <Pressable
                key={idx}
                onPress={() => handleSend(prompt)}
                className="border border-border rounded-xl px-4 py-3 bg-card"
                accessibilityLabel={prompt}
                accessibilityRole="button"
              >
                <Text className="text-sm text-foreground font-sans">
                  {prompt}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* H1: Stop generation button */}
        {loading && hasStreaming && (
          <View className="items-center pb-2">
            <Pressable
              onPress={handleStop}
              className="flex-row items-center gap-1.5 bg-card border border-border rounded-full px-4 py-2"
              accessibilityLabel="Stop generating"
              accessibilityRole="button"
            >
              <Square size={12} color={isDark ? "#f1f5f9" : "#0f172a"} fill={isDark ? "#f1f5f9" : "#0f172a"} />
              <Text className="text-xs font-sans-medium text-foreground">
                Stop generating
              </Text>
            </Pressable>
          </View>
        )}

        {/* Quota exceeded card */}
        {isQuotaExceeded && !loading && (
          <View className="px-4 pb-2">
            <Card className="p-4 border-amber-500/30 bg-amber-500/5">
              <Text className="text-sm font-sans-semibold text-foreground mb-1">
                Daily limit reached
              </Text>
              <Text className="text-xs text-muted-foreground font-sans mb-3">
                You've used all {quota?.dailyLimit} free AI messages for today. Resets at midnight.
              </Text>
              <Button
                size="sm"
                variant="outline"
                onPress={() => router.push("/(tabs)/add")}
                accessibilityLabel="Add expense manually"
              >
                <Text className="text-sm font-sans-medium text-foreground">
                  Add Expense Manually
                </Text>
              </Button>
            </Card>
          </View>
        )}

        {/* H5: Offline indicator */}
        {!isConnected && (
          <View className="flex-row items-center justify-center gap-1.5 py-2 bg-amber-500/10">
            <WifiOff size={14} color="#f59e0b" />
            <Text className="text-xs text-amber-600 dark:text-amber-400 font-sans-medium">
              You're offline. Chat requires an internet connection.
            </Text>
          </View>
        )}

        {/* Mention dropdown */}
        <MentionDropdown
          type={mentionState?.trigger ?? "@"}
          contacts={mentionState?.trigger === "@" ? filteredMentionItems as ContactDto[] : undefined}
          groups={mentionState?.trigger === "#" ? filteredMentionItems as GroupDto[] : undefined}
          onSelect={handleMentionSelect}
          visible={!!mentionState}
          selectedIndex={mentionSelectedIndex}
          isLoading={mentionState?.trigger === "@" ? contactsLoading : false}
        />

        {/* Image preview */}
        {pendingImage && (
          <View className="px-4 pt-2 border-t border-border bg-background">
            <View className="flex-row items-start gap-2">
              <View className="rounded-xl overflow-hidden" style={{ width: 64, height: 64 }}>
                <Image
                  source={{ uri: pendingImage.uri }}
                  style={{ width: "100%", height: "100%" }}
                  contentFit="cover"
                />
              </View>
              <Pressable
                onPress={() => setPendingImage(null)}
                accessibilityLabel="Remove image"
                accessibilityRole="button"
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: isDark ? "#334155" : "#f1f5f9",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <X size={14} color={isDark ? "#f1f5f9" : "#64748b"} />
              </Pressable>
            </View>
          </View>
        )}

        {/* B45: Reply preview bar */}
        {replyTo && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderTopWidth: 1,
              borderTopColor: isDark ? "#334155" : "#e2e8f0",
              backgroundColor: isDark ? "#1e293b" : "#f8fafc",
              gap: 8,
            }}
          >
            <View
              style={{
                borderLeftWidth: 2,
                borderLeftColor: "#0d9488",
                paddingLeft: 8,
                flex: 1,
              }}
            >
              <Text
                style={{
                  fontSize: 11,
                  fontFamily: "Inter_500Medium",
                  color: "#0d9488",
                  marginBottom: 1,
                }}
              >
                Replying to {replyTo.role === "user" ? "yourself" : "Assistant"}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 12,
                  fontFamily: "Inter_400Regular",
                  color: isDark ? "#94a3b8" : "#64748b",
                }}
              >
                {replyTo.content}
              </Text>
            </View>
            <Pressable
              onPress={() => setReplyTo(null)}
              accessibilityLabel="Cancel reply"
              accessibilityRole="button"
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                backgroundColor: isDark ? "#334155" : "#e2e8f0",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <X size={12} color={isDark ? "#94a3b8" : "#64748b"} />
            </Pressable>
          </View>
        )}

        {/* Input */}
        <View className={`flex-row items-end gap-2 px-4 py-3 ${!pendingImage && !replyTo ? "border-t border-border" : ""} bg-background`}>
          <Pressable
            onPress={handleTakePhoto}
            onLongPress={handlePickImage}
            disabled={loading || isQuotaExceeded || !isConnected}
            accessibilityLabel="Take photo"
            accessibilityRole="button"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: !loading && !isQuotaExceeded && isConnected
                ? (isDark ? "#334155" : "#f1f5f9")
                : (isDark ? "rgba(51,65,85,0.5)" : "rgba(241,245,249,0.5)"),
            }}
          >
            <Camera
              size={20}
              color={!loading && !isQuotaExceeded && isConnected ? (isDark ? "#f1f5f9" : "#64748b") : "#94a3b8"}
            />
          </Pressable>
          
          {/* Voice input button */}
          <Pressable
            onPress={handleVoiceInput}
            disabled={loading || isQuotaExceeded || !isConnected}
            accessibilityLabel={isRecording ? "Stop recording" : "Voice input"}
            accessibilityRole="button"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: isRecording
                ? "#ef4444"
                : !loading && !isQuotaExceeded && isConnected
                  ? (isDark ? "#334155" : "#f1f5f9")
                  : (isDark ? "rgba(51,65,85,0.5)" : "rgba(241,245,249,0.5)"),
            }}
          >
            {isRecording ? (
              <Animated.View style={recordingPulseStyle}>
                <Mic size={20} color="#ffffff" />
              </Animated.View>
            ) : (
              <Mic
                size={20}
                color={!loading && !isQuotaExceeded && isConnected ? (isDark ? "#f1f5f9" : "#64748b") : "#94a3b8"}
              />
            )}
          </Pressable>
          
          <View style={{ flex: 1 }}>
            <TextInput
              value={input}
              onChangeText={handleInputChange}
              onSelectionChange={handleSelectionChange}
              onKeyPress={mentionState ? handleKeyPress : undefined}
              placeholder={
                isQuotaExceeded
                  ? "Daily limit reached"
                  : !isConnected
                    ? "Offline..."
                    : pendingImage
                      ? "Describe the receipt..."
                      : "Type a message... (@ for people, # for groups)"
              }
              placeholderTextColor={isDark ? "#64748b" : "#94a3b8"}
              multiline
              maxLength={500}
              editable={!isQuotaExceeded && isConnected}
              className="bg-muted rounded-2xl px-4 py-3 max-h-24 text-foreground"
              style={{
                fontSize: 16,
                fontFamily: "Inter_400Regular",
              }}
              onSubmitEditing={() => handleSend()}
              accessibilityLabel="Chat message input"
            />
          </View>
          <SendButton
            onSend={() => handleSend()}
            enabled={(!!input.trim() || !!pendingImage) && !loading && !isQuotaExceeded && isConnected}
            isDark={isDark}
          />
        </View>
      </ChatKeyboardAvoidingView>

      {/* B48: Image preview modal */}
      <ImagePreviewModal
        visible={!!previewImage}
        imageUri={previewImage}
        onClose={() => setPreviewImage(null)}
      />
    </SafeAreaView>
  );
}
