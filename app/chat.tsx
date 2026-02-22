import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Send,
  Bot,
  User,
  Users,
  Plus,
  CheckCircle2,
  Loader2,
} from "lucide-react-native";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { chatStream } from "@/lib/api";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolResults?: Array<{ toolName: string; result: any }>;
}

const suggestedPrompts = [
  "Split $50 for dinner with Sarah and Mike",
  "Add $120 hotel expense for the beach trip",
  "Split $30 cab fare with Alex and Jordan",
];

export default function ChatScreen() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I'm your Splitr assistant. Tell me about an expense you'd like to split and I'll handle the rest. For example: \"Split $50 for dinner with Sarah and Mike\"",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList>(null);

  const handleSend = useCallback(
    (text?: string) => {
      const messageText = text || input.trim();
      if (!messageText || loading) return;

      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: messageText,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setLoading(true);

      let assistantContent = "";
      const toolResults: ChatMessage["toolResults"] = [];

      const allMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      chatStream(
        allMessages,
        (chunk) => {
          if (chunk.type === "text") {
            assistantContent += chunk.content;
            setMessages((prev) => {
              const existing = prev.find((m) => m.id === "streaming");
              if (existing) {
                return prev.map((m) =>
                  m.id === "streaming" ? { ...m, content: assistantContent } : m
                );
              }
              return [
                ...prev,
                {
                  id: "streaming",
                  role: "assistant",
                  content: assistantContent,
                },
              ];
            });
          } else if (chunk.type === "tool_result") {
            toolResults.push({
              toolName: chunk.toolName,
              result: chunk.result,
            });
            setMessages((prev) => {
              const streaming = prev.find((m) => m.id === "streaming");
              if (streaming) {
                return prev.map((m) =>
                  m.id === "streaming" ? { ...m, toolResults: [...toolResults] } : m
                );
              }
              return [
                ...prev,
                {
                  id: "streaming",
                  role: "assistant",
                  content: assistantContent,
                  toolResults: [...toolResults],
                },
              ];
            });
          }
        },
        () => {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === "streaming"
                ? { ...m, id: `assistant-${Date.now()}` }
                : m
            )
          );
          setLoading(false);
        },
        (err) => {
          setMessages((prev) => [
            ...prev.filter((m) => m.id !== "streaming"),
            {
              id: `error-${Date.now()}`,
              role: "assistant",
              content: "Sorry, something went wrong. Please try again.",
            },
          ]);
          setLoading(false);
        }
      );
    },
    [input, loading, messages]
  );

  const renderToolResult = (toolName: string, result: any) => {
    if (!result) return null;

    if (toolName === "searchGroups") {
      if (result?.found) {
        return (
          <View className="mt-2 gap-2">
            <View className="flex-row items-center gap-2">
              <Users size={14} color="#64748b" />
              <Text className="text-xs text-muted-foreground font-sans">
                Found {result.matchCount} group{result.matchCount > 1 ? "s" : ""}
              </Text>
            </View>
            {result.groups?.map((group: any, idx: number) => (
              <Card key={group.id} className="p-3 bg-secondary/50 border-primary/20">
                <View className="flex-row items-center gap-2">
                  <View className="w-6 h-6 rounded-full bg-primary items-center justify-center">
                    <Text className="text-xs font-sans-bold text-primary-foreground">
                      {idx + 1}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-sm font-sans-medium text-foreground">
                      {group.name}
                    </Text>
                    <Text className="text-xs text-muted-foreground font-sans">
                      {group.members?.join(", ")}
                    </Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        );
      }
      return (
        <Card className="mt-2 p-3 bg-muted/50">
          <View className="flex-row items-center gap-2">
            <Users size={14} color="#64748b" />
            <Text className="text-xs text-muted-foreground font-sans">
              No groups found with: {result?.searchedMembers?.join(", ")}
            </Text>
          </View>
        </Card>
      );
    }

    if (toolName === "createGroup" && result?.success) {
      return (
        <Card className="mt-2 p-3 bg-accent/10 border-accent/30">
          <View className="flex-row items-center gap-2 mb-1">
            <Plus size={14} color="#0d9488" />
            <Text className="text-sm font-sans-medium text-foreground">
              New Group Created
            </Text>
          </View>
          <Text className="text-xs text-muted-foreground font-sans">
            {result.group?.name} - {result.group?.members?.join(", ")}
          </Text>
        </Card>
      );
    }

    if (toolName === "createExpense" && result?.success) {
      return (
        <Card className="mt-2 p-4 bg-success/10 border-success/30">
          <View className="flex-row items-center gap-2 mb-2">
            <CheckCircle2 size={18} color="#10b981" />
            <Text className="text-sm font-sans-semibold text-foreground">
              Expense Added!
            </Text>
          </View>
          <View className="gap-1.5">
            <View className="flex-row justify-between">
              <Text className="text-xs text-muted-foreground font-sans">Total</Text>
              <Text className="text-xs font-sans-semibold text-foreground">
                ${result.expense?.amount?.toFixed(2)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-muted-foreground font-sans">Per person</Text>
              <Text className="text-xs font-sans-semibold text-foreground">
                ${result.expense?.perPersonAmount?.toFixed(2)}
              </Text>
            </View>
            <View className="flex-row justify-between">
              <Text className="text-xs text-muted-foreground font-sans">Group</Text>
              <Text className="text-xs font-sans-semibold text-foreground">
                {result.expense?.groupName}
              </Text>
            </View>
          </View>
        </Card>
      );
    }

    return null;
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === "user";

    return (
      <View className={`px-4 py-1.5 ${isUser ? "items-end" : "items-start"}`}>
        <View className="flex-row items-start gap-2 max-w-[85%]">
          {!isUser && (
            <View className="w-7 h-7 rounded-full bg-primary/10 items-center justify-center mt-1">
              <Bot size={14} color="#0d9488" />
            </View>
          )}
          <View
            className={`rounded-2xl px-4 py-3 flex-shrink ${
              isUser
                ? "bg-primary rounded-br-md"
                : "bg-card border border-border rounded-bl-md"
            }`}
          >
            <Text
              className={`text-sm font-sans leading-5 ${
                isUser ? "text-primary-foreground" : "text-foreground"
              }`}
            >
              {item.content}
            </Text>
            {item.toolResults?.map((tr, idx) => (
              <View key={idx}>{renderToolResult(tr.toolName, tr.result)}</View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      {/* Header */}
      <View className="flex-row items-center gap-3 px-4 py-3 border-b border-border">
        <Button variant="ghost" size="icon" onPress={() => router.back()}>
          <ArrowLeft size={24} color="#0f172a" />
        </Button>
        <View className="w-9 h-9 rounded-full bg-primary/10 items-center justify-center">
          <Bot size={20} color="#0d9488" />
        </View>
        <View className="flex-1">
          <Text className="text-base font-sans-semibold text-foreground">
            Split Assistant
          </Text>
          <Text className="text-xs text-muted-foreground font-sans">
            Powered by AI
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerClassName="py-4"
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={
            loading ? (
              <View className="px-4 py-2 items-start">
                <View className="flex-row items-center gap-2 bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
                  <ActivityIndicator size="small" color="#0d9488" />
                  <Text className="text-sm text-muted-foreground font-sans">Thinking...</Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* Suggested prompts */}
        {messages.length <= 1 && (
          <View className="px-4 pb-2 gap-2">
            {suggestedPrompts.map((prompt, idx) => (
              <Pressable
                key={idx}
                onPress={() => handleSend(prompt)}
                className="border border-border rounded-xl px-4 py-3 bg-card"
              >
                <Text className="text-sm text-foreground font-sans">{prompt}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {/* Input */}
        <View className="flex-row items-end gap-2 px-4 py-3 border-t border-border bg-background">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            placeholderTextColor="#94a3b8"
            multiline
            className="flex-1 bg-muted rounded-2xl px-4 py-3 text-base text-foreground font-sans max-h-24"
            onSubmitEditing={() => handleSend()}
          />
          <Pressable
            onPress={() => handleSend()}
            disabled={!input.trim() || loading}
            className={`w-11 h-11 rounded-full items-center justify-center ${
              input.trim() && !loading ? "bg-primary" : "bg-muted"
            }`}
          >
            <Send size={18} color={input.trim() && !loading ? "#ffffff" : "#94a3b8"} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
