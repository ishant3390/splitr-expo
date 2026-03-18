/**
 * audit-tokens.ts — Scans the Splitr codebase for hardcoded visual values
 * that should use design tokens from lib/tokens.ts.
 *
 * Usage: npx tsx scripts/audit-tokens.ts
 *
 * Exit code 1 if errors found, 0 if only warnings (or clean).
 */

import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// ANSI color helpers
// ---------------------------------------------------------------------------
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const WHITE = "\x1b[37m";
const MAGENTA = "\x1b[35m";

const error = (s: string) => `${RED}${s}${RESET}`;
const warn = (s: string) => `${YELLOW}${s}${RESET}`;
const success = (s: string) => `${GREEN}${s}${RESET}`;
const dim = (s: string) => `${DIM}${s}${RESET}`;
const bold = (s: string) => `${BOLD}${s}${RESET}`;
const cyan = (s: string) => `${CYAN}${s}${RESET}`;
const magenta = (s: string) => `${MAGENTA}${s}${RESET}`;

// ---------------------------------------------------------------------------
// Hex → token mapping (single values)
// ---------------------------------------------------------------------------
const HEX_TOKEN_MAP: Record<string, string> = {
  "#0d9488": "colors().primary",
  "#14b8a6": "colors().accent",
  "#ffffff": "palette.white / colors().card",
  "#fff": "palette.white / colors().card",
  "#0f172a": "colors().foreground (light) / colors().background (dark)",
  "#f8fafb": "colors().background",
  "#f8fafc": "colors().background / palette.slate50",
  "#1e293b": "colors().card (dark) / colors().secondaryForeground",
  "#f1f5f9": "colors().muted / colors().foreground (dark)",
  "#64748b": "colors().mutedForeground",
  "#94a3b8": "colors().mutedForeground (dark) / palette.slate400",
  "#e2e8f0": "colors().border",
  "#334155": "colors().border (dark) / colors().muted (dark)",
  "#ef4444": "colors().destructive",
  "#10b981": "colors().success",
  "#f59e0b": "colors().warning",
  "#cbd5e1": "palette.slate300",
  "#475569": "palette.slate600",
  "#000000": "palette.black",
  "#000": "palette.black",
  "#ccfbf1": "palette.teal100",
  "#5eead4": "palette.teal300",
  "#2dd4bf": "palette.teal400",
  "#0f766e": "palette.teal700",
  "#115e59": "palette.teal800",
  "#134e4a": "palette.teal900",
  "#042f2e": "palette.teal950",
  "#f0fdfa": "palette.teal50",
  "#99f6e4": "palette.teal200",
  "#059669": "palette.emerald600",
  "#0891b2": "palette.cyan600",
  "#3b82f6": "palette.blue500",
  "#a855f7": "palette.purple500",
  "#ec4899": "palette.pink500",
  "#f97316": "palette.orange500",
  "#6366f1": "palette.indigo500",
  "#020617": "palette.slate950",
};

// ---------------------------------------------------------------------------
// isDark ternary pair → token mapping
// ---------------------------------------------------------------------------
interface TernaryMapping {
  dark: string;
  light: string;
  token: string;
}

const TERNARY_PAIRS: TernaryMapping[] = [
  { dark: "#94a3b8", light: "#64748b", token: "colors().mutedForeground" },
  { dark: "#f1f5f9", light: "#0f172a", token: "colors().foreground" },
  { dark: "#334155", light: "#e2e8f0", token: "colors().border" },
  { dark: "#334155", light: "#f1f5f9", token: "colors().muted" },
  { dark: "#1e293b", light: "#ffffff", token: "colors().card" },
  { dark: "#0f172a", light: "#f8fafb", token: "colors().background" },
  { dark: "#0f172a", light: "#ffffff", token: "colors().card / colors().background" },
  { dark: "#1e293b", light: "#f1f5f9", token: "colors().secondary" },
  { dark: "#0f172a", light: "#f8fafc", token: "colors().background" },
  { dark: "#1e293b", light: "#fff", token: "colors().card" },
];

