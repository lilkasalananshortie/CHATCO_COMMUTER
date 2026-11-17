import { createContext, forwardRef, useContext } from "react";
import { Text as NativeText, TextInput as NativeTextInput, StyleSheet, type TextProps, type TextInputProps } from "react-native";
import { brandFont } from "./brand-font";

export const BrandFontContext = createContext(false);

/** Use bundled Poppins weights consistently across app text. */
export function Text({ style, ...props }: TextProps) {
  const loaded = useContext(BrandFontContext);
  const resolved = StyleSheet.flatten(style);
  return <NativeText {...props} style={[style, loaded
    ? { fontFamily: brandFont(resolved?.fontWeight), fontWeight: "normal" } : undefined]} />;
}

/** Forward native input methods used by OTP and other focus controls. */
export const TextInput = forwardRef<NativeTextInput, TextInputProps>(function TextInput({ style, ...props }, ref) {
  const loaded = useContext(BrandFontContext);
  const resolved = StyleSheet.flatten(style);
  return <NativeTextInput {...props} ref={ref} style={[style, loaded
    ? { fontFamily: brandFont(resolved?.fontWeight), fontWeight: "normal" } : undefined]} />;
});
