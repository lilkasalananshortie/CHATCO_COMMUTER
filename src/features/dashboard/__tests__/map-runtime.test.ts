/// <reference types="jest" />
/// <reference types="node" />
import { runInNewContext } from "node:vm";
import { MAP_RUNTIME, mapUpdateScript } from "../map-runtime";
import { maskedEmail } from "../../profile/profile-privacy";
import { COMMUTER_ACCOUNT_PATH } from "../commuter-map-pin";
import { BUS_ART } from "../bus-map-art";
import { mapVehicleState } from "../map-vehicle-state";

function runtime(reducedMotion = false) {
  const markers: any[] = [];
  const map = { removeLayer: jest.fn(), on: jest.fn(), flyTo: jest.fn(), setView: jest.fn(), getBounds: () => ({ contains: () => true }) };
  const window: any = { matchMedia: () => ({ matches: reducedMotion }), addEventListener: jest.fn(), ReactNativeWebView: { postMessage: jest.fn() } };
  const element = () => {
    const node: any = { style: {}, className: "", textContent: "", children: [], attributes: {} };
    node.appendChild = (child: unknown) => node.children.push(child);
    node.setAttribute = (name: string, value: string) => { node.attributes[name] = value; };
    return node;
  };
  const document = { createElement: element, createElementNS: element };
  const L = { divIcon: (options: unknown) => options, marker: jest.fn(() => {
    const marker = { addTo: jest.fn().mockReturnThis(), bindPopup: jest.fn().mockReturnThis(), on: jest.fn().mockReturnThis(), setLatLng: jest.fn(), setPopupContent: jest.fn(), setIcon: jest.fn() };
    markers.push(marker); return marker;
  }), circle: jest.fn(() => ({ addTo: jest.fn().mockReturnThis(), setLatLng: jest.fn() })) };
  runInNewContext(MAP_RUNTIME, { window, document, map, L, routePoints: [[14.8, 120.8], [14.9, 120.9]] });
  return { update: window.chatcoUpdate, markers, map, L, window };
}
const unit = { id: "unit", unitNumber: "U1", plateNumber: "ABC", lat: 14.8, lng: 120.8, driverName: "Driver", conductorName: "Conductor", availableSeats: 0 };
test("web jeep art faces along the published route and reverses with the shift", () => {
  const route: [number, number][] = [[14.85, 120.8], [14.841, 120.809], [14.832, 120.818]];
  const vehicle = { vehicle_id: "unit", unit_number: "U1", plate_number: "ABC", latitude: 14.841, longitude: 120.809 };
  const forward = mapVehicleState({ ...vehicle, trip_direction: "FORWARD" }, route);
  const reverse = mapVehicleState({ ...vehicle, trip_direction: "REVERSE" }, route);
  expect(forward.heading).toEqual({ facing: "se", arrow: 135 });
  expect(reverse.heading).toEqual({ facing: "nw", arrow: 315 });
  expect(mapVehicleState(vehicle, [])?.heading).toBeNull();
});
test("marker uses the exact angled SVG data, web dimensions, and separate status dots", () => {
  const r = runtime();
  r.update({ vehicles: [{ ...unit, capacityStatus: "FULL", heading: { facing: "nw", arrow: 315 } }], userLocation: fix });
  const options = (r.L.marker.mock.calls[0] as unknown as any[])[1];
  expect(options.icon.iconSize).toEqual([52, 46]);
  expect(options.icon.iconAnchor).toEqual([26, 23]);
  expect(options.icon.html.children[0].src).toBe(BUS_ART.nw);
  expect(options.icon.html.children[1].style.background).toBe("#ef4444");
  expect(options.icon.html.children[2].style.background).toBe("#22c55e");
  expect(options.icon.html.children[3].style.transform).toBe("rotate(315deg)");
  r.update({ vehicles: [{ ...unit, heading: null, lat: 14.9 }] });
  expect(r.markers[0].setIcon.mock.calls[0][0].html.children[0].src).toBe(BUS_ART.s);
  expect(r.markers[0].setIcon.mock.calls[0][0].html.children).toHaveLength(2);
});
test("tapping a unit only opens its map card", () => {
  const r = runtime(); r.update({ vehicles: [unit] });
  expect(r.markers[0].bindPopup).toHaveBeenCalledTimes(1);
  expect(r.markers[0].on).not.toHaveBeenCalledWith("popupopen", expect.anything());
  expect(r.window.ReactNativeWebView.postMessage).not.toHaveBeenCalled();
});
test("location polls update the same marker and popup without recreating the map", () => {
  const r = runtime(); r.update({ vehicles: [unit] }); r.update({ vehicles: [{ ...unit, lat: 14.9 }] });
  expect(r.L.marker).toHaveBeenCalledTimes(1);
  expect(r.markers[0].bindPopup).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ className: "chatco-unit-popup", closeButton: false }));
  expect(r.markers[0].setLatLng).toHaveBeenCalledWith([14.9, 120.8]); expect(r.markers[0].setPopupContent).toHaveBeenCalledTimes(1);
});
test("a unit leaving removes only its marker; invalid coordinates are rejected", () => {
  const r = runtime(); r.update({ vehicles: [unit, { ...unit, id: "invalid", lat: 999 }] }); r.update({ vehicles: [] });
  expect(r.L.marker).toHaveBeenCalledTimes(1); expect(r.map.removeLayer).toHaveBeenCalledWith(r.markers[0]);
});
test("backend labels use text nodes instead of interpolated executable markup", () => {
  const r = runtime(); r.update({ vehicles: [{ ...unit, plateNumber: '<img src=x onerror="bad()">' }] });
  const popup = r.markers[0].bindPopup.mock.calls[0][0];
  expect(text(popup)).toContain('<img src=x onerror="bad()">');
  expect(mapUpdateScript({ value: "</script>" })).not.toContain("</script>");
});
test("nearby unit popup includes distance and estimated arrival", () => {
  const r = runtime();
  r.update({ vehicles: [unit], userLocation: { latitude: unit.lat, longitude: unit.lng } });
  const popup = r.markers[0].bindPopup.mock.calls[0][0];
  expect(text(popup)).toMatch(/Distance\s+0 m/);
  expect(text(popup)).toMatch(/ETA\s+~1 min/);
});
test("profile masks email for display without changing the source address", () => {
  const email = "commuter@example.test";
  expect(maskedEmail(email)).toBe("c••••@example.test"); expect(email).toBe("commuter@example.test"); expect(maskedEmail(null)).toBe("—");
});

