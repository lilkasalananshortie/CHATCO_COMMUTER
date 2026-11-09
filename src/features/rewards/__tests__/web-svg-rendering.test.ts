/// <reference types="jest" />
import React from "react";
import { ProfileIcon, ProfileIdentityBackground } from "../../profile/ProfileIcon";
import { RewardsProgressRing } from "../RewardsProgressRing";

const { renderToStaticMarkup } = jest.requireActual("react-dom/server") as { renderToStaticMarkup: (element: React.ReactElement) => string };

jest.mock("react-native", () => ({
  Platform: { OS: "web" },
  Animated: { createAnimatedComponent: jest.fn() },
}));
jest.mock("react-native-svg", () => ({
  __esModule: true, default: "NativeSvg", Circle: "NativeCircle", Defs: "NativeDefs",
  LinearGradient: "NativeGradient", Path: "NativePath", Rect: "NativeRect", Stop: "NativeStop",
}));

test("profile icon and identity background use browser elements on web", () => {
  const icon = renderToStaticMarkup(React.createElement(ProfileIcon, { name: "sun", size: 20 }));
  const background = renderToStaticMarkup(React.createElement(ProfileIdentityBackground, { isLight: true }));
  expect(icon).toContain("<svg");
  expect(icon).toContain("<circle");
  expect(icon).not.toContain("NativeSvg");
  expect(background).toContain("linear-gradient");
  expect(background).toContain("border-radius:16px");
  expect(background).not.toContain("NativeSvg");
});

test("native profile gradient has rounded corners like its card", () => {
  const platform = jest.requireMock("react-native").Platform as { OS: string };
  platform.OS = "android";
  try {
    const background = ProfileIdentityBackground({ isLight: false }) as React.ReactElement<{ children: React.ReactElement[] }>;
    const rect = background.props.children.find(child => child.type === "NativeRect");
    expect(rect?.props).toMatchObject({ rx: 16, ry: 16 });
  } finally { platform.OS = "web"; }
});

test("rewards ring uses browser SVG and does not create an animated native SVG component", () => {
  const markup = renderToStaticMarkup(React.createElement(RewardsProgressRing, {
    percent: 50, isLight: true, reduceMotion: false,
    nativeOffset: {} as React.ComponentProps<typeof RewardsProgressRing>["nativeOffset"],
  }));
  expect(markup).toContain("<svg");
  expect(markup.match(/<circle/g)).toHaveLength(2);
  expect(markup).toContain("stroke-dashoffset");
  expect(markup).not.toContain("NativeSvg");
  expect(jest.requireMock("react-native").Animated.createAnimatedComponent).not.toHaveBeenCalled();
});