// ---------------------------------------------------------------------------
// Violation types
// ---------------------------------------------------------------------------
type Severity = "error" | "warning";

interface Violation {
  file: string;
  line: number;
  severity: Severity;
  category: string;
  match: string;
  suggestion: string;
}

// ---------------------------------------------------------------------------
// File discovery
// ---------------------------------------------------------------------------
// Resolve project root: the directory containing package.json (one level up from scripts/)
const SCRIPT_DIR = import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(SCRIPT_DIR, "..");
const SCAN_DIRS = ["app", "components", "lib"];
const EXTENSIONS = new Set([".tsx", ".ts"]);

const EXCLUDED_SEGMENTS = ["__tests__", "icons"];
const EXCLUDED_FILES = ["tokens.ts", "gradients.ts", "shadows.ts", "category-icons.ts"];

function shouldInclude(filePath: string): boolean {
  const rel = path.relative(ROOT, filePath);
  const segments = rel.split(path.sep);

  // Exclude directories
  if (segments.some((s) => EXCLUDED_SEGMENTS.includes(s))) return false;

  // Exclude specific files
  const basename = path.basename(filePath);
  if (EXCLUDED_FILES.includes(basename)) return false;
  if (basename.includes(".test.")) return false;

  // Must have valid extension
  return EXTENSIONS.has(path.extname(filePath));
}

function walkDir(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath));
    } else if (entry.isFile() && shouldInclude(fullPath)) {
      results.push(fullPath);
    }
  }
  return results;
}

function discoverFiles(): string[] {
  const files: string[] = [];
  for (const dir of SCAN_DIRS) {
    files.push(...walkDir(path.join(ROOT, dir)));
  }
  return files.sort();
}

// ---------------------------------------------------------------------------
// Detection patterns
// ---------------------------------------------------------------------------

/**
 * Normalize a hex color to lowercase 6-char form for lookup.
 * Returns null if not a standard 3 or 6 char hex.
 */
function normalizeHex(hex: string): string {
  const h = hex.toLowerCase();
  // Keep short form for lookup too (we have #fff, #000 in the map)
  return h;
}

