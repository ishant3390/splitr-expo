import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  ScrollView,
  useColorScheme,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
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
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { chatStream, chatApi } from "@/lib/api";
import { useAuth } from "@clerk/clerk-expo";
import { cn, formatCents } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { hapticSuccess } from "@/lib/haptics";
import { useNetwork } from "@/components/NetworkProvider";
import { useMergedContacts, useGroups } from "@/lib/hooks";
import { trackMention } from "@/lib/mention-recency";
import { MentionDropdown } from "@/components/ui/mention-dropdown";
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

// ---- B27: Typing Dots ----

function TypingDot({ delay: d }: { delay: number }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      d,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 200 }),
          withTiming(0, { duration: 200 })
        ),
        -1,
        false
      )
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[
        { width: 6, height: 6, borderRadius: 3, backgroundColor: "rgba(13,148,136,0.5)" },
        animStyle,
      ]}
    />
  );
}

function TypingDotsIndicator({ label }: { label: string }) {
  return (
    <View className="px-4 py-2 items-start">
      <View className="flex-row items-start gap-2">
        <View className="w-7 h-7 rounded-full bg-primary/10 items-center justify-center mt-1">
          <Bot size={14} color="#0d9488" />
        </View>
        <View>
          <View className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <TypingDot delay={0} />
              <TypingDot delay={150} />
              <TypingDot delay={300} />
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
];

// ---- Styled input overlay (web: colored mentions in input field) ----

function renderStyledInputSegments(
  text: string,
  mentions: MentionRecord[],
  isDark: boolean
) {
  if (!text || mentions.length === 0) return null;

  // Find mention positions in the text
  const positions: { start: number; end: number }[] = [];
  for (const m of mentions) {
    const pattern = `${m.trigger}${m.displayName}`;
    const idx = text.indexOf(pattern);
    if (idx !== -1) positions.push({ start: idx, end: idx + pattern.length });
  }
  positions.sort((a, b) => a.start - b.start);

  if (positions.length === 0) return null;

  const segments: React.ReactNode[] = [];
  let lastIdx = 0;
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i];
    if (pos.start > lastIdx) {
      segments.push(
        <Text key={`t${i}`} style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}>
          {text.slice(lastIdx, pos.start)}
        </Text>
      );
    }
    segments.push(
      <Text
        key={`m${i}`}
        style={{
          color: "#0d9488",
          fontFamily: "Inter_600SemiBold",
        }}
      >
        {text.slice(pos.start, pos.end)}
      </Text>
    );
    lastIdx = pos.end;
  }
  if (lastIdx < text.length) {
    segments.push(
      <Text key="tail" style={{ color: isDark ? "#f1f5f9" : "#0f172a" }}>
        {text.slice(lastIdx)}
      </Text>
    );
  }
  return segments;
}

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
  previousMessage?: ChatMessage;
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
    previousMessage,
  }: MessageItemProps) {
    const isUser = item.role === "user";
    const position = getBubblePosition(allMessages, index);
    const showAvatar = !isUser && (position === "last" || position === "only");

    // B31: Vertical spacing based on grouping
    const verticalPadding = position === "middle" ? "py-0.5" : "py-1.5";

    // B31: Border radius adjustments for grouped bubbles
    const getBubbleClasses = () => {
      if (isUser) {
        const base = "bg-primary rounded-2xl";
        if (position === "only" || position === "last") return `${base} rounded-br-md`;
        return base;
      }
      const base = "bg-card border border-border rounded-2xl";
      if (position === "only" || position === "last") return `${base} rounded-bl-md`;
      return base;
    };

    // B26: Timestamp
    const showTs = shouldShowTimestamp(item, previousMessage);
    const timeStr = item.createdAt ? formatMessageTime(item.createdAt) : "";

    return (
      <>
        {/* B26: Timestamp separator */}
        {showTs && timeStr ? (
          <View className="items-center py-2">
            <Text className="text-[10px] text-muted-foreground font-sans">
              {timeStr}
            </Text>
          </View>
        ) : null}

        <View
          className={cn("px-4", verticalPadding, isUser ? "items-end" : "items-start")}
          accessibilityLabel={item.content || undefined}
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
                  <View className="w-7 h-7 rounded-full bg-primary/10 items-center justify-center">
                    <Bot size={14} color="#0d9488" />
                  </View>
                )}
              </View>
            )}
            <View className="flex-shrink">
              {/* Image attachment */}
              {item.imageUri && (
                <View className="rounded-2xl overflow-hidden mb-1" style={{ width: 200, height: 150 }}>
                  <Image
                    source={{ uri: item.imageUri }}
                    style={{ width: "100%", height: "100%" }}
                    contentFit="cover"
                  />
                </View>
              )}
              {/* Only render bubble if there is content */}
              {item.content ? (
                <Pressable
                  onLongPress={onCopy ? () => onCopy(item.content) : undefined}
                >
                  <View className={cn(getBubbleClasses(), "px-4 py-3")}>
                    <Text
                      className={cn(
                        "text-sm font-sans leading-5",
                        isUser ? "text-primary-foreground" : "text-foreground"
                      )}
                    >
                      {parseMentionsForDisplay(item.content).map((seg, i) =>
                        seg.type === "mention" ? (
                          <Text
                            key={i}
                            style={{
                              color: isUser ? "#ccfbf1" : "#0d9488",
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
                  </View>
                </Pressable>
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
        </View>
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
    prevProps.messages[prevProps.index + 1]?.role === nextProps.messages[nextProps.index + 1]?.role
);

// ---- Component ----

export default function ChatScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const isDark = useColorScheme() === "dark";
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
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(-1);
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
      };

      safeSetMessages((prev) => [...prev, userMessage]);
      setInput("");
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
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, actionHandled: true } : m
        )
      );
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

  // H2: Smart scroll — only auto-scroll if user is near bottom
  const handleScroll = useCallback((e: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const distanceFromBottom =
      contentSize.height - contentOffset.y - layoutMeasurement.height;
    isNearBottomRef.current = distanceFromBottom < 100;
  }, []);

  const handleContentSizeChange = useCallback(() => {
    if (isNearBottomRef.current) {
      listRef.current?.scrollToEnd({ animated: true });
    }
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
        previousMessage={index > 0 ? messages[index - 1] : undefined}
      />
    ),
    [messages, isDark, loading, handleRetry, handleSelectGroup, handleConfirmExpense, handleEditExpense, handleConfirmCreateGroup, handleFollowUp, handleCopyMessage]
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
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
        <Pressable
          onPress={goBack}
          accessibilityLabel="Go back"
          accessibilityRole="button"
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ArrowLeft size={24} color={isDark ? "#f1f5f9" : "#0f172a"} />
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

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
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

        {/* Input */}
        <View className={`flex-row items-end gap-2 px-4 py-3 ${!pendingImage ? "border-t border-border" : ""} bg-background`}>
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
          <View style={{ flex: 1, position: "relative" }}>
            {/* Styled mention overlay (web: colored @mentions in input) */}
            {mentions.length > 0 && Platform.OS === "web" && (
              <View
                // @ts-ignore — pointerEvents style prop works on web
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  zIndex: 1,
                  pointerEvents: "none",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    lineHeight: 20,
                    fontFamily: "Inter_400Regular",
                  }}
                >
                  {renderStyledInputSegments(input, mentions, isDark)}
                </Text>
              </View>
            )}
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
              placeholderTextColor="#94a3b8"
              multiline
              maxLength={500}
              editable={!isQuotaExceeded && isConnected}
              className="bg-muted rounded-2xl px-4 py-3 text-base text-foreground font-sans max-h-24"
              style={
                mentions.length > 0 && Platform.OS === "web"
                  ? { color: "transparent", caretColor: isDark ? "#f1f5f9" : "#0f172a" } as any
                  : undefined
              }
              onSubmitEditing={() => handleSend()}
              accessibilityLabel="Chat message input"
            />
          </View>
          <Pressable
            onPress={() => handleSend()}
            disabled={(!input.trim() && !pendingImage) || loading || isQuotaExceeded || !isConnected}
            accessibilityLabel="Send message"
            accessibilityRole="button"
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor:
                (input.trim() || pendingImage) && !loading && !isQuotaExceeded && isConnected
                  ? "#0d9488"
                  : (isDark ? "#334155" : "#f1f5f9"),
            }}
          >
            <Send
              size={18}
              color={
                (input.trim() || pendingImage) && !loading && !isQuotaExceeded && isConnected
                  ? "#ffffff"
                  : "#94a3b8"
              }
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
