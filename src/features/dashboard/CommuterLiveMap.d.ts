import type { ComponentType } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import type { VehicleLocation } from "../../core/domain/types";

export interface CommuterLiveMapProps {
  vehicles: VehicleLocation[];
  userLocation?: { latitude: number; longitude: number } | null;
  isHailing?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const CommuterLiveMap: ComponentType<CommuterLiveMapProps>;
