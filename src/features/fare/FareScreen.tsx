import React, { useEffect, useState, useRef } from "react";
import { ActivityIndicator, AppState, RefreshControl, ScrollView, Text, View } from "react-native";
import { commuterService } from "../../core/api/commuter-service";
import { FeatureButton, FeatureInput, featureStyles as s } from "../../shared/ui/FeatureControls";
import { estimateFare, normalizeFareMatrix, type FareCategory, type PublishedFareMatrix } from "./fare-estimate";

export function FareScreen() {
  const [matrix, setMatrix] = useState<PublishedFareMatrix | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pickup, setPickup] = useState("");
  const [destination, setDestination] = useState("");
  const [category, setCategory] = useState<FareCategory>("REGULAR");
  const [field, setField] = useState<"pickup" | "destination">("pickup");
  const [query, setQuery] = useState("");
  const [landmarks, setLandmarks] = useState({ pickup: "", destination: "" });
  const active = useRef(true);
  const inFlight = useRef(false);
  const load = async () => {
    if (inFlight.current) return;
    inFlight.current = true; setLoading(true); setError("");
    // Never reuse a previously cached tariff as if it were current.
    setMatrix(null);
    try {
      const result = normalizeFareMatrix(await commuterService.getFareMatrix());
      if (active.current) { setMatrix(result); setPickup(""); setDestination(""); setLandmarks({ pickup: "", destination: "" }); }
    } catch (e) { if (active.current) setError((e as Error).message); }
    finally { inFlight.current = false; if (active.current) setLoading(false); }
  };
  useEffect(() => {
    active.current = true; void load();
    const subscription = AppState.addEventListener("change", (state) => { if (state === "active") void load(); });
    return () => { active.current = false; subscription.remove(); };
  }, []);
  const from = matrix?.points.find((p) => p.id === pickup);
  const to = matrix?.points.find((p) => p.id === destination);
  const estimate = matrix && from && to ? estimateFare(matrix, pickup, destination, category) : null;
  const selected = field === "pickup" ? from : to;
  return <ScrollView style={s.screen} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} tintColor="#62A0EA" />}>
    <Text style={s.title}>Fare Calculator</Text>
    <Text style={s.muted}>Estimate your fare. Final payment and discount eligibility are confirmed by the backend.</Text>
    {loading && <ActivityIndicator color="#62A0EA" />}
    {!!error && <View style={s.card}><Text style={s.error}>{error}</Text><FeatureButton label="Retry fare loading" onPress={() => void load()} /></View>}
    {matrix && <>
      <Text style={s.heading}>{matrix.route.name}</Text>
      <FeatureButton secondary={field !== "pickup"} label={`Pickup: ${from?.name ?? "Select"}${landmarks.pickup ? ` · ${landmarks.pickup}` : ""}`} onPress={() => { setField("pickup"); setQuery(""); }} />
      <FeatureButton secondary={field !== "destination"} label={`Destination: ${to?.name ?? "Select"}${landmarks.destination ? ` · ${landmarks.destination}` : ""}`} onPress={() => { setField("destination"); setQuery(""); }} />
      <FeatureButton secondary label="Swap pickup and destination" onPress={() => { setPickup(destination); setDestination(pickup); setLandmarks({ pickup: landmarks.destination, destination: landmarks.pickup }); }} />
      <FeatureInput label={`Search ${field}`} value={query} onChangeText={setQuery} />
      {matrix.points.filter((p) => [p.name, ...p.landmarks, ...p.subStops].join(" ").toLowerCase().includes(query.toLowerCase())).map((point) => <FeatureButton key={point.id} secondary label={point.name} onPress={() => { if (field === "pickup") setPickup(point.id); else setDestination(point.id); setLandmarks((v) => ({ ...v, [field]: "" })); }} />)}
      {selected && [...new Set([...selected.landmarks, ...selected.subStops])].map((landmark) => <FeatureButton key={landmark} secondary label={`Landmark: ${landmark}`} onPress={() => setLandmarks((v) => ({ ...v, [field]: landmark }))} />)}
      <View style={s.row}>{(["REGULAR", "STUDENT", "SENIOR", "PWD"] as const).map((kind) => <FeatureButton key={kind} label={kind} secondary={category !== kind} onPress={() => setCategory(kind)} />)}</View>
      {estimate && <View style={s.card}><Text style={s.heading}>Estimated fare: ₱{estimate.amount.toFixed(2)}</Text><Text style={s.text}>Regular fare: ₱{estimate.regular.toFixed(2)}</Text>{category !== "REGULAR" && <Text style={s.text}>Discount: ₱{estimate.discount.toFixed(2)}</Text>}<Text style={s.muted}>Selecting a category here does not change your account or authorize a discount.</Text></View>}
    </>}
  </ScrollView>;
}
