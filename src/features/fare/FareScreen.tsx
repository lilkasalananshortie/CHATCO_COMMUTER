import React, { useEffect, useState, useRef } from "react";
import { ActivityIndicator, Animated, AppState, Easing, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { commuterService } from "../../core/api/commuter-service";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { Text } from "../../shared/ui/BrandText";
import { estimateFare, normalizeFareMatrix, type FareCategory, type PublishedFareMatrix } from "./fare-estimate";
import { emptySelection, matchesFarePoint, reconcileSelection, selectStop, subStops, swapStops, type FareField } from "./fare-selection";
import { useReducedMotion } from "../../shared/useReducedMotion";

// Paths from web components/commuter/fare/fare-content.tsx.
const paths = {
  close: "M6 18 18 6M6 6l12 12",
  swap: "M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5",
  search: "m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z",
  chevron: "m19.5 8.25-7.5 7.5-7.5-7.5",
  arrow: "M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3",
};
function FareIcon({ name, color }: { name: keyof typeof paths; color: string }) {
  return <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={name === "close" ? 2.5 : 2} pointerEvents="none"><Path d={paths[name]} strokeLinecap="round" strokeLinejoin="round" /></Svg>;
}
function AnimatedFareChevron({ expanded, color }: { expanded: boolean; color: string }) {
  const reduceMotion = useReducedMotion();
  const rotation = useRef(new Animated.Value(expanded ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) {
      rotation.setValue(expanded ? 1 : 0);
      return;
    }
    const animation = Animated.timing(rotation, {
      toValue: expanded ? 1 : 0,
      duration: 200,
      easing: Easing.out(Easing.ease),
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start();
    return () => animation.stop();
  }, [expanded, reduceMotion, rotation]);
  return <Animated.View style={{ transform: [{ rotate: rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] }) }] }}><FareIcon name="chevron" color={color} /></Animated.View>;
}
const categories: [FareCategory, string][] = [["REGULAR", "Regular"], ["STUDENT", "Student"], ["SENIOR", "Senior Citizen"], ["PWD", "PWD"]];
const money = (value: number) => "₱" + value.toFixed(2);

