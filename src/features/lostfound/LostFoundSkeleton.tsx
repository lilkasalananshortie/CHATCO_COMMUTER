import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, View, useWindowDimensions, type DimensionValue } from "react-native";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { useReducedMotion } from "../../shared/useReducedMotion";

/** Phone layout from the web TripLedgerSkeleton and My Claims placeholders. */
export function LostFoundSkeleton({ claims = false }: { claims?: boolean }) {
  const { isLight } = useCommuterTheme();
  const { width } = useWindowDimensions();
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    pulse.setValue(1);
    if (reduced) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 0.5, duration: 1000, easing: Easing.bezier(0.4, 0, 0.6, 1), useNativeDriver: Platform.OS !== "web", isInteraction: false }),
      Animated.timing(pulse, { toValue: 1, duration: 1000, easing: Easing.bezier(0.4, 0, 0.6, 1), useNativeDriver: Platform.OS !== "web", isInteraction: false }),
    ]));
    animation.start();
    return () => { animation.stop(); pulse.stopAnimation(); };
  }, [pulse, reduced]);
  const border = isLight ? "#E5E7EB" : "#203248";
  const surface = isLight ? "#FFFFFF" : "#0B1E33";
  const fill = isLight ? "#F3F4F6" : "#172B40";
  const barColor = isLight ? "#E5E7EB" : "#203248";
  const bar = (barWidth: DimensionValue, height: number) => <View style={{ width: barWidth, height, borderRadius: 4, backgroundColor: barColor }} />;

  return <View testID="lost-found-skeleton" accessibilityRole="progressbar" accessibilityLabel={claims ? "Loading your claims" : "Loading found items"} accessibilityState={{ busy: true }} pointerEvents="none">
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ gap: claims ? 12 : 32 }}>
      {claims ? Array.from({ length: 4 }, (_, index) => <View key={index} testID="claim-skeleton-card" style={{ height: 176, borderRadius: 12, borderWidth: 1, borderColor: border, backgroundColor: surface, overflow: "hidden" }}>
        <Animated.View style={{ flex: 1, backgroundColor: fill, opacity: pulse }} />
      </View>) : [3, 2].map((tiles, day) => <View key={day} testID="found-day-skeleton">
        <View style={{ flexDirection: "row", justifyContent: "space-between", borderBottomWidth: 1, borderColor: border, paddingVertical: 12 }}>{bar(144, 16)}{bar(56, 16)}</View>
        {[0, 1].map(trip => <View key={trip} testID="found-trip-skeleton" style={{ gap: 12, paddingVertical: 20 }}>
          <View style={{ gap: 8 }}>{bar(64, 12)}{bar(112, 20)}</View>
          <View style={{ flexDirection: "row", gap: 10, overflow: "hidden" }}>
            {Array.from({ length: tiles }, (_, index) => <View key={index} testID="found-item-skeleton" style={{ width: width < 640 ? "44%" : "31%", flexShrink: 0, borderRadius: 8, borderWidth: 1, borderColor: border, backgroundColor: surface, overflow: "hidden" }}>
              <Animated.View style={{ width: "100%", aspectRatio: 4 / 3, backgroundColor: fill, opacity: pulse }} />
              <View style={{ paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12, gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>{bar(48, 10)}{bar(56, 10)}</View>
                {bar("80%", 14)}{bar("50%", 12)}
              </View>
              <View style={{ marginHorizontal: 12, borderTopWidth: 1, borderStyle: "dashed", borderColor: border }} />
              <View style={{ flexDirection: "row", gap: 8, padding: 12 }}><View style={{ flex: 1, height: 36, borderRadius: 6, backgroundColor: fill }} /><View style={{ width: 36, height: 36, borderRadius: 6, backgroundColor: fill }} /></View>
            </View>)}
          </View>
        </View>)}
      </View>)}
    </View>
  </View>;
}
