/**
 * Centralized error handling for Splitr API errors.
 *
 * Backend error shape: { timestamp, status, error, code, category, message, path, details? }
 * See: pipeline/fe/error-handling-spec.md
 */

// ---- Types ----

export interface ApiErrorBody {
  timestamp?: string;
  status?: number;
  error?: string;
  code: string;
  category: ErrorCategory;
  message: string;
  path?: string;
  details?: Record<string, string>;
}

export type ErrorCategory =
  | "GENERAL"
  | "VALIDATION"
  | "AUTHENTICATION"
  | "AUTHORIZATION"
  | "RESOURCE"
  | "BUSINESS_LOGIC"
  | "EXTERNAL_SERVICE";

// ---- SplitError ----

/**
 * Typed error carrying the parsed backend error body.
 * Message format: "API {status}: {JSON}" for backward compatibility with
 * existing `msg.includes("ERR-xxx")` checks during migration.
 */
export class SplitError extends Error {
  readonly body: ApiErrorBody;
  readonly httpStatus: number;

  constructor(body: ApiErrorBody, httpStatus: number) {
    super(`API ${httpStatus}: ${JSON.stringify(body)}`);
    this.name = "SplitError";
    this.body = body;
    this.httpStatus = httpStatus;
  }
}

// ---- Type guard ----

export function isSplitError(err: unknown): err is SplitError {
  return err instanceof SplitError;
}

// ---- User-facing messages ----

export const ERROR_MESSAGES: Record<string, string> = {
  // General
  "ERR-001": "Something went wrong. Please try again.",
  "ERR-002": "Splitr is temporarily unavailable. Please try again in a moment.",

  // Validation
  "ERR-100": "Please fix the errors below.",
  "ERR-101": "Something's not right with your request. Please check and try again.",
  "ERR-102": "Please fill in all required fields.",
  "ERR-103": "Invalid format. Please check your input.",
  "ERR-104": "Invalid value provided.",
  "ERR-419": "The individual amounts don't add up to the total. Please check and try again.",
  "ERR-420": "Invalid participant selection. Each person must be either a member or a guest.",
  "ERR-421": "You can't settle a debt with yourself. Please select a different person.",

  // Authorization
  "ERR-201": "You don't have permission to do that.",
  "ERR-204": "You're not a member of this group.",
  "ERR-205": "You can only edit your own content.",

  // Resource
  "ERR-300": "This doesn't exist or may have been deleted.",
  "ERR-301": "This already exists.",
  "ERR-302": "Someone else just edited this. Refreshing...",

  // Business Logic
  "ERR-400": "Settle all outstanding balances before doing this.",
  "ERR-401": "This invite link has expired. Ask the group admin for a new one.",
  "ERR-402": "This group has been archived and can't accept new members.",
  "ERR-403": "You've reached your daily receipt scan limit. Try again tomorrow.",
  "ERR-404": "You've reached your daily chat limit. Try again tomorrow.",
  "ERR-405": "Slow down! Wait a moment before sending another message.",
  "ERR-406": "You have another chat in progress. Please wait for it to finish.",
  "ERR-407": "You already sent a reminder recently. Try again later.",
  "ERR-408": "This person doesn't owe you anything in this group.",
  "ERR-409": "This person is already a member of the group.",
  "ERR-410": "This recurring expense is paused.",
  "ERR-411": "Invalid schedule. Choose weekly, monthly, or yearly.",
  "ERR-412": "This image is too large. Maximum size is 5 MB.",
  "ERR-413": "Unsupported image format. Use JPEG, PNG, WebP, or HEIC.",

  // Idempotency
  "ERR-414": "This action was already completed with different details. Please try again.",
  "ERR-415": "Your request is being processed. Please wait a moment.",
  "ERR-416": "Something went wrong. Please try again.",
  "ERR-417": "Something went wrong. Please try again.",

  // External Service
  "ERR-500": "Something went wrong on our end. Please try again.",
  "ERR-501": "Failed to upload image. Please try again.",
  "ERR-502": "Something went wrong. Please try again.",
};

const FALLBACK_MESSAGE = "Something went wrong. Please try again.";

/**
 * Get the user-facing message for an API error body.
 */
export function getUserMessage(error: ApiErrorBody): string {
  return ERROR_MESSAGES[error.code] ?? FALLBACK_MESSAGE;
}

// ---- Parsing ----

/**
 * Extract an ApiErrorBody from an unknown error value.
 *
 * Handles:
 * 1. SplitError (structured, preferred)
 * 2. Legacy Error("API 409: {...json...}") format
 * 3. Returns null for anything else
 */
export function parseApiError(err: unknown): ApiErrorBody | null {
  // SplitError — already structured
  if (isSplitError(err)) {
    return err.body;
  }

  // Legacy Error with "API {status}: {json}" message
  if (err instanceof Error) {
    const match = err.message.match(/^API \d+: (.+)$/s);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed && typeof parsed.code === "string") {
          return parsed as ApiErrorBody;
        }
      } catch {
        // Not JSON — fall through
      }
    }
  }

  return null;
}
