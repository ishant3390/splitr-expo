import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Linking } from "react-native";
import HelpSupportScreen from "@/app/help-support";

jest.mock("@/components/ui/accordion-item", () => {
  const { View, Text, Pressable } = require("react-native");
  const MockReact = require("react");
  return {
    AccordionItem: ({ title, children, expanded, onToggle }: any) =>
      MockReact.createElement(View, null,
        MockReact.createElement(Pressable, { onPress: onToggle },
          MockReact.createElement(Text, null, title)
        ),
        expanded ? MockReact.createElement(Text, null, children) : null
      ),
  };
});

describe("HelpSupportScreen", () => {
  it("renders the header", () => {
    render(<HelpSupportScreen />);
    expect(screen.getByText("Help & Support")).toBeTruthy();
  });

  it("renders FAQ section title", () => {
    render(<HelpSupportScreen />);
    expect(screen.getByText("Frequently Asked Questions")).toBeTruthy();
  });

  it("renders all FAQ questions", () => {
    render(<HelpSupportScreen />);
    expect(screen.getByText("How do I split an expense?")).toBeTruthy();
    expect(screen.getByText("How do I settle up with someone?")).toBeTruthy();
    expect(screen.getByText("How do I invite friends to a group?")).toBeTruthy();
    expect(screen.getByText("Can I use Splitr offline?")).toBeTruthy();
    expect(screen.getByText("How are balances calculated?")).toBeTruthy();
    expect(screen.getByText("Can I edit or delete an expense?")).toBeTruthy();
  });

  it("expands FAQ item on press", () => {
    render(<HelpSupportScreen />);
    fireEvent.press(screen.getByText("How do I split an expense?"));
    expect(
      screen.getByText(/Tap the \+ button at the bottom/)
    ).toBeTruthy();
  });

  it("collapses FAQ item when pressed again", () => {
    render(<HelpSupportScreen />);
    fireEvent.press(screen.getByText("How do I split an expense?"));
    expect(screen.getByText(/Tap the \+ button at the bottom/)).toBeTruthy();

    fireEvent.press(screen.getByText("How do I split an expense?"));
    expect(screen.queryByText(/Tap the \+ button at the bottom/)).toBeNull();
  });

  it("renders contact section", () => {
    render(<HelpSupportScreen />);
    expect(screen.getByText("Get in Touch")).toBeTruthy();
    expect(screen.getByText("Email Support")).toBeTruthy();
    expect(screen.getByText("support@splitr.ai")).toBeTruthy();
    expect(screen.getByText("Visit Website")).toBeTruthy();
    expect(screen.getByText("splitr.ai")).toBeTruthy();
  });

  it("renders rate us section", () => {
    render(<HelpSupportScreen />);
    expect(screen.getByText("Enjoying Splitr?")).toBeTruthy();
    expect(screen.getByText("Rate 5 Stars")).toBeTruthy();
  });

  it("renders app version info", () => {
    render(<HelpSupportScreen />);
    expect(screen.getByText(/Splitr v/)).toBeTruthy();
    expect(screen.getByText("Made with care in India")).toBeTruthy();
  });

  it("opens email support link when Email Support is pressed", () => {
    const spy = jest.spyOn(Linking, "openURL").mockImplementation(() => Promise.resolve(true));
    render(<HelpSupportScreen />);
    fireEvent.press(screen.getByText("Email Support"));
    expect(spy).toHaveBeenCalledWith("mailto:support@splitr.ai");
    spy.mockRestore();
  });

  it("opens website link when Visit Website is pressed", () => {
    const spy = jest.spyOn(Linking, "openURL").mockImplementation(() => Promise.resolve(true));
    render(<HelpSupportScreen />);
    fireEvent.press(screen.getByText("Visit Website"));
    expect(spy).toHaveBeenCalledWith("https://splitr.ai");
    spy.mockRestore();
  });

  it("handles Rate 5 Stars button press", () => {
    render(<HelpSupportScreen />);
    fireEvent.press(screen.getByText("Rate 5 Stars"));
    // No crash — hapticLight is called internally
  });

  it("expands a different FAQ and collapses previous", () => {
    render(<HelpSupportScreen />);
    fireEvent.press(screen.getByText("How do I split an expense?"));
    expect(screen.getByText(/Tap the \+ button at the bottom/)).toBeTruthy();

    fireEvent.press(screen.getByText("How do I settle up with someone?"));
    // Previous FAQ should be collapsed
    expect(screen.queryByText(/Tap the \+ button at the bottom/)).toBeNull();
    expect(screen.getByText(/Go to a group, tap 'Settle Up'/)).toBeTruthy();
  });

  it("renders all FAQ answers when expanded", () => {
    render(<HelpSupportScreen />);
    // Expand each FAQ and verify answer
    fireEvent.press(screen.getByText("Can I use Splitr offline?"));
    expect(screen.getByText(/If you're offline, your expenses are saved locally/)).toBeTruthy();

    fireEvent.press(screen.getByText("How are balances calculated?"));
    expect(screen.getByText(/Splitr tracks who paid/)).toBeTruthy();

    fireEvent.press(screen.getByText("Can I edit or delete an expense?"));
    expect(screen.getByText(/Tap any expense in a group/)).toBeTruthy();
  });

  it("renders the Splitr logo icon", () => {
    render(<HelpSupportScreen />);
    expect(screen.getByText("S")).toBeTruthy();
  });

  it("renders rate us description", () => {
    render(<HelpSupportScreen />);
    expect(screen.getByText("Rate us on the App Store to help others discover Splitr")).toBeTruthy();
  });
});