const fix = { latitude: 14.8, longitude: 120.8 };
function text(node: any): string { return [node.textContent, ...(node.children ?? []).map(text)].join(" "); }
test("current location uses the web account SVG at 30px, not a blue dot", () => {
  const r = runtime(); r.update({ vehicles: [], userLocation: fix });
  const options = (r.L.marker.mock.calls[0] as unknown as any[])[1];
  expect(options.icon.iconSize).toEqual([30, 30]); expect(options.icon.iconAnchor).toEqual([15, 15]);
  expect(options.icon.html.className).toBe("commuter-location-marker");
  expect(options.icon.html.children[0].children[0].attributes.d).toBe(COMMUTER_ACCOUNT_PATH);
});
test("current location is interactive and has the web's You are here popup", () => {
  const r = runtime(); r.update({ vehicles: [], userLocation: fix });
  const options = (r.L.marker.mock.calls[0] as unknown as any[])[1];
  expect(options).toMatchObject({ interactive: true, keyboard: true, title: "Your location" });
  const [popup, popupOptions] = r.markers[0].bindPopup.mock.calls[0];
  expect(text(popup)).toContain("Your location"); expect(text(popup)).toContain("You are here"); expect(text(popup)).toContain("Live GPS");
  expect(popupOptions.className).toBe("chatco-location-popup");
});
test("GPS refresh reuses the current-location marker and its popup", () => {
  const r = runtime(); r.update({ vehicles: [], userLocation: fix }); r.update({ vehicles: [], userLocation: { ...fix, latitude: 14.9 } });
  expect(r.L.marker).toHaveBeenCalledTimes(1); expect(r.markers[0].bindPopup).toHaveBeenCalledTimes(1);
  expect(r.markers[0].setLatLng).toHaveBeenCalledWith([14.9, 120.8]);
});
test("hailing keeps the web's blue current-location pin and its separate hail radius", () => {
  const r = runtime(); r.update({ vehicles: [], userLocation: fix, isHailing: true });
  const options = (r.L.marker.mock.calls[0] as unknown as any[])[1];
  expect(options.icon.html.style.backgroundColor).toBe("#1A5FB4"); expect(options.icon.iconSize).toEqual([30, 30]);
  expect(r.L.circle).toHaveBeenCalledTimes(1);
});
test("losing the location fix removes the marker instead of showing a fake location", () => {
  const r = runtime(); r.update({ vehicles: [], userLocation: fix }); r.update({ vehicles: [], userLocation: null });
  expect(r.map.removeLayer).toHaveBeenCalledWith(r.markers[0]);
});

test("first valid GPS fix zooms into the user like web, once only", () => {
  const r = runtime();
  r.update({ vehicles: [], userLocation: null });
  r.update({ vehicles: [], userLocation: { latitude: NaN, longitude: 120.8 } });
  expect(r.map.flyTo).not.toHaveBeenCalled();
  r.update({ vehicles: [], userLocation: fix });
  expect(r.map.flyTo).toHaveBeenCalledWith([14.8, 120.8], 16, { duration: 1.5 });
  r.update({ vehicles: [], userLocation: null });
  r.update({ vehicles: [], userLocation: { ...fix, latitude: 14.85 } });
  expect(r.map.flyTo).toHaveBeenCalledTimes(1);
});

test("manual navigation before GPS arrives prevents automatic zoom", () => {
  const r = runtime();
  r.map.on.mock.calls.find(([events]) => events === "dragstart zoomstart")![1]();
  r.update({ vehicles: [], userLocation: fix });
  expect(r.map.flyTo).not.toHaveBeenCalled();
  expect(r.map.setView).not.toHaveBeenCalled();
});

test("first fix elsewhere in the service area uses web's wider zoom", () => {
  const r = runtime();
  r.update({ vehicles: [], userLocation: { latitude: 14.78, longitude: 120.8 } });
  expect(r.map.setView).toHaveBeenCalledWith([14.78, 120.8], 13, { animate: true });
  expect(r.map.flyTo).not.toHaveBeenCalled();
});

test("a fix outside the service area leaves the route view in place", () => {
  const r = runtime();
  r.update({ vehicles: [], userLocation: { latitude: 15.5, longitude: 121.5 } });
  expect(r.map.flyTo).not.toHaveBeenCalled();
  expect(r.map.setView).not.toHaveBeenCalled();
});

test("reduced motion keeps the initial user zoom without the fly animation", () => {
  const r = runtime(true);
  r.update({ vehicles: [], userLocation: fix });
  expect(r.map.setView).toHaveBeenCalledWith([14.8, 120.8], 16, { animate: false });
  expect(r.map.flyTo).not.toHaveBeenCalled();
});
