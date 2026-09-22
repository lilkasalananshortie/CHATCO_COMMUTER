import type { ComponentType } from "react";
import type { VehicleLocation } from "../../core/domain/types";

export interface CommuterLiveMapProps {
  vehicles: VehicleLocation[];
  userLocation?: { latitude: number; longitude: number } | null;
  isHailing?: boolean;
}

export const CommuterLiveMap: ComponentType<CommuterLiveMapProps>;
