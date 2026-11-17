import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, View } from "react-native";
import { Text } from "../../shared/ui/BrandText";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { WebIcon } from "../../shared/ui/WebIcon";
import type { NearbyHailableVehicle } from "./nearby-hailing";
import { hailHint, type HailHintReason } from "./dashboard-ui";
import { useReducedMotion } from "../../shared/useReducedMotion";

interface NearbyUnitsCardProps {
  vehicles: NearbyHailableVehicle[];
  unavailableReason?: HailHintReason;
  dismissed?: boolean;
  onDismiss?: () => void;
}

function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

function capacityLabel(status: string | null | undefined): string {
  if (status === "STANDING") return "Standing only";
  if (status === "FULL") return "Full";
  return "Seats available";
}

function NearbyChevron({ expanded, color }: { expanded: boolean; color: string }) {
  const reducedMotion = useReducedMotion();
  const rotation = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  useEffect(() => {
    if (reducedMotion) { rotation.setValue(expanded ? 1 : 0); return; }
    const animation = Animated.timing(rotation, { toValue: expanded ? 1 : 0, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: true });
    animation.start();
    return () => animation.stop();
  }, [expanded, reducedMotion, rotation]);
  return <Animated.View style={{ transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "0deg"] }) }] }}><WebIcon name="chevron-up" size={15} color={color} /></Animated.View>;
}

export function NearbyUnitsCard({ vehicles, unavailableReason = "no-nearby-units", dismissed: dismissedForSession = false, onDismiss }: NearbyUnitsCardProps) {
  const { colors, isLight } = useCommuterTheme();
  const [showOthers, setShowOthers] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const styles = createStyles(colors, isLight);

  if (vehicles.length === 0) {
    if (dismissed || dismissedForSession) return null;
    const message = hailHint(unavailableReason);
    return (
      <View style={styles.card}>
        <View style={{ paddingRight: 44 }}>
          <Text style={styles.emptyTitle}>{message.title}</Text>
          <Text style={styles.emptySubtitle}>{message.message}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss unit status" onPress={() => { setDismissed(true); onDismiss?.(); }} style={{ position: "absolute", top: 0, right: 0, width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
          <WebIcon name="x" size={18} color={colors.textSecondary} />
        </Pressable>
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
          <NearbyChevron expanded={expanded} color={colors.textSecondary} />
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
