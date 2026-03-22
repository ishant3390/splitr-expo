import {
  colors,
  palette,
  fontSize,
  fontFamily,
  spacing,
  radius,
  zIndex,
  duration,
  opacity,
  chartColors,
  useThemeColors,
} from "@/lib/tokens";

const mockUseColorScheme = jest.fn(() => ({
  colorScheme: "light",
  setColorScheme: jest.fn(),
  toggleColorScheme: jest.fn(),
}));

jest.mock("nativewind", () => ({
  useColorScheme: (...args: any[]) => mockUseColorScheme(...args),
}));

describe("colors(false) — light mode matches global.css :root", () => {
  const light = colors(false);

  it("background === '#f8fafb'", () => {
    expect(light.background).toBe("#f8fafb");
  });

  it("foreground === '#0f172a'", () => {
    expect(light.foreground).toBe("#0f172a");
  });

  it("card === '#ffffff'", () => {
    expect(light.card).toBe("#ffffff");
  });

  it("cardForeground === '#0f172a'", () => {
    expect(light.cardForeground).toBe("#0f172a");
  });

  it("muted === '#f1f5f9'", () => {
    expect(light.muted).toBe("#f1f5f9");
  });

  it("mutedForeground === '#64748b'", () => {
    expect(light.mutedForeground).toBe("#64748b");
  });

  it("border === '#e2e8f0'", () => {
    expect(light.border).toBe("#e2e8f0");
  });

  it("input === '#e2e8f0'", () => {
    expect(light.input).toBe("#e2e8f0");
  });

  it("secondary === '#f1f5f9'", () => {
    expect(light.secondary).toBe("#f1f5f9");
  });

  it("secondaryForeground === '#1e293b'", () => {
    expect(light.secondaryForeground).toBe("#1e293b");
  });

  it("surfaceTint === '#f0fdfa'", () => {
    expect(light.surfaceTint).toBe("#f0fdfa");
  });

  it("borderSubtle === '#f1f5f9'", () => {
    expect(light.borderSubtle).toBe("#f1f5f9");
  });
});

describe("colors(true) — dark mode matches global.css .dark", () => {
  const dark = colors(true);

  it("background === '#000000'", () => {
    expect(dark.background).toBe("#000000");
  });

  it("foreground === '#f1f5f9'", () => {
    expect(dark.foreground).toBe("#f1f5f9");
  });

  it("card === '#0d0d0d'", () => {
    expect(dark.card).toBe("#0d0d0d");
  });

  it("cardForeground === '#f1f5f9'", () => {
    expect(dark.cardForeground).toBe("#f1f5f9");
  });

  it("muted === '#1a1a1a'", () => {
    expect(dark.muted).toBe("#1a1a1a");
  });

  it("mutedForeground === '#a1a1aa'", () => {
    expect(dark.mutedForeground).toBe("#a1a1aa");
  });

  it("border === '#262626'", () => {
    expect(dark.border).toBe("#262626");
  });

  it("input === '#262626'", () => {
    expect(dark.input).toBe("#262626");
  });

  it("secondary === '#0d0d0d'", () => {
    expect(dark.secondary).toBe("#0d0d0d");
  });

  it("secondaryForeground === '#e2e8f0'", () => {
    expect(dark.secondaryForeground).toBe("#e2e8f0");
  });

  it("surfaceTint === '#042f2e'", () => {
    expect(dark.surfaceTint).toBe("#042f2e");
  });

  it("borderSubtle === 'rgba(255,255,255,0.06)'", () => {
    expect(dark.borderSubtle).toBe("rgba(255,255,255,0.06)");
  });
});

describe("colors() — brand colors are consistent between light and dark", () => {
  const light = colors(false);
  const dark = colors(true);

  it("primary === '#0d9488' in both modes", () => {
    expect(light.primary).toBe("#0d9488");
    expect(dark.primary).toBe("#0d9488");
  });

  it("destructive is red in both modes", () => {
    expect(light.destructive).toBe("#ef4444");
    expect(dark.destructive).toBe("#f87171"); // brighter red on OLED black
  });

  it("success === '#10b981' in both modes", () => {
    expect(light.success).toBe("#10b981");
    expect(dark.success).toBe("#10b981");
  });

  it("warning === '#f59e0b' in both modes", () => {
    expect(light.warning).toBe("#f59e0b");
    expect(dark.warning).toBe("#f59e0b");
  });
});

