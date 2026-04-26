import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

// Mock haptics
jest.mock("@/lib/haptics", () => ({
  hapticSelection: jest.fn(),
  hapticMedium: jest.fn(),
  hapticLight: jest.fn(),
}));

// Mock tab icons
jest.mock("@/components/icons/tab-icons", () => ({
  HomeIcon: "HomeIcon",
  GroupsIcon: "GroupsIcon",
  ActivityIcon: "ActivityIcon",
  ProfileIcon: "ProfileIcon",
}));

// Mock lucide
jest.mock("lucide-react-native", () => ({
  Plus: "Plus",
}));

import { TabBar, getGroupIdFromPath } from "@/components/TabBar";
import { hapticSelection, hapticMedium } from "@/lib/haptics";

const mockNavigate = jest.fn();
const mockEmit = jest.fn(() => ({ defaultPrevented: false }));
const mockPush = jest.fn();

const pathnameRef: { current: string } = { current: "/(tabs)" };
const setMockPathname = (path: string) => { pathnameRef.current = path; };

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  usePathname: () => pathnameRef.current,
  Link: "Link",
}));

function createMockProps(activeIndex = 0): any {
  return {
    state: {
      index: activeIndex,
      routes: [
        { key: "index-key", name: "index" },
        { key: "groups-key", name: "groups" },
        { key: "add-key", name: "add" },
        { key: "activity-key", name: "activity" },
        { key: "profile-key", name: "profile" },
      ],
    },
    descriptors: {},
    navigation: {
      navigate: mockNavigate,
      emit: mockEmit,
    },
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("TabBar", () => {
  it("renders all tab labels", () => {
    render(<TabBar {...createMockProps()} />);
    expect(screen.getByText("Home")).toBeTruthy();
    expect(screen.getByText("Groups")).toBeTruthy();
    expect(screen.getByText("Activity")).toBeTruthy();
    expect(screen.getByText("Profile")).toBeTruthy();
  });

  it("renders FAB button with Add Expense label", () => {
    render(<TabBar {...createMockProps()} />);
    expect(screen.getByLabelText("Add Expense")).toBeTruthy();
  });

  it("triggers haptic selection on tab press", () => {
    render(<TabBar {...createMockProps(0)} />);
    fireEvent.press(screen.getByLabelText("Groups"));
    expect(hapticSelection).toHaveBeenCalled();
  });

  it("emits tabPress event on tab press", () => {
    render(<TabBar {...createMockProps(0)} />);
    fireEvent.press(screen.getByLabelText("Groups"));
    expect(mockEmit).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "tabPress",
        target: "groups-key",
        canPreventDefault: true,
      })
    );
  });

  it("navigates to tab route with screen reset when not already focused", () => {
    render(<TabBar {...createMockProps(0)} />);
    fireEvent.press(screen.getByLabelText("Groups"));
    expect(mockNavigate).toHaveBeenCalledWith("groups", { screen: "index" });
  });

  it("resets to root when tapping already focused tab", () => {
    render(<TabBar {...createMockProps(0)} />);
    fireEvent.press(screen.getByLabelText("Home"));
    expect(mockNavigate).toHaveBeenCalledWith("index", { screen: "index" });
  });

  it("does not navigate when event default is prevented", () => {
    mockEmit.mockReturnValueOnce({ defaultPrevented: true });
    render(<TabBar {...createMockProps(0)} />);
    fireEvent.press(screen.getByLabelText("Groups"));
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("navigates to add screen on FAB press", () => {
    setMockPathname("/(tabs)");
    render(<TabBar {...createMockProps()} />);
    fireEvent.press(screen.getByLabelText("Add Expense"));
    expect(hapticMedium).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/(tabs)/add", params: {} });
  });

  it("navigates to quick add on FAB long press", () => {
    setMockPathname("/(tabs)");
    render(<TabBar {...createMockProps()} />);
    fireEvent(screen.getByLabelText("Add Expense"), "longPress");
    expect(hapticMedium).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(tabs)/add",
      params: { quick: "true" },
    });
  });

  it("forwards returnGroupId when FAB pressed from a group screen", () => {
    setMockPathname("/group/abc-123");
    render(<TabBar {...createMockProps()} />);
    fireEvent.press(screen.getByLabelText("Add Expense"));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(tabs)/add",
      params: { returnGroupId: "abc-123" },
    });
  });

  it("forwards returnGroupId via long press from a group screen", () => {
    setMockPathname("/(tabs)/groups/g-42");
    render(<TabBar {...createMockProps()} />);
    fireEvent(screen.getByLabelText("Add Expense"), "longPress");
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(tabs)/add",
      params: { quick: "true", returnGroupId: "g-42" },
    });
  });

  it("sets accessibility state selected on focused tab", () => {
    render(<TabBar {...createMockProps(0)} />);
    const homeTab = screen.getByLabelText("Home");
    expect(homeTab.props.accessibilityState).toEqual({ selected: true });
  });

  it("does not set selected state on unfocused tab", () => {
    render(<TabBar {...createMockProps(0)} />);
    const groupsTab = screen.getByLabelText("Groups");
    expect(groupsTab.props.accessibilityState).toEqual({});
  });

  it("renders with different active indices", () => {
    render(<TabBar {...createMockProps(3)} />);
    const activityTab = screen.getByLabelText("Activity");
    expect(activityTab.props.accessibilityState).toEqual({ selected: true });
  });
});

describe("getGroupIdFromPath", () => {
  it("extracts id from /group/{id}", () => {
    expect(getGroupIdFromPath("/group/abc123")).toBe("abc123");
  });

  it("extracts id from /(tabs)/groups/{id}", () => {
    expect(getGroupIdFromPath("/(tabs)/groups/g-99")).toBe("g-99");
  });

  it("extracts id from /groups/{id}", () => {
    expect(getGroupIdFromPath("/groups/foo")).toBe("foo");
  });

  it("strips query string", () => {
    expect(getGroupIdFromPath("/group/abc?from=tab")).toBe("abc");
  });

  it("returns null for non-group paths", () => {
    expect(getGroupIdFromPath("/(tabs)")).toBeNull();
    expect(getGroupIdFromPath("/(tabs)/groups")).toBeNull();
    expect(getGroupIdFromPath("/(tabs)/activity")).toBeNull();
    expect(getGroupIdFromPath("/profile")).toBeNull();
  });

  it("returns null for null/empty paths", () => {
    expect(getGroupIdFromPath(null)).toBeNull();
    expect(getGroupIdFromPath("")).toBeNull();
  });

  it("decodes URI components in the id", () => {
    expect(getGroupIdFromPath("/group/abc%20def")).toBe("abc def");
  });
});
