/// <reference types="jest" />
import { paymentAppearance } from "../payment-appearance";
import { commuterColors } from "../../../core/theme/colors";
const base = { stateTitle: { color: "#FFFFFF" }, stateSubtitle: { color: "rgba(255,255,255,0.5)" }, modalContent: { backgroundColor: "#071A2E" }, neutralButtonText: {}, permissionBox: {}, noticeBox: {}, neutralButton: {}, closeBtn: {}, headerIconCircle: {}, successIconCircle: {}, errorIconCircle: {}, primaryButton: {}, emeraldButton: {}, emeraldButtonText: {}, scanLaser: {} };
test.each([false, true])("payment surfaces, labels and controls follow appearance (light=%s)", isLight => {
 const colors = isLight ? { ...commuterColors, surface: "#FFFFFF", surfaceSecondary: "#F9FAFB", textPrimary: "#111827", textSecondary: "#4B5563", textMuted: "#6B7280", border: "#E5E7EB" } : commuterColors;
 const styles: any = paymentAppearance(base, colors, isLight);
 expect(styles.modalContent.backgroundColor).toBe(colors.surface);
 expect(styles.stateTitle.color).toBe(isLight ? colors.textPrimary : "#FFFFFF");
 expect(styles.neutralButtonText.color).toBe(colors.textSecondary);
 expect(styles.primaryButton.backgroundColor).toBe(colors.primary);
 expect(styles.emeraldButton.backgroundColor).toBe(colors.primary);
 expect(styles.emeraldButtonText.color).toBe("#FFFFFF");
 expect(styles.noticeBox.backgroundColor).toBe(colors.surfaceSecondary);
 expect(styles.successIconCircle.backgroundColor).toBe(colors.surface);
});
