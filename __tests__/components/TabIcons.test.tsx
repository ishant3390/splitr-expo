import React from "react";
import { render } from "@testing-library/react-native";
import {
  HomeIcon,
  GroupsIcon,
  ActivityIcon,
  ProfileIcon,
} from "@/components/icons/tab-icons";

describe("TabIcons", () => {
  describe("HomeIcon", () => {
    it("renders outline variant by default", () => {
      const { toJSON } = render(<HomeIcon />);
      expect(toJSON()).toBeTruthy();
    });

    it("renders filled variant", () => {
      const { toJSON } = render(<HomeIcon filled />);
      expect(toJSON()).toBeTruthy();
    });

    it("renders with custom size and color", () => {
      const { toJSON } = render(<HomeIcon size={32} color="#ff0000" />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe("GroupsIcon", () => {
    it("renders outline variant by default", () => {
      const { toJSON } = render(<GroupsIcon />);
      expect(toJSON()).toBeTruthy();
    });

    it("renders filled variant", () => {
      const { toJSON } = render(<GroupsIcon filled />);
      expect(toJSON()).toBeTruthy();
    });

    it("renders with custom size and color", () => {
      const { toJSON } = render(<GroupsIcon size={32} color="#ff0000" />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe("ActivityIcon", () => {
    it("renders outline variant by default", () => {
      const { toJSON } = render(<ActivityIcon />);
      expect(toJSON()).toBeTruthy();
    });

    it("renders filled variant", () => {
      const { toJSON } = render(<ActivityIcon filled />);
      expect(toJSON()).toBeTruthy();
    });

    it("renders with custom size and color", () => {
      const { toJSON } = render(<ActivityIcon size={32} color="#ff0000" />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe("ProfileIcon", () => {
    it("renders outline variant by default", () => {
      const { toJSON } = render(<ProfileIcon />);
      expect(toJSON()).toBeTruthy();
    });

    it("renders filled variant", () => {
      const { toJSON } = render(<ProfileIcon filled />);
      expect(toJSON()).toBeTruthy();
    });

    it("renders with custom size and color", () => {
      const { toJSON } = render(<ProfileIcon size={32} color="#ff0000" />);
      expect(toJSON()).toBeTruthy();
    });
  });

  it("uses default props when none provided", () => {
    // All icons should have defaults: size=24, color="#94a3b8", filled=false
    expect(() => {
      render(<HomeIcon />);
      render(<GroupsIcon />);
      render(<ActivityIcon />);
      render(<ProfileIcon />);
    }).not.toThrow();
  });
});
