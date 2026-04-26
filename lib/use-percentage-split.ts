import { useCallback, useRef, type Dispatch, type SetStateAction } from "react";
import { redistributePercentages } from "./screen-helpers";
import { sanitizePercentInput } from "./utils";

/**
 * Tracks which split participants have a manually-edited percentage and
 * keeps the remaining 100% evenly distributed across the rest. The locked
 * set lives in a ref so rapid keystrokes within the same tick observe prior
 * locks immediately — state setters are async and would lose them otherwise.
 */
export function useLockedPercentages(
  splitWith: string[],
  setSplitPercentages: Dispatch<SetStateAction<Record<string, string>>>
) {
  const lockedRef = useRef<string[]>([]);

  const handlePercentageChange = useCallback(
    (memberId: string, raw: string) => {
      const sanitized = sanitizePercentInput(raw);
      const current = lockedRef.current;
      const next = current.includes(memberId) ? current : [...current, memberId];
      lockedRef.current = next;
      setSplitPercentages((prev) =>
        redistributePercentages(prev, memberId, sanitized, splitWith, next)
      );
    },
    [splitWith, setSplitPercentages]
  );

  const resetLocked = useCallback(() => {
    lockedRef.current = [];
  }, []);

  return { handlePercentageChange, resetLocked };
}
