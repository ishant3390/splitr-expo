import React from "react";
import { render } from "@testing-library/react-native";

// Unmock confetti so we test the real component
jest.unmock("@/components/ui/confetti");

import { Confetti } from "@/components/ui/confetti";

describe("Confetti", () => {
  it("returns null when not visible", () => {
    const { toJSON } = render(<Confetti visible={false} />);
    expect(toJSON()).toBeNull();
  });

  it("renders particles when visible", () => {
    const { toJSON } = render(<Confetti visible={true} />);
    const tree = toJSON();
    expect(tree).not.toBeNull();
    // Should have children (the particles)
    if (tree && !Array.isArray(tree)) {
      expect(tree.children).not.toBeNull();
      expect(tree.children!.length).toBe(40); // PARTICLE_COUNT
    }
  });

  it("renders correct number of particles", () => {
    const { toJSON } = render(<Confetti visible={true} />);
    const tree = toJSON();
    if (tree && !Array.isArray(tree)) {
      expect(tree.children!.length).toBe(40);
    }
  });
});
