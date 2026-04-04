import { getLocales } from "expo-localization";
import { detectDefaultCurrency, CURRENCIES, CURRENCY_CODES } from "@/lib/currencies";

const mockGetLocales = getLocales as jest.Mock;

describe("currencies", () => {
  describe("CURRENCIES", () => {
    it("has 7 supported currencies", () => {
      expect(CURRENCIES).toHaveLength(7);
    });

    it("each currency has code, symbol, and flag", () => {
      for (const c of CURRENCIES) {
        expect(c.code).toBeTruthy();
        expect(c.symbol).toBeTruthy();
        expect(c.flag).toBeTruthy();
      }
    });

    it("includes expected currencies", () => {
      const codes = CURRENCIES.map((c) => c.code);
      expect(codes).toEqual(["USD", "EUR", "GBP", "INR", "CAD", "AUD", "JPY"]);
    });
  });

  describe("CURRENCY_CODES", () => {
    it("matches CURRENCIES codes", () => {
      expect(CURRENCY_CODES).toEqual(CURRENCIES.map((c) => c.code));
    });
  });

  describe("detectDefaultCurrency", () => {
    it("returns USD for US region", () => {
      mockGetLocales.mockReturnValue([{ regionCode: "US" }]);
      expect(detectDefaultCurrency()).toBe("USD");
    });

    it("returns GBP for GB region", () => {
      mockGetLocales.mockReturnValue([{ regionCode: "GB" }]);
      expect(detectDefaultCurrency()).toBe("GBP");
    });

    it("returns GBP for UK region", () => {
      mockGetLocales.mockReturnValue([{ regionCode: "UK" }]);
      expect(detectDefaultCurrency()).toBe("GBP");
    });

    it("returns INR for IN region", () => {
      mockGetLocales.mockReturnValue([{ regionCode: "IN" }]);
      expect(detectDefaultCurrency()).toBe("INR");
    });

    it("returns CAD for CA region", () => {
      mockGetLocales.mockReturnValue([{ regionCode: "CA" }]);
      expect(detectDefaultCurrency()).toBe("CAD");
    });

    it("returns AUD for AU region", () => {
      mockGetLocales.mockReturnValue([{ regionCode: "AU" }]);
      expect(detectDefaultCurrency()).toBe("AUD");
    });

    it("returns JPY for JP region", () => {
      mockGetLocales.mockReturnValue([{ regionCode: "JP" }]);
      expect(detectDefaultCurrency()).toBe("JPY");
    });

    it("returns EUR for eurozone countries", () => {
      for (const region of ["DE", "FR", "IT", "ES", "NL", "BE", "AT", "PT", "IE"]) {
        mockGetLocales.mockReturnValue([{ regionCode: region }]);
        expect(detectDefaultCurrency()).toBe("EUR");
      }
    });

    it("handles lowercase region codes", () => {
      mockGetLocales.mockReturnValue([{ regionCode: "gb" }]);
      expect(detectDefaultCurrency()).toBe("GBP");
    });

    it("returns USD for unknown region", () => {
      mockGetLocales.mockReturnValue([{ regionCode: "ZZ" }]);
      expect(detectDefaultCurrency()).toBe("USD");
    });

    it("returns USD when regionCode is null", () => {
      mockGetLocales.mockReturnValue([{ regionCode: null }]);
      expect(detectDefaultCurrency()).toBe("USD");
    });

    it("returns USD when locales array is empty", () => {
      mockGetLocales.mockReturnValue([]);
      expect(detectDefaultCurrency()).toBe("USD");
    });

    it("returns USD when getLocales throws", () => {
      mockGetLocales.mockImplementation(() => { throw new Error("not available"); });
      expect(detectDefaultCurrency()).toBe("USD");
    });
  });
});
