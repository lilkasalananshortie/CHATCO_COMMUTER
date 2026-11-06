import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { commuterService, type VehicleDetails } from "../../core/api/commuter-service";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";

export function UnitDetailsPanel({ vehicleId, onClose }: { vehicleId: string | null; onClose: () => void }) {
  const { colors } = useCommuterTheme();
  const [details, setDetails] = useState<VehicleDetails | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!vehicleId) return;
    let cancelled = false;
    setDetails(null);
    setError("");
    setLoading(true);
    commuterService.getVehicleDetails(vehicleId).then((data) => {
      if (!cancelled) setDetails(data);
    }).catch((cause) => {
      if (!cancelled) setError(cause?.status === 404 ? "This unit is no longer available on the commuter map." : cause?.message || "Could not load unit details.");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [vehicleId, attempt]);

  if (!vehicleId) return null;
  const card = { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 14, padding: 16, gap: 10 } as const;
  const primary = { color: colors.textPrimary };
  const secondary = { color: colors.textSecondary };
  const crew = (label: string, person: NonNullable<VehicleDetails["driver"]> | null) => (
    <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 }}>
      {person?.photo_url ? <Image source={{ uri: person.photo_url }} style={{ width: 38, height: 38, borderRadius: 19 }} /> : <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: colors.surfaceSecondary }} />}
      <View style={{ flex: 1 }}>
        <Text style={[secondary, { fontSize: 12 }]}>{label}</Text>
        <Text style={[primary, { fontWeight: "700" }]}>{person?.name || "Not assigned"}</Text>
        {person && <Text style={[secondary, { fontSize: 12 }]}>{person.rating_count ? `${person.average_rating?.toFixed(1) ?? "—"} / 5 · ${person.rating_count} ratings` : "No ratings yet"}</Text>}
      </View>
    </View>
  );
  return (
    <View style={{ position: "absolute", left: 12, right: 12, bottom: 12, zIndex: 10 }}>
      <View style={card}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={[primary, { fontSize: 16, fontWeight: "700" }]}>{details?.unit_number || "Unit details"}</Text>
          <Pressable accessibilityLabel="Close unit details" onPress={onClose} hitSlop={10}><Text style={[secondary, { fontSize: 22 }]}>×</Text></Pressable>
        </View>
        {loading && <ActivityIndicator color={colors.primary} />}
        {!!error && <>
          <Text style={{ color: colors.danger }}>{error}</Text>
          <Pressable onPress={() => setAttempt(value => value + 1)}><Text style={{ color: colors.primaryLight, fontWeight: "700" }}>Retry</Text></Pressable>
        </>}
        {details && <>
          <Text style={secondary}>{[details.plate_number, details.route_name].filter(Boolean).join(" · ")}</Text>
          {crew("Driver", details.driver)}
          {crew("Conductor", details.conductor)}
        </>}
      </View>
    </View>
  );
}
