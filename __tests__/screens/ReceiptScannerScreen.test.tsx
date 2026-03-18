import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import ReceiptScannerScreen from "@/app/receipt-scanner";

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, replace: mockReplace, canGoBack: () => true }),
}));

const mockGetToken = jest.fn(() => Promise.resolve("test-token"));
jest.mock("@clerk/clerk-expo", () => ({
  useAuth: () => ({ getToken: mockGetToken }),
}));

jest.mock("@/lib/haptics", () => ({
  hapticSuccess: jest.fn(),
  hapticWarning: jest.fn(),
}));

const mockScanReceipt = jest.fn();
jest.mock("@/lib/api", () => ({
  expensesApi: { scanReceipt: (...args: any[]) => mockScanReceipt(...args) },
}));

jest.mock("expo-image-picker", () => ({
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ status: "granted" })),
  launchCameraAsync: jest.fn(() =>
    Promise.resolve({ canceled: false, assets: [{ uri: "file://photo.jpg", base64: "abc123" }] })
  ),
  launchImageLibraryAsync: jest.fn(() =>
    Promise.resolve({ canceled: false, assets: [{ uri: "file://gallery.jpg", base64: "def456" }] })
  ),
}));

const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
jest.mock("@/components/ui/toast", () => ({
  useToast: () => mockToast,
}));

const MOCK_RECEIPT = {
  merchant: "Test Cafe",
  date: "2026-03-06",
  currency: "USD",
  subtotalCents: 1500,
  taxCents: 120,
  tipCents: 0,
  totalCents: 1620,
  lineItems: [
    { description: "Coffee", amountCents: 500, quantity: 1 },
    { description: "Sandwich", amountCents: 1000, quantity: 1 },
  ],
  confidence: { overall: 0.95, total: 0.99, date: 0.97, merchant: 0.92, lineItems: 0.88 },
};

const MOCK_RESPONSE = {
  receipt: MOCK_RECEIPT,
  dailyScansUsed: 1,
  dailyScanLimit: 2,
};

