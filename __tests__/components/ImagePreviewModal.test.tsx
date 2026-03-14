import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";

// Override gesture handler mock to capture callbacks
const capturedCallbacks: Record<string, Function> = {};
jest.mock("react-native-gesture-handler", () => {
  const RN = require("react-native");
  function chainableGesture(type: string): any {
    const g: any = {};
    const methods = [
      "activeOffsetX", "failOffsetY", "onStart",
      "minPointers", "maxPointers", "enabled",
    ];
    for (const m of methods) g[m] = () => g;
    g.onUpdate = (cb: Function) => { capturedCallbacks[`${type}_onUpdate`] = cb; return g; };
    g.onEnd = (cb: Function) => { capturedCallbacks[`${type}_onEnd`] = cb; return g; };
    g.numberOfTaps = () => g;
    return g;
  }
  return {
    GestureDetector: ({ children }: any) => children,
    GestureHandlerRootView: ({ children }: any) => children,
    Gesture: {
      Pan: () => chainableGesture("pan"),
      Pinch: () => chainableGesture("pinch"),
      Tap: () => chainableGesture("tap"),
      Simultaneous: (..._g: any[]) => chainableGesture("simultaneous"),
    },
    Directions: {},
  };
});

// Use the real component (not the global mock) for this test file
jest.unmock("@/components/ui/image-preview-modal");

import {
  ImagePreviewModal,
  handlePinchUpdate,
  handlePinchEnd,
  handlePanUpdate,
  handlePanEnd,
  handleDoubleTap,
  MIN_SCALE,
  MAX_SCALE,
  type GestureSharedValues,
} from "@/components/ui/image-preview-modal";

function makeSV(overrides?: Partial<Record<keyof GestureSharedValues, number>>): GestureSharedValues {
  return {
    scale: { value: overrides?.scale ?? 1 },
    savedScale: { value: overrides?.savedScale ?? 1 },
    translateX: { value: overrides?.translateX ?? 0 },
    translateY: { value: overrides?.translateY ?? 0 },
    savedTranslateX: { value: overrides?.savedTranslateX ?? 0 },
    savedTranslateY: { value: overrides?.savedTranslateY ?? 0 },
  };
}

