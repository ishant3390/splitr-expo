import { getIdempotencyKey, clearIdempotencyKey, withIdempotency } from "@/lib/idempotency";
import { SplitError } from "@/lib/errors";
import AsyncStorage from "@react-native-async-storage/async-storage";

// expo-crypto is mocked in setup.ts — randomUUID returns a fixed value
jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "test-uuid-1234"),
}));

beforeEach(() => {
  (AsyncStorage.getItem as jest.Mock).mockReset();
  (AsyncStorage.setItem as jest.Mock).mockReset();
  (AsyncStorage.removeItem as jest.Mock).mockReset();
  (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
  (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
});

describe("getIdempotencyKey", () => {
  it("generates a new UUID and persists it", async () => {
    const key = await getIdempotencyKey("op-1");
    expect(key).toBe("test-uuid-1234");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("@splitr/idem:op-1", "test-uuid-1234");
  });

  it("returns existing key from storage (crash recovery)", async () => {
    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce("existing-key")
      .mockResolvedValueOnce(String(Date.now()));
    const key = await getIdempotencyKey("op-2");
    expect(key).toBe("existing-key");
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it("rotates existing key when timestamp metadata is missing", async () => {
    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce("legacy-key")
      .mockResolvedValueOnce(null);

    const key = await getIdempotencyKey("op-legacy");
    expect(key).toBe("test-uuid-1234");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("@splitr/idem:op-legacy");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("@splitr/idem_ts:op-legacy");
  });

  it("generates fresh key when storage read fails", async () => {
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error("storage error"));
    const key = await getIdempotencyKey("op-3");
    expect(key).toBe("test-uuid-1234");
  });

  it("rotates expired keys based on TTL", async () => {
    const oldTs = Date.now() - (1000 * 60 * 60 * 25);
    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce("expired-key")
      .mockResolvedValueOnce(String(oldTs));

    const key = await getIdempotencyKey("op-expired");
    expect(key).toBe("test-uuid-1234");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("@splitr/idem:op-expired");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("@splitr/idem_ts:op-expired");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("@splitr/idem:op-expired", "test-uuid-1234");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith("@splitr/idem_ts:op-expired", expect.any(String));
  });
});

describe("clearIdempotencyKey", () => {
  it("removes key from storage", async () => {
    await clearIdempotencyKey("op-1");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("@splitr/idem:op-1");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("@splitr/idem_ts:op-1");
  });

  it("does not throw when storage fails", async () => {
    (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(new Error("fail"));
    await expect(clearIdempotencyKey("op-1")).resolves.toBeUndefined();
  });
});

describe("withIdempotency", () => {
  it("passes idempotency key to fn and clears on success", async () => {
    const fn = jest.fn().mockResolvedValue({ id: "result" });
    const result = await withIdempotency("op-success", fn);
    expect(result).toEqual({ id: "result" });
    expect(fn).toHaveBeenCalledWith("test-uuid-1234");
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("@splitr/idem:op-success");
  });

  it("clears key and throws on ERR-414 (param mismatch)", async () => {
    const err = new SplitError(
      { code: "ERR-414", category: "BUSINESS_LOGIC", message: "Param mismatch", status: 400 },
      400
    );
    const fn = jest.fn().mockRejectedValue(err);
    await expect(withIdempotency("op-414", fn)).rejects.toThrow(SplitError);
    expect(fn).toHaveBeenCalledTimes(1); // no retry
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith("@splitr/idem:op-414");
  });

  it("clears key and throws on other 4xx errors without retrying", async () => {
    const err = new SplitError(
      { code: "ERR-409", category: "BUSINESS_LOGIC", message: "Already member", status: 422 },
      422
    );
    const fn = jest.fn().mockRejectedValue(err);
    await expect(withIdempotency("op-4xx", fn)).rejects.toThrow(SplitError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on ERR-415 (in-flight) with same key", async () => {
    const inFlight = new SplitError(
      { code: "ERR-415", category: "BUSINESS_LOGIC", message: "In flight", status: 409 },
      409
    );
    const fn = jest.fn()
      .mockRejectedValueOnce(inFlight)
      .mockResolvedValueOnce({ id: "ok" });

    const result = await withIdempotency("op-415", fn);
    expect(result).toEqual({ id: "ok" });
    expect(fn).toHaveBeenCalledTimes(2);
    // Both calls use the same key
    expect(fn).toHaveBeenNthCalledWith(1, "test-uuid-1234");
    expect(fn).toHaveBeenNthCalledWith(2, "test-uuid-1234");
  });

  it("throws after MAX_RETRIES exceeded", async () => {
    const err = new SplitError(
      { code: "ERR-415", category: "BUSINESS_LOGIC", message: "In flight", status: 409 },
      409
    );
    const fn = jest.fn().mockRejectedValue(err);
    await expect(withIdempotency("op-max", fn)).rejects.toThrow(SplitError);
    expect(fn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    expect(AsyncStorage.removeItem).not.toHaveBeenCalledWith("@splitr/idem:op-max");
  });

  it("preserves key after retry exhaustion on network error", async () => {
    const fn = jest.fn().mockRejectedValue(new Error("Network down"));
    await expect(withIdempotency("op-network", fn)).rejects.toThrow("Network down");
    expect(fn).toHaveBeenCalledTimes(4);
    expect(AsyncStorage.removeItem).not.toHaveBeenCalledWith("@splitr/idem:op-network");
  });
});
