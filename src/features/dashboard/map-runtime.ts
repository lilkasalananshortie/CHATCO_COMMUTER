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
function markerIcon(capacity, isWithinRadius) {
  var colors = { AVAILABLE: '#22c55e', STANDING: '#eab308', FULL: '#ef4444', LAST_TRIP: '#ef4444' };
  var color = colors[String(capacity || 'AVAILABLE').toUpperCase()] || colors.AVAILABLE;
  var node = document.createElement('div');
  node.className = 'vehicle-marker';
  node.style.borderColor = color;
  var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '24'); svg.setAttribute('height', '24'); svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', color); svg.setAttribute('aria-hidden', 'true');
  var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', 'M19,13V7H20V4H4V7H5V13H2C2,13.93 2.5,14.71 3.5,14.93V20A1,1 0 0,0 4.5,21H5.5A1,1 0 0,0 6.5,20V19H17.5V20A1,1 0 0,0 18.5,21H19.5A1,1 0 0,0 20.5,20V14.93C21.5,14.7 22,13.93 22,13H19M8,15A1.5,1.5 0 0,1 6.5,13.5A1.5,1.5 0 0,1 8,12A1.5,1.5 0 0,1 9.5,13.5A1.5,1.5 0 0,1 8,15M16,15A1.5,1.5 0 0,1 14.5,13.5A1.5,1.5 0 0,1 16,12A1.5,1.5 0 0,1 17.5,13.5A1.5,1.5 0 0,1 16,15M17.5,10.5C15.92,10.18 14.03,10 12,10C9.97,10 8,10.18 6.5,10.5V7H17.5V10.5Z');
  svg.appendChild(path); node.appendChild(svg);
  if (isWithinRadius) {
    var dot = document.createElement('span'); dot.className = 'vehicle-marker-in-range'; node.appendChild(dot);
  }
  return L.divIcon({className: '', html: node, iconSize: [44,44], iconAnchor: [22,22], popupAnchor: [0,-25]});
}
function distanceMeters(a, b) {
  var rad = Math.PI / 180, dLat = (b[0] - a[0]) * rad, dLng = (b[1] - a[1]) * rad;
  var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 12742000 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
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
function unitDetails(v, userLocation) {
  var node = document.createElement('div'); node.style.minWidth = '160px';
  var capacityLabel = v.capacityStatus === 'FULL' || v.capacityStatus === 'Full' ? 'Full'
    : v.capacityStatus === 'STANDING' || v.capacityStatus === 'Standing' ? 'Standing only' : 'Seats available';
  [v.plateNumber || v.unitNumber, capacityLabel, v.routeName && 'Route: ' + v.routeName,
   v.driverName && 'Driver: ' + v.driverName,
   v.conductorName && 'Conductor: ' + v.conductorName,
   v.availableSeats != null && 'Available seats: ' + v.availableSeats].forEach(function(value) {
    if (!value) return; var row = document.createElement('div'); row.textContent = String(value); node.appendChild(row);
  });
  if (userLocation && coordinates(userLocation.latitude,userLocation.longitude) && coordinates(v.lat,v.lng)) {
    var distance = distanceMeters([userLocation.latitude,userLocation.longitude],[v.lat,v.lng]);
    var distanceLabel = distance < 1000 ? Math.round(distance) + ' m' : (distance / 1000).toFixed(1) + ' km';
    var distanceRow = document.createElement('div'); distanceRow.textContent = 'Distance: ' + distanceLabel; node.appendChild(distanceRow);
    if (distance <= 1000) {
      var eta = Math.max(1, Math.round(distance / (25000 / 60)));
      var etaRow = document.createElement('div'); etaRow.textContent = 'ETA: ~' + eta + ' min'; node.appendChild(etaRow);
    } else if (v.capacityStatus === 'FULL' || v.capacityStatus === 'Full') {
      var note = document.createElement('div'); note.textContent = 'Not accepting passengers'; node.appendChild(note);
    } else {
      var note = document.createElement('div'); note.textContent = 'Outside pickup radius'; node.appendChild(note);
    }
  }
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
      var user = state.userLocation;
      var inRange = user && coordinates(user.latitude,user.longitude) && distanceMeters([user.latitude,user.longitude],[v.lat,v.lng]) <= 1000;
      marker = L.marker([v.lat,v.lng], {icon: markerIcon(v.capacityStatus, inRange)}).addTo(map);
      marker.bindPopup(unitDetails(v,state.userLocation), {autoClose:false,closeOnClick:false}); vehicleMarkers[key] = marker;
    } else {
      var user = state.userLocation;
      var inRange = user && coordinates(user.latitude,user.longitude) && distanceMeters([user.latitude,user.longitude],[v.lat,v.lng]) <= 1000;
      marker.setIcon(markerIcon(v.capacityStatus, inRange));
      marker.setLatLng([v.lat,v.lng]); marker.setPopupContent(unitDetails(v,state.userLocation));
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
