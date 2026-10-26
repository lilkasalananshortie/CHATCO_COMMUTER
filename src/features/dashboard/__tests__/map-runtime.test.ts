/// <reference types="jest" />
/// <reference types="node" />
import { runInNewContext } from "node:vm";
import { MAP_RUNTIME, mapUpdateScript } from "../map-runtime";
import { maskedEmail } from "../../profile/profile-privacy";

function runtime() {
  const markers: any[] = [];
  const map = { removeLayer: jest.fn() };
  const window: any = { addEventListener: jest.fn() };
  const document = { createElement: () => ({ style: {}, className: "", textContent: "", appendChild: jest.fn() }) };
  const L = { divIcon: (options: unknown) => options, marker: jest.fn(() => {
    const marker = { addTo: jest.fn().mockReturnThis(), bindPopup: jest.fn().mockReturnThis(), setLatLng: jest.fn(), setPopupContent: jest.fn(), setIcon: jest.fn() };
    markers.push(marker); return marker;
  }), circle: jest.fn() };
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
