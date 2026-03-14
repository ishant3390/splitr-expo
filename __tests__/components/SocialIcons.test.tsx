import React from "react";
import { render } from "@testing-library/react-native";
import {
  GoogleIcon,
  AppleIcon,
  FacebookIcon,
  InstagramIcon,
} from "@/components/icons/social-icons";

describe("SocialIcons", () => {
  describe("GoogleIcon", () => {
    it("renders without crashing", () => {
      expect(() => render(<GoogleIcon />)).not.toThrow();
    });

    it("renders with default size", () => {
      const { toJSON } = render(<GoogleIcon />);
      expect(toJSON()).toBeTruthy();
    });

    it("renders with custom size", () => {
      const { toJSON } = render(<GoogleIcon size={32} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe("AppleIcon", () => {
    it("renders without crashing", () => {
      expect(() => render(<AppleIcon />)).not.toThrow();
    });

    it("renders with default size", () => {
      const { toJSON } = render(<AppleIcon />);
      expect(toJSON()).toBeTruthy();
    });

    it("renders with custom size", () => {
      const { toJSON } = render(<AppleIcon size={32} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe("FacebookIcon", () => {
    it("renders without crashing", () => {
      expect(() => render(<FacebookIcon />)).not.toThrow();
    });

    it("renders with default size", () => {
      const { toJSON } = render(<FacebookIcon />);
      expect(toJSON()).toBeTruthy();
    });

    it("renders with custom size", () => {
      const { toJSON } = render(<FacebookIcon size={32} />);
      expect(toJSON()).toBeTruthy();
    });
  });

  describe("InstagramIcon", () => {
    it("renders without crashing", () => {
      expect(() => render(<InstagramIcon />)).not.toThrow();
    });

    it("renders with default size", () => {
      const { toJSON } = render(<InstagramIcon />);
      expect(toJSON()).toBeTruthy();
    });

    it("renders with custom size", () => {
      const { toJSON } = render(<InstagramIcon size={32} />);
      expect(toJSON()).toBeTruthy();
    });
  });
});
