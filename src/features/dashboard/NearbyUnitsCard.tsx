import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "../../shared/ui/BrandText";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { WebIcon } from "../../shared/ui/WebIcon";
import type { NearbyHailableVehicle } from "./nearby-hailing";

interface NearbyUnitsCardProps {
  vehicles: NearbyHailableVehicle[];
}

function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

function capacityLabel(status: string | null | undefined): string {
  if (status === "STANDING") return "Standing only";
  if (status === "FULL") return "Full";
  return "Seats available";
}

export function NearbyUnitsCard({ vehicles }: NearbyUnitsCardProps) {
  const { colors, isLight } = useCommuterTheme();
  const [showOthers, setShowOthers] = useState(false);
  const styles = createStyles(colors, isLight);

  if (vehicles.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.emptyTitle}>No units within 1 km</Text>
        <Text style={styles.emptySubtitle}>Units appear here when one comes nearby. Hailing is available within range.</Text>
      </View>
    );
  }

  const [nearest, ...others] = vehicles;
  if (!nearest) return null;
  const expanded = showOthers && others.length > 0;

  return (
    <View style={styles.card}>
      <View style={styles.nearestRow}>
        <View style={styles.unitCopy}>
          <Text style={styles.eyebrow}>NEAREST UNIT</Text>
          <Text style={styles.plate} numberOfLines={1}>{nearest.vehicle.plate_number || nearest.vehicle.unit_number}</Text>
          <Text style={styles.capacity}>{capacityLabel(nearest.vehicle.capacity_status)}</Text>
        </View>
        <Text style={styles.distance}>{formatDistance(nearest.distanceMeters)}</Text>
      </View>

      {expanded && others.map(({ vehicle, distanceMeters }) => (
        <View key={vehicle.vehicle_id || vehicle.id || vehicle.unit_number} style={styles.otherRow}>
          <View style={styles.unitCopy}>
            <Text style={styles.otherPlate} numberOfLines={1}>{vehicle.plate_number || vehicle.unit_number}</Text>
            <Text style={styles.capacity}>{capacityLabel(vehicle.capacity_status)}</Text>
          </View>
          <Text style={styles.otherDistance}>{formatDistance(distanceMeters)}</Text>
        </View>
      ))}

      {others.length > 0 && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={() => setShowOthers((value) => !value)}
          style={styles.toggle}
        >
          <Text style={styles.toggleText}>{expanded ? "Hide other units" : `${others.length} more unit${others.length === 1 ? "" : "s"} nearby`}</Text>
          <WebIcon name="chevron-up" size={15} color={colors.textSecondary} style={{ transform: [{ rotate: expanded ? "0deg" : "180deg" }] }} />
        </Pressable>
      )}
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useCommuterTheme>["colors"], isLight: boolean) {
  return StyleSheet.create({
    card: {
      backgroundColor: isLight ? "#F9FAFB" : "#0B1E33",
      borderColor: isLight ? "#E5E7EB" : "#1C3350",
      borderWidth: 1,
      borderRadius: 14,
      marginBottom: 10,
      overflow: "hidden",
    },
    nearestRow: { minHeight: 82, padding: 14, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 12 },
    unitCopy: { flex: 1, minWidth: 0 },
    eyebrow: { color: colors.textSecondary, fontSize: 10, fontWeight: "700", letterSpacing: 1 },
    plate: { color: colors.textPrimary, fontSize: 18, lineHeight: 23, fontWeight: "800", letterSpacing: 0.4, marginTop: 3 },
    capacity: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
    distance: { color: colors.textPrimary, fontSize: 23, lineHeight: 26, fontWeight: "800", fontVariant: ["tabular-nums"] },
    otherRow: { minHeight: 58, paddingHorizontal: 14, paddingVertical: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: isLight ? "#E5E7EB" : "#1C3350", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    otherPlate: { color: colors.textPrimary, fontSize: 14, fontWeight: "800", letterSpacing: 0.3 },
    otherDistance: { color: colors.textPrimary, fontSize: 14, fontWeight: "800", fontVariant: ["tabular-nums"] },
    toggle: { minHeight: 40, margin: 9, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: isLight ? "#E5E7EB" : "#1C3350", backgroundColor: isLight ? "#FFFFFF" : "#071A2E", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    toggleText: { color: colors.textPrimary, fontSize: 12, fontWeight: "700" },
    emptyTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: "800", paddingHorizontal: 14, paddingTop: 13 },
    emptySubtitle: { color: colors.textSecondary, fontSize: 12, lineHeight: 18, paddingHorizontal: 14, paddingTop: 3, paddingBottom: 13 },
  });
}
