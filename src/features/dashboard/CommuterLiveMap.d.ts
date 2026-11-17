import type { ComponentType } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import type { VehicleLocation } from "../../core/domain/types";
import type { usePublishedRoute } from "./usePublishedRoute";

export interface CommuterLiveMapProps {
  vehicles: VehicleLocation[];
  route?: ReturnType<typeof usePublishedRoute>;
  userLocation?: { latitude: number; longitude: number } | null;
  isHailing?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const CommuterLiveMap: ComponentType<CommuterLiveMapProps>;