function checkTernary(line: string, lineNum: number, filePath: string): Violation | null {
  // Match: isDark ? "#hex" : "#hex"  or  isDark ? '#hex' : '#hex'
  const ternaryRe =
    /isDark\s*\?\s*["'](\#[0-9a-fA-F]{3,8})["']\s*:\s*["'](\#[0-9a-fA-F]{3,8})["']/g;

  let m: RegExpExecArray | null;
  while ((m = ternaryRe.exec(line)) !== null) {
    const darkVal = m[1].toLowerCase();
    const lightVal = m[2].toLowerCase();

    const mapping = TERNARY_PAIRS.find(
      (p) => p.dark === darkVal && p.light === lightVal
    );

    if (mapping) {
      return {
        file: filePath,
        line: lineNum,
        severity: "error",
        category: "isDark ternary",
        match: m[0],
        suggestion: mapping.token,
      };
    }

    // Still an error — known hex values used in ternary but pair not mapped
    const darkToken = HEX_TOKEN_MAP[darkVal];
    const lightToken = HEX_TOKEN_MAP[lightVal];
    if (darkToken || lightToken) {
      return {
        file: filePath,
        line: lineNum,
        severity: "error",
        category: "isDark ternary",
        match: m[0],
        suggestion: `dark: ${darkToken ?? "unknown"}, light: ${lightToken ?? "unknown"}`,
      };
    }

    // Unknown pair → warning
    return {
      file: filePath,
      line: lineNum,
      severity: "warning",
      category: "isDark ternary (unmapped)",
      match: m[0],
      suggestion: "Extract to colors() semantic token",
    };
  }
  return null;
}

function checkHexColors(line: string, lineNum: number, filePath: string): Violation[] {
  const violations: Violation[] = [];

  // Skip lines that are comments or imports
  const trimmed = line.trim();
  if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("import ")) {
    return violations;
  }

  // Match hex colors in various contexts:
  //   color="#hex", color: "#hex", fill="#hex", stroke="#hex", backgroundColor: "#hex", etc.
  const hexPropRe =
    /(?:color|fill|stroke|backgroundColor|borderColor|tintColor|shadowColor|background|borderBottomColor|borderTopColor|borderLeftColor|borderRightColor)\s*[:=]\s*["'](\#[0-9a-fA-F]{3,8})["']/gi;

  let m: RegExpExecArray | null;
  while ((m = hexPropRe.exec(line)) !== null) {
    const hex = normalizeHex(m[1]);
    const token = HEX_TOKEN_MAP[hex];

    // shadowColor: "#000" is always black — downgrade to warning
    const isShadowBlack =
      /shadowColor/i.test(m[0]) && (hex === "#000" || hex === "#000000");

    violations.push({
      file: filePath,
      line: lineNum,
      severity: isShadowBlack ? "warning" : token ? "error" : "warning",
      category: "hardcoded hex color",
      match: m[0],
      suggestion: token ?? "Add to palette or use existing token",
    });
  }

  // Catch standalone hex strings in style objects not caught above
  // e.g., { someKey: "#0d9488" } — but avoid matching imports, className strings, etc.
  const standaloneHexRe = /:\s*["'](\#[0-9a-fA-F]{3,8})["']/g;
  while ((m = standaloneHexRe.exec(line)) !== null) {
    const hex = normalizeHex(m[1]);
    // Avoid duplicates from the prop regex above
    const alreadyCaught = violations.some(
      (v) => v.line === lineNum && v.match.includes(m![1])
    );
    if (alreadyCaught) continue;

    // Only flag if it looks like a style context (not className or route string)
    // Heuristic: the line should contain a style-related keyword or be inside a style object
    if (
      /style|Style|color|Color|background|Background|border|Border|fill|stroke|shadow|tint/i.test(
        line
      )
    ) {
      const token = HEX_TOKEN_MAP[hex];
      // Data/config objects (TYPE_OPTIONS, EMOJI maps) are domain data, not UI styles
      const isDataObject =
        /OPTIONS|TYPES|EMOJIS|CATEGORIES|ICONS|_MAP|_CONFIG|_COLORS/i.test(line) ||
        /^\s*\{.*color:.*,.*(?:label|name|icon|emoji):/i.test(line);
      violations.push({
        file: filePath,
        line: lineNum,
        severity: isDataObject ? "warning" : token ? "error" : "warning",
        category: "hardcoded hex color",
        match: m[0].trim(),
        suggestion: token ?? "Add to palette or use existing token",
      });
    }
  }

  return violations;
}

function checkFontSize(line: string, lineNum: number, filePath: string): Violation | null {
  const trimmed = line.trim();
  if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("import ")) {
    return null;
  }

  // fontSize: <number> (numeric literal, not a variable reference)
  const re = /fontSize\s*:\s*(\d+(?:\.\d+)?)\b/g;
  const m = re.exec(line);
  if (m) {
    const val = parseFloat(m[1]);
    // Values > 34 are decorative (watermarks, large emojis) — downgrade to warning
    // Values < 11 or 10 are below our scale — downgrade to warning
    const isOutOfScale = val > 34 || val < 11;
    return {
      file: filePath,
      line: lineNum,
      severity: isOutOfScale ? "warning" : "error",
      category: "inline fontSize",
      match: m[0],
      suggestion: isOutOfScale
        ? `Decorative/non-standard size (${m[1]}px) — consider if a token is needed`
        : `fontSize.* token from lib/tokens.ts (value: ${m[1]})`,
    };
  }
  return null;
}

function checkFontFamily(line: string, lineNum: number, filePath: string): Violation | null {
  const trimmed = line.trim();
  if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("import ")) {
    return null;
  }

  const re = /fontFamily\s*:\s*["'](Inter_\w+)["']/g;
  const m = re.exec(line);
  if (m) {
    return {
      file: filePath,
      line: lineNum,
      severity: "error",
      category: "inline fontFamily",
      match: m[0],
      suggestion: `fontFamily.* token from lib/tokens.ts (value: "${m[1]}")`,
    };
  }
  return null;
}

function checkBorderRadius(line: string, lineNum: number, filePath: string): Violation | null {
  const trimmed = line.trim();
  if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("import ")) {
    return null;
  }

  const re = /borderRadius\s*:\s*(\d+(?:\.\d+)?)\b/g;
  const m = re.exec(line);
  if (m) {
    const val = parseFloat(m[1]);
    // Values in our radius scale are errors; geometric values (half of component
    // dimensions like 1, 1.5, 2, 2.5, 3, 4, 5, 14, 15) are warnings
    const RADIUS_SCALE = new Set([0, 6, 8, 12, 16, 20, 24, 9999]);
    const isInScale = RADIUS_SCALE.has(val);
    return {
      file: filePath,
      line: lineNum,
      severity: isInScale ? "error" : "warning",
      category: "inline borderRadius",
      match: m[0],
      suggestion: isInScale
        ? `radius.* token from lib/tokens.ts (value: ${m[1]})`
        : `Geometric/non-standard radius (${m[1]}px) — consider if a token is appropriate`,
    };
  }
  return null;
}

function checkRgba(line: string, lineNum: number, filePath: string): Violation | null {
  const trimmed = line.trim();
  if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("import ")) {
    return null;
  }

  // rgba() values in style props
  const re = /(?:color|backgroundColor|borderColor|shadowColor|background)\s*[:=]\s*["'](rgba?\([^)]+\))["']/gi;
  const m = re.exec(line);
  if (m) {
    return {
      file: filePath,
      line: lineNum,
      severity: "warning",
      category: "inline rgba() value",
      match: m[0],
      suggestion: "Consider extracting to a token or using opacity preset",
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main scan
// ---------------------------------------------------------------------------
function scanFile(filePath: string): Violation[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const violations: Violation[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Check isDark ternaries first (more specific)
    const ternaryViolation = checkTernary(line, lineNum, filePath);
    if (ternaryViolation) {
      violations.push(ternaryViolation);
      // Still check other patterns on this line (there may be multiple issues)
    }

    // Hex colors
    const hexViolations = checkHexColors(line, lineNum, filePath);
    // Filter out hex violations that overlap with ternary matches
    for (const v of hexViolations) {
      if (!ternaryViolation || !ternaryViolation.match.includes(v.match.split(/[:=]/)[1]?.trim().replace(/["']/g, "") ?? "")) {
        violations.push(v);
      }
    }

    // Font size
    const fsViolation = checkFontSize(line, lineNum, filePath);
    if (fsViolation) violations.push(fsViolation);

    // Font family
    const ffViolation = checkFontFamily(line, lineNum, filePath);
    if (ffViolation) violations.push(ffViolation);

    // Border radius
    const brViolation = checkBorderRadius(line, lineNum, filePath);
    if (brViolation) violations.push(brViolation);

    // Rgba
    const rgbaViolation = checkRgba(line, lineNum, filePath);
    if (rgbaViolation) violations.push(rgbaViolation);
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------
function printReport(violations: Violation[]): void {
  const errors = violations.filter((v) => v.severity === "error");
  const warnings = violations.filter((v) => v.severity === "warning");

  console.log("");
  console.log(bold("=".repeat(70)));
  console.log(bold("  Splitr Design Token Audit"));
  console.log(bold("=".repeat(70)));
  console.log("");

  // Summary
  console.log(bold("Summary"));
  console.log(dim("-".repeat(40)));
  console.log(
    `  ${error("Errors:  ")} ${errors.length === 0 ? success("0") : error(String(errors.length))}  ${dim("(hardcoded values with token equivalents)")}`
  );
  console.log(
    `  ${warn("Warnings:")} ${warnings.length === 0 ? success("0") : warn(String(warnings.length))}  ${dim("(unmapped or decorative values)")}`
  );
  console.log(
    `  ${dim("Total:   ")} ${violations.length}`
  );
  console.log("");

  // Top violations by category frequency
  if (violations.length > 0) {
    const categoryCounts = new Map<string, number>();
    for (const v of violations) {
      categoryCounts.set(v.category, (categoryCounts.get(v.category) ?? 0) + 1);
    }
    const sorted = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1]);

    console.log(bold("Top violation categories"));
    console.log(dim("-".repeat(40)));
    for (const [cat, count] of sorted) {
      const bar = "\u2588".repeat(Math.min(count, 40));
      console.log(`  ${cyan(cat.padEnd(28))} ${String(count).padStart(4)}  ${magenta(bar)}`);
    }
    console.log("");

    // Top hex values by frequency
    const hexCounts = new Map<string, number>();
    for (const v of violations) {
      if (v.category.includes("hex") || v.category.includes("ternary")) {
        // Extract the hex values from the match
        const hexes = v.match.match(/#[0-9a-fA-F]{3,8}/gi) ?? [];
        for (const h of hexes) {
          const normalized = h.toLowerCase();
          hexCounts.set(normalized, (hexCounts.get(normalized) ?? 0) + 1);
        }
      }
    }

    if (hexCounts.size > 0) {
      const sortedHex = [...hexCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
      console.log(bold("Top hardcoded hex values"));
      console.log(dim("-".repeat(40)));
      for (const [hex, count] of sortedHex) {
        const token = HEX_TOKEN_MAP[hex];
        console.log(
          `  ${hex.padEnd(12)} ${String(count).padStart(4)}x  ${dim("→")} ${token ? cyan(token) : warn("no token mapping")}`
        );
      }
      console.log("");
    }

    // Per-file report
    const byFile = new Map<string, Violation[]>();
    for (const v of violations) {
      const rel = path.relative(ROOT, v.file);
      if (!byFile.has(rel)) byFile.set(rel, []);
      byFile.get(rel)!.push(v);
    }

    console.log(bold("Per-file report"));
    console.log(dim("=".repeat(70)));

    for (const [file, fileViolations] of [...byFile.entries()].sort()) {
      const fileErrors = fileViolations.filter((v) => v.severity === "error").length;
      const fileWarnings = fileViolations.filter((v) => v.severity === "warning").length;

      console.log("");
      console.log(
        `${bold(file)}  ${fileErrors > 0 ? error(`${fileErrors}E`) : ""}${fileErrors > 0 && fileWarnings > 0 ? " " : ""}${fileWarnings > 0 ? warn(`${fileWarnings}W`) : ""}`
      );
      console.log(dim("-".repeat(file.length + 10)));

      for (const v of fileViolations.sort((a, b) => a.line - b.line)) {
        const sev =
          v.severity === "error" ? error("ERROR") : warn("WARN ");
        const lineStr = dim(`L${String(v.line).padStart(4)}`);
        console.log(
          `  ${lineStr}  ${sev}  ${dim(`[${v.category}]`)}  ${v.match}`
        );
        console.log(`${" ".repeat(20)}${dim("→")} ${cyan(v.suggestion)}`);
      }
    }
  }

  // Final status
  console.log("");
  console.log(dim("=".repeat(70)));
  if (errors.length > 0) {
    console.log(
      error(
        `  FAIL: ${errors.length} error(s) found. Replace hardcoded values with design tokens.`
      )
    );
  } else if (warnings.length > 0) {
    console.log(
      warn(
        `  PASS (with warnings): ${warnings.length} warning(s). Consider extracting to tokens.`
      )
    );
  } else {
    console.log(success("  PASS: No hardcoded visual values detected."));
  }
  console.log(dim("=".repeat(70)));
  console.log("");
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
function main(): void {
  console.log(dim(`Scanning from: ${ROOT}`));

  const files = discoverFiles();
  console.log(dim(`Found ${files.length} files to scan.`));

  const allViolations: Violation[] = [];
  for (const file of files) {
    const violations = scanFile(file);
    allViolations.push(...violations);
  }

  printReport(allViolations);

  const hasErrors = allViolations.some((v) => v.severity === "error");
  process.exit(hasErrors ? 1 : 0);
}

main();
