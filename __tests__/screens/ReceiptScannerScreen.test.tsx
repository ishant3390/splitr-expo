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
      expect(screen.getByText("Network error")).toBeTruthy();
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
});
