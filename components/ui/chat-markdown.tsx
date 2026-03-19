import React from "react";
import { View, Text } from "react-native";
import { useColorScheme } from "nativewind";
import { colors, fontSize as fs, fontFamily as ff, radius, palette } from "@/lib/tokens";

interface ChatMarkdownProps {
  content: string;
  isUser?: boolean;
}

type InlineSegment =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "code"; value: string }
  | { type: "mention"; trigger: string; value: string };

function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  // Combined regex: code, bold, italic, @mention, #mention
  const regex = /`([^`]+)`|\*\*(.+?)\*\*|\*(.+?)\*|(@\w[\w\s]*?)(?=\s[@#*`]|\s*$|[,.])|(?<=#)([\w\s]+?)(?=\s[@#*`]|\s*$|[,.])/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Simpler approach: handle code, bold, italic only (mentions handled separately)
  const inlineRegex = /`([^`]+)`|\*\*(.+?)\*\*|\*(.+?)\*/g;

  while ((match = inlineRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ type: "code", value: match[1] });
    } else if (match[2] !== undefined) {
      segments.push({ type: "bold", value: match[2] });
    } else if (match[3] !== undefined) {
      segments.push({ type: "italic", value: match[3] });
    }
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: text }];
}

type BlockElement =
  | { type: "paragraph"; content: string }
  | { type: "code_block"; content: string }
  | { type: "bullet"; content: string }
  | { type: "numbered"; number: string; content: string };

function parseBlocks(content: string): BlockElement[] {
  const blocks: BlockElement[] = [];
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block (```)
    if (line.trimStart().startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ type: "code_block", content: codeLines.join("\n") });
      i++; // skip closing ```
      continue;
    }

    // Bullet list (- or *)
    const bulletMatch = line.match(/^(\s*[-*])\s+(.+)/);
    if (bulletMatch) {
      blocks.push({ type: "bullet", content: bulletMatch[2] });
      i++;
      continue;
    }

    // Numbered list
    const numMatch = line.match(/^(\s*\d+)[.)]\s+(.+)/);
    if (numMatch) {
      blocks.push({ type: "numbered", number: numMatch[1], content: numMatch[2] });
      i++;
      continue;
    }

    // Empty line — skip
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Regular paragraph
    blocks.push({ type: "paragraph", content: line });
    i++;
  }

  return blocks;
}

function InlineRenderer({
  segments,
  isUser,
  isDark,
}: {
  segments: InlineSegment[];
  isUser: boolean;
  isDark: boolean;
}) {
  const c = colors(isDark);
  const textColor = isUser ? palette.white : c.foreground;
  const codeColor = isUser ? "rgba(255,255,255,0.15)" : c.muted;

  return (
    <>
      {segments.map((seg, i) => {
        switch (seg.type) {
          case "bold":
            return (
              <Text key={i} style={{ fontFamily: ff.bold, color: textColor }}>
                {seg.value}
              </Text>
            );
          case "italic":
            return (
              <Text key={i} style={{ fontStyle: "italic", color: textColor }}>
                {seg.value}
              </Text>
            );
          case "code":
            return (
              <Text
                key={i}
                style={{
                  fontFamily: "monospace",
                  fontSize: fs.base,
                  backgroundColor: codeColor,
                  color: isUser ? palette.teal100 : c.primary,
                  borderRadius: 3,
                  paddingHorizontal: 4,
                }}
              >
                {seg.value}
              </Text>
            );
          default:
            return (
              <Text key={i} style={{ color: textColor }}>
                {seg.value}
              </Text>
            );
        }
      })}
    </>
  );
}

export function ChatMarkdown({ content, isUser = false }: ChatMarkdownProps) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const c = colors(isDark);
  const blocks = parseBlocks(content);
  const textColor = isUser ? palette.white : c.foreground;
  const codeBlockBg = isUser ? "rgba(255,255,255,0.1)" : c.secondary;
  const mutedColor = c.mutedForeground;

  // Simple content (no blocks, single paragraph) — render inline only
  if (blocks.length === 1 && blocks[0].type === "paragraph") {
    const segments = parseInline(blocks[0].content);
    const hasFormatting = segments.some((s) => s.type !== "text");
    if (!hasFormatting) return null; // Let the default renderer handle plain text
    return (
      <Text style={{ fontSize: fs.md, lineHeight: 20, fontFamily: ff.regular }}>
        <InlineRenderer segments={segments} isUser={isUser} isDark={isDark} />
      </Text>
    );
  }

  // Multi-block content — render with proper spacing
  return (
    <View style={{ gap: 4 }}>
      {blocks.map((block, i) => {
        switch (block.type) {
          case "code_block":
            return (
              <View
                key={i}
                style={{
                  backgroundColor: codeBlockBg,
                  borderRadius: radius.md,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  marginVertical: 2,
                }}
              >
                <Text
                  style={{
                    fontFamily: "monospace",
                    fontSize: fs.sm,
                    lineHeight: 18,
                    color: isUser ? palette.teal100 : isDark ? palette.slate200 : palette.slate700,
                  }}
                >
                  {block.content}
                </Text>
              </View>
            );

          case "bullet":
            return (
              <View key={i} style={{ flexDirection: "row", paddingLeft: 4, gap: 6 }}>
                <Text style={{ color: mutedColor, fontSize: fs.md, lineHeight: 20 }}>
                  {"\u2022"}
                </Text>
                <Text
                  style={{
                    flex: 1,
                    fontSize: fs.md,
                    lineHeight: 20,
                    fontFamily: ff.regular,
                  }}
                >
                  <InlineRenderer
                    segments={parseInline(block.content)}
                    isUser={isUser}
                    isDark={isDark}
                  />
                </Text>
              </View>
            );

          case "numbered":
            return (
              <View key={i} style={{ flexDirection: "row", paddingLeft: 4, gap: 6 }}>
                <Text
                  style={{
                    color: mutedColor,
                    fontSize: fs.md,
                    lineHeight: 20,
                    fontFamily: ff.medium,
                    minWidth: 16,
                  }}
                >
                  {block.number}.
                </Text>
                <Text
                  style={{
                    flex: 1,
                    fontSize: fs.md,
                    lineHeight: 20,
                    fontFamily: ff.regular,
                  }}
                >
                  <InlineRenderer
                    segments={parseInline(block.content)}
                    isUser={isUser}
                    isDark={isDark}
                  />
                </Text>
              </View>
            );

          case "paragraph":
          default:
            return (
              <Text
                key={i}
                style={{
                  fontSize: fs.md,
                  lineHeight: 20,
                  fontFamily: ff.regular,
                  color: textColor,
                }}
              >
                <InlineRenderer
                  segments={parseInline(block.content)}
                  isUser={isUser}
                  isDark={isDark}
                />
              </Text>
            );
        }
      })}
    </View>
  );
}
