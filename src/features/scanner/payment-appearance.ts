import { themedStyles } from "../../core/theme/themed-styles";

/** All payment states share solid neutral surfaces and the selected appearance. */
export function paymentAppearance<T extends Record<string, any>>(base: T, colors: Record<string, string>, isLight: boolean): T {
  const result = themedStyles(base, colors, isLight) as Record<string, any>;
  for (const name of ["permissionBox", "noticeBox", "neutralButton"]) {
    result[name] = { ...result[name], backgroundColor: colors.surfaceSecondary, borderColor: colors.border };
  }
  result.closeBtn = { ...result.closeBtn, width: 44, height: 44, flexShrink: 0, borderWidth: 0 };
  result.neutralButtonText = { ...result.neutralButtonText, color: colors.textSecondary };
  for (const name of ["headerIconCircle", "successIconCircle", "errorIconCircle"]) {
    result[name] = { ...result[name], backgroundColor: colors.surface, borderWidth: 0 };
  }
  for (const name of ["primaryButton", "emeraldButton"]) {
    result[name] = { ...result[name], backgroundColor: colors.primary, shadowOpacity: 0, elevation: 0 };
  }
  result.emeraldButtonText = { ...result.emeraldButtonText, color: "#FFFFFF" };
  result.scanLaser = { ...result.scanLaser, backgroundColor: colors.primaryLight, shadowOpacity: 0 };
  return result as T;
}
