export const commuterColors = {
  primary: "#1A5FB4",
  primaryHover: "#164A8F",
  primaryLight: "#62A0EA",
  primaryLighter: "#99C1F1",
  accentSignal: "#FF6D3A", // Strictly for "Pick Me Up" hail & CTA orange
  accentSignalHover: "#E55A2B",
  navyDeep: "#071A2E",
  background: "#050F1A", // Exact Web dark theme
  surface: "#071A2E", // Exact Web card surface
  surfaceSecondary: "#0E1628", // Exact Web input / nested surface
  surfaceHover: "#0B1E33",
  border: "rgba(255, 255, 255, 0.1)", // Exact Web border-white/10
  borderSubtle: "rgba(255, 255, 255, 0.05)", // border-white/5
  textPrimary: "#FFFFFF",
  textSecondary: "rgba(255, 255, 255, 0.7)", // text-white/70
  textMuted: "rgba(255, 255, 255, 0.4)", // text-white/40
  success: "#10B981", // emerald-500
  successBg: "rgba(16, 185, 129, 0.1)",
  successBorder: "rgba(16, 185, 129, 0.2)",
  warning: "#F59E0B", // amber-500
  warningBg: "rgba(245, 158, 11, 0.1)",
  warningBorder: "rgba(245, 158, 11, 0.2)",
  danger: "#EF4444", // red-500
  dangerBg: "rgba(239, 68, 68, 0.1)",
  dangerBorder: "rgba(239, 68, 68, 0.2)",
  info: "#62A0EA",
  infoBg: "rgba(98, 160, 234, 0.1)",
  infoBorder: "rgba(98, 160, 234, 0.2)",
} as const;

export type CommuterColorToken = keyof typeof commuterColors;

