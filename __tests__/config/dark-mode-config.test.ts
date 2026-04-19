import * as fs from "fs";
import * as path from "path";

const root = path.resolve(__dirname, "../..");
const tailwindConfigPath = path.join(root, "tailwind.config.js");
const globalCssPath = path.join(root, "global.css");

// eslint-disable-next-line @typescript-eslint/no-var-requires
const tailwindConfig = require(tailwindConfigPath);
const globalCss = fs.readFileSync(globalCssPath, "utf-8");

describe("Dark mode configuration", () => {
  describe("tailwind.config.js", () => {
    it("uses 'media' darkMode strategy so NativeWind follows system preference on native", () => {
      // With "class", useColorScheme() always returns "light" on iOS/Android
      // because no CSS .dark class is ever added to the native view hierarchy.
      expect(tailwindConfig.darkMode).toBe("media");
    });
  });

  describe("global.css", () => {
    it("contains a @media (prefers-color-scheme: dark) block", () => {
      expect(globalCss).toMatch(/@media\s*\(prefers-color-scheme:\s*dark\)/);
    });

    it("sets --color-background to black (#000000) in dark mode", () => {
      // Verify the dark block actually overrides the light value
      const darkBlockMatch = globalCss.match(
        /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{[\s\S]*?\}/
      );
      expect(darkBlockMatch).not.toBeNull();
      expect(darkBlockMatch![0]).toContain("--color-background: #000000");
    });

    it("sets --color-card to #0d0d0d in dark mode", () => {
      const darkBlockMatch = globalCss.match(
        /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{[\s\S]*?\}/
      );
      expect(darkBlockMatch).not.toBeNull();
      expect(darkBlockMatch![0]).toContain("--color-card: #0d0d0d");
    });

    it("sets --color-foreground to #f1f5f9 in dark mode", () => {
      const darkBlockMatch = globalCss.match(
        /@media\s*\(prefers-color-scheme:\s*dark\)\s*\{[\s\S]*?\}/
      );
      expect(darkBlockMatch).not.toBeNull();
      expect(darkBlockMatch![0]).toContain("--color-foreground: #f1f5f9");
    });

    it("retains light mode --color-background as #f8fafb in :root", () => {
      // The :root block (before any media query) should have the light value
      const rootBlockMatch = globalCss.match(/:root\s*\{[\s\S]*?\}/);
      expect(rootBlockMatch).not.toBeNull();
      expect(rootBlockMatch![0]).toContain("--color-background: #f8fafb");
    });

    it("retains .dark class block for web manual override", () => {
      // NativeWind adds .dark to <html> on web when setColorScheme("dark") is called
      expect(globalCss).toMatch(/\.dark\s*\{/);
    });
  });
});
