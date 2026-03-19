/**
 * Tests for image-related API functions:
 * - usersApi.uploadProfileImage / deleteProfileImage
 * - groupsApi.uploadBanner / deleteBanner
 * - expensesApi.getReceiptUrl / deleteReceipt
 */

const BASE_URL = "http://localhost:8085/api";

// Must mock before importing
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { usersApi, groupsApi, expensesApi } from "@/lib/api";

beforeEach(() => {
  mockFetch.mockReset();
});

describe("usersApi image endpoints", () => {
  describe("uploadProfileImage", () => {
    it("sends POST with FormData and returns UserDto", async () => {
      const mockUser = { id: "usr_1", name: "Alice", profileImageUrl: "https://cdn.splitr.ai/test.jpg" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUser),
      });
      const formData = new FormData();
      const result = await usersApi.uploadProfileImage(formData, "token-123");
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/v1/users/me/profile-image`,
        expect.objectContaining({
          method: "POST",
          headers: { Authorization: "Bearer token-123" },
          body: formData,
        })
      );
      expect(result).toEqual(mockUser);
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify({ code: "ERR-412", category: "VALIDATION", message: "Too large" })),
      });
      const formData = new FormData();
      await expect(usersApi.uploadProfileImage(formData, "token")).rejects.toThrow();
    });
  });

  describe("deleteProfileImage", () => {
    it("sends DELETE and resolves on 204", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });
      await expect(usersApi.deleteProfileImage("token-123")).resolves.toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/v1/users/me/profile-image`,
        expect.objectContaining({ method: "DELETE" })
      );
    });

    it("throws on non-ok response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      });
      await expect(usersApi.deleteProfileImage("token")).rejects.toThrow();
    });
  });
});

describe("groupsApi banner endpoints", () => {
  describe("uploadBanner", () => {
    it("sends POST with FormData and returns GroupDto", async () => {
      const mockGroup = { id: "grp_1", name: "Trip", bannerImageUrl: "https://cdn.splitr.ai/banner.jpg" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockGroup),
      });
      const formData = new FormData();
      const result = await groupsApi.uploadBanner("grp_1", formData, "token-123");
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/v1/groups/grp_1/banner`,
        expect.objectContaining({ method: "POST", body: formData })
      );
      expect(result).toEqual(mockGroup);
    });

    it("throws on error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify({ code: "ERR-413", category: "VALIDATION", message: "Bad format" })),
      });
      await expect(groupsApi.uploadBanner("grp_1", new FormData(), "token")).rejects.toThrow();
    });
  });

  describe("deleteBanner", () => {
    it("sends DELETE and resolves on 204", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });
      await expect(groupsApi.deleteBanner("grp_1", "token-123")).resolves.toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/v1/groups/grp_1/banner`,
        expect.objectContaining({ method: "DELETE" })
      );
    });

    it("throws on error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Server Error"),
      });
      await expect(groupsApi.deleteBanner("grp_1", "token")).rejects.toThrow();
    });
  });
});

describe("expensesApi receipt endpoints", () => {
  describe("getReceiptUrl", () => {
    it("returns signed URL object", async () => {
      const mockResponse = { url: "https://r2.splitr.ai/receipts/exp_1/receipt.jpg?sig=abc" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(JSON.stringify(mockResponse)),
      });
      const result = await expensesApi.getReceiptUrl("exp_1", "token-123");
      expect(result).toEqual(mockResponse);
    });

    it("throws on error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve(JSON.stringify({ code: "ERR-500", category: "GENERAL", message: "Failed" })),
      });
      await expect(expensesApi.getReceiptUrl("exp_1", "token")).rejects.toThrow();
    });
  });

  describe("deleteReceipt", () => {
    it("sends DELETE and resolves on 204", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 204 });
      await expect(expensesApi.deleteReceipt("exp_1", "token-123")).resolves.toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/v1/expenses/exp_1/receipt`,
        expect.objectContaining({ method: "DELETE" })
      );
    });

    it("throws on error response", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve("Forbidden"),
      });
      await expect(expensesApi.deleteReceipt("exp_1", "token")).rejects.toThrow();
    });
  });
});
