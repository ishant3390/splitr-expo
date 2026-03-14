import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { MentionDropdown } from "@/components/ui/mention-dropdown";
import type { ContactDto, GroupDto } from "@/lib/types";

const mockContacts: ContactDto[] = [
  { userId: "u1", name: "Alice Smith", email: "alice@test.com", isGuest: false },
  { userId: "u2", name: "Bob Jones", email: "bob@test.com", isGuest: false },
  { guestUserId: "g1", name: "Charlie Guest", isGuest: true },
];

const mockGroups: GroupDto[] = [
  { id: "gr1", name: "Trip to Paris", emoji: "✈️", memberCount: 4 } as GroupDto,
  { id: "gr2", name: "Roommates", memberCount: 1 } as GroupDto,
  { id: "gr3", name: "Work Lunch" } as GroupDto,
];

describe("MentionDropdown", () => {
  const onSelect = jest.fn();

  beforeEach(() => jest.clearAllMocks());

  // --- visibility ---
  it("returns null when not visible", () => {
    const { toJSON } = render(
      <MentionDropdown type="@" contacts={mockContacts} onSelect={onSelect} visible={false} />
    );
    expect(toJSON()).toBeNull();
  });

  // --- contacts rendering ---
  it("renders contact list with names and emails", () => {
    render(
      <MentionDropdown type="@" contacts={mockContacts} onSelect={onSelect} visible={true} />
    );
    expect(screen.getByText("Alice Smith")).toBeTruthy();
    expect(screen.getByText("alice@test.com")).toBeTruthy();
    expect(screen.getByText("Bob Jones")).toBeTruthy();
    expect(screen.getByText("Charlie Guest")).toBeTruthy();
  });

  it("shows Guest badge for guest contacts", () => {
    render(
      <MentionDropdown type="@" contacts={mockContacts} onSelect={onSelect} visible={true} />
    );
    expect(screen.getByText("Guest")).toBeTruthy();
  });

  it("shows People header for @ type", () => {
    render(
      <MentionDropdown type="@" contacts={mockContacts} onSelect={onSelect} visible={true} />
    );
    expect(screen.getByText("People")).toBeTruthy();
  });

  it("calls onSelect when a contact is pressed", () => {
    render(
      <MentionDropdown type="@" contacts={mockContacts} onSelect={onSelect} visible={true} />
    );
    fireEvent.press(screen.getByLabelText("Mention Alice Smith"));
    expect(onSelect).toHaveBeenCalledWith(mockContacts[0]);
  });

  // --- groups rendering ---
  it("renders group list with names and member counts", () => {
    render(
      <MentionDropdown type="#" groups={mockGroups} onSelect={onSelect} visible={true} />
    );
    expect(screen.getByText("Trip to Paris")).toBeTruthy();
    expect(screen.getByText("4 members")).toBeTruthy();
    expect(screen.getByText("Roommates")).toBeTruthy();
    expect(screen.getByText("1 member")).toBeTruthy();
  });

  it("shows Groups header for # type", () => {
    render(
      <MentionDropdown type="#" groups={mockGroups} onSelect={onSelect} visible={true} />
    );
    expect(screen.getByText("Groups")).toBeTruthy();
  });

  it("shows emoji for groups that have one", () => {
    render(
      <MentionDropdown type="#" groups={mockGroups} onSelect={onSelect} visible={true} />
    );
    expect(screen.getByText("✈️")).toBeTruthy();
  });

  it("shows first letter when group has no emoji", () => {
    render(
      <MentionDropdown type="#" groups={[{ id: "g1", name: "Zephyr" } as GroupDto]} onSelect={onSelect} visible={true} />
    );
    expect(screen.getByText("Z")).toBeTruthy();
  });

  it("calls onSelect when a group is pressed", () => {
    render(
      <MentionDropdown type="#" groups={mockGroups} onSelect={onSelect} visible={true} />
    );
    fireEvent.press(screen.getByLabelText("Mention group Trip to Paris"));
    expect(onSelect).toHaveBeenCalledWith(mockGroups[0]);
  });

  // --- empty state ---
  it("shows 'No contacts found' when contacts is empty and type is @", () => {
    render(
      <MentionDropdown type="@" contacts={[]} onSelect={onSelect} visible={true} />
    );
    expect(screen.getByText("No contacts found")).toBeTruthy();
  });

  it("shows 'No groups found' when groups is empty and type is #", () => {
    render(
      <MentionDropdown type="#" groups={[]} onSelect={onSelect} visible={true} />
    );
    expect(screen.getByText("No groups found")).toBeTruthy();
  });

  it("shows loading indicator in empty state when isLoading", () => {
    const { toJSON } = render(
      <MentionDropdown type="@" contacts={[]} onSelect={onSelect} visible={true} isLoading={true} />
    );
    // Should not show "No contacts found" while loading
    expect(screen.queryByText("No contacts found")).toBeNull();
    // Component should render (not null)
    expect(toJSON()).not.toBeNull();
  });

  // --- selectedIndex ---
  it("renders with selectedIndex highlighting", () => {
    render(
      <MentionDropdown type="@" contacts={mockContacts} onSelect={onSelect} visible={true} selectedIndex={0} />
    );
    // Renders without crashing and contact is still there
    expect(screen.getByText("Alice Smith")).toBeTruthy();
  });

  // --- undefined data defaults to empty array ---
  it("handles undefined contacts gracefully", () => {
    render(
      <MentionDropdown type="@" onSelect={onSelect} visible={true} />
    );
    expect(screen.getByText("No contacts found")).toBeTruthy();
  });

  it("handles undefined groups gracefully", () => {
    render(
      <MentionDropdown type="#" onSelect={onSelect} visible={true} />
    );
    expect(screen.getByText("No groups found")).toBeTruthy();
  });

  // --- contact without email ---
  it("does not render email when contact has no email", () => {
    const noEmailContacts: ContactDto[] = [
      { userId: "u1", name: "NoEmail Person", isGuest: false },
    ];
    render(
      <MentionDropdown type="@" contacts={noEmailContacts} onSelect={onSelect} visible={true} />
    );
    expect(screen.getByText("NoEmail Person")).toBeTruthy();
    // No email text
    expect(screen.queryByText("@")).toBeNull();
  });

  // --- group without memberCount ---
  it("does not render member count when group has no memberCount", () => {
    render(
      <MentionDropdown type="#" groups={[{ id: "g1", name: "NoCount" } as GroupDto]} onSelect={onSelect} visible={true} />
    );
    expect(screen.getByText("NoCount")).toBeTruthy();
    expect(screen.queryByText(/member/)).toBeNull();
  });

  // --- branch coverage: selectedIndex on groups ---
  it("renders with selectedIndex highlighting on groups", () => {
    render(
      <MentionDropdown type="#" groups={mockGroups} onSelect={onSelect} visible={true} selectedIndex={1} />
    );
    expect(screen.getByText("Roommates")).toBeTruthy();
  });

  // --- branch coverage: singular member count ---
  it("shows singular 'member' for memberCount=1", () => {
    const singleMemberGroups: GroupDto[] = [
      { id: "gr1", name: "Solo Group", memberCount: 1 } as GroupDto,
    ];
    render(
      <MentionDropdown type="#" groups={singleMemberGroups} onSelect={onSelect} visible={true} />
    );
    expect(screen.getByText("1 member")).toBeTruthy();
  });

  // --- branch coverage: empty loading state for groups ---
  it("shows loading indicator in empty state for groups when isLoading", () => {
    const { toJSON } = render(
      <MentionDropdown type="#" groups={[]} onSelect={onSelect} visible={true} isLoading={true} />
    );
    expect(screen.queryByText("No groups found")).toBeNull();
    expect(toJSON()).not.toBeNull();
  });

  // --- scrollToIndex failure silently caught ---
  it("handles scrollToIndex failure gracefully", () => {
    // Render with data and a valid selectedIndex
    render(
      <MentionDropdown type="@" contacts={mockContacts} onSelect={onSelect} visible={true} selectedIndex={2} />
    );
    // The FlatList scrollToIndex may throw — the component catches it
    expect(screen.getByText("Charlie Guest")).toBeTruthy();
  });

  // --- key extractor branches ---
  it("uses correct keyExtractor for contacts with only name", () => {
    const nameOnlyContacts: ContactDto[] = [
      { name: "NameOnly", isGuest: false },
    ];
    render(
      <MentionDropdown type="@" contacts={nameOnlyContacts} onSelect={onSelect} visible={true} />
    );
    expect(screen.getByText("NameOnly")).toBeTruthy();
  });
});
