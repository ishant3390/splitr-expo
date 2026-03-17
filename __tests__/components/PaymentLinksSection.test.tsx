import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { PaymentLinksSection } from "@/components/ui/payment-links-section";
import type { PaymentHandles } from "@/lib/types";

const mockToast = { success: jest.fn(), error: jest.fn(), info: jest.fn() };
jest.mock("@/components/ui/toast", () => ({
  useToast: () => mockToast,
}));

const mockOpenPaymentLink = jest.fn(() => Promise.resolve(true));
jest.mock("@/lib/payment-links", () => {
  const actual = jest.requireActual("@/lib/payment-links");
  return {
    ...actual,
    openPaymentLink: (...args: any[]) => mockOpenPaymentLink(...args),
  };
});

const mockOpenURL = jest.fn(() => Promise.resolve(true));
jest.mock("react-native/Libraries/Linking/Linking", () => ({
  openURL: (...args: any[]) => mockOpenURL(...args),
  canOpenURL: jest.fn(() => Promise.resolve(false)),
}));

const handles: PaymentHandles = {
  venmoUsername: "alice",
  paypalUsername: "alice123",
  zelleContact: "alice@test.com",
};

const defaultProps = {
  providers: ["venmo" as const, "paypal" as const, "zelle" as const],
  creditorHandles: handles,
  amount: 50,
  currency: "USD",
  creditorName: "Alice",
  onPaymentInitiated: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe("PaymentLinksSection", () => {
  it("renders provider pills", () => {
    render(<PaymentLinksSection {...defaultProps} />);
    expect(screen.getByText("Venmo")).toBeTruthy();
    expect(screen.getByText("PayPal")).toBeTruthy();
    expect(screen.getByText("Zelle")).toBeTruthy();
  });

  it("renders 'Pay Directly' header", () => {
    render(<PaymentLinksSection {...defaultProps} />);
    expect(screen.getByText("Pay Directly")).toBeTruthy();
  });

  it("renders nothing when no providers", () => {
    const { toJSON } = render(
      <PaymentLinksSection {...defaultProps} providers={[]} />
    );
    expect(toJSON()).toBeNull();
  });

  it("calls onPaymentInitiated on venmo press", async () => {
    render(<PaymentLinksSection {...defaultProps} />);
    fireEvent.press(screen.getByText("Venmo"));
    await waitFor(() => {
      expect(defaultProps.onPaymentInitiated).toHaveBeenCalledWith("venmo");
    });
  });

  it("calls onPaymentInitiated on paypal press", async () => {
    render(<PaymentLinksSection {...defaultProps} />);
    fireEvent.press(screen.getByText("PayPal"));
    await waitFor(() => {
      expect(defaultProps.onPaymentInitiated).toHaveBeenCalledWith("paypal");
    });
  });

  it("copies contact and shows toast for zelle", async () => {
    render(<PaymentLinksSection {...defaultProps} />);
    fireEvent.press(screen.getByText("Zelle"));
    await waitFor(() => {
      expect(mockToast.info).toHaveBeenCalledWith(
        expect.stringContaining("Open your banking app")
      );
      expect(defaultProps.onPaymentInitiated).toHaveBeenCalledWith("zelle");
    });
  });

  it("has accessibility labels on pills", () => {
    render(<PaymentLinksSection {...defaultProps} />);
    expect(screen.getByLabelText("Pay with Venmo")).toBeTruthy();
    expect(screen.getByLabelText("Pay with PayPal")).toBeTruthy();
    expect(screen.getByLabelText("Pay with Zelle")).toBeTruthy();
  });

  it("shows Cash App disclaimer", async () => {
    render(
      <PaymentLinksSection
        {...defaultProps}
        providers={["cashapp"]}
        creditorHandles={{ cashAppTag: "alice" }}
      />
    );
    fireEvent.press(screen.getByText("Cash App"));
    await waitFor(() => {
      expect(mockToast.info).toHaveBeenCalledWith(
        expect.stringContaining("Amount can't be pre-filled")
      );
    });
  });

  describe("region vs other methods grouping", () => {
    it("shows 'Your other methods' separator with region pills before and other pills after", () => {
      render(
        <PaymentLinksSection
          {...defaultProps}
          providers={["paypal", "venmo"]}
          creditorHandles={{ paypalUsername: "alice", venmoUsername: "alice" }}
          regionProviderCount={1}
        />
      );
      expect(screen.getByText("PayPal")).toBeTruthy();
      expect(screen.getByText("Your other methods")).toBeTruthy();
      expect(screen.getByText("Venmo")).toBeTruthy();

      // Verify ordering: collect all visible text nodes and check relative positions
      const allText = screen.root.findAll((node) => typeof node.children?.[0] === "string");
      const texts = allText.map((n) => n.children![0] as string);
      const paypalPos = texts.indexOf("PayPal");
      const separatorPos = texts.indexOf("Your other methods");
      const venmoPos = texts.indexOf("Venmo");
      expect(paypalPos).toBeGreaterThan(-1);
      expect(separatorPos).toBeGreaterThan(-1);
      expect(venmoPos).toBeGreaterThan(-1);
      expect(paypalPos).toBeLessThan(separatorPos);
      expect(separatorPos).toBeLessThan(venmoPos);
    });

    it("hides separator when all providers are region", () => {
      render(
        <PaymentLinksSection
          {...defaultProps}
          providers={["venmo", "paypal"]}
          regionProviderCount={2}
        />
      );
      expect(screen.queryByText("Your other methods")).toBeNull();
    });

    it("hides separator when all providers are non-region (regionCount=0)", () => {
      render(
        <PaymentLinksSection
          {...defaultProps}
          providers={["upi"]}
          creditorHandles={{ upiVpa: "test@upi" }}
          regionProviderCount={0}
        />
      );
      // All pills shown flat under "Pay Directly", no misleading separator
      expect(screen.queryByText("Your other methods")).toBeNull();
      expect(screen.getByText("UPI")).toBeTruthy();
    });

    it("defaults regionProviderCount to providers.length when not passed", () => {
      render(
        <PaymentLinksSection
          {...defaultProps}
          providers={["venmo", "paypal"]}
        />
      );
      // No regionProviderCount → all treated as region → no separator
      expect(screen.queryByText("Your other methods")).toBeNull();
    });
  });
});
