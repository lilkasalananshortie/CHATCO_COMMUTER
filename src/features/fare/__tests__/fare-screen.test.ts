/// <reference types="jest" />
import React from "react";
import { FareScreen } from "../FareScreen";
import { normalizeFareMatrix } from "../fare-estimate";
let mockStates: any[] = [], mockIndex = 0;
jest.mock("react", () => ({ ...jest.requireActual("react"), useEffect: () => {}, useRef: (value: unknown) => ({ current: value }), useState: (initial: unknown) => { const index = mockIndex++; if (!(index in mockStates)) mockStates[index] = initial; return [mockStates[index], (value: any) => { mockStates[index] = typeof value === "function" ? value(mockStates[index]) : value; }]; } }));
jest.mock("react-native", () => ({ ActivityIndicator: "Spinner", AppState: {}, KeyboardAvoidingView: "Keyboard", Platform: { OS: "android" }, Pressable: "Button", RefreshControl: "Refresh", ScrollView: "Scroll", TextInput: "Input", View: "View", StyleSheet: { create: (s: unknown) => s } }));
jest.mock("react-native-svg", () => ({ __esModule: true, default: "Svg", Path: "Path" }));
jest.mock("../../../shared/ui/BrandText", () => ({ Text: "Text" }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useCommuterTheme: () => ({ isLight: false }) }));
jest.mock("../../../core/api/commuter-service", () => ({ commuterService: {} }));
function walk(node: any): any[] { if (Array.isArray(node)) return node.flatMap(walk); if (!React.isValidElement(node)) return []; return [node, ...walk((node.props as any).children)]; }
function render() { mockIndex = 0; return walk(FareScreen()); }
function press(label: string) { render().find(node => node.props.accessibilityLabel === label)!.props.onPress(); }
beforeEach(() => {
  mockStates = []; render();
  mockStates[0] = normalizeFareMatrix({ route: { id: "r", name: "Route" }, points: [
    { id: "a", name: "Alpha", code: "ALP", pointNumber: 1, regularFare: 17, discountedFare: 13.6, landmarks: ["Market"] },
    { id: "b", name: "Beta", pointNumber: 8, regularFare: 40, discountedFare: 32 },
  ] }); mockStates[1] = false;
});
test("point expands sub-stops and landmark selection advances to drop-off", () => {
  press("Select Alpha"); expect(mockStates[7]).toBe("a");
  press("Market"); expect(mockStates[3].pickupLandmark).toBe("Market"); expect(mockStates[5]).toBe("destination"); expect(mockStates[7]).toBeNull();
});
test("expanded fare point passes its state to the animated web-parity chevron", () => {
  press("Select Alpha");
  expect(render().find(node => (node.type as any)?.name === "AnimatedFareChevron")?.props.expanded).toBe(true);
});
test("point-only selection advances and does not force a landmark", () => {
  press("Select Alpha"); press("Use Alpha Point Area only"); expect(mockStates[3].pickup).toBe("a"); expect(mockStates[3].pickupLandmark).toBe(""); expect(mockStates[5]).toBe("destination");
});
test("point with no sub-stops advances automatically", () => { press("Select Beta"); expect(mockStates[5]).toBe("destination"); });
test("clear and swap controls update their selections", () => {
  press("Select Alpha"); press("Market"); press("Select Beta"); press("Swap pickup and drop-off");
  expect(mockStates[3].destinationLandmark).toBe("Market"); press("Clear Drop-off"); expect(mockStates[3].destination).toBe(""); expect(mockStates[3].destinationLandmark).toBe("");
});
test("same stop displays web violet warning", () => {
  press("Select Beta"); press("Select Beta"); expect(render().some(node => node.props.children === "Same pickup & drop-off — both locations shown in violet")).toBe(true);
});
test("search has an empty state and finds published point codes", () => {
  mockStates[6] = "unknown"; expect(render().some(node => node.props.children === "No locations found.")).toBe(true);
  mockStates[6] = "ALP"; expect(render().some(node => node.props.accessibilityLabel === "Select Alpha")).toBe(true);
});
test("fare summary is outside the scrolling list", () => {
  const tree = render(); const list = tree.find(node => node.props.testID === "fare-location-list");
  expect(walk(list).some(node => node.props.testID === "fare-summary")).toBe(false);
  expect(tree.some(node => node.props.testID === "fare-summary")).toBe(true);
});
test("discount selection shows authoritative-matrix estimate", () => {
  press("Select Alpha"); press("Market"); press("Select Beta"); press("Student");
  expect(render().some(node => node.props.children === "₱18.40")).toBe(true);
});
