import React from "react";
import { render, screen } from "@testing-library/react-native";
import { ChatMarkdown } from "@/components/ui/chat-markdown";

describe("ChatMarkdown", () => {
  it("returns null for plain text without formatting", () => {
    const { toJSON } = render(<ChatMarkdown content="Hello world" />);
    expect(toJSON()).toBeNull();
  });

  it("renders bold text with bold font", () => {
    const { toJSON } = render(<ChatMarkdown content="Hello **world**" />);
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain("world");
    expect(tree).toContain("Inter_700Bold");
  });

  it("renders italic text", () => {
    const { toJSON } = render(<ChatMarkdown content="Hello *world*" />);
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain("world");
    expect(tree).toContain("italic");
  });

  it("renders inline code with monospace font", () => {
    const { toJSON } = render(<ChatMarkdown content="Use `formatCents()` here" />);
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain("formatCents()");
    expect(tree).toContain("monospace");
  });

  it("renders bullet lists with bullet character", () => {
    const content = ["Items:", "- Apple", "- Banana"].join("\n");
    render(<ChatMarkdown content={content} />);
    const bullets = screen.getAllByText("\u2022");
    expect(bullets.length).toBe(2);
  });

  it("renders numbered lists", () => {
    const content = ["Steps:", "1. First", "2. Second"].join("\n");
    const { toJSON } = render(<ChatMarkdown content={content} />);
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain("First");
    expect(tree).toContain("Second");
    expect(screen.getByText("1.")).toBeTruthy();
    expect(screen.getByText("2.")).toBeTruthy();
  });

  it("renders code blocks with monospace font", () => {
    const content = ["Example:", "```", "const x = 1;", "```"].join("\n");
    render(<ChatMarkdown content={content} />);
    expect(screen.getByText("const x = 1;")).toBeTruthy();
  });

  it("renders mixed inline formatting", () => {
    const { toJSON } = render(
      <ChatMarkdown content="**Bold** and *italic* and `code`" />
    );
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain("Bold");
    expect(tree).toContain("Inter_700Bold");
    expect(tree).toContain("italic");
    expect(tree).toContain("code");
    expect(tree).toContain("monospace");
  });

  it("renders multi-block content", () => {
    const content = ["Summary:", "- **Dinner**: $50", "- **Lunch**: $30"].join("\n");
    const { toJSON } = render(<ChatMarkdown content={content} />);
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain("Dinner");
    expect(tree).toContain("$50");
    expect(tree).toContain("Lunch");
    expect(tree).toContain("$30");
  });

  it("uses user colors when isUser is true", () => {
    const { toJSON } = render(<ChatMarkdown content="Hello **world**" isUser />);
    const tree = JSON.stringify(toJSON());
    expect(tree).toContain("world");
    expect(tree).toContain("#ffffff");
  });

  it("skips empty lines between blocks", () => {
    const content = "Heading\n\n- Item one\n\n- Item two";
    render(<ChatMarkdown content={content} />);
    const bullets = screen.getAllByText("\u2022");
    expect(bullets.length).toBe(2);
    expect(screen.getByText("Heading")).toBeTruthy();
  });
});
