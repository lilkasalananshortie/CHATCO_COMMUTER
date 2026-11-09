import React, { useEffect, useMemo, useRef, useState } from "react";
import { Text, View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { WebView } from "react-native-webview";
import Constants from "expo-constants";
import { commuterColors } from "../../core/theme/colors";
import type { VehicleLocation } from "../../core/domain/types";
import { usePublishedRoute } from "./usePublishedRoute";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { MAP_RUNTIME, mapUpdateScript } from "./map-runtime";
import { commuterLocationCss } from "./commuter-map-pin";
import { UnitDetailsPanel } from "./UnitDetailsPanel";
import { mapVehicleState } from "./map-vehicle-state";

const CARTO_API_KEY =
  process.env.EXPO_PUBLIC_CARTO_API_KEY ||
  process.env.NEXT_PUBLIC_CARTO_API_KEY ||
  (Constants.expoConfig?.extra as any)?.cartoApiKey ||
  "";

export interface CommuterLiveMapProps {
  vehicles: VehicleLocation[];
  userLocation?: { latitude: number; longitude: number } | null;
  isHailing?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const CommuterLiveMap = React.memo(function CommuterLiveMap({
  vehicles,
  userLocation,
  isHailing = false,
  style,
}: CommuterLiveMapProps) {
  const webViewRef = useRef<WebView>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const route = usePublishedRoute();
  const { isLight, colors } = useCommuterTheme();

  const routeCenter = useMemo(() => {
    const latitudes = route.coordinates.map(p => p[0]);
    const longitudes = route.coordinates.map(p => p[1]);
    return {
      latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
      longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    };
  }, [route.coordinates]);

  const routePointsJs = useMemo(
    () => JSON.stringify(route.coordinates),
    [route.coordinates]
  );

  const mapVehicles = useMemo(() => vehicles.map(v => mapVehicleState(v, route.coordinates)), [vehicles, route.coordinates]);
  const mapState = useMemo(() => ({
    vehicles: mapVehicles, userLocation, isHailing,
  }), [mapVehicles, userLocation, isHailing]);
  useEffect(() => {
    if (selectedVehicleId && !vehicles.some(v => String(v.vehicle_id || v.id) === selectedVehicleId)) setSelectedVehicleId(null);
  }, [vehicles, selectedVehicleId]);
  useEffect(() => { webViewRef.current?.injectJavaScript(mapUpdateScript(mapState)); }, [mapState, isLight]);

  const htmlContent = useMemo(() => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    html, body, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      background: ${isLight ? '#F3F7FC' : '#050F1A'};
      overflow: hidden;
    }
    .leaflet-control-attribution, .leaflet-control-zoom { display: none !important; }
    
    ${commuterLocationCss(isLight)}
    @keyframes pulse {
      0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 109, 58, 0.7); }
      70% { transform: scale(1.1); box-shadow: 0 0 0 12px rgba(255, 109, 58, 0); }
      100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(255, 109, 58, 0); }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', {
      center: [${routeCenter.latitude}, ${routeCenter.longitude}],
      zoom: 12,
      minZoom: 11,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false
    });

    var cartoKey = "${CARTO_API_KEY}";
    var tileUrl = cartoKey
      ? 'https://{s}.basemaps.cartocdn.com/${isLight ? 'rastertiles/voyager' : 'dark_all'}/{z}/{x}/{y}{r}.png?key=' + encodeURIComponent(cartoKey)
      : 'https://{s}.basemaps.cartocdn.com/${isLight ? 'rastertiles/voyager' : 'dark_all'}/{z}/{x}/{y}{r}.png';

    var tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abcd'
    });

    tileLayer.on('tileerror', function() {
      if (!tileLayer._hasFallenBack) {
        tileLayer._hasFallenBack = true;
        tileLayer.setUrl('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
      }
    });

    tileLayer.addTo(map);

    var routePoints = ${routePointsJs};
    L.polyline(routePoints, {
      color: '${isLight ? "#1A5FB4" : "#62A0EA"}',
      weight: 8,
      opacity: 0.2,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);
    L.polyline(routePoints, {
      color: '${isLight ? "#1A5FB4" : "#62A0EA"}',
      weight: 4,
      opacity: 0.9,
      dashArray: '10 10',
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);

    ${MAP_RUNTIME}
  </script>
</body>
</html>
  `, [routePointsJs, routeCenter.latitude, routeCenter.longitude, isLight]);
  const source = useMemo(() => ({ html: htmlContent }), [htmlContent]);

  return (
    <View style={[styles.container, { backgroundColor: colors.surfaceSecondary }, style]}>
      {route.source !== "backend" && <Text style={{ position: "absolute", top: 8, left: 8, zIndex: 5, color: "white", backgroundColor: "#071A2E", padding: 8, borderRadius: 8 }}>
        {route.source === "cached" ? "Saved route — reconnect to refresh" : "Fallback route — awaiting published route"}
      </Text>}
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={source}
        onLoadEnd={() => webViewRef.current?.injectJavaScript(mapUpdateScript(mapState))}
        onMessage={(event) => {
          try {
            const message = JSON.parse(event.nativeEvent.data);
            if (message?.type === "chatco-unit-open" && vehicles.some(v => String(v.vehicle_id || v.id) === String(message.id))) setSelectedVehicleId(String(message.id));
          } catch { /* Ignore unrelated WebView messages. */ }
        }}
        style={styles.webView}
        scrollEnabled={false}
      />
      <UnitDetailsPanel vehicleId={selectedVehicleId} onClose={() => setSelectedVehicleId(null)} />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    backgroundColor: commuterColors.surfaceSecondary,
  },
  webView: {
    flex: 1,
    backgroundColor: "transparent",
  },
});
