import { useState } from "react";
import { Text } from "../../shared/ui/BrandText";
import { Pressable, View } from "react-native";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { planGroupVouchers, type GroupSeat, type VoucherOption } from "../../core/domain/group-voucher-plan";

export function GroupVoucherPicker({ vouchers, seats, onUse, onPayInstead }: {
  vouchers: VoucherOption[]; seats: GroupSeat[]; onUse: (ids: string[]) => void; onPayInstead: () => void;
}) {
  const { colors } = useCommuterTheme();
  const [selected, setSelected] = useState<string[]>([]);
  const chosen = vouchers.filter(voucher => selected.includes(voucher.id));
  const plan = planGroupVouchers(seats, chosen);
  const button = { minHeight: 48, borderRadius: 12, padding: 14, justifyContent: "center" as const };
  return <View style={{ gap: 12, width: "100%" }}>
    <Text style={{ fontSize: 20, fontWeight: "700", color: colors.textPrimary }}>Use vouchers for your group</Text>
    <Text style={{ color: colors.textSecondary }}>Choose up to one voucher per passenger. Nothing is spent until you confirm.</Text>
    {vouchers.map(voucher => {
      const checked = selected.includes(voucher.id);
      const expired = voucher.expiresAt != null && !(Date.parse(voucher.expiresAt) > Date.now());
      const disabled = expired || (!checked && (selected.length >= seats.length || planGroupVouchers(seats, [...chosen, voucher]).unused.includes(voucher.id)));
      return <Pressable key={voucher.id} accessibilityRole="checkbox" accessibilityState={{ checked, disabled }}
        disabled={disabled} onPress={() => setSelected(previous => previous.includes(voucher.id) ? previous.filter(id => id !== voucher.id) : [...previous, voucher.id])}
        style={[button, { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: checked ? colors.primary : colors.border, opacity: disabled ? 0.45 : 1 }]}>
        <Text style={{ color: colors.textPrimary, fontWeight: "600" }}>{checked ? "✓ " : ""}{voucher.type === "DISCOUNT" ? `₱${Number(voucher.amount ?? 0).toFixed(2)} off` : "Free ride"}</Text>
        <Text style={{ color: colors.textMuted, marginTop: 4 }}>{voucher.expiresAt ? `Valid until ${new Date(voucher.expiresAt).toLocaleDateString("en-PH")}` : "No expiry"}</Text>
      </Pressable>;
    })}
    <Text style={{ color: colors.textPrimary, fontSize: 18, fontWeight: "700" }}>GCash remaining: ₱{plan.remaining.toFixed(2)}</Text>
    <Text style={{ color: colors.textMuted }}>Preview only. The server confirms the final fare.</Text>
    <Pressable accessibilityRole="button" disabled={selected.length === 0} onPress={() => onUse(selected)} style={[button, { backgroundColor: colors.primary, opacity: selected.length ? 1 : 0.5 }]}>
      <Text style={{ color: "#FFFFFF", textAlign: "center", fontWeight: "700" }}>Use selected vouchers</Text>
    </Pressable>
    <Pressable accessibilityRole="button" onPress={onPayInstead} style={[button, { backgroundColor: colors.surfaceSecondary }]}><Text style={{ color: colors.textPrimary, textAlign: "center" }}>Pay with GCash instead</Text></Pressable>
  </View>;
}
