import { useEffect, useState } from "react";
import { Platform } from "react-native";

// Map documents are isolated from the app's font registry. Load the same bundled
// font into the iframe/WebView instead of falling back to a system font.
let pendingFontCss: Promise<string> | undefined;

function loadMapFontCss(): Promise<string> {
  if (!pendingFontCss) {
    pendingFontCss = (async () => {
      const { Asset } = require("expo-asset") as typeof import("expo-asset");
      const faces = [
        { source: require("../../../assets/fonts/Poppins-Regular.ttf"), weight: 400 },
        { source: require("../../../assets/fonts/Poppins-Bold.ttf"), weight: 700 },
      ];
      const css = await Promise.all(faces.map(async ({ source, weight }) => {
        const asset = Asset.fromModule(source);
        let uri = asset.uri;
        if (Platform.OS !== "web") {
          await asset.downloadAsync();
          const fileSystem = require("expo-file-system/legacy") as typeof import("expo-file-system/legacy");
          const data = await fileSystem.readAsStringAsync(asset.localUri ?? asset.uri, { encoding: fileSystem.EncodingType.Base64 });
          uri = `data:font/ttf;base64,${data}`;
        }
        return `@font-face{font-family:Poppins;src:url(${JSON.stringify(uri)});font-weight:${weight};font-style:normal;}`;
      }));
      return css.join("\n");
    })().catch((error) => { pendingFontCss = undefined; throw error; });
  }
  return pendingFontCss;
}

export function useMapFontCss(): string {
  const [css, setCss] = useState("");
  useEffect(() => {
    let active = true;
    void loadMapFontCss().then((value) => { if (active) setCss(value); }).catch(() => {});
    return () => { active = false; };
  }, []);
  return css;
}