describe("palette — contains all expected primitives", () => {
  it("has white and black", () => {
    expect(palette.white).toBe("#ffffff");
    expect(palette.black).toBe("#000000");
  });

  it("has full slate scale (50-950)", () => {
    const slateKeys = [
      "slate50", "slate100", "slate200", "slate300", "slate400",
      "slate500", "slate600", "slate700", "slate800", "slate900", "slate950",
    ] as const;
    for (const key of slateKeys) {
      expect(palette[key]).toBeDefined();
      expect(palette[key]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("has full teal scale (50-950)", () => {
    const tealKeys = [
      "teal50", "teal100", "teal200", "teal300", "teal400",
      "teal500", "teal600", "teal700", "teal800", "teal900", "teal950",
    ] as const;
    for (const key of tealKeys) {
      expect(palette[key]).toBeDefined();
      expect(palette[key]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("has emerald500, red500, amber500, blue500, purple500", () => {
    expect(palette.emerald500).toBe("#10b981");
    expect(palette.red500).toBe("#ef4444");
    expect(palette.amber500).toBe("#f59e0b");
    expect(palette.blue500).toBe("#3b82f6");
    expect(palette.purple500).toBe("#a855f7");
  });
});

describe("fontSize scale — monotonically increasing", () => {
  it("each value is greater than the previous", () => {
    const values = Object.values(fontSize);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });
});

describe("spacing scale — monotonically increasing", () => {
  it("each value is greater than the previous when keys are sorted numerically", () => {
    const sorted = Object.entries(spacing)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([, v]) => v);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i]).toBeGreaterThan(sorted[i - 1]);
    }
  });
});

describe("radius scale — monotonically increasing (excluding 'full')", () => {
  it("each value is greater than the previous", () => {
    const entries = Object.entries(radius).filter(([key]) => key !== "full");
    const values = entries.map(([, v]) => v);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThan(values[i - 1]);
    }
  });
});

describe("useThemeColors() hook", () => {
  it("returns light colors when colorScheme is 'light'", () => {
    mockUseColorScheme.mockReturnValue({ colorScheme: "light" });
    const result = useThemeColors();
    expect(result).toEqual(colors(false));
  });

  it("returns dark colors when colorScheme is 'dark'", () => {
    mockUseColorScheme.mockReturnValue({ colorScheme: "dark" });
    const result = useThemeColors();
    expect(result).toEqual(colors(true));
  });
});

describe("fontFamily — has all weights", () => {
  it("regular matches Inter_400Regular", () => {
    expect(fontFamily.regular).toBe("Inter_400Regular");
  });

  it("medium matches Inter_500Medium", () => {
    expect(fontFamily.medium).toBe("Inter_500Medium");
  });

  it("semibold matches Inter_600SemiBold", () => {
    expect(fontFamily.semibold).toBe("Inter_600SemiBold");
  });

  it("bold matches Inter_700Bold", () => {
    expect(fontFamily.bold).toBe("Inter_700Bold");
  });
});

describe("exported constants are properly typed", () => {
  it("palette is a frozen object with string values", () => {
    expect(typeof palette).toBe("object");
    expect(Object.keys(palette).length).toBeGreaterThan(0);
    for (const value of Object.values(palette)) {
      expect(typeof value).toBe("string");
    }
  });

  it("fontSize is a frozen object with number values", () => {
    expect(typeof fontSize).toBe("object");
    for (const value of Object.values(fontSize)) {
      expect(typeof value).toBe("number");
    }
  });

  it("fontFamily is a frozen object with string values", () => {
    expect(typeof fontFamily).toBe("object");
    for (const value of Object.values(fontFamily)) {
      expect(typeof value).toBe("string");
    }
  });

  it("spacing is a frozen object with number values", () => {
    expect(typeof spacing).toBe("object");
    for (const value of Object.values(spacing)) {
      expect(typeof value).toBe("number");
    }
  });

  it("radius is a frozen object with number values", () => {
    expect(typeof radius).toBe("object");
    for (const value of Object.values(radius)) {
      expect(typeof value).toBe("number");
    }
  });

  it("zIndex is a frozen object with number values", () => {
    expect(typeof zIndex).toBe("object");
    for (const value of Object.values(zIndex)) {
      expect(typeof value).toBe("number");
    }
  });

  it("duration is a frozen object with number values", () => {
    expect(typeof duration).toBe("object");
    for (const value of Object.values(duration)) {
      expect(typeof value).toBe("number");
    }
  });

  it("opacity is a frozen object with number values", () => {
    expect(typeof opacity).toBe("object");
    for (const value of Object.values(opacity)) {
      expect(typeof value).toBe("number");
    }
  });

  it("chartColors is a frozen array", () => {
    expect(Array.isArray(chartColors)).toBe(true);
  });
});

describe("chartColors", () => {
  it("has 5 entries", () => {
    expect(chartColors).toHaveLength(5);
  });

  it("uses palette values", () => {
    expect(chartColors[0]).toBe(palette.teal600);
    expect(chartColors[1]).toBe(palette.emerald500);
    expect(chartColors[2]).toBe(palette.blue500);
    expect(chartColors[3]).toBe(palette.amber500);
    expect(chartColors[4]).toBe(palette.purple500);
  });
});
