/**
 * Device contacts utilities — permission handling, reading, normalization, and batch matching.
 * Native-only (expo-contacts); all functions return early / no-op on web.
 */

import { Platform } from "react-native";
import * as Contacts from "expo-contacts";
import { contactsApi } from "./api";
import type {
  DeviceContact,
  ContactMatchResponse,
  MatchedContact,
  UnmatchedContact,
} from "./types";

const BATCH_SIZE = 500;

export type ContactsPermissionStatus = "granted" | "denied" | "unavailable";

/**
 * Request contacts permission. Returns "unavailable" on web.
 */
export async function requestContactsPermission(): Promise<ContactsPermissionStatus> {
  if (Platform.OS === "web") return "unavailable";

  const { status } = await Contacts.requestPermissionsAsync();
  return status === "granted" ? "granted" : "denied";
}

/**
 * Check current contacts permission without prompting.
 */
export async function getContactsPermission(): Promise<ContactsPermissionStatus> {
  if (Platform.OS === "web") return "unavailable";

  const { status } = await Contacts.getPermissionsAsync();
  return status === "granted" ? "granted" : "denied";
}

/**
 * Read device contacts via expo-contacts.
 * Returns normalized DeviceContact[] with first email + first phone per contact.
 * Deduplicates by phone number (keeps first occurrence).
 */
export async function readDeviceContacts(): Promise<DeviceContact[]> {
  if (Platform.OS === "web") return [];

  const { data } = await Contacts.getContactsAsync({
    fields: [Contacts.Fields.Emails, Contacts.Fields.PhoneNumbers],
    sort: Contacts.SortTypes.FirstName,
  });

  const seenPhones = new Set<string>();
  const seenEmails = new Set<string>();
  const results: DeviceContact[] = [];

  for (const contact of data) {
    const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
    if (!name) continue;

    const email = contact.emails?.[0]?.email?.trim().toLowerCase() || undefined;
    const phone = contact.phoneNumbers?.[0]?.number?.trim() || undefined;

    // Skip contacts with no email and no phone — can't match or invite
    if (!email && !phone) continue;

    // Deduplicate by phone (normalized: digits only) and email
    if (phone) {
      const normalized = phone.replace(/\D/g, "");
      if (seenPhones.has(normalized)) continue;
      seenPhones.add(normalized);
    }
    if (email) {
      if (seenEmails.has(email)) continue;
      seenEmails.add(email);
    }

    results.push({ name, email, phone });
  }

  return results;
}

/**
 * Send device contacts to the match API in batches of 500.
 * Merges results from all batches, adjusting contactIndex offsets.
 */
export async function chunkAndMatch(
  contacts: DeviceContact[],
  token: string,
): Promise<ContactMatchResponse> {
  const allMatched: MatchedContact[] = [];
  const allUnmatched: UnmatchedContact[] = [];

  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE);
    try {
      const result = await contactsApi.matchContacts({ contacts: batch }, token);

      // Offset contactIndex to reflect position in the full array
      for (const m of result.matched) {
        allMatched.push({ ...m, contactIndex: m.contactIndex + i });
      }
      for (const u of result.unmatched) {
        allUnmatched.push({ ...u, contactIndex: u.contactIndex + i });
      }
    } catch {
      // Partial failure: treat failed batch contacts as unmatched so they still appear
      for (let j = 0; j < batch.length; j++) {
        allUnmatched.push({ contactIndex: i + j, ...batch[j] });
      }
    }
  }

  return { matched: allMatched, unmatched: allUnmatched };
}
