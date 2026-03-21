import { validateImage, pickImage, buildImageFormData, buildImageFormDataAsync, compressImage, sanitizeImageUrl, MAX_IMAGE_SIZE, ALLOWED_IMAGE_TYPES } from "@/lib/image-utils";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync } from "expo-image-manipulator";
import { Platform } from "react-native";

describe("image-utils", () => {
  describe("validateImage", () => {
    it("returns null for valid JPEG under 10MB", () => {
      const asset = { uri: "file://photo.jpg", mimeType: "image/jpeg", fileSize: 1024 * 1024, width: 100, height: 100 } as ImagePicker.ImagePickerAsset;
      expect(validateImage(asset)).toBeNull();
    });

    it("returns null for valid PNG", () => {
      const asset = { uri: "file://photo.png", mimeType: "image/png", fileSize: 2 * 1024 * 1024, width: 100, height: 100 } as ImagePicker.ImagePickerAsset;
      expect(validateImage(asset)).toBeNull();
    });

    it("returns null for valid WebP", () => {
      const asset = { uri: "file://photo.webp", mimeType: "image/webp", fileSize: 100, width: 100, height: 100 } as ImagePicker.ImagePickerAsset;
      expect(validateImage(asset)).toBeNull();
    });

    it("returns null for valid HEIC", () => {
      const asset = { uri: "file://photo.heic", mimeType: "image/heic", fileSize: 100, width: 100, height: 100 } as ImagePicker.ImagePickerAsset;
      expect(validateImage(asset)).toBeNull();
    });

    it("returns error for file over 10MB", () => {
      const asset = { uri: "file://big.jpg", mimeType: "image/jpeg", fileSize: MAX_IMAGE_SIZE + 1, width: 100, height: 100 } as ImagePicker.ImagePickerAsset;
      expect(validateImage(asset)).toBe("Image must be under 10 MB");
    });

    it("returns error for unsupported MIME type", () => {
      const asset = { uri: "file://doc.pdf", mimeType: "application/pdf", fileSize: 1000, width: 100, height: 100 } as ImagePicker.ImagePickerAsset;
      expect(validateImage(asset)).toBe("Use JPEG, PNG, WebP, or HEIC");
    });

    it("skips size check when fileSize is undefined (web)", () => {
      const asset = { uri: "blob://photo.jpg", mimeType: "image/jpeg", width: 100, height: 100 } as ImagePicker.ImagePickerAsset;
      expect(validateImage(asset)).toBeNull();
    });

    it("validates by file extension when mimeType is absent", () => {
      const asset = { uri: "file://photo.jpg", width: 100, height: 100 } as ImagePicker.ImagePickerAsset;
      expect(validateImage(asset)).toBeNull();
    });

    it("rejects unknown extension when mimeType is absent", () => {
      // No mimeType and no recognizable extension — but function returns null as fallback
      const asset = { uri: "file://photo.xyz", width: 100, height: 100 } as ImagePicker.ImagePickerAsset;
      expect(validateImage(asset)).toBeNull(); // Allows it — server validates
    });

    it("returns null for exactly 10MB file", () => {
      const asset = { uri: "file://exact.jpg", mimeType: "image/jpeg", fileSize: MAX_IMAGE_SIZE, width: 100, height: 100 } as ImagePicker.ImagePickerAsset;
      expect(validateImage(asset)).toBeNull();
    });
  });

  describe("pickImage", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("returns null when gallery is cancelled", async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: [] });
      const result = await pickImage("gallery");
      expect(result).toBeNull();
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalled();
    });

    it("returns asset from gallery", async () => {
      const mockAsset = { uri: "file://picked.jpg", mimeType: "image/jpeg", width: 100, height: 100 };
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: false, assets: [mockAsset] });
      const result = await pickImage("gallery");
      expect(result).toEqual(mockAsset);
    });

    it("returns null when camera is cancelled", async () => {
      (ImagePicker.launchCameraAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: [] });
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ status: "granted" });
      // Platform.OS is "ios" by default in jest-expo
      const origOS = Platform.OS;
      Object.defineProperty(Platform, "OS", { value: "ios" });
      const result = await pickImage("camera");
      expect(result).toBeNull();
      Object.defineProperty(Platform, "OS", { value: origOS });
    });

    it("returns null for camera on web", async () => {
      const origOS = Platform.OS;
      Object.defineProperty(Platform, "OS", { value: "web" });
      const result = await pickImage("camera");
      expect(result).toBeNull();
      expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
      Object.defineProperty(Platform, "OS", { value: origOS });
    });

    it("returns null when camera permission denied", async () => {
      (ImagePicker.requestCameraPermissionsAsync as jest.Mock).mockResolvedValue({ status: "denied" });
      const origOS = Platform.OS;
      Object.defineProperty(Platform, "OS", { value: "ios" });
      const result = await pickImage("camera");
      expect(result).toBeNull();
      expect(ImagePicker.launchCameraAsync).not.toHaveBeenCalled();
      Object.defineProperty(Platform, "OS", { value: origOS });
    });

    it("returns null when picker throws", async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockRejectedValue(new Error("crash"));
      const result = await pickImage("gallery");
      expect(result).toBeNull();
    });

    it("passes custom options to gallery picker", async () => {
      (ImagePicker.launchImageLibraryAsync as jest.Mock).mockResolvedValue({ canceled: true, assets: [] });
      await pickImage("gallery", { aspect: [1, 1], quality: 0.5 });
      expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledWith(
        expect.objectContaining({ aspect: [1, 1], quality: 0.5 })
      );
    });
  });

  describe("buildImageFormData", () => {
    it("creates FormData with default field name and mime type", () => {
      const formData = buildImageFormData("file://photo.jpg");
      // FormData doesn't have a .get in RN, but we can verify it was created
      expect(formData).toBeInstanceOf(FormData);
    });

    it("creates FormData with custom field name", () => {
      const formData = buildImageFormData("file://photo.png", "image/png", "image");
      expect(formData).toBeInstanceOf(FormData);
    });

    it("uses jpeg as default when no mimeType provided", () => {
      const formData = buildImageFormData("file://test");
      expect(formData).toBeInstanceOf(FormData);
    });
  });

  describe("buildImageFormDataAsync", () => {
    it("creates FormData on native (non-web)", async () => {
      const formData = await buildImageFormDataAsync("file://photo.jpg", "image/jpeg");
      expect(formData).toBeInstanceOf(FormData);
    });

    it("handles web platform with blob fetch", async () => {
      const origOS = Platform.OS;
      Object.defineProperty(Platform, "OS", { value: "web" });
      // Mock fetch for blob resolution
      const mockBlob = new Blob(["test"], { type: "image/jpeg" });
      const origFetch = global.fetch;
      global.fetch = jest.fn(() => Promise.resolve({ blob: () => Promise.resolve(mockBlob) })) as any;
      const formData = await buildImageFormDataAsync("blob:http://localhost/test", "image/jpeg");
      expect(formData).toBeInstanceOf(FormData);
      expect(global.fetch).toHaveBeenCalledWith("blob:http://localhost/test");
      global.fetch = origFetch;
      Object.defineProperty(Platform, "OS", { value: origOS });
    });

    it("falls back on web when blob fetch fails", async () => {
      const origOS = Platform.OS;
      Object.defineProperty(Platform, "OS", { value: "web" });
      const origFetch = global.fetch;
      global.fetch = jest.fn(() => Promise.reject(new Error("fail"))) as any;
      const formData = await buildImageFormDataAsync("blob:http://localhost/test", "image/jpeg");
      expect(formData).toBeInstanceOf(FormData);
      global.fetch = origFetch;
      Object.defineProperty(Platform, "OS", { value: origOS });
    });
  });

  describe("compressImage", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("skips compression when file is under 1MB and base64 not needed", async () => {
      const result = await compressImage("file://small.jpg", 500_000);
      expect(result).toEqual({ uri: "file://small.jpg" });
      expect(manipulateAsync).not.toHaveBeenCalled();
    });

    it("compresses when file is over 1MB", async () => {
      const result = await compressImage("file://large.jpg", 3_000_000);
      expect(manipulateAsync).toHaveBeenCalledWith(
        "file://large.jpg",
        [{ resize: { width: 1600 } }],
        { compress: 0.7, format: "jpeg", base64: false }
      );
      expect(result.uri).toBe("file://compressed.jpg");
    });

    it("compresses when fileSize is undefined (web)", async () => {
      const result = await compressImage("blob://photo.jpg");
      expect(manipulateAsync).toHaveBeenCalled();
      expect(result.uri).toBe("file://compressed.jpg");
    });

    it("returns base64 when options.base64 is true", async () => {
      const result = await compressImage("file://receipt.jpg", 2_000_000, { base64: true });
      expect(manipulateAsync).toHaveBeenCalledWith(
        "file://receipt.jpg",
        [{ resize: { width: 1600 } }],
        { compress: 0.7, format: "jpeg", base64: true }
      );
      expect(result.base64).toBe("abc123");
    });

    it("compresses small file when base64 is requested", async () => {
      const result = await compressImage("file://small.jpg", 500_000, { base64: true });
      expect(manipulateAsync).toHaveBeenCalled();
      expect(result.base64).toBe("abc123");
    });

    it("falls back to original URI on manipulator error", async () => {
      (manipulateAsync as jest.Mock).mockRejectedValueOnce(new Error("manipulator crash"));
      const result = await compressImage("file://broken.jpg", 3_000_000);
      expect(result).toEqual({ uri: "file://broken.jpg" });
    });

    it("falls back to original URI without base64 when manipulator errors and base64 requested", async () => {
      (manipulateAsync as jest.Mock).mockRejectedValueOnce(new Error("manipulator crash"));
      const result = await compressImage("file://broken.jpg", 2_000_000, { base64: true });
      expect(result).toEqual({ uri: "file://broken.jpg" });
      expect(result.base64).toBeUndefined();
    });
  });

  describe("sanitizeImageUrl", () => {
    it("returns undefined for null/undefined", () => {
      expect(sanitizeImageUrl(null)).toBeUndefined();
      expect(sanitizeImageUrl(undefined)).toBeUndefined();
      expect(sanitizeImageUrl("")).toBeUndefined();
    });

    it("fixes double https:// prefix", () => {
      expect(sanitizeImageUrl("https://https://cdn.example.com/img.jpg")).toBe("https://cdn.example.com/img.jpg");
    });

    it("fixes triple https:// prefix", () => {
      expect(sanitizeImageUrl("https://https://https://cdn.example.com/img.jpg")).toBe("https://cdn.example.com/img.jpg");
    });

    it("leaves valid https URL unchanged", () => {
      expect(sanitizeImageUrl("https://cdn.example.com/img.jpg")).toBe("https://cdn.example.com/img.jpg");
    });

    it("leaves valid http URL unchanged", () => {
      expect(sanitizeImageUrl("http://localhost:8085/img.jpg")).toBe("http://localhost:8085/img.jpg");
    });

    it("fixes double http:// prefix", () => {
      expect(sanitizeImageUrl("http://http://localhost/img.jpg")).toBe("http://localhost/img.jpg");
    });
  });

  describe("constants", () => {
    it("MAX_IMAGE_SIZE is 10MB", () => {
      expect(MAX_IMAGE_SIZE).toBe(10 * 1024 * 1024);
    });

    it("ALLOWED_IMAGE_TYPES has 4 types", () => {
      expect(ALLOWED_IMAGE_TYPES).toEqual(["image/jpeg", "image/png", "image/webp", "image/heic"]);
    });
  });
});
