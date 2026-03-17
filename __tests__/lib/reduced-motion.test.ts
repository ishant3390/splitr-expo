import { renderHook } from "@testing-library/react-native";
import * as Reanimated from "react-native-reanimated";
import { useMotionPreference } from "@/lib/reduced-motion";

describe("reduced-motion.ts", () => {
  describe("useMotionPreference", () => {
    let useReducedMotionSpy: jest.SpyInstance;

    beforeEach(() => {
      useReducedMotionSpy = jest.spyOn(Reanimated, "useReducedMotion");
    });

    afterEach(() => {
      useReducedMotionSpy.mockRestore();
    });

    it("returns shouldReduce=false when reduced motion is off", () => {
      useReducedMotionSpy.mockReturnValue(false);
      const { result } = renderHook(() => useMotionPreference());
      expect(result.current.shouldReduce).toBe(false);
    });

    it("returns shouldReduce=true when reduced motion is on", () => {
      useReducedMotionSpy.mockReturnValue(true);
      const { result } = renderHook(() => useMotionPreference());
      expect(result.current.shouldReduce).toBe(true);
    });

    it("duration returns original ms when reduced motion is off", () => {
      useReducedMotionSpy.mockReturnValue(false);
      const { result } = renderHook(() => useMotionPreference());
      expect(result.current.duration(300)).toBe(300);
      expect(result.current.duration(600)).toBe(600);
      expect(result.current.duration(0)).toBe(0);
    });

    it("duration returns 0 when reduced motion is on", () => {
      useReducedMotionSpy.mockReturnValue(true);
      const { result } = renderHook(() => useMotionPreference());
      expect(result.current.duration(300)).toBe(0);
      expect(result.current.duration(600)).toBe(0);
    });

    it("spring returns original config when reduced motion is off", () => {
      useReducedMotionSpy.mockReturnValue(false);
      const { result } = renderHook(() => useMotionPreference());
      const config = { damping: 15, stiffness: 150 };
      expect(result.current.spring(config)).toBe(config);
    });

    it("spring returns critically-damped config when reduced motion is on", () => {
      useReducedMotionSpy.mockReturnValue(true);
      const { result } = renderHook(() => useMotionPreference());
      const config = { damping: 15, stiffness: 150 };
      expect(result.current.spring(config)).toEqual({
        damping: 100,
        stiffness: 150,
        mass: 1,
      });
    });

    it("spring preserves custom mass when reduced motion is on", () => {
      useReducedMotionSpy.mockReturnValue(true);
      const { result } = renderHook(() => useMotionPreference());
      const config = { damping: 15, stiffness: 150, mass: 2 };
      expect(result.current.spring(config)).toEqual({
        damping: 100,
        stiffness: 150,
        mass: 2,
      });
    });

    it("spring uses default mass=1 when mass is not provided and reduced", () => {
      useReducedMotionSpy.mockReturnValue(true);
      const { result } = renderHook(() => useMotionPreference());
      const config = { damping: 10, stiffness: 200 };
      const springResult = result.current.spring(config);
      expect(springResult.mass).toBe(1);
    });
  });
});
