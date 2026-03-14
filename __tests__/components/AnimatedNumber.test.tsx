import React from "react";
import { render, screen, act } from "@testing-library/react-native";
import { AnimatedNumber } from "@/components/ui/animated-number";

// Use real timers + mock rAF so animation loop runs synchronously
let rafCallbacks: Array<FrameRequestCallback> = [];
let rafId = 0;

beforeEach(() => {
  rafCallbacks = [];
  rafId = 0;
  jest.spyOn(global, "requestAnimationFrame").mockImplementation((cb) => {
    rafCallbacks.push(cb);
    return ++rafId;
  });
  jest.spyOn(global, "cancelAnimationFrame").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

function flushRAF(times = 50) {
  for (let i = 0; i < times; i++) {
    const cbs = [...rafCallbacks];
    rafCallbacks = [];
    cbs.forEach((cb) => cb(performance.now()));
    if (rafCallbacks.length === 0) break;
  }
}

describe("AnimatedNumber", () => {
  it("renders initial value", () => {
    render(<AnimatedNumber value={42} />);
    expect(screen.getByText("42")).toBeTruthy();
  });

  it("renders with custom formatter", () => {
    render(<AnimatedNumber value={1234} formatter={(n) => `$${n.toFixed(2)}`} />);
    expect(screen.getByText("$1234.00")).toBeTruthy();
  });

  it("animates when value changes", () => {
    // Mock Date.now to control animation progress
    const realDateNow = Date.now;
    let currentTime = 1000;
    Date.now = () => currentTime;

    const { rerender } = render(<AnimatedNumber value={0} duration={600} />);
    expect(screen.getByText("0")).toBeTruthy();

    // Change value — kicks off rAF animation
    rerender(<AnimatedNumber value={100} duration={600} />);

    // Advance time past duration and flush rAF frames inside act
    currentTime += 700;
    act(() => {
      flushRAF();
    });

    // After animation completes, should show final value
    expect(screen.getByText("100")).toBeTruthy();

    Date.now = realDateNow;
  });

  it("does not animate when value stays the same", () => {
    const { rerender } = render(<AnimatedNumber value={50} />);
    rerender(<AnimatedNumber value={50} />);
    // No rAF scheduled for same value
    expect(rafCallbacks.length).toBe(0);
    expect(screen.getByText("50")).toBeTruthy();
  });

  it("cancels animation on unmount", () => {
    const cancelSpy = jest.spyOn(global, "cancelAnimationFrame");
    const { rerender, unmount } = render(<AnimatedNumber value={0} />);
    rerender(<AnimatedNumber value={100} />);
    // rAF is scheduled
    unmount();
    expect(cancelSpy).toHaveBeenCalled();
  });

  it("accepts custom duration prop", () => {
    render(<AnimatedNumber value={10} duration={100} />);
    expect(screen.getByText("10")).toBeTruthy();
  });
});
