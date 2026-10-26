/** Data stays outside HTML templates so a GPS poll never recreates the map. */
export function mapUpdateScript(state: unknown): string {
  return `window.chatcoUpdate && window.chatcoUpdate(${JSON.stringify(state).replace(/</g, "\\u003c")}); true;`;
}

export const MAP_RUNTIME = `
var vehicleMarkers = Object.create(null), userMarker = null, hailCircle = null;
function coordinates(lat, lng) { return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180; }
function markerIcon(label, className, size) {
  var node = document.createElement('div'); node.className = className; node.textContent = label;
  return L.divIcon({className: '', html: node, iconSize: [size,size], iconAnchor: [size/2,size/2]});
}
function unitDetails(v) {
  var node = document.createElement('div'); node.style.minWidth = '160px';
  [v.unitNumber, v.plateNumber, v.driverName && 'Driver: ' + v.driverName,
   v.conductorName && 'Conductor: ' + v.conductorName,
   v.availableSeats != null && 'Available seats: ' + v.availableSeats].forEach(function(value) {
    if (!value) return; var row = document.createElement('div'); row.textContent = String(value); node.appendChild(row);
  });
  return node;
}
window.chatcoUpdate = function(state) {
  if (!state || !Array.isArray(state.vehicles)) return;
  var keep = Object.create(null);
  state.vehicles.forEach(function(v) {
    if (!coordinates(v.lat,v.lng)) return;
    var key = String(v.id); keep[key] = true;
    var marker = vehicleMarkers[key];
    if (!marker) {
      marker = L.marker([v.lat,v.lng], {icon: markerIcon(v.unitNumber || 'J', 'vehicle-marker',32)}).addTo(map);
      marker.bindPopup(unitDetails(v), {autoClose:false,closeOnClick:false}); vehicleMarkers[key] = marker;
    } else {
      marker.setLatLng([v.lat,v.lng]); marker.setPopupContent(unitDetails(v));
    }
  });
  Object.keys(vehicleMarkers).forEach(function(key) { if (!keep[key]) { map.removeLayer(vehicleMarkers[key]); delete vehicleMarkers[key]; } });
  var location = state.userLocation;
  if (location && coordinates(location.latitude,location.longitude)) {
    var position = [location.latitude,location.longitude];
    var icon = markerIcon('',state.isHailing ? 'hail-marker' : 'user-marker',state.isHailing ? 24 : 20);
    if (!userMarker) userMarker = L.marker(position,{icon:icon}).addTo(map);
    else { userMarker.setLatLng(position); userMarker.setIcon(icon); }
    if (state.isHailing) {
      if (!hailCircle) hailCircle = L.circle(position,{radius:1000,color:'#FF6D3A',fillOpacity:0.1,weight:1.5}).addTo(map);
      else hailCircle.setLatLng(position);
    } else if (hailCircle) { map.removeLayer(hailCircle); hailCircle = null; }
  } else {
    if (userMarker) map.removeLayer(userMarker); if (hailCircle) map.removeLayer(hailCircle);
    userMarker = null; hailCircle = null;
  }
};
window.addEventListener('message', function(event) {
  if (event.source !== window.parent || !event.data || event.data.type !== 'chatco-map-update') return;
  window.chatcoUpdate(event.data.state);
});
`;
