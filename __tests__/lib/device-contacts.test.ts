import { Platform } from "react-native";
import * as Contacts from "expo-contacts";
import { contactsApi } from "@/lib/api";
import {
  requestContactsPermission,
  getContactsPermission,
  readDeviceContacts,
  chunkAndMatch,
} from "@/lib/device-contacts";

// Mock expo-contacts
jest.mock("expo-contacts", () => ({
  requestPermissionsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  getContactsAsync: jest.fn(),
  Fields: {
    Emails: "emails",
    PhoneNumbers: "phoneNumbers",
  },
  SortTypes: {
    FirstName: "firstName",
  },
}));

// Mock API
jest.mock("@/lib/api", () => ({
  contactsApi: {
    matchContacts: jest.fn(),
  },
}));

const mockContacts = Contacts as jest.Mocked<typeof Contacts>;
const mockContactsApi = contactsApi as jest.Mocked<typeof contactsApi>;

describe("device-contacts", () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(Platform, "OS", { value: originalPlatform });
  });

  describe("requestContactsPermission", () => {
    it("returns 'unavailable' on web", async () => {
      Object.defineProperty(Platform, "OS", { value: "web" });
      const result = await requestContactsPermission();
      expect(result).toBe("unavailable");
      expect(mockContacts.requestPermissionsAsync).not.toHaveBeenCalled();
    });

    it("returns 'granted' when permission granted", async () => {
      Object.defineProperty(Platform, "OS", { value: "ios" });
      mockContacts.requestPermissionsAsync.mockResolvedValue({
        status: "granted" as any,
        granted: true,
        canAskAgain: true,
        expires: "never",
      });
      const result = await requestContactsPermission();
      expect(result).toBe("granted");
    });

    it("returns 'denied' when permission denied", async () => {
      Object.defineProperty(Platform, "OS", { value: "ios" });
      mockContacts.requestPermissionsAsync.mockResolvedValue({
        status: "denied" as any,
        granted: false,
        canAskAgain: true,
        expires: "never",
      });
      const result = await requestContactsPermission();
      expect(result).toBe("denied");
    });
  });

  describe("getContactsPermission", () => {
    it("returns 'unavailable' on web", async () => {
      Object.defineProperty(Platform, "OS", { value: "web" });
      const result = await getContactsPermission();
      expect(result).toBe("unavailable");
    });

    it("returns 'granted' when already granted", async () => {
      Object.defineProperty(Platform, "OS", { value: "android" });
      mockContacts.getPermissionsAsync.mockResolvedValue({
        status: "granted" as any,
        granted: true,
        canAskAgain: true,
        expires: "never",
      });
      const result = await getContactsPermission();
      expect(result).toBe("granted");
    });
  });

  describe("readDeviceContacts", () => {
    it("returns empty array on web", async () => {
      Object.defineProperty(Platform, "OS", { value: "web" });
      const result = await readDeviceContacts();
      expect(result).toEqual([]);
    });

    it("normalizes contacts with first email and phone", async () => {
      Object.defineProperty(Platform, "OS", { value: "ios" });
      mockContacts.getContactsAsync.mockResolvedValue({
        data: [
          {
            id: "1",
            contactType: "person" as any,
            firstName: "Alice",
            lastName: "Smith",
            emails: [{ email: "alice@example.com", label: "home" }],
            phoneNumbers: [{ number: "+15551234567", label: "mobile" }],
          },
          {
            id: "2",
            contactType: "person" as any,
            firstName: "Bob",
            lastName: null,
            emails: [],
            phoneNumbers: [{ number: "+15559876543", label: "mobile" }],
          },
        ] as any,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      const result = await readDeviceContacts();
      expect(result).toEqual([
        { name: "Alice Smith", email: "alice@example.com", phone: "+15551234567" },
        { name: "Bob", email: undefined, phone: "+15559876543" },
      ]);
    });

    it("skips contacts with no name", async () => {
      Object.defineProperty(Platform, "OS", { value: "ios" });
      mockContacts.getContactsAsync.mockResolvedValue({
        data: [
          { id: "1", contactType: "person" as any, firstName: null, lastName: null, phoneNumbers: [{ number: "+1555" }] },
        ] as any,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      const result = await readDeviceContacts();
      expect(result).toEqual([]);
    });

    it("skips contacts with no email and no phone", async () => {
      Object.defineProperty(Platform, "OS", { value: "ios" });
      mockContacts.getContactsAsync.mockResolvedValue({
        data: [
          { id: "1", contactType: "person" as any, firstName: "Charlie", lastName: "Brown" },
        ] as any,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      const result = await readDeviceContacts();
      expect(result).toEqual([]);
    });

    it("deduplicates by email", async () => {
      Object.defineProperty(Platform, "OS", { value: "ios" });
      mockContacts.getContactsAsync.mockResolvedValue({
        data: [
          {
            id: "1",
            contactType: "person" as any,
            firstName: "Alice",
            emails: [{ email: "alice@example.com" }],
          },
          {
            id: "2",
            contactType: "person" as any,
            firstName: "Alice Work",
            emails: [{ email: "alice@example.com" }],
          },
        ] as any,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      const result = await readDeviceContacts();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice");
    });

    it("deduplicates by phone number (digits only)", async () => {
      Object.defineProperty(Platform, "OS", { value: "ios" });
      mockContacts.getContactsAsync.mockResolvedValue({
        data: [
          {
            id: "1",
            contactType: "person" as any,
            firstName: "Alice",
            phoneNumbers: [{ number: "+1 (555) 123-4567" }],
          },
          {
            id: "2",
            contactType: "person" as any,
            firstName: "Alice Work",
            phoneNumbers: [{ number: "15551234567" }],
          },
        ] as any,
        hasNextPage: false,
        hasPreviousPage: false,
      });

      const result = await readDeviceContacts();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice");
    });
  });

  describe("chunkAndMatch", () => {
    it("sends contacts in a single batch when under limit", async () => {
      const contacts = [
        { name: "Alice", email: "alice@example.com" },
        { name: "Bob", phone: "+15551234567" },
      ];

      mockContactsApi.matchContacts.mockResolvedValue({
        matched: [{ contactIndex: 0, userId: "usr_1", name: "Alice" }],
        unmatched: [{ contactIndex: 1, name: "Bob", phone: "+15551234567" }],
      });

      const result = await chunkAndMatch(contacts, "token");
      expect(mockContactsApi.matchContacts).toHaveBeenCalledTimes(1);
      expect(result.matched).toHaveLength(1);
      expect(result.unmatched).toHaveLength(1);
    });

    it("returns empty results for empty contacts array", async () => {
      const result = await chunkAndMatch([], "token");
      expect(mockContactsApi.matchContacts).not.toHaveBeenCalled();
      expect(result).toEqual({ matched: [], unmatched: [] });
    });

    it("treats failed batch contacts as unmatched (partial failure)", async () => {
      const contacts = [
        { name: "Alice", email: "alice@example.com" },
        { name: "Bob", phone: "+15551234567" },
      ];

      mockContactsApi.matchContacts.mockRejectedValue(new Error("Network error"));

      const result = await chunkAndMatch(contacts, "token");
      expect(result.matched).toHaveLength(0);
      expect(result.unmatched).toHaveLength(2);
      expect(result.unmatched[0].name).toBe("Alice");
      expect(result.unmatched[1].name).toBe("Bob");
    });

    it("chunks contacts into batches of 500 and merges results with offset", async () => {
      // Create 600 contacts
      const contacts = Array.from({ length: 600 }, (_, i) => ({
        name: `Contact ${i}`,
        phone: `+1555000${String(i).padStart(4, "0")}`,
      }));

      // First batch (0-499)
      mockContactsApi.matchContacts
        .mockResolvedValueOnce({
          matched: [{ contactIndex: 0, userId: "usr_1", name: "Contact 0" }],
          unmatched: [{ contactIndex: 499, name: "Contact 499", phone: "+15550000499" }],
        })
        // Second batch (500-599)
        .mockResolvedValueOnce({
          matched: [],
          unmatched: [{ contactIndex: 50, name: "Contact 550", phone: "+15550000550" }],
        });

      const result = await chunkAndMatch(contacts, "token");

      expect(mockContactsApi.matchContacts).toHaveBeenCalledTimes(2);
      // First batch: contactIndex 0 stays 0
      expect(result.matched[0].contactIndex).toBe(0);
      // First batch: contactIndex 499 stays 499
      expect(result.unmatched[0].contactIndex).toBe(499);
      // Second batch: contactIndex 50 → 550 (offset by 500)
      expect(result.unmatched[1].contactIndex).toBe(550);
    });
  });
});
