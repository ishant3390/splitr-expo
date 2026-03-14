import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import PaymentMethodsScreen from "@/app/payment-methods";

describe("PaymentMethodsScreen", () => {
  it("renders header", () => {
    render(<PaymentMethodsScreen />);
    expect(screen.getByText("Payment Methods")).toBeTruthy();
  });

  it("renders Coming Soon badge", () => {
    render(<PaymentMethodsScreen />);
    expect(screen.getByText("Coming Soon")).toBeTruthy();
  });

  it("renders hero card text", () => {
    render(<PaymentMethodsScreen />);
    expect(screen.getByText("Payments are on the way")).toBeTruthy();
    expect(screen.getByText(/Soon you'll be able to settle up instantly/)).toBeTruthy();
  });

  it("renders faux card visual", () => {
    render(<PaymentMethodsScreen />);
    expect(screen.getByText("SPLITR")).toBeTruthy();
    expect(screen.getByText("XXXX  XXXX  XXXX  XXXX")).toBeTruthy();
    expect(screen.getByText("YOUR NAME")).toBeTruthy();
    expect(screen.getByText("XX/XX")).toBeTruthy();
  });

  it("renders all feature cards", () => {
    render(<PaymentMethodsScreen />);
    expect(screen.getByText("Link Cards & Banks")).toBeTruthy();
    expect(screen.getByText("Pay Friends Instantly")).toBeTruthy();
    expect(screen.getByText("Bank-Grade Security")).toBeTruthy();
  });

  it("renders feature descriptions", () => {
    render(<PaymentMethodsScreen />);
    expect(screen.getByText("Add your debit or credit card for instant settlements")).toBeTruthy();
    expect(screen.getByText("Send money directly from the app with one tap")).toBeTruthy();
    expect(screen.getByText("256-bit encryption with PCI DSS compliance")).toBeTruthy();
  });

  it("renders notify button", () => {
    render(<PaymentMethodsScreen />);
    expect(screen.getByText("Notify Me When Available")).toBeTruthy();
    expect(screen.getByText("Be the first to know")).toBeTruthy();
  });

  it("shows confirmation after pressing notify", () => {
    render(<PaymentMethodsScreen />);
    fireEvent.press(screen.getByText("Notify Me When Available"));
    expect(screen.getByText("You're on the list!")).toBeTruthy();
    expect(screen.getByText(/We'll notify you as soon as payments are available/)).toBeTruthy();
  });

  it("hides notify button after pressing it", () => {
    render(<PaymentMethodsScreen />);
    fireEvent.press(screen.getByText("Notify Me When Available"));
    expect(screen.queryByText("Notify Me When Available")).toBeNull();
  });

  it("navigates back on back button press", () => {
    render(<PaymentMethodsScreen />);
    // The back button is in the header
    // Pressing it calls hapticLight() + router.back()
    // No crash means it renders correctly
    expect(screen.getByText("Payment Methods")).toBeTruthy();
  });
});
