import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { AvatarStrip } from "@/components/ui/avatar-strip";

jest.mock("@/components/ui/avatar", () => {
  const RN = require("react-native");
  const R = require("react");
  return {
    Avatar: ({ fallback }: any) => R.createElement(RN.Text, { testID: "avatar" }, fallback),
  };
});

const makeMembers = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `m${i}`,
    user: { id: `u${i}`, name: `User ${i}`, email: `user${i}@test.com`, avatarUrl: null },
    guestUser: null,
    displayName: `User ${i}`,
    balance: 0,
  }));

describe("AvatarStrip", () => {
  it("renders correct number of avatars", () => {
    render(<AvatarStrip members={makeMembers(3)} />);
    const avatars = screen.getAllByTestId("avatar");
    expect(avatars).toHaveLength(3);
  });

  it("limits visible avatars to maxVisible", () => {
    render(<AvatarStrip members={makeMembers(8)} maxVisible={5} />);
    const avatars = screen.getAllByTestId("avatar");
    expect(avatars).toHaveLength(5);
  });

  it("shows +N overflow pill when exceeding maxVisible", () => {
    render(<AvatarStrip members={makeMembers(8)} maxVisible={5} />);
    expect(screen.getByText("+3")).toBeTruthy();
  });

  it("does not show overflow pill when within maxVisible", () => {
    render(<AvatarStrip members={makeMembers(3)} maxVisible={5} />);
    expect(screen.queryByText(/^\+/)).toBeNull();
  });

  it("calls onPress when tapped", () => {
    const onPress = jest.fn();
    render(<AvatarStrip members={makeMembers(3)} onPress={onPress} />);
    fireEvent.press(screen.getByLabelText("3 members"));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it("handles empty members array", () => {
    render(<AvatarStrip members={[]} />);
    expect(screen.queryByTestId("avatar")).toBeNull();
    expect(screen.queryByText(/^\+/)).toBeNull();
  });

  it("renders guest member names", () => {
    const members = [
      { id: "m1", user: null, guestUser: { id: "g1", name: "Guest Bob" }, displayName: "Guest Bob", balance: 0 },
    ];
    render(<AvatarStrip members={members as any} />);
    expect(screen.getByText("GB")).toBeTruthy();
  });

  it("uses displayName as fallback", () => {
    const members = [
      { id: "m1", user: null, guestUser: null, displayName: "Custom Name", balance: 0 },
    ];
    render(<AvatarStrip members={members as any} />);
    expect(screen.getByText("CN")).toBeTruthy();
  });

  it("does not wrap in Pressable when onPress is not provided", () => {
    render(<AvatarStrip members={makeMembers(3)} />);
    expect(screen.queryByLabelText("3 members")).toBeNull();
  });
});
