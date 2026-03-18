/**
 * Global API error interceptor.
 *
 * Routes errors by category and returns a discriminated union telling the
 * caller what action was taken (or what action the caller should take).
 */

import type { ApiErrorBody } from "./errors";
import { parseApiError, getUserMessage } from "./errors";

// ---- Result types ----

export type InterceptorResult =
  | { action: "HANDLED" }
  | { action: "RETRY" }
  | { action: "REFETCH" }
  | { action: "FIELD_ERRORS"; errors: Record<string, string> };

// ---- Toast / router interfaces (avoid coupling to concrete implementations) ----

interface Toast {
  success(msg: string): void;
  error(msg: string): void;
  info(msg: string): void;
}

interface Router {
  back(): void;
  replace(path: string): void;
}

interface Clerk {
  signOut(): Promise<void>;
  session?: {
    getToken(opts?: { skipCache?: boolean }): Promise<string | null>;
  };
}

// ---- Network error detection ----

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) {
    const msg = err.message.toLowerCase();
    return msg.includes("network") || msg.includes("fetch") || msg.includes("failed to fetch");
  }
  return false;
}

// ---- Interceptor ----

/**
 * Handle an API error globally by category.
 *
 * Screens can call this as a fallback after handling specific codes locally.
 * Returns an `InterceptorResult` so the caller knows whether to retry, refetch, etc.
 */
export async function handleApiError(
  err: unknown,
  toast: Toast,
  router: Router,
  clerk?: Clerk
): Promise<InterceptorResult> {
  // Network errors
  if (isNetworkError(err)) {
    toast.error("No internet connection. Please check your network.");
    return { action: "HANDLED" };
  }

  const body = parseApiError(err);
  if (!body) {
    toast.error("Something went wrong. Please try again.");
    return { action: "HANDLED" };
  }

  switch (body.category) {
    case "AUTHENTICATION": {
      // Token expired — try silent refresh
      if (body.code === "ERR-203" && clerk?.session) {
        try {
          const refreshed = await clerk.session.getToken({ skipCache: true });
          if (refreshed) return { action: "RETRY" };
        } catch {
          // Refresh failed — fall through to sign out
        }
      }
      // All other auth errors — sign out
      if (clerk) {
        try {
          await clerk.signOut();
        } catch {
          // Sign-out failed (e.g., network) — still redirect to login
        }
      }
      router.replace("/(auth)");
      return { action: "HANDLED" };
    }

    case "AUTHORIZATION": {
      toast.error(getUserMessage(body));
      if (body.code === "ERR-204") {
        router.back();
      }
      return { action: "HANDLED" };
    }

    case "VALIDATION": {
      if (body.code === "ERR-100" && body.details) {
        return { action: "FIELD_ERRORS", errors: body.details };
      }
      toast.error(getUserMessage(body));
      return { action: "HANDLED" };
    }

    case "RESOURCE": {
      if (body.code === "ERR-302") {
        toast.info(getUserMessage(body));
        return { action: "REFETCH" };
      }
      toast.error(getUserMessage(body));
      return { action: "HANDLED" };
    }

    case "BUSINESS_LOGIC": {
      // Business logic errors are expected states — use info, not error
      toast.info(getUserMessage(body));
      return { action: "HANDLED" };
    }

    default: {
      toast.error(getUserMessage(body));
      return { action: "HANDLED" };
    }
  }
}
