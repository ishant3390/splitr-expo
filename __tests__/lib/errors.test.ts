import {
  SplitError,
  isSplitError,
  parseApiError,
  getUserMessage,
  ERROR_MESSAGES,
} from "@/lib/errors";
import type { ApiErrorBody } from "@/lib/errors";

describe("SplitError", () => {
  const body: ApiErrorBody = {
    code: "ERR-409",
    category: "BUSINESS_LOGIC",
    message: "Already a member",
    status: 409,
  };

  it("extends Error with name 'SplitError'", () => {
    const err = new SplitError(body, 409);
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("SplitError");
  });

  it("carries body and httpStatus", () => {
    const err = new SplitError(body, 409);
    expect(err.body).toBe(body);
    expect(err.httpStatus).toBe(409);
  });

  it("formats message as 'API {status}: {JSON}' for backward compat", () => {
    const err = new SplitError(body, 409);
    expect(err.message).toMatch(/^API 409: /);
    expect(err.message).toContain('"ERR-409"');
  });
});

describe("isSplitError", () => {
  it("returns true for SplitError instances", () => {
    const err = new SplitError(
      { code: "ERR-001", category: "GENERAL", message: "err" },
      500
    );
    expect(isSplitError(err)).toBe(true);
  });

  it("returns false for plain Error", () => {
    expect(isSplitError(new Error("oops"))).toBe(false);
  });

  it("returns false for non-Error values", () => {
    expect(isSplitError("string")).toBe(false);
    expect(isSplitError(null)).toBe(false);
    expect(isSplitError(undefined)).toBe(false);
    expect(isSplitError(42)).toBe(false);
  });
});

describe("parseApiError", () => {
  it("extracts body from SplitError", () => {
    const body: ApiErrorBody = {
      code: "ERR-302",
      category: "RESOURCE",
      message: "Version conflict",
    };
    const err = new SplitError(body, 409);
    expect(parseApiError(err)).toBe(body);
  });

  it("parses legacy Error('API 409: {json}') format", () => {
    const jsonBody = JSON.stringify({
      code: "ERR-409",
      category: "BUSINESS_LOGIC",
      message: "Already a member",
    });
    const err = new Error(`API 409: ${jsonBody}`);
    const result = parseApiError(err);
    expect(result).not.toBeNull();
    expect(result!.code).toBe("ERR-409");
    expect(result!.category).toBe("BUSINESS_LOGIC");
  });

  it("returns null for legacy Error without JSON body", () => {
    const err = new Error("API 500: Internal Server Error");
    expect(parseApiError(err)).toBeNull();
  });

  it("returns null for legacy Error with JSON but no code field", () => {
    const err = new Error(`API 400: ${JSON.stringify({ error: "Bad Request" })}`);
    expect(parseApiError(err)).toBeNull();
  });

  it("returns null for non-Error values", () => {
    expect(parseApiError("just a string")).toBeNull();
    expect(parseApiError(null)).toBeNull();
    expect(parseApiError(42)).toBeNull();
  });

  it("returns null for plain Error without API prefix", () => {
    expect(parseApiError(new Error("Network error"))).toBeNull();
  });
});

describe("getUserMessage", () => {
  it("returns mapped message for known codes", () => {
    const body: ApiErrorBody = {
      code: "ERR-407",
      category: "BUSINESS_LOGIC",
      message: "dev message",
    };
    expect(getUserMessage(body)).toBe(
      "You already sent a reminder recently. Try again later."
    );
  });

  it("returns fallback for unknown codes", () => {
    const body: ApiErrorBody = {
      code: "ERR-999",
      category: "GENERAL",
      message: "dev message",
    };
    expect(getUserMessage(body)).toBe("Something went wrong. Please try again.");
  });

  it("has entries for all documented error codes", () => {
    const expectedCodes = [
      "ERR-001", "ERR-002",
      "ERR-100", "ERR-101", "ERR-102", "ERR-103", "ERR-104",
      "ERR-201", "ERR-204", "ERR-205",
      "ERR-300", "ERR-301", "ERR-302",
      "ERR-400", "ERR-401", "ERR-402", "ERR-403", "ERR-404",
      "ERR-405", "ERR-406", "ERR-407", "ERR-408", "ERR-409",
      "ERR-410", "ERR-411", "ERR-412", "ERR-413",
      "ERR-414", "ERR-415", "ERR-416", "ERR-417",
      "ERR-500", "ERR-501", "ERR-502",
    ];
    for (const code of expectedCodes) {
      expect(ERROR_MESSAGES[code]).toBeDefined();
    }
  });
});