describe("ReceiptScannerScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders the initial capture screen", () => {
    render(<ReceiptScannerScreen />);
    expect(screen.getByText("Scan a Receipt")).toBeTruthy();
    expect(screen.getByText("Take Photo")).toBeTruthy();
    expect(screen.getByText("Choose from Gallery")).toBeTruthy();
  });

  it("renders header with back button", () => {
    render(<ReceiptScannerScreen />);
    expect(screen.getByText("Scan Receipt")).toBeTruthy();
  });

  it("calls camera on Take Photo press and sends to API", async () => {
    mockScanReceipt.mockResolvedValueOnce(MOCK_RESPONSE);
    render(<ReceiptScannerScreen />);

    fireEvent.press(screen.getByText("Take Photo"));

    await waitFor(() => {
      expect(mockScanReceipt).toHaveBeenCalledWith("abc123", "test-token");
    });
  });

  it("calls gallery on Choose from Gallery press", async () => {
    mockScanReceipt.mockResolvedValueOnce(MOCK_RESPONSE);
    render(<ReceiptScannerScreen />);

    fireEvent.press(screen.getByText("Choose from Gallery"));

    await waitFor(() => {
      expect(mockScanReceipt).toHaveBeenCalledWith("def456", "test-token");
    });
  });

  it("displays scan results with merchant, items, and total", async () => {
    mockScanReceipt.mockResolvedValueOnce(MOCK_RESPONSE);
    render(<ReceiptScannerScreen />);

    fireEvent.press(screen.getByText("Take Photo"));

    await waitFor(() => {
      expect(screen.getByText("Test Cafe")).toBeTruthy();
      expect(screen.getByText("Coffee")).toBeTruthy();
      expect(screen.getByText("Sandwich")).toBeTruthy();
      expect(screen.getByText("Create Expense")).toBeTruthy();
    });
  });

  it("navigates to add expense with scanned data", async () => {
    mockScanReceipt.mockResolvedValueOnce(MOCK_RESPONSE);
    render(<ReceiptScannerScreen />);

    fireEvent.press(screen.getByText("Take Photo"));

    await waitFor(() => {
      expect(screen.getByText("Create Expense")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Create Expense"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/(tabs)/add",
      params: {
        amount: "16.2",
        description: "Test Cafe",
        date: "2026-03-06",
      },
    });
  });

  it("shows error state on scan failure", async () => {
    mockScanReceipt.mockRejectedValueOnce(new Error("Network error"));
    render(<ReceiptScannerScreen />);

    fireEvent.press(screen.getByText("Take Photo"));

    await waitFor(() => {
      expect(screen.getByText("Scan Failed")).toBeTruthy();
      expect(screen.getByText("Failed to scan receipt. Please try again.")).toBeTruthy();
    });
  });

  it("allows scanning another receipt after results", async () => {
    mockScanReceipt.mockResolvedValueOnce(MOCK_RESPONSE);
    render(<ReceiptScannerScreen />);

    fireEvent.press(screen.getByText("Take Photo"));

    await waitFor(() => {
      expect(screen.getByText("Scan Another")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Scan Another"));

    expect(screen.getByText("Scan a Receipt")).toBeTruthy();
  });

  it("shows confidence badge for low-confidence line items", async () => {
    const lowConfResponse = {
      receipt: {
        ...MOCK_RECEIPT,
        confidence: { ...MOCK_RECEIPT.confidence, lineItems: 0.65 },
      },
      dailyScansUsed: 1,
      dailyScanLimit: 2,
    };
    mockScanReceipt.mockResolvedValueOnce(lowConfResponse);
    render(<ReceiptScannerScreen />);

    fireEvent.press(screen.getByText("Take Photo"));

    await waitFor(() => {
      expect(screen.getAllByText("Verify").length).toBeGreaterThan(0);
    });
  });

  it("shows quota usage after successful scan", async () => {
    mockScanReceipt.mockResolvedValueOnce(MOCK_RESPONSE);
    render(<ReceiptScannerScreen />);

    fireEvent.press(screen.getByText("Take Photo"));

    await waitFor(() => {
      expect(screen.getByText(/1 of 2 free scans used today/)).toBeTruthy();
    });
  });

  // B34: Split via Chat button
  it("shows 'Split via Chat' button after scan results", async () => {
    mockScanReceipt.mockResolvedValueOnce(MOCK_RESPONSE);
    render(<ReceiptScannerScreen />);

    fireEvent.press(screen.getByText("Take Photo"));

    await waitFor(() => {
      expect(screen.getByText("Split via Chat")).toBeTruthy();
    });
  });

  it("navigates to chat with receipt message on Split via Chat", async () => {
    mockScanReceipt.mockResolvedValueOnce(MOCK_RESPONSE);
    render(<ReceiptScannerScreen />);

    fireEvent.press(screen.getByText("Take Photo"));

    await waitFor(() => {
      expect(screen.getByText("Split via Chat")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Split via Chat"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/chat",
      params: {
        receiptMessage: "Split $16.20 from Test Cafe on 2026-03-06. Items: Coffee $5.00, Sandwich $10.00",
      },
    });
  });

  it("shows error toast when camera permission is denied", async () => {
    const ImagePicker = require("expo-image-picker");
    ImagePicker.requestCameraPermissionsAsync.mockResolvedValueOnce({ status: "denied" });

    render(<ReceiptScannerScreen />);
    fireEvent.press(screen.getByText("Take Photo"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Please allow camera access to scan receipts.");
    });
  });

  it("shows error toast when media library permission is denied", async () => {
    const ImagePicker = require("expo-image-picker");
    ImagePicker.requestMediaLibraryPermissionsAsync.mockResolvedValueOnce({ status: "denied" });

    render(<ReceiptScannerScreen />);
    fireEvent.press(screen.getByText("Choose from Gallery"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Please allow access to your photo library.");
    });
  });

  it("handles camera cancel (no image selected)", async () => {
    const ImagePicker = require("expo-image-picker");
    ImagePicker.launchCameraAsync.mockResolvedValueOnce({ canceled: true, assets: [] });

    render(<ReceiptScannerScreen />);
    fireEvent.press(screen.getByText("Take Photo"));

    await waitFor(() => {
      // Should stay on capture screen
      expect(screen.getByText("Scan a Receipt")).toBeTruthy();
    });
  });

  it("handles gallery cancel (no image selected)", async () => {
    const ImagePicker = require("expo-image-picker");
    ImagePicker.launchImageLibraryAsync.mockResolvedValueOnce({ canceled: true, assets: [] });

    render(<ReceiptScannerScreen />);
    fireEvent.press(screen.getByText("Choose from Gallery"));

    await waitFor(() => {
      expect(screen.getByText("Scan a Receipt")).toBeTruthy();
    });
  });

  it("shows Try Again and New Photo buttons on error", async () => {
    mockScanReceipt.mockRejectedValueOnce(new Error("API error"));
    render(<ReceiptScannerScreen />);

    fireEvent.press(screen.getByText("Take Photo"));

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeTruthy();
      expect(screen.getByText("New Photo")).toBeTruthy();
    });
  });

  it("retries scan on Try Again press", async () => {
    mockScanReceipt.mockRejectedValueOnce(new Error("Fail"));
    render(<ReceiptScannerScreen />);

    fireEvent.press(screen.getByText("Take Photo"));

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeTruthy();
    });

    mockScanReceipt.mockResolvedValueOnce(MOCK_RESPONSE);
    fireEvent.press(screen.getByText("Try Again"));

    await waitFor(() => {
      expect(mockScanReceipt).toHaveBeenCalledTimes(2);
    });
  });

  it("resets to capture screen on New Photo press", async () => {
    mockScanReceipt.mockRejectedValueOnce(new Error("Fail"));
    render(<ReceiptScannerScreen />);

    fireEvent.press(screen.getByText("Take Photo"));

    await waitFor(() => {
      expect(screen.getByText("New Photo")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("New Photo"));
    expect(screen.getByText("Scan a Receipt")).toBeTruthy();
  });

  it("shows daily limit reached when quota is exhausted", async () => {
    mockScanReceipt.mockResolvedValueOnce({
      receipt: MOCK_RECEIPT,
      dailyScansUsed: 2,
      dailyScanLimit: 2,
    });
    render(<ReceiptScannerScreen />);

    fireEvent.press(screen.getByText("Take Photo"));

    await waitFor(() => {
      expect(screen.getByText("Daily scan limit reached. Resets tomorrow.")).toBeTruthy();
      expect(screen.queryByText("Scan Another")).toBeNull();
    });
  });

  it("shows low overall confidence warning", async () => {
    const lowConfResponse = {
      receipt: {
        ...MOCK_RECEIPT,
        confidence: { ...MOCK_RECEIPT.confidence, overall: 0.65 },
      },
      dailyScansUsed: 1,
      dailyScanLimit: 3,
    };
    mockScanReceipt.mockResolvedValueOnce(lowConfResponse);
    render(<ReceiptScannerScreen />);

    fireEvent.press(screen.getByText("Take Photo"));

    await waitFor(() => {
      expect(screen.getByText(/Some fields have low confidence/)).toBeTruthy();
    });
  });

  it("shows subtotal, tax, and tip in results", async () => {
    const withTipResponse = {
      receipt: {
        ...MOCK_RECEIPT,
        tipCents: 300,
      },
      dailyScansUsed: 1,
      dailyScanLimit: 3,
    };
    mockScanReceipt.mockResolvedValueOnce(withTipResponse);
    render(<ReceiptScannerScreen />);

    fireEvent.press(screen.getByText("Take Photo"));

    await waitFor(() => {
      expect(screen.getByText("Subtotal")).toBeTruthy();
      expect(screen.getByText("Tax")).toBeTruthy();
      expect(screen.getByText("Tip")).toBeTruthy();
    });
  });

  it("shows Scanned badge on the receipt image after scan", async () => {
    mockScanReceipt.mockResolvedValueOnce(MOCK_RESPONSE);
    render(<ReceiptScannerScreen />);

    fireEvent.press(screen.getByText("Take Photo"));

    await waitFor(() => {
      expect(screen.getByText("Scanned")).toBeTruthy();
    });
  });

  it("shows currency badge when result has currency", async () => {
    mockScanReceipt.mockResolvedValueOnce(MOCK_RESPONSE);
    render(<ReceiptScannerScreen />);

    fireEvent.press(screen.getByText("Take Photo"));

    await waitFor(() => {
      expect(screen.getByText("USD")).toBeTruthy();
    });
  });

  it("handles not authenticated error", async () => {
    mockGetToken.mockResolvedValueOnce(null);
    render(<ReceiptScannerScreen />);

    fireEvent.press(screen.getByText("Take Photo"));

    await waitFor(() => {
      expect(screen.getByText("Scan Failed")).toBeTruthy();
      expect(screen.getByText("Failed to scan receipt. Please try again.")).toBeTruthy();
    });
  });

  it("shows date in results", async () => {
    mockScanReceipt.mockResolvedValueOnce(MOCK_RESPONSE);
    render(<ReceiptScannerScreen />);

    fireEvent.press(screen.getByText("Take Photo"));

    await waitFor(() => {
      expect(screen.getByText("2026-03-06")).toBeTruthy();
    });
  });

  it("includes 'and X more' in chat message when >5 line items", async () => {
    const manyItemsReceipt = {
      ...MOCK_RECEIPT,
      lineItems: [
        { description: "Item 1", amountCents: 100, quantity: 1 },
        { description: "Item 2", amountCents: 200, quantity: 1 },
        { description: "Item 3", amountCents: 300, quantity: 1 },
        { description: "Item 4", amountCents: 400, quantity: 1 },
        { description: "Item 5", amountCents: 500, quantity: 1 },
        { description: "Item 6", amountCents: 600, quantity: 1 },
        { description: "Item 7", amountCents: 700, quantity: 1 },
      ],
    };
    mockScanReceipt.mockResolvedValueOnce({
      receipt: manyItemsReceipt,
      dailyScansUsed: 1,
      dailyScanLimit: 3,
    });
    render(<ReceiptScannerScreen />);

    fireEvent.press(screen.getByText("Take Photo"));

    await waitFor(() => {
      expect(screen.getByText("Split via Chat")).toBeTruthy();
    });

    fireEvent.press(screen.getByText("Split via Chat"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/chat",
      params: {
        receiptMessage: expect.stringContaining("and 2 more"),
      },
    });
    // Should only include first 5 items
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/chat",
      params: {
        receiptMessage: expect.stringContaining("Item 5 $5.00"),
      },
    });
    // Item 6 should NOT be in the message
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/chat",
      params: {
        receiptMessage: expect.not.stringContaining("Item 6"),
      },
    });
  });

  it("shows low confidence badge for merchant", async () => {
    const lowMerchantConf = {
      receipt: {
        ...MOCK_RECEIPT,
        confidence: { ...MOCK_RECEIPT.confidence, merchant: 0.6 },
      },
      dailyScansUsed: 1,
      dailyScanLimit: 3,
    };
    mockScanReceipt.mockResolvedValueOnce(lowMerchantConf);
    render(<ReceiptScannerScreen />);

    fireEvent.press(screen.getByText("Take Photo"));

    await waitFor(() => {
      expect(screen.getAllByText("Verify").length).toBeGreaterThan(0);
    });
  });
});
