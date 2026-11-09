/// <reference types="jest" />
import React from "react";
const { renderToStaticMarkup } = jest.requireActual("react-dom/server") as { renderToStaticMarkup: (element: React.ReactElement) => string };
import { CommuterLiveMap } from "../CommuterLiveMap.web";
import { MascotErrorBoundary } from "../../../shared/ui/MascotErrorBoundary";

jest.mock("react-native", () => jest.requireActual("react-native-web/dist/cjs"));
jest.mock("expo-constants", () => ({ __esModule: true, default: { expoConfig: { extra: {} } } }));
jest.mock("../usePublishedRoute", () => ({ usePublishedRoute: () => ({ coordinates: [[14.8, 120.8], [14.9, 120.9]], source: "fallback" }) }));
jest.mock("../../../core/theme/ThemeProvider", () => ({ useCommuterTheme: () => ({ isLight: false, colors: jest.requireActual("../../../core/theme/colors").commuterColors }) }));
jest.mock("../../../core/api/commuter-service", () => ({ commuterService: {} }));
jest.mock("../../../shared/ui/MascotMessage", () => ({ MascotMessage: () => null }));

test("web map renders through React Native Web without render errors", () => {
  const errors = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    const html = renderToStaticMarkup(React.createElement(CommuterLiveMap, { vehicles: [] }));
    expect(html).toContain('<iframe');
    expect(html).toContain('Fallback route');
    expect(errors).not.toHaveBeenCalled();
  } finally { errors.mockRestore(); }
});

test("render failure diagnostics forward readable error text instead of an Error object", () => {
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  try {
    const boundary = new MascotErrorBoundary({ children: null });
    boundary.componentDidCatch(new Error("map failure detail"), { componentStack: "at CommuterLiveMap" });
    expect(log).toHaveBeenCalledWith(expect.stringContaining("[CHATCO render error] Error: map failure detail"));
    expect(log).toHaveBeenCalledWith(expect.stringContaining("at CommuterLiveMap"));
  } finally { log.mockRestore(); }
});