export function FareScreen() {
  const { isLight } = useCommuterTheme();
  const ink = isLight ? "#111827" : "#FFFFFF";
  const muted = isLight ? "#64748B" : "#94A3B8";
  const background = isLight ? "#F8FAFC" : "#050F1A";
  const surface = isLight ? "#FFFFFF" : "#071A2E";
  const border = isLight ? "#E2E8F0" : "#FFFFFF1A";
  const [matrix, setMatrix] = useState<PublishedFareMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selection, setSelection] = useState(emptySelection);
  const [category, setCategory] = useState<FareCategory>("REGULAR");
  const [field, setField] = useState<FareField>("pickup");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const active = useRef(true);
  const inFlight = useRef(false);
  const load = async () => {
    if (inFlight.current) return;
    inFlight.current = true; setLoading(true); setError("");
    // Never display an old tariff as current, but retain IDs for revalidation.
    setMatrix(null);
    try {
      const result = normalizeFareMatrix(await commuterService.getFareMatrix());
      if (active.current) {
        setMatrix(result);
        setSelection(previous => reconcileSelection(previous, result));
        setExpanded(previous => result.points.some(point => point.id === previous) ? previous : null);
      }
    } catch (e) { if (active.current) setError(e instanceof Error ? e.message : "Unable to load fares. Please retry."); }
    finally { inFlight.current = false; if (active.current) setLoading(false); }
  };
  useEffect(() => {
    active.current = true; void load();
    const subscription = AppState.addEventListener("change", state => { if (state === "active") void load(); });
    return () => { active.current = false; subscription.remove(); };
  }, []);
  const from = matrix?.points.find(point => point.id === selection.pickup);
  const to = matrix?.points.find(point => point.id === selection.destination);
  const estimate = matrix && from && to ? estimateFare(matrix, from.id, to.id, category) : null;
  const same = !!from && !!to && from.pointNumber === to.pointNumber;
  const accent = same ? (isLight ? "#7C3AED" : "#A78BFA") : (isLight ? "#047857" : "#34D399");
  const tint = same ? "#8B5CF61A" : "#10B9811A";
  const filtered = matrix?.points.filter(point => matchesFarePoint(point, query)) ?? [];
  const traversed = from && to ? Math.abs(from.pointNumber - to.pointNumber) + 1 : 0;
  const baseCount = matrix?.config.baseBarangayCount ?? 4;
  const chooseField = (next: FareField) => {
    setField(next);
    const point = matrix?.points.find(item => item.id === selection[next]);
    setExpanded(point && subStops(point).length ? point.id : null);
  };
  return <KeyboardAvoidingView style={[s.screen, { backgroundColor: background }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <View style={[s.header, { backgroundColor: surface, borderColor: border }]}>
      <Text accessibilityRole="header" style={[s.title, { color: ink }]}>Fare Calculator</Text>
      {(["pickup", "destination"] as const).map((key, index) => {
        const point = key === "pickup" ? from : to;
        const label = key === "pickup" ? "Pickup" : "Drop-off";
        const landmark = key === "pickup" ? selection.pickupLandmark : selection.destinationLandmark;
        return <React.Fragment key={key}>
          {index === 1 && <Pressable accessibilityRole="button" accessibilityLabel="Swap pickup and drop-off" disabled={!from || !to} onPress={() => setSelection(swapStops)} style={s.swap}><FareIcon name="swap" color={muted} /></Pressable>}
          <View style={[s.selection, { borderColor: field === key ? accent : border, backgroundColor: field === key ? tint : isLight ? "#F9FAFB" : "#FFFFFF08" }]}>
            <Pressable accessibilityRole="button" accessibilityLabel={"Select " + label} accessibilityState={{ selected: field === key }} onPress={() => chooseField(key)} style={s.selectionMain}>
              <View style={s.row}><View style={[s.dot, { backgroundColor: point ? accent : muted }]} /><Text style={[s.label, { color: muted }]}>{label.toUpperCase()}</Text></View>
              <View style={[s.row, { marginLeft: 18 }]}><Text numberOfLines={2} style={[s.pointName, { color: point ? ink : muted }]}>{point ? point.name + (landmark ? " · " + landmark : "") : "Select " + label.toLowerCase() + " location"}</Text>{point && <Text style={[s.badge, { color: accent, backgroundColor: tint }]}>Brgy {point.pointNumber}</Text>}</View>
            </Pressable>
            {point && <Pressable accessibilityRole="button" accessibilityLabel={"Clear " + label} onPress={() => { setSelection(previous => selectStop(previous, key, "")); setField(key); setExpanded(null); }} style={s.iconButton}><FareIcon name="close" color={muted} /></Pressable>}
          </View>
        </React.Fragment>;
      })}
      {same && <Text style={[s.same, { color: accent, backgroundColor: tint }]}>Same pickup & drop-off — both locations shown in violet</Text>}
      <Text style={[s.label, { color: muted, marginTop: 10 }]}>COMMUTER TYPE</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categories}>
        {categories.map(([kind, label]) => <Pressable key={kind} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: category === kind }} onPress={() => setCategory(kind)} style={[s.category, { backgroundColor: category === kind ? "#1A5FB4" : isLight ? "#F1F5F9" : "#FFFFFF0D" }]}><Text style={[s.small, { color: category === kind ? "white" : muted }]}>{label}</Text></Pressable>)}
      </ScrollView>
    </View>
    <View style={s.searchArea}><View style={[s.search, { borderColor: border, backgroundColor: surface }]}><FareIcon name="search" color={muted} /><TextInput accessibilityLabel="Search barangay or landmark" placeholder="Search barangay or landmark..." placeholderTextColor={muted} value={query} onChangeText={setQuery} style={[s.input, { color: ink }]} /></View><Text style={[s.hint, { color: muted }]}>Tap your {field === "pickup" ? "boarding" : "destination"} Point Area — then select a sub {field === "pickup" ? "pickup" : "drop-off"} point · Auto-opens after selection</Text></View>
    <ScrollView testID="fare-location-list" style={s.list} contentContainerStyle={s.listContent} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor={accent} />}>
      {loading && <View style={s.empty}><ActivityIndicator color={accent} /><Text style={{ color: muted }}>Loading locations...</Text></View>}
      {!!error && <View style={s.empty}><Text accessibilityRole="alert" style={{ color: isLight ? "#B91C1C" : "#FCA5A5" }}>{error}</Text><Pressable accessibilityRole="button" onPress={() => void load()} style={s.category}><Text style={{ color: accent }}>Retry fare loading</Text></Pressable></View>}
      {!loading && !error && filtered.length === 0 && <Text style={[s.empty, { color: muted }]}>No locations found.</Text>}
      {filtered.map(point => {
        const pickup = from?.id === point.id, dropoff = to?.id === point.id;
        const stops = subStops(point);
        return <View key={point.id}>
          <View style={[s.pointRow, { borderColor: pickup || dropoff ? accent : border, backgroundColor: pickup || dropoff ? tint : "transparent" }]}>
            <Pressable accessibilityRole="button" accessibilityLabel={"Select " + point.name} onPress={() => { setSelection(previous => selectStop(previous, field, point.id)); setQuery(""); setExpanded(stops.length ? point.id : null); if (field === "pickup" && !stops.length) setField("destination"); }} style={s.pointMain}>
              <View><Text style={[s.label, { color: muted }]}>PT</Text><Text style={{ color: muted, fontWeight: "700" }}>{point.pointNumber}</Text></View>
              <View style={s.grow}><Text style={[s.pointName, { color: ink }]}>{point.name} <Text style={[s.label, { color: muted }]}>Brgy {point.pointNumber}</Text></Text>{stops.length > 0 && <Text numberOfLines={1} style={[s.hint, { color: muted }]}>{stops.join(" · ")}</Text>}<View style={s.row}>{pickup && <Text style={[s.tag, { backgroundColor: accent }]}>PICKUP</Text>}{dropoff && <Text style={[s.tag, { backgroundColor: accent }]}>DROP-OFF</Text>}</View></View>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={"Expand " + point.name} accessibilityState={{ expanded: expanded === point.id }} onPress={() => setExpanded(expanded === point.id ? null : point.id)} style={s.iconButton}><AnimatedFareChevron expanded={expanded === point.id} color={muted} /></Pressable>
          </View>
          {expanded === point.id && <View style={s.stops}><Text style={[s.hint, { color: muted }]}>SUB PICKUP/DROP-OFF POINTS IN {point.name.toUpperCase()} · tap to select</Text>
            {["", ...stops].map(stop => <Pressable key={stop} accessibilityRole="button" accessibilityLabel={stop || "Use " + point.name + " Point Area only"} onPress={() => { setSelection(previous => selectStop(previous, field, point.id, stop)); setExpanded(null); setQuery(""); if (field === "pickup") setField("destination"); }} style={s.stop}><View style={[s.dot, { width: 6, height: 6, backgroundColor: stop ? accent : "#F59E0B" }]} /><Text style={[s.small, { color: stop ? ink : isLight ? "#92400E" : "#FBBF24", flex: 1 }]}>{stop || "Use Point Area only"}</Text>{stop && ((pickup && selection.pickupLandmark === stop) || (dropoff && selection.destinationLandmark === stop)) ? <Text style={[s.label, { color: accent }]}>{pickup && selection.pickupLandmark === stop ? dropoff && selection.destinationLandmark === stop ? "BOTH" : "PICKUP" : "DROP-OFF"}</Text> : null}</Pressable>)}
          </View>}
        </View>;
      })}
    </ScrollView>
    <View testID="fare-summary" style={[s.summary, { borderColor: border, backgroundColor: isLight ? "white" : background }]}>
      {estimate && from && to ? <>
        <View style={s.route}><View style={[s.dot, { backgroundColor: accent }]} /><Text style={[s.small, { color: ink, flexShrink: 1 }]}>{from.name}{selection.pickupLandmark ? " · " + selection.pickupLandmark : ""}</Text><FareIcon name="arrow" color={muted} /><Text style={[s.small, { color: ink, flexShrink: 1 }]}>{to.name}{selection.destinationLandmark ? " · " + selection.destinationLandmark : ""}</Text></View>
        <Text style={[s.explanation, { color: muted, backgroundColor: isLight ? "#F8FAFC" : "#FFFFFF08" }]}>{traversed} barangay{traversed === 1 ? "" : "s"} traversed{traversed > baseCount ? " · Base fare covers first " + baseCount + " + " + (traversed - baseCount) + " succeeding" : ""}</Text>
        <View style={s.totalRow}><Text style={[s.hint, { color: muted, flex: 1 }]}>ESTIMATED FARE</Text><View style={{ alignItems: "flex-end" }}>{category !== "REGULAR" && <Text style={{ color: muted, fontSize: 12, textDecorationLine: "line-through" }}>{money(estimate.regular)}</Text>}<Text style={[s.total, { color: ink }]}>{money(estimate.amount)}</Text>{category !== "REGULAR" && <Text style={[s.hint, { color: accent }]}>You save {money(estimate.discount)}</Text>}</View></View>
      </> : <Text style={[s.hint, { color: muted, textAlign: "center" }]}>{loading ? "Refreshing current fares..." : "Select both pickup and drop-off to calculate fare"}</Text>}
    </View>
  </KeyboardAvoidingView>;
}

