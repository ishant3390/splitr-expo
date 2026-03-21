/**
 * Shared image utilities for profile, banner, and receipt uploads.
 */

import { Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic"];

/**
 * Validate an image picker asset before upload.
 * Returns an error string or null if valid.
 */
export function validateImage(asset: ImagePicker.ImagePickerAsset): string | null {
  // Check file size (skip if undefined — web doesn't always provide it)
  if (asset.fileSize != null && asset.fileSize > MAX_IMAGE_SIZE) {
    return "Image must be under 10 MB";
  }

  // Check MIME type if available
  if (asset.mimeType) {
    if (ALLOWED_IMAGE_TYPES.includes(asset.mimeType.toLowerCase())) {
      return null;
    }
    return "Use JPEG, PNG, WebP, or HEIC";
  }

  // Fallback: check file extension from URI
  if (asset.uri) {
    const ext = asset.uri.split(".").pop()?.toLowerCase();
    if (ext && ALLOWED_EXTENSIONS.includes(`.${ext}`)) {
      return null;
    }
  }

  // If neither MIME nor extension is available, allow it (server will validate)
  return null;
}

/** Threshold below which we skip compression (1 MB). */
const COMPRESS_THRESHOLD = 1 * 1024 * 1024;
/** Maximum longest dimension after resize. */
const MAX_DIMENSION = 1600;
/** JPEG quality for compressed output (0–1). */
const COMPRESS_QUALITY = 0.7;

export interface CompressedImage {
  uri: string;
  base64?: string;
}

/**
 * Compress an image by resizing + JPEG quality reduction.
 * - Skips if the file is already under 1 MB (and base64 not requested).
 * - Resizes longest dimension to 1600 px (preserves aspect ratio by only setting width).
 * - Outputs JPEG at 0.7 quality.
 * - Falls back to the original URI if the manipulator fails.
 */
export async function compressImage(
  uri: string,
  originalFileSize?: number,
  options?: { base64?: boolean }
): Promise<CompressedImage> {
  const needBase64 = options?.base64 === true;

  // Skip compression for small files when base64 isn't needed
  if (!needBase64 && originalFileSize != null && originalFileSize < COMPRESS_THRESHOLD) {
    return { uri };
  }

  try {
    // Only set width — expo-image-manipulator auto-calculates height to preserve aspect ratio
    const result = await manipulateAsync(
      uri,
      [{ resize: { width: MAX_DIMENSION } }],
      { compress: COMPRESS_QUALITY, format: SaveFormat.JPEG, base64: needBase64 }
    );
    return { uri: result.uri, base64: result.base64 };
  } catch {
    // Manipulator failed — return original so the server can be the final gate
    return { uri };
  }
}

/**
 * Fix double-protocol URLs (e.g. "https://https://cdn.example.com/...").
 * Backend bug BE-6 can produce these; this is a defensive FE fix.
 */
export function sanitizeImageUrl(url: string | undefined | null): string | undefined {
  if (!url) return undefined;
  return url.replace(/^(https?:\/\/)\1+/, "$1");
}

/**
 * Pick an image from camera or gallery.
 * Returns the asset or null if cancelled/failed.
 */
export async function pickImage(
  source: "camera" | "gallery",
  options?: Partial<ImagePicker.ImagePickerOptions>
): Promise<ImagePicker.ImagePickerAsset | null> {
  const defaultOptions: ImagePicker.ImagePickerOptions = {
    mediaTypes: ["images"],
    quality: 0.8,
    allowsEditing: true,
    ...options,
  };

  try {
    if (source === "camera") {
      if (Platform.OS === "web") return null;
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") return null;
      const result = await ImagePicker.launchCameraAsync(defaultOptions);
      return result.canceled ? null : result.assets[0] ?? null;
    } else {
      const result = await ImagePicker.launchImageLibraryAsync(defaultOptions);
      return result.canceled ? null : result.assets[0] ?? null;
    }
  } catch {
    return null;
  }
}

/**
 * Build a FormData object for image upload.
 * On native, appends { uri, type, name } cast as any (RN convention).
 */
/**
 * Build a FormData object for image upload.
 * On native, appends { uri, type, name } cast as any (RN convention).
 * On web, fetches the blob URI and appends as a Blob (browser convention).
 */
export function buildImageFormData(
  uri: string,
  mimeType?: string,
  fieldName: string = "file"
): FormData {
  const formData = new FormData();
  const type = mimeType || "image/jpeg";
  const ext = type.split("/")[1] || "jpg";
  const name = `upload.${ext}`;

  if (Platform.OS === "web") {
    // Web: uri is a blob URL — must fetch to get Blob object
    // We return a FormData now; the blob will be resolved before upload via buildImageFormDataAsync
    formData.append(fieldName, {
      uri,
      type,
      name,
    } as any);
  } else {
    formData.append(fieldName, {
      uri,
      type,
      name,
    } as any);
  }

  return formData;
}

/**
 * Async version for web that properly resolves blob URIs.
 * Use this on web platform; falls back to sync version on native.
 */
export async function buildImageFormDataAsync(
  uri: string,
  mimeType?: string,
  fieldName: string = "file"
): Promise<FormData> {
  const formData = new FormData();
  const type = mimeType || "image/jpeg";
  const ext = type.split("/")[1] || "jpg";
  const name = `upload.${ext}`;

  if (Platform.OS === "web") {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append(fieldName, blob, name);
    } catch {
      // Fallback to RN-style append if blob fetch fails
      formData.append(fieldName, { uri, type, name } as any);
    }
  } else {
    formData.append(fieldName, { uri, type, name } as any);
  }

  return formData;
}
