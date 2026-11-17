import React, { useMemo, useRef, useState } from "react";
import { Image, PanResponder, Platform, TouchableOpacity, useWindowDimensions, View } from "react-native";
import { Text } from "../../shared/ui/BrandText";
import { Ionicons } from "@expo/vector-icons";
import { File as ExpoFile } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { commuterColors } from "../../core/theme/colors";
import { useCommuterTheme } from "../../core/theme/ThemeProvider";
import { clampPhotoOffset, photoCropRect, type PhotoOffset } from "./profile-photo-crop";
import { renderProfilePhotoCrop } from "./profile-photo-processing";
import type { ProfilePhoto } from "./profile-photo";

const MAX_ZOOM = 3;

export function ProfilePhotoAdjuster({ photo, onCancel, onUsePhoto, onPreparingChange }: {
  photo: ProfilePhoto;
  onCancel: () => void;
  onUsePhoto: (cropped: ProfilePhoto) => void;
  onPreparingChange: (preparing: boolean) => void;
}) {
  const { colors = commuterColors } = useCommuterTheme();
  const { width: screenWidth } = useWindowDimensions();
  const viewport = Math.min(300, Math.max(140, screenWidth - 96));
  const [source, setSource] = useState({ uri: photo.uri, width: photo.width ?? 1, height: photo.height ?? 1 });
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState<PhotoOffset>({ x: 0, y: 0 });
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const zoomRef = useRef(1);
  const offsetRef = useRef<PhotoOffset>({ x: 0, y: 0 });
  const lastTouch = useRef<{ x: number; y: number } | null>(null);
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);

  const updateOffset = (next: PhotoOffset) => {
    const bounded = clampPhotoOffset(source.width, source.height, viewport, zoomRef.current, next);
    offsetRef.current = bounded;
    setOffset(bounded);
  };
  const updateZoom = (next: number) => {
    const bounded = Math.min(MAX_ZOOM, Math.max(1, next));
    zoomRef.current = bounded;
    setZoom(bounded);
    updateOffset(offsetRef.current);
  };

  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => gesture.numberActiveTouches > 1 || Math.abs(gesture.dx) > 3 || Math.abs(gesture.dy) > 3,
    onPanResponderGrant: (event) => {
      const touch = event.nativeEvent.touches[0];
      lastTouch.current = touch ? { x: touch.pageX, y: touch.pageY } : null;
      pinch.current = null;
    },
    onPanResponderMove: (event) => {
      const touches = event.nativeEvent.touches;
      if (touches.length >= 2) {
        const distance = Math.hypot(touches[0]!.pageX - touches[1]!.pageX, touches[0]!.pageY - touches[1]!.pageY);
        if (!pinch.current) pinch.current = { distance, zoom: zoomRef.current };
        if (pinch.current.distance > 0) updateZoom(pinch.current.zoom * distance / pinch.current.distance);
        lastTouch.current = null;
      } else if (touches.length === 1) {
        const point = { x: touches[0]!.pageX, y: touches[0]!.pageY };
        if (lastTouch.current) updateOffset({ x: offsetRef.current.x + point.x - lastTouch.current.x, y: offsetRef.current.y + point.y - lastTouch.current.y });
        lastTouch.current = point;
        pinch.current = null;
      }
    },
    onPanResponderRelease: () => { lastTouch.current = null; pinch.current = null; },
    onPanResponderTerminate: () => { lastTouch.current = null; pinch.current = null; },
  }), [source.width, source.height, viewport]);

  const rotate = async (degrees: number) => {
    if (preparing) return;
    setPreparing(true); onPreparingChange(true); setError(null);
    try {
      const rendered = await ImageManipulator.manipulate(source.uri).rotate(degrees).renderAsync();
      const result = await rendered.saveAsync({ format: SaveFormat.PNG });
      setSource({ uri: result.uri, width: result.width, height: result.height });
      zoomRef.current = 1; offsetRef.current = { x: 0, y: 0 };
      setZoom(1); setOffset({ x: 0, y: 0 });
    } catch {
      setError("Couldn't rotate this photo. Please try again.");
    }
    setPreparing(false); onPreparingChange(false);
  };

  const usePhoto = async () => {
    if (preparing) return;
    setPreparing(true); onPreparingChange(true); setError(null);
    try {
      const crop = photoCropRect(source.width, source.height, viewport, zoomRef.current, offsetRef.current);
      const rendered = await renderProfilePhotoCrop(source.uri, crop);
      const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
      const name = `${photo.name.replace(/\.[^.]+$/, "") || "profile-photo"}-cropped.jpg`;
      const file = Platform.OS === "web" ? new File([await (await fetch(result.uri)).blob()], name, { type: "image/jpeg" }) : undefined;
      const size = file?.size ?? new ExpoFile(result.uri).size;
      if (size > 3 * 1024 * 1024) throw new Error("Your adjusted photo must be 3 MB or smaller. Try zooming out.");
      onUsePhoto({ uri: result.uri, name, type: "image/jpeg", width: result.width, height: result.height, size, file });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Couldn't prepare your photo. Please try again.");
      setPreparing(false); onPreparingChange(false);
    }
  };

  const scale = viewport / Math.min(source.width, source.height) * zoom;
  const imageWidth = source.width * scale;
  const imageHeight = source.height * scale;
  const actionStyle = { minHeight: 44, minWidth: 44, alignItems: "center" as const, justifyContent: "center" as const, borderRadius: 10, backgroundColor: colors.surfaceSecondary };

  return <>
    <Text accessibilityRole="header" style={{ color: colors.textPrimary, fontSize: 20, fontWeight: "700" }}>Adjust photo</Text>
    <View {...pan.panHandlers} accessibilityLabel="Drag or pinch to adjust profile photo" style={{ width: viewport, height: viewport, overflow: "hidden", borderRadius: 16, backgroundColor: "#050F1A" }}>
      <Image source={{ uri: source.uri }} resizeMode="stretch" style={{ position: "absolute", width: imageWidth, height: imageHeight, left: (viewport - imageWidth) / 2 + offset.x, top: (viewport - imageHeight) / 2 + offset.y }} />
      <View pointerEvents="none" style={{ position: "absolute", width: viewport, height: viewport, borderWidth: 2, borderColor: "#FFFFFF", borderRadius: 16 }} />
    </View>
    <Text style={{ color: colors.textSecondary, textAlign: "center", fontSize: 13 }}>Drag to reposition. Pinch or use the buttons to zoom.</Text>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 }}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Zoom out" disabled={preparing || zoom <= 1} onPress={() => updateZoom(zoomRef.current - 0.25)} style={[actionStyle, (preparing || zoom <= 1) && { opacity: 0.4 }]}><Ionicons name="remove" size={22} color={colors.textPrimary} /></TouchableOpacity>
      <Text accessibilityLabel={`Photo zoom ${Math.round(zoom * 100)} percent`} style={{ color: colors.textPrimary, minWidth: 48, textAlign: "center" }}>{Math.round(zoom * 100)}%</Text>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Zoom in" disabled={preparing || zoom >= MAX_ZOOM} onPress={() => updateZoom(zoomRef.current + 0.25)} style={[actionStyle, (preparing || zoom >= MAX_ZOOM) && { opacity: 0.4 }]}><Ionicons name="add" size={22} color={colors.textPrimary} /></TouchableOpacity>
    </View>
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12 }}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Rotate photo left" disabled={preparing} onPress={() => void rotate(-90)} style={[actionStyle, preparing && { opacity: 0.4 }]}><Ionicons name="refresh" size={20} color={colors.textPrimary} style={{ transform: [{ scaleX: -1 }] }} /></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Rotate photo right" disabled={preparing} onPress={() => void rotate(90)} style={[actionStyle, preparing && { opacity: 0.4 }]}><Ionicons name="refresh" size={20} color={colors.textPrimary} /></TouchableOpacity>
    </View>
    {error && <Text accessibilityRole="alert" style={{ color: colors.danger, textAlign: "center" }}>{error}</Text>}
    <View style={{ flexDirection: "row", gap: 12, width: "100%" }}>
      <TouchableOpacity accessibilityRole="button" onPress={onCancel} disabled={preparing} style={{ flex: 1, minHeight: 48, justifyContent: "center", alignItems: "center", borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surfaceSecondary, opacity: preparing ? 0.5 : 1 }}><Text style={{ color: colors.textPrimary, fontWeight: "600" }}>Cancel</Text></TouchableOpacity>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Use adjusted photo" onPress={() => void usePhoto()} disabled={preparing} style={{ flex: 1, minHeight: 48, justifyContent: "center", alignItems: "center", borderRadius: 10, backgroundColor: colors.primary, opacity: preparing ? 0.5 : 1 }}><Text style={{ color: "#FFFFFF", fontWeight: "600" }}>{preparing ? "Preparing…" : "Use photo"}</Text></TouchableOpacity>
    </View>
  </>;
}
