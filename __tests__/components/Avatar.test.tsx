import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { Avatar } from "@/components/ui/avatar";

describe("Avatar", () => {
  it("renders fallback text when no image", () => {
    render(<Avatar fallback="JD" />);
    expect(screen.getByText("JD")).toBeTruthy();
  });

  it("renders fallback text when image fails", () => {
    render(<Avatar src="https://broken.com/img.png" fallback="AB" />);
    // Simulate the image error to trigger the onError handler
    const image = screen.UNSAFE_queryAllByType(
      require("expo-image").Image
    );
    if (image.length > 0) {
      fireEvent(image[0], "error");
    }
    // After error, fallback text should appear
    expect(screen.getByText("AB")).toBeTruthy();
  });

  it("renders different sizes without crashing", () => {
    const { unmount: u1 } = render(<Avatar fallback="A" size="sm" />);
    u1();
    const { unmount: u2 } = render(<Avatar fallback="B" size="md" />);
    u2();
    render(<Avatar fallback="C" size="lg" />);
    expect(screen.getByText("C")).toBeTruthy();
  });
});
