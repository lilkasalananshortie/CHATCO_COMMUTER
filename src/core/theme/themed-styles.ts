import { commuterColors } from "./colors";

type ThemeColors = Record<string, string>;

const alwaysWhiteText = new Set([
  "retryButtonText", "renewalActionText", "claimBtnText", "primaryButtonText",
  "announcementPrimaryActionText", "voucherTabTextActive",
  "sectionTabTextActive", "useVoucherBtnText", "permissionRetryText", "submitButtonText",
  "stepNumberText", "cardCategoryText", "actionPrimaryText", "actionDangerText",
  "sosButtonText", "neutralButtonText", "buttonText", "passwordSubmitText",
]);

// The web keeps the branded GCash gradient card identical in both themes.
// Preserve its white text, translucent controls, and white border over blue.
const fixedBrandStyles = new Set([
  "gcashPayCard", "gcashTitle", "gcashSubtitle", "gcashIconBox", "gcashDecoCircle",
  "gcashContent", "gcashTitleRow", "scanPill", "scanPillText", "historyBtn",
]);

/** Adapt existing dark-first StyleSheet values to the selected app palette. */
export function themedStyles<T extends object>(source: T, colors: ThemeColors, isLight: boolean): T {
  const palette = { ...commuterColors, ...(colors ?? {}) };
  const output: Record<string, Record<string, unknown>> = {};
  for (const [name, rawStyle] of Object.entries(source)) {
    if (!rawStyle || typeof rawStyle !== "object" || Array.isArray(rawStyle)) continue;
    const sourceStyle = rawStyle as Record<string, unknown>;
    const style = { ...sourceStyle };
    if (fixedBrandStyles.has(name)) {
      output[name] = style;
      continue;
    }
    for (const [property, raw] of Object.entries(style)) {
      if (typeof raw !== "string") continue;
      const value = raw.replace(/\s/g, "").toLowerCase();
      if (property === "backgroundColor") {
        if (value === "#050f1a") style[property] = palette.background;
        else if (value === "#071a2e") style[property] = palette.surface;
        else if (value === "#0b2034" || value === "#0b223a") style[property] = palette.surface;
        else if (value === "#0e1628" || value === "#142b40") style[property] = palette.surfaceSecondary;
        else if (value === "#0b1e33" || value === "#0a1e33" || value === "#0e2238" || value === "#0b1e34") style[property] = palette.surfaceHover;
        else if (isLight && /^rgba\(255,255,255,0\.(0[3-9]|1)\)$/.test(value)) style[property] = palette.surfaceSecondary;
      } else if (property === "color") {
        if ((value === "#ffffff" || value === "white") && isLight && !alwaysWhiteText.has(name) && !/(button|btn|action|badge|chip|pill|active|tag|stepnumbercurrent)$/.test(name.toLowerCase())) style[property] = palette.textPrimary;
        else if (isLight && /^rgba\(255,255,255,0?\.\d+\)$/.test(value)) {
          const alpha = Number(value.slice(value.lastIndexOf(",") + 1, -1));
          style[property] = alpha >= 0.55 ? palette.textSecondary : palette.textMuted;
        }
        else if (isLight && (value === "#94a3b8" || value === "#cbd5e1")) style[property] = palette.textSecondary;
        else if (isLight && (value === "#fca5a5" || value === "#fecaca")) style[property] = "#B91C1C";
        else if (isLight && (value === "#99c1f1" || value === "#62a0ea" || value === "#8cb9f0")) style[property] = palette.primary;
        else if (isLight && (value === "#fbbf24" || value === "#f59e0b")) style[property] = "#B45309";
        else if (isLight && (value === "#34d399" || value === "#10b981")) style[property] = "#047857";
        else if (isLight && (value === "#f87171" || value === "#ef4444")) style[property] = "#B91C1C";
      } else if (property.toLowerCase().includes("bordercolor")) {
        if (value.startsWith("rgba(255,255,255,")) style[property] = palette.border;
        else if (value === "#1e2d45" || value === "#e2e8f0") style[property] = palette.border;
        else if (isLight && value === "#ffffff") style[property] = palette.border;
      }
    }
    output[name] = style;
  }
  return output as unknown as T;
}
