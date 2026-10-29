import React, { useEffect, useState } from "react";
import { Image, Platform, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { Text } from "../../shared/ui/BrandText";
import type { RenewalDocument } from "./renewal-types";

function usePreviewUri(document: RenewalDocument | null) {
  const [uri, setUri] = useState<string | null>(null);
  useEffect(() => {
    if (!document) { setUri(null); return; }
    if ("uri" in document) { setUri(document.uri); return; }
    if (Platform.OS !== "web" || typeof URL.createObjectURL !== "function") { setUri(null); return; }
    const objectUrl = URL.createObjectURL(document);
    setUri(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [document]);
  return uri;
}

export function SupportingDocumentField({ document, label, disabled, onChoose, onRemove }: {
  document: RenewalDocument | null; label: string; disabled: boolean; onChoose: () => void; onRemove: () => void;
}) {
  const { colors } = useCommuterTheme();
  const previewUri = usePreviewUri(document);
  const isImage = Boolean(document && document.type.startsWith("image/"));
  const size = document?.size == null ? "Size unavailable" : `${(document.size / (1024 * 1024)).toFixed(document.size < 1024 * 1024 ? 2 : 1)} MB`;
  return <View style={{ gap: 8 }}>
    <TouchableOpacity accessibilityRole="button" disabled={disabled} onPress={onChoose} style={{ minHeight: 72, flexDirection: "row", alignItems: "center", gap: 12, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: document ? colors.primary : colors.border, backgroundColor: colors.surfaceSecondary, opacity: disabled ? 0.6 : 1 }}>
      <View style={{ width: 52, height: 52, borderRadius: 9, overflow: "hidden", alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceHover }}>
        {isImage && previewUri ? <Image source={{ uri: previewUri }} style={{ width: 52, height: 52 }} resizeMode="cover" /> : <Ionicons name={document?.type === "application/pdf" ? "document-text-outline" : "cloud-upload-outline"} size={23} color={colors.primary} />}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text numberOfLines={1} style={{ color: colors.textPrimary, fontSize: 14, fontWeight: "700" }}>{document?.name ?? label}</Text>
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>{document ? `${document.type === "application/pdf" ? "PDF document" : "Image"} · ${size}` : "JPG, PNG, WebP or PDF · max 5 MB"}</Text>
      </View>
      <Ionicons name={document ? "refresh-outline" : "cloud-upload-outline"} size={19} color={colors.primary} />
    </TouchableOpacity>
    {document && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Remove supporting document" disabled={disabled} onPress={onRemove} style={{ minHeight: 36, alignSelf: "flex-end", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 8 }}><Ionicons name="trash-outline" size={15} color={colors.danger} /><Text style={{ color: colors.danger, fontSize: 13, fontWeight: "600" }}>Remove document</Text></TouchableOpacity>}
  </View>;
}
