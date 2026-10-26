import { useRef, useState } from "react";
import { TouchableOpacity, View } from "react-native";
import { Text } from "../../shared/ui/BrandText";
import { useDashboardDialogStyles } from "../dashboard/DashboardDialog";

export function SosActions({ onClose, onStop }: { onClose: () => void; onStop: () => Promise<void> }) {
  const D = useDashboardDialogStyles();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const running = useRef(false);
  const stop = async () => {
    if (running.current) return;
    running.current = true; setBusy(true); setError("");
    try { await onStop(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to stop SOS. Please try again."); }
    finally { running.current = false; setBusy(false); }
  };
  return <View style={{ gap: 12 }}>
    {confirm && <View style={[D.field, { borderColor: "#DC2626" }]}><Text style={D.title}>Stop this SOS?</Text><Text style={D.body}>This closes your alert and tells dispatch you no longer need help.</Text></View>}
    {Boolean(error) && <Text accessibilityRole="alert" style={[D.body, D.red]}>{error}</Text>}
    <View style={D.row}>
      <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={confirm ? () => { setConfirm(false); setError(""); } : onClose} style={[D.button, D.secondary]}><Text style={D.onSecondary}>{confirm ? "Keep SOS active" : "Close screen"}</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" disabled={busy} onPress={confirm ? stop : () => setConfirm(true)} style={[D.button, D.danger]}><Text style={D.onPrimary}>{busy ? "Stopping…" : confirm ? "Yes, stop SOS" : "Stop SOS"}</Text></TouchableOpacity>
    </View>
  </View>;
}
