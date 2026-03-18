import { handleApiError } from "@/lib/api-interceptor";
import { SplitError } from "@/lib/errors";
import type { ApiErrorBody } from "@/lib/errors";

function makeBody(overrides: Partial<ApiErrorBody> & { code: string; category: string }): ApiErrorBody {
  return {
    message: "dev message",
    ...overrides,
  } as ApiErrorBody;
}

function makeSplitError(body: ApiErrorBody, status = 400): SplitError {
  return new SplitError(body, status);
}

describe("handleApiError", () => {
  let toast: { success: jest.Mock; error: jest.Mock; info: jest.Mock };
  let router: { back: jest.Mock; replace: jest.Mock };

  beforeEach(() => {
    toast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
    router = { back: jest.fn(), replace: jest.fn() };
  });

  // --- AUTHENTICATION ---

  it("signs out and redirects for auth errors", async () => {
    const err = makeSplitError(
      makeBody({ code: "ERR-200", category: "AUTHENTICATION" }),
      401
    );
    const clerk = { signOut: jest.fn().mockResolvedValue(undefined) };
    const result = await handleApiError(err, toast, router, clerk);
    expect(clerk.signOut).toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith("/(auth)");
    expect(result).toEqual({ action: "HANDLED" });
  });

  it("attempts token refresh for ERR-203 before signing out", async () => {
    const err = makeSplitError(
      makeBody({ code: "ERR-203", category: "AUTHENTICATION" }),
      401
    );
    const session = { getToken: jest.fn().mockResolvedValue("new-token") };
    const clerk = { signOut: jest.fn(), session };
    const result = await handleApiError(err, toast, router, clerk);
    expect(session.getToken).toHaveBeenCalledWith({ skipCache: true });
    expect(clerk.signOut).not.toHaveBeenCalled();
    expect(result).toEqual({ action: "RETRY" });
  });

  it("signs out if token refresh fails for ERR-203", async () => {
    const err = makeSplitError(
      makeBody({ code: "ERR-203", category: "AUTHENTICATION" }),
      401
    );
    const session = { getToken: jest.fn().mockResolvedValue(null) };
    const clerk = { signOut: jest.fn().mockResolvedValue(undefined), session };
    const result = await handleApiError(err, toast, router, clerk);
    expect(clerk.signOut).toHaveBeenCalled();
    expect(result).toEqual({ action: "HANDLED" });
  });

  // --- AUTHORIZATION ---

  it("shows toast and navigates back for ERR-204", async () => {
    const err = makeSplitError(
      makeBody({ code: "ERR-204", category: "AUTHORIZATION" }),
      403
    );
    const result = await handleApiError(err, toast, router);
    expect(toast.error).toHaveBeenCalledWith("You're not a member of this group.");
    expect(router.back).toHaveBeenCalled();
    expect(result).toEqual({ action: "HANDLED" });
  });

  it("shows toast for generic authorization error", async () => {
    const err = makeSplitError(
      makeBody({ code: "ERR-201", category: "AUTHORIZATION" }),
      403
    );
    const result = await handleApiError(err, toast, router);
    expect(toast.error).toHaveBeenCalledWith("You don't have permission to do that.");
    expect(router.back).not.toHaveBeenCalled();
    expect(result).toEqual({ action: "HANDLED" });
  });

  // --- VALIDATION ---

  it("returns field errors for ERR-100 with details", async () => {
    const err = makeSplitError(
      makeBody({
        code: "ERR-100",
        category: "VALIDATION",
        details: { name: "Name is required", email: "Invalid email" },
      }),
      400
    );
    const result = await handleApiError(err, toast, router);
    expect(result).toEqual({
      action: "FIELD_ERRORS",
      errors: { name: "Name is required", email: "Invalid email" },
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it("shows toast for validation error without details", async () => {
    const err = makeSplitError(
      makeBody({ code: "ERR-101", category: "VALIDATION" }),
      400
    );
    const result = await handleApiError(err, toast, router);
    expect(toast.error).toHaveBeenCalled();
    expect(result).toEqual({ action: "HANDLED" });
  });

  // --- RESOURCE ---

  it("returns REFETCH for ERR-302 (optimistic lock)", async () => {
    const err = makeSplitError(
      makeBody({ code: "ERR-302", category: "RESOURCE" }),
      409
    );
    const result = await handleApiError(err, toast, router);
    expect(toast.info).toHaveBeenCalledWith(
      "Someone else just edited this. Refreshing..."
    );
    expect(result).toEqual({ action: "REFETCH" });
  });

  it("shows toast for ERR-300 (not found)", async () => {
    const err = makeSplitError(
      makeBody({ code: "ERR-300", category: "RESOURCE" }),
      404
    );
    const result = await handleApiError(err, toast, router);
    expect(toast.error).toHaveBeenCalled();
    expect(result).toEqual({ action: "HANDLED" });
  });

  // --- BUSINESS LOGIC ---

  it("uses info toast for business logic errors", async () => {
    const err = makeSplitError(
      makeBody({ code: "ERR-407", category: "BUSINESS_LOGIC" }),
      422
    );
    const result = await handleApiError(err, toast, router);
    expect(toast.info).toHaveBeenCalledWith(
      "You already sent a reminder recently. Try again later."
    );
    expect(result).toEqual({ action: "HANDLED" });
  });

  // --- NETWORK ---

  it("shows network error toast for TypeError", async () => {
    const err = new TypeError("Failed to fetch");
    const result = await handleApiError(err, toast, router);
    expect(toast.error).toHaveBeenCalledWith(
      "No internet connection. Please check your network."
    );
    expect(result).toEqual({ action: "HANDLED" });
  });

  // --- GENERIC FALLBACK ---

  it("shows generic toast for unparseable errors", async () => {
    const err = new Error("Something unexpected");
    const result = await handleApiError(err, toast, router);
    expect(toast.error).toHaveBeenCalledWith(
      "Something went wrong. Please try again."
    );
    expect(result).toEqual({ action: "HANDLED" });
  });

  // --- EXTERNAL SERVICE ---

  it("shows error toast for external service errors", async () => {
    const err = makeSplitError(
      makeBody({ code: "ERR-500", category: "EXTERNAL_SERVICE" }),
      500
    );
    const result = await handleApiError(err, toast, router);
    expect(toast.error).toHaveBeenCalledWith(
      "Something went wrong on our end. Please try again."
    );
    expect(result).toEqual({ action: "HANDLED" });
  });

  // --- ADDITIONAL EDGE CASES ---

  it("shows toast for ERR-100 validation without details field", async () => {
    const err = makeSplitError(
      makeBody({ code: "ERR-100", category: "VALIDATION" }),
      400
    );
    const result = await handleApiError(err, toast, router);
    expect(toast.error).toHaveBeenCalledWith("Please fix the errors below.");
    expect(result).toEqual({ action: "HANDLED" });
  });

  it("still redirects when clerk is undefined for auth errors", async () => {
    const err = makeSplitError(
      makeBody({ code: "ERR-200", category: "AUTHENTICATION" }),
      401
    );
    const result = await handleApiError(err, toast, router);
    expect(router.replace).toHaveBeenCalledWith("/(auth)");
    expect(result).toEqual({ action: "HANDLED" });
  });

  it("signs out and redirects when token refresh throws", async () => {
    const err = makeSplitError(
      makeBody({ code: "ERR-203", category: "AUTHENTICATION" }),
      401
    );
    const session = { getToken: jest.fn().mockRejectedValue(new Error("refresh failed")) };
    const clerk = { signOut: jest.fn().mockResolvedValue(undefined), session };
    const result = await handleApiError(err, toast, router, clerk);
    expect(clerk.signOut).toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith("/(auth)");
    expect(result).toEqual({ action: "HANDLED" });
  });

  it("still redirects when clerk.signOut rejects", async () => {
    const err = makeSplitError(
      makeBody({ code: "ERR-200", category: "AUTHENTICATION" }),
      401
    );
    const clerk = { signOut: jest.fn().mockRejectedValue(new Error("signout failed")) };
    const result = await handleApiError(err, toast, router, clerk);
    expect(router.replace).toHaveBeenCalledWith("/(auth)");
    expect(result).toEqual({ action: "HANDLED" });
  });
});
