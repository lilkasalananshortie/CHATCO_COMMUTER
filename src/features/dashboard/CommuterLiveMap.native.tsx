import React, { useEffect, useMemo, useRef } from "react";
import { Text, View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { WebView } from "react-native-webview";
import Constants from "expo-constants";
import { commuterColors } from "../../core/theme/colors";
import type { VehicleLocation } from "../../core/domain/types";
import { usePublishedRoute } from "./usePublishedRoute";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { MAP_RUNTIME, mapUpdateScript } from "./map-runtime";
import { commuterLocationCss } from "./commuter-map-pin";

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

export const CommuterLiveMap: React.FC<CommuterLiveMapProps> = ({
  vehicles,
  userLocation,
  isHailing = false,
  style,
}) => {
  const webViewRef = useRef<WebView>(null);
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

  const mapState = useMemo(() => ({ vehicles: vehicles.map(v => ({
    id: v.vehicle_id || v.id || v.unit_number, unitNumber: v.unit_number,
    plateNumber: v.plate_number, lat: Number(v.latitude), lng: Number(v.longitude),
    availableSeats: v.available_seats, driverName: v.driver_name, conductorName: v.conductor_name,
  })), userLocation, isHailing }), [vehicles, userLocation, isHailing]);
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
    .vehicle-marker {
      width: 32px;
      height: 32px;
      background: #1A5FB4;
      border: 2px solid #FFFFFF;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 3px 8px rgba(7, 26, 46, 0.4);
      color: white;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-weight: 800;
      font-size: 10px;
    }



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
    var polyline = L.polyline(routePoints, {
      color: '#1A5FB4',
      weight: 5,
      opacity: 0.85,
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
        style={styles.webView}
        scrollEnabled={false}
      />
    </View>
  );
};

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