const s = StyleSheet.create({
  screen: { flex: 1 }, header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1 },
  title: { fontSize: 18, fontWeight: "700", marginBottom: 12 }, row: { flexDirection: "row", alignItems: "center", gap: 6 },
  selection: { borderWidth: 1, borderRadius: 12, flexDirection: "row", alignItems: "center" }, selectionMain: { flex: 1, padding: 12, gap: 4 },
  label: { fontSize: 10, fontWeight: "600" }, dot: { width: 10, height: 10, borderRadius: 5 }, pointName: { flexShrink: 1, fontSize: 13, fontWeight: "600" },
  badge: { fontSize: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 }, iconButton: { width: 44, minHeight: 44, alignItems: "center", justifyContent: "center" },
  swap: { height: 36, width: 44, alignSelf: "center", alignItems: "center", justifyContent: "center" }, same: { padding: 8, marginTop: 8, borderRadius: 8, fontSize: 10 },
  categories: { gap: 6, paddingTop: 6 }, category: { paddingHorizontal: 10, paddingVertical: 9, borderRadius: 8 }, small: { fontSize: 11, fontWeight: "500" },
  searchArea: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 }, search: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, gap: 8 }, input: { flex: 1, minHeight: 44, fontSize: 13 }, hint: { fontSize: 10, marginTop: 4 },
  list: { flex: 1, minHeight: 60 }, listContent: { paddingHorizontal: 16, paddingBottom: 12 }, empty: { padding: 20, gap: 10, textAlign: "center" },
  pointRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 12, marginBottom: 4 }, pointMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12, padding: 12 }, grow: { flex: 1 },
  tag: { fontSize: 8, fontWeight: "700", color: "white", paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4, marginTop: 4 }, stops: { marginLeft: 36, marginBottom: 8 }, stop: { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44, paddingHorizontal: 8 },
  summary: { borderTopWidth: 1, paddingHorizontal: 16, paddingVertical: 12 }, route: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }, explanation: { fontSize: 10, padding: 8, borderRadius: 8, marginTop: 8 }, totalRow: { flexDirection: "row", alignItems: "center", marginTop: 6 }, total: { fontSize: 24, fontWeight: "800" },
});