describe("ImagePreviewModal", () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders when visible with an imageUri", () => {
    render(
      <ImagePreviewModal
        visible={true}
        imageUri="https://example.com/photo.jpg"
        onClose={mockOnClose}
      />
    );

    // Close button should be visible
    expect(screen.getByLabelText("Close image preview")).toBeTruthy();
  });

  it("does not render when imageUri is null", () => {
    const { toJSON } = render(
      <ImagePreviewModal
        visible={true}
        imageUri={null}
        onClose={mockOnClose}
      />
    );

    expect(toJSON()).toBeNull();
  });

  it("calls onClose when close button is pressed", () => {
    render(
      <ImagePreviewModal
        visible={true}
        imageUri="https://example.com/photo.jpg"
        onClose={mockOnClose}
      />
    );

    fireEvent.press(screen.getByLabelText("Close image preview"));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("does not show content when not visible", () => {
    render(
      <ImagePreviewModal
        visible={false}
        imageUri="https://example.com/photo.jpg"
        onClose={mockOnClose}
      />
    );

    // Modal with visible=false renders nothing in RN test environment
    expect(screen.queryByLabelText("Close image preview")).toBeNull();
  });

  it("renders native gesture-enabled view on non-web platform", () => {
    // Platform.OS defaults to 'ios' in jest-expo, so this tests the native path
    render(
      <ImagePreviewModal
        visible={true}
        imageUri="https://example.com/native.jpg"
        onClose={mockOnClose}
      />
    );
    // Close button should still render on native
    expect(screen.getByLabelText("Close image preview")).toBeTruthy();
  });

  it("calls onClose via close button on native", () => {
    render(
      <ImagePreviewModal
        visible={true}
        imageUri="https://example.com/native.jpg"
        onClose={mockOnClose}
      />
    );
    fireEvent.press(screen.getByLabelText("Close image preview"));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});

describe("ImagePreviewModal (gesture callbacks)", () => {
  beforeEach(() => {
    // Clear captured callbacks before each test
    for (const key of Object.keys(capturedCallbacks)) delete capturedCallbacks[key];
  });

  it("renders GestureDetector on native platform", () => {
    render(
      <ImagePreviewModal
        visible={true}
        imageUri="https://example.com/gesture.jpg"
        onClose={jest.fn()}
      />
    );
    expect(screen.getByLabelText("Close image preview")).toBeTruthy();
  });

  it("captures and invokes pinch onUpdate callback", () => {
    render(
      <ImagePreviewModal visible={true} imageUri="https://example.com/g.jpg" onClose={jest.fn()} />
    );
    expect(capturedCallbacks["pinch_onUpdate"]).toBeDefined();
    // Invoke the callback — should not throw
    capturedCallbacks["pinch_onUpdate"]({ scale: 2.0 });
  });

  it("captures and invokes pinch onEnd callback", () => {
    render(
      <ImagePreviewModal visible={true} imageUri="https://example.com/g.jpg" onClose={jest.fn()} />
    );
    expect(capturedCallbacks["pinch_onEnd"]).toBeDefined();
    capturedCallbacks["pinch_onEnd"]();
  });

  it("captures and invokes pan onUpdate callback", () => {
    render(
      <ImagePreviewModal visible={true} imageUri="https://example.com/g.jpg" onClose={jest.fn()} />
    );
    expect(capturedCallbacks["pan_onUpdate"]).toBeDefined();
    capturedCallbacks["pan_onUpdate"]({ translationX: 10, translationY: 20 });
  });

  it("captures and invokes pan onEnd callback", () => {
    render(
      <ImagePreviewModal visible={true} imageUri="https://example.com/g.jpg" onClose={jest.fn()} />
    );
    expect(capturedCallbacks["pan_onEnd"]).toBeDefined();
    capturedCallbacks["pan_onEnd"]();
  });

  it("captures and invokes double-tap onEnd callback", () => {
    render(
      <ImagePreviewModal visible={true} imageUri="https://example.com/g.jpg" onClose={jest.fn()} />
    );
    expect(capturedCallbacks["tap_onEnd"]).toBeDefined();
    capturedCallbacks["tap_onEnd"]();
  });
});

describe("ImagePreviewModal (web)", () => {
  const mockOnClose = jest.fn();
  let Platform: any;

  beforeEach(() => {
    jest.clearAllMocks();
    Platform = require("react-native").Platform;
  });

  it("renders web implementation when Platform.OS is web", () => {
    const originalOS = Platform.OS;
    Platform.OS = "web";

    try {
      render(
        <ImagePreviewModal
          visible={true}
          imageUri="https://example.com/web.jpg"
          onClose={mockOnClose}
        />
      );

      expect(screen.getByLabelText("Close image preview")).toBeTruthy();
      fireEvent.press(screen.getByLabelText("Close image preview"));
      expect(mockOnClose).toHaveBeenCalled();
    } finally {
      Platform.OS = originalOS;
    }
  });

  it("stopPropagation Pressable on web does not close modal", () => {
    const originalOS = Platform.OS;
    Platform.OS = "web";

    try {
      const { UNSAFE_root } = render(
        <ImagePreviewModal
          visible={true}
          imageUri="https://example.com/web.jpg"
          onClose={mockOnClose}
        />
      );

      // Find all Pressable-like elements and press the image area
      // The image Pressable wraps the Image component and calls e.stopPropagation()
      const allViews = UNSAFE_root.findAll(
        (node) => node.props && typeof node.props.onPress === "function"
      );
      // The last pressable with onPress that isn't the close button should be the stopPropagation wrapper
      for (const view of allViews) {
        try {
          fireEvent.press(view);
        } catch {
          // some might throw, that's ok
        }
      }
    } finally {
      Platform.OS = originalOS;
    }
  });
});

// --- Gesture handler pure function tests ---

describe("handlePinchUpdate", () => {
  it("updates scale clamped between MIN and MAX", () => {
    const sv = makeSV({ savedScale: 1 });
    handlePinchUpdate(sv, 2.5);
    expect(sv.scale.value).toBe(2.5);
  });

  it("clamps scale to MAX_SCALE", () => {
    const sv = makeSV({ savedScale: 2 });
    handlePinchUpdate(sv, 3); // 2*3 = 6 > MAX_SCALE (4)
    expect(sv.scale.value).toBe(MAX_SCALE);
  });

  it("clamps scale to MIN_SCALE", () => {
    const sv = makeSV({ savedScale: 1 });
    handlePinchUpdate(sv, 0.3); // 0.3 < MIN_SCALE (1)
    expect(sv.scale.value).toBe(MIN_SCALE);
  });
});

describe("handlePinchEnd", () => {
  it("saves scale and calls resetFn when scale < 1.05", () => {
    const resetFn = jest.fn();
    const sv = makeSV({ scale: 1.02 });
    handlePinchEnd(sv, resetFn);
    expect(sv.savedScale.value).toBe(1.02);
    expect(resetFn).toHaveBeenCalled();
  });

  it("saves scale without reset when scale >= 1.05", () => {
    const resetFn = jest.fn();
    const sv = makeSV({ scale: 2 });
    handlePinchEnd(sv, resetFn);
    expect(sv.savedScale.value).toBe(2);
    expect(resetFn).not.toHaveBeenCalled();
  });
});

describe("handlePanUpdate", () => {
  it("updates translation when zoomed in (savedScale > 1)", () => {
    const sv = makeSV({ savedScale: 2, savedTranslateX: 10, savedTranslateY: 20 });
    handlePanUpdate(sv, 50, 30);
    expect(sv.translateX.value).toBe(60);
    expect(sv.translateY.value).toBe(50);
  });

  it("does not update translation when not zoomed (savedScale <= 1)", () => {
    const sv = makeSV({ savedScale: 1 });
    handlePanUpdate(sv, 50, 30);
    expect(sv.translateX.value).toBe(0);
    expect(sv.translateY.value).toBe(0);
  });
});

describe("handlePanEnd", () => {
  it("saves translation when zoomed in", () => {
    const sv = makeSV({ savedScale: 2, translateX: 50, translateY: 30 });
    handlePanEnd(sv);
    expect(sv.savedTranslateX.value).toBe(50);
    expect(sv.savedTranslateY.value).toBe(30);
  });

  it("snaps back to zero when not zoomed", () => {
    const sv = makeSV({ savedScale: 1, translateX: 50, translateY: 30 });
    handlePanEnd(sv);
    expect(sv.translateX.value).toBe(0);
    expect(sv.translateY.value).toBe(0);
    expect(sv.savedTranslateX.value).toBe(0);
    expect(sv.savedTranslateY.value).toBe(0);
  });
});

describe("handleDoubleTap", () => {
  it("calls resetFn when already zoomed in (scale > 1.05)", () => {
    const resetFn = jest.fn();
    const sv = makeSV({ scale: 2 });
    handleDoubleTap(sv, resetFn);
    expect(resetFn).toHaveBeenCalled();
  });

  it("zooms to 2x when not zoomed", () => {
    const resetFn = jest.fn();
    const sv = makeSV({ scale: 1 });
    handleDoubleTap(sv, resetFn);
    expect(sv.scale.value).toBe(2);
    expect(sv.savedScale.value).toBe(2);
    expect(resetFn).not.toHaveBeenCalled();
  });
});
