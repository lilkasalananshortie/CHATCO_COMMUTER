import { COMMUTER_ACCOUNT_PATH, COMMUTER_PIN_SIZE } from "./commuter-map-pin";

/** Data stays outside HTML templates so a GPS poll never recreates the map. */
export function mapUpdateScript(state: unknown): string {
  return `window.chatcoUpdate && window.chatcoUpdate(${JSON.stringify(state).replace(/</g, "\\u003c")}); true;`;
}

export const MAP_RUNTIME = `
var vehicleMarkers = Object.create(null), userMarker = null, hailCircle = null, userPosition = null, userDirection = null;
function coordinates(lat, lng) { return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180; }
function updateUserDirection() {
  if (!userPosition || map.getBounds().contains(userPosition)) {
    if (userDirection) userDirection.style.display = 'none';
    return;
  }
  if (!userDirection) {
    userDirection = document.createElement('div'); userDirection.className = 'commuter-you-direction';
    userDirection.innerHTML = '<svg class="commuter-you-arrow" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg><span class="commuter-you-label">You</span>';
    map.getContainer().appendChild(userDirection);
  }
  var center = map.getCenter(), lat1 = center.lat * Math.PI / 180, lat2 = userPosition[0] * Math.PI / 180;
  var dLng = (userPosition[1] - center.lng) * Math.PI / 180;
  var y = Math.sin(dLng) * Math.cos(lat2);
  var x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  var angle = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  var dx = Math.sin(angle * Math.PI / 180), dy = -Math.cos(angle * Math.PI / 180);
  var tx = dx > 0 ? 45 / dx : dx < 0 ? -45 / dx : Infinity;
  var ty = dy > 0 ? 25 / dy : dy < 0 ? -35 / dy : Infinity;
  var t = Math.min(tx, ty);
  userDirection.style.left = (50 + t * dx) + '%'; userDirection.style.top = (50 + t * dy) + '%';
  userDirection.querySelector('svg').style.transform = 'rotate(' + angle + 'deg)';
  userDirection.style.display = 'flex';
}
map.on('move zoom', updateUserDirection);
function markerIcon(label, className, size) {
  var node = document.createElement('div'); node.className = className; node.textContent = label;
  return L.divIcon({className: '', html: node, iconSize: [size,size], iconAnchor: [size/2,size/2]});
}
function accountSvg(size, className) {
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(size)); svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
  if (className) svg.setAttribute('class', className); else svg.setAttribute('fill', '#FFFFFF');
  var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', ${JSON.stringify(COMMUTER_ACCOUNT_PATH)}); svg.appendChild(path); return svg;
}
function commuterIcon() {
  var node = document.createElement('div'); node.className = 'commuter-location-marker';
  node.style.backgroundColor = '#1A5FB4'; node.appendChild(accountSvg(18));
  return L.divIcon({className:'custom-commuter-icon',html:node,iconSize:[${COMMUTER_PIN_SIZE},${COMMUTER_PIN_SIZE}],iconAnchor:[${COMMUTER_PIN_SIZE / 2},${COMMUTER_PIN_SIZE / 2}],popupAnchor:[0,-15]});
}
function currentLocationDetails() {
  var panel = document.createElement('section');
  var header = document.createElement('div'); header.className = 'commuter-popup-header'; header.appendChild(accountSvg(34, 'commuter-popup-icon'));
  var subtitle = document.createElement('div'); subtitle.className = 'commuter-popup-subtitle'; subtitle.textContent = 'Your location'; header.appendChild(subtitle);
  var title = document.createElement('div'); title.className = 'commuter-popup-title'; title.textContent = 'You are here'; header.appendChild(title); panel.appendChild(header);
  var status = document.createElement('span'); status.className = 'commuter-popup-status'; status.textContent = 'Live GPS'; panel.appendChild(status); return panel;
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
    userPosition = position;
    var icon = commuterIcon();
    if (!userMarker) {
      userMarker = L.marker(position,{icon:icon,title:'Your location',alt:'Your location',keyboard:true,interactive:true}).addTo(map);
      userMarker.bindPopup(currentLocationDetails(), {className:'chatco-location-popup',autoClose:false,closeOnClick:false,minWidth:180,maxWidth:260});
    }
    else { userMarker.setLatLng(position); userMarker.setIcon(icon); }
    if (state.isHailing) {
      if (!hailCircle) hailCircle = L.circle(position,{radius:1000,color:'#FF6D3A',fillOpacity:0.1,weight:1.5}).addTo(map);
      else hailCircle.setLatLng(position);
    } else if (hailCircle) { map.removeLayer(hailCircle); hailCircle = null; }
    updateUserDirection();
  } else {
    if (userMarker) map.removeLayer(userMarker); if (hailCircle) map.removeLayer(hailCircle);
    userMarker = null; hailCircle = null; userPosition = null; updateUserDirection();
  }
};
window.addEventListener('message', function(event) {
  if (event.source !== window.parent || !event.data || event.data.type !== 'chatco-map-update') return;
  window.chatcoUpdate(event.data.state);
});
`;
