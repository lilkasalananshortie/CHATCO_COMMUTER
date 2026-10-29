/// <reference types="jest" />
/// <reference types="node" />
import { runInNewContext } from "node:vm";
import { MAP_RUNTIME, mapUpdateScript } from "../map-runtime";
import { maskedEmail } from "../../profile/profile-privacy";
import { COMMUTER_ACCOUNT_PATH } from "../commuter-map-pin";

function runtime() {
  const markers: any[] = [];
  const map = { removeLayer: jest.fn(), on: jest.fn(), getBounds: () => ({ contains: () => true }) };
  const window: any = { addEventListener: jest.fn() };
  const element = () => {
    const node: any = { style: {}, className: "", textContent: "", children: [], attributes: {} };
    node.appendChild = (child: unknown) => node.children.push(child);
    node.setAttribute = (name: string, value: string) => { node.attributes[name] = value; };
    return node;
  };
  const document = { createElement: element, createElementNS: element };
  const L = { divIcon: (options: unknown) => options, marker: jest.fn(() => {
    const marker = { addTo: jest.fn().mockReturnThis(), bindPopup: jest.fn().mockReturnThis(), setLatLng: jest.fn(), setPopupContent: jest.fn(), setIcon: jest.fn() };
    markers.push(marker); return marker;
  }), circle: jest.fn(() => ({ addTo: jest.fn().mockReturnThis(), setLatLng: jest.fn() })) };
  runInNewContext(MAP_RUNTIME, { window, document, map, L });
  return { update: window.chatcoUpdate, markers, map, L };
}
const unit = { id: "unit", unitNumber: "U1", plateNumber: "ABC", lat: 14.8, lng: 120.8, driverName: "Driver", conductorName: "Conductor", availableSeats: 0 };
test("location polls update the same marker and popup without recreating the map", () => {
  const r = runtime(); r.update({ vehicles: [unit] }); r.update({ vehicles: [{ ...unit, lat: 14.9 }] });
  expect(r.L.marker).toHaveBeenCalledTimes(1);
  expect(r.markers[0].bindPopup).toHaveBeenCalledWith(expect.anything(), { autoClose: false, closeOnClick: false });
  expect(r.markers[0].setLatLng).toHaveBeenCalledWith([14.9, 120.8]); expect(r.markers[0].setPopupContent).toHaveBeenCalledTimes(1);
});
test("a unit leaving removes only its marker; invalid coordinates are rejected", () => {
  const r = runtime(); r.update({ vehicles: [unit, { ...unit, id: "invalid", lat: 999 }] }); r.update({ vehicles: [] });
  expect(r.L.marker).toHaveBeenCalledTimes(1); expect(r.map.removeLayer).toHaveBeenCalledWith(r.markers[0]);
});
test("backend labels use text nodes instead of interpolated executable markup", () => {
  const r = runtime(); r.update({ vehicles: [{ ...unit, unitNumber: '<img src=x onerror="bad()">' }] });
  const icon = r.L.marker.mock.calls[0] as unknown as any[];
  expect(icon[1].icon.html.textContent).toContain("<img");
  expect(mapUpdateScript({ value: "</script>" })).not.toContain("</script>");
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
