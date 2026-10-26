import React, { type CSSProperties } from "react";
import { Platform } from "react-native";
import Svg, { Circle, Line, Path, Polyline, Rect, type SvgProps } from "react-native-svg";
import { webIconNodes } from "./web-icon-nodes";

export type WebIconName = keyof typeof webIconNodes;
export interface WebIconProps { name: WebIconName; size?: number; color?: string; strokeWidth?: number; style?: SvgProps["style"] }

function flattenSvgStyle(value: unknown): Record<string, unknown> {
  if (Array.isArray(value)) return Object.assign({}, ...value.map((item: unknown) => flattenSvgStyle(item)));
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

/** Exact web geometry, rendered natively. No icon-font loading or baseline offsets. */
export function WebIcon({ name, size = 24, color = "#FFFFFF", strokeWidth, style }: WebIconProps) {
  const width = strokeWidth ?? (name === "hail-pin" || name === "history" || name === "tools-chevron" ? 2.5 : name === "qr-code" || name === "share-ride" || name === "sos" ? 1.5 : 2);
  // Keep styles flat for both the browser SVG renderer and native react-native-svg.
  const svgStyle = { width: size, height: size, flexShrink: 0, ...flattenSvgStyle(style), pointerEvents: "none" as const };
  if (Platform.OS === "web") {
    return React.createElement(
      "svg",
      {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: color,
        strokeWidth: width,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": true,
        focusable: false,
        style: svgStyle as CSSProperties,
      },
      ...webIconNodes[name].map(([tag, attributes], index) => {
        const { key, ...props } = attributes as Record<string, string | number>;
        return React.createElement(tag, { key: String(key ?? index), ...props });
      }),
    );
  }

  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color}
    strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" accessible={false}
    style={svgStyle}>
    {webIconNodes[name].map(([tag, attributes], index) => {
      const { key, ...props } = attributes as Record<string, string | number>;
      const id = String(key ?? index);
      switch (tag as string) {
        case "path": return <Path key={id} {...props} />;
        case "circle": return <Circle key={id} {...props} />;
        case "line": return <Line key={id} {...props} />;
        case "polyline": return <Polyline key={id} {...props} />;
        case "rect": return <Rect key={id} {...props} />;
        default: return null;
      }
    })}
  </Svg>;
}
