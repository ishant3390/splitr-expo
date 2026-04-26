import { renderHook, act } from "@testing-library/react-native";
import { useState } from "react";
import { useLockedPercentages } from "@/lib/use-percentage-split";

function harness(splitWith: string[], initial: Record<string, string> = {}) {
  return renderHook(() => {
    const [pct, setPct] = useState<Record<string, string>>(initial);
    const { handlePercentageChange, resetLocked } = useLockedPercentages(splitWith, setPct);
    return { pct, handlePercentageChange, resetLocked };
  });
}

describe("useLockedPercentages", () => {
  it("redistributes the remaining 100% across unlocked members on first edit", () => {
    const { result } = harness(
      ["a", "b", "c", "d"],
      { a: "25.00", b: "25.00", c: "25.00", d: "25.00" }
    );
    act(() => {
      result.current.handlePercentageChange("a", "10");
    });
    expect(result.current.pct.a).toBe("10");
    expect(result.current.pct.b).toBe("30.00");
    expect(result.current.pct.c).toBe("30.00");
    expect(result.current.pct.d).toBe("30.00");
  });

  it("retains earlier locks across rapid sequential edits (regression: stale closure)", () => {
    const { result } = harness(
      ["a", "b", "c", "d"],
      { a: "25.00", b: "25.00", c: "25.00", d: "25.00" }
    );
    // Two edits inside the same act batch — the ref must carry the lock from the first into the second.
    act(() => {
      result.current.handlePercentageChange("a", "10");
      result.current.handlePercentageChange("b", "20");
    });
    expect(result.current.pct.a).toBe("10");
    expect(result.current.pct.b).toBe("20");
    expect(result.current.pct.c).toBe("35.00");
    expect(result.current.pct.d).toBe("35.00");
  });

  it("clamps user input to valid percentages via sanitizePercentInput", () => {
    const { result } = harness(["a", "b"], { a: "50.00", b: "50.00" });
    act(() => {
      result.current.handlePercentageChange("a", "150");
    });
    // sanitizePercentInput caps at 100
    expect(parseFloat(result.current.pct.a)).toBeLessThanOrEqual(100);
  });

  it("resetLocked clears the locked set so subsequent edits re-redistribute everything", () => {
    const { result } = harness(
      ["a", "b", "c"],
      { a: "33.33", b: "33.33", c: "33.34" }
    );
    act(() => {
      result.current.handlePercentageChange("a", "10");
    });
    expect(result.current.pct.a).toBe("10");
    act(() => {
      result.current.resetLocked();
      // After reset, editing 'b' should redistribute a too (no longer locked)
      result.current.handlePercentageChange("b", "20");
    });
    expect(result.current.pct.b).toBe("20");
    // a + c sum to 80 (a is no longer locked; both redistribute)
    const aPlusC = parseFloat(result.current.pct.a) + parseFloat(result.current.pct.c);
    expect(aPlusC).toBeCloseTo(80, 2);
  });
});
