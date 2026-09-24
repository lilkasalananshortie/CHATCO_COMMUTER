import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import Constants from "expo-constants";
import { commuterColors } from "../../core/theme/colors";
import type { VehicleLocation } from "../../core/domain/types";
import { ROUTE_POINTS, ROUTE_COORDINATES } from "./route-data";

const CARTO_API_KEY =
  process.env.EXPO_PUBLIC_CARTO_API_KEY ||
  process.env.NEXT_PUBLIC_CARTO_API_KEY ||
  (Constants.expoConfig?.extra as any)?.cartoApiKey ||
  "cb1_2dut_1_0bf5bd46e8782ff0b7ba6f38";

export interface CommuterLiveMapProps {
  vehicles: VehicleLocation[];
  userLocation?: { latitude: number; longitude: number } | null;
  isHailing?: boolean;
}

export const CommuterLiveMap: React.FC<CommuterLiveMapProps> = ({
  vehicles,
  userLocation,
  isHailing = false,
}) => {
  const routeCenter = useMemo(() => {
    const latitudes = ROUTE_COORDINATES.map((p) => p.latitude);
    const longitudes = ROUTE_COORDINATES.map((p) => p.longitude);
    return {
      latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
      longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    };
  }, []);

  const routePointsJs = useMemo(
    () => JSON.stringify(ROUTE_POINTS),
    []
  );

  const vehiclesJs = useMemo(
    () =>
      JSON.stringify(
        vehicles.map((v) => ({
          id: v.vehicle_id || v.id || v.unit_number || "JEEP",
          unitNumber: v.unit_number || "JEEP",
          plateNumber: v.plate_number,
          lat: v.latitude,
          lng: v.longitude,
          availableSeats: v.available_seats ?? null,
        }))
      ),
    [vehicles]
  );

  const userLocJs = useMemo(
    () => (userLocation ? JSON.stringify([userLocation.latitude, userLocation.longitude]) : "null"),
    [userLocation]
  );

  const htmlContent = `
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
      background: #050F1A;
      overflow: hidden;
    }
    .leaflet-control-attribution, .leaflet-control-zoom { display: none !important; }
    
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

    .user-marker {
      width: 20px;
      height: 20px;
      background: #0284C7;
      border: 3px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 0 10px rgba(2, 132, 199, 0.8);
    }

    .hail-marker {
      width: 24px;
      height: 24px;
      background: #FF6D3A;
      border: 3px solid #FFFFFF;
      border-radius: 50%;
      box-shadow: 0 0 14px rgba(255, 109, 58, 0.9);
      animation: pulse 1.5s infinite;
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
      zoomControl: false,
      attributionControl: false
    });

    var cartoKey = "${CARTO_API_KEY}";
    var tileUrl = cartoKey
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png?key=' + encodeURIComponent(cartoKey)
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

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

    var vehicles = ${vehiclesJs};
    var vehicleMarkers = [];

    vehicles.forEach(function(v) {
      var icon = L.divIcon({
        className: '',
        html: '<div class="vehicle-marker">' + (v.unitNumber || 'J') + '</div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });
      var m = L.marker([v.lat, v.lng], { icon: icon }).addTo(map);
      vehicleMarkers.push(m);
    });

    var userLoc = ${userLocJs};
    var isHailing = ${isHailing ? "true" : "false"};

    if (userLoc) {
      var userIcon = L.divIcon({
        className: '',
        html: isHailing ? '<div class="hail-marker"></div>' : '<div class="user-marker"></div>',
        iconSize: isHailing ? [24, 24] : [20, 20],
        iconAnchor: isHailing ? [12, 12] : [10, 10]
      });
      L.marker(userLoc, { icon: userIcon }).addTo(map);
      
      if (isHailing) {
        L.circle(userLoc, {
          radius: 1000,
          color: '#FF6D3A',
          fillColor: '#FF6D3A',
          fillOpacity: 0.1,
          weight: 1.5,
          dashArray: '4, 4'
        }).addTo(map);
      }
    }
  </script>
</body>
</html>
  `;

  return (
    <View style={styles.container}>
      {React.createElement("iframe", {
        srcDoc: htmlContent,
        style: {
          width: "100%",
          height: "100%",
          border: "none",
          backgroundColor: "transparent",
        },
        title: "Commuter Live Map",
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 280,
    width: "100%",
    backgroundColor: commuterColors.surfaceSecondary,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: commuterColors.border,
  },
});
