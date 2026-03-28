describe("Modal navigation config regression", () => {
  it("keeps settle-up screen on stable card presentation contract", () => {
    const { SETTLE_UP_SCREEN_OPTIONS } = require("@/lib/navigation-options");
    expect(SETTLE_UP_SCREEN_OPTIONS).toMatchObject({
      animation: "slide_from_right",
      presentation: "card",
    });
    expect(SETTLE_UP_SCREEN_OPTIONS.presentation).not.toBe("formSheet");
    expect(SETTLE_UP_SCREEN_OPTIONS).not.toHaveProperty("sheetAllowedDetents");
    expect(SETTLE_UP_SCREEN_OPTIONS).not.toHaveProperty("sheetGrabberVisible");
  });
});
