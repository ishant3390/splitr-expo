import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useReducer,
  useRef,
  useEffect,
  useId,
  type ReactNode,
} from "react";
import { StyleSheet, View } from "react-native";

interface PortalContextValue {
  register: (key: string, node: ReactNode) => void;
  unregister: (key: string) => void;
}

export const PortalContext = createContext<PortalContextValue | null>(null);

/**
 * Renders at the app root and collects teleported portal children
 * for non-native-modal overlay use cases.
 * This provider is currently optional and not mounted in RootLayout.
 *
 * Uses a ref for content storage + forceRender to avoid infinite loops:
 * - Context value is memoized (stable) → Portal consumers don't re-render
 *   when provider re-renders due to content updates
 * - React's "children as props" optimization → app tree doesn't re-render
 *   when provider re-renders (children reference is stable from parent)
 */
export function PortalProvider({ children }: { children: ReactNode }) {
  const contentRef = useRef(new Map<string, ReactNode>());
  const [, forceRender] = useReducer((x: number) => x + 1, 0);

  const register = useCallback((key: string, node: ReactNode) => {
    contentRef.current.set(key, node);
    forceRender();
  }, []);

  const unregister = useCallback((key: string) => {
    contentRef.current.delete(key);
    forceRender();
  }, []);

  // Stable context value — prevents Portal consumers from re-rendering
  // when provider re-renders due to content changes
  const contextValue = useMemo(() => ({ register, unregister }), [register, unregister]);

  const portalEntries = Array.from(contentRef.current.entries());

  return (
    <PortalContext.Provider value={contextValue}>
      {children}
      {portalEntries.length > 0 && (
        <View
          style={[StyleSheet.absoluteFill, { zIndex: 99999, elevation: 99999 }]}
          pointerEvents="box-none"
          collapsable={false}
        >
          {portalEntries.map(([key, node]) => (
            <React.Fragment key={key}>{node}</React.Fragment>
          ))}
        </View>
      )}
    </PortalContext.Provider>
  );
}

/**
 * Teleports children to the root PortalProvider.
 * Can be used by overlays that do not need native Modal semantics.
 *
 * Registers content on mount and every update (so portal shows latest children).
 * Unregisters only on unmount.
 */
export function Portal({ children }: { children: ReactNode }) {
  const ctx = useContext(PortalContext);
  const key = useId();

  // Register content on every render so the portal outlet shows the latest children.
  // This is safe because: (1) context value is memoized, so this component doesn't
  // re-render from its own register call, and (2) forceRender in the provider only
  // re-renders the portal outlet, not the app tree (children prop is stable).
  useEffect(() => {
    ctx?.register(key, children);
  });

  // Unregister only on unmount
  useEffect(() => {
    return () => {
      ctx?.unregister(key);
    };
  }, [ctx, key]);

  return null;
}
