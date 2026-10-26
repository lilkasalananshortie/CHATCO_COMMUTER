export interface User {
  id: string;
  email: string;
  name: string;
  role: "COMMUTER" | "CONDUCTOR" | "ADMIN";
  must_change_password?: boolean;
}

export interface CommuterProfile {
  id: string;
  first_name: string;
  middle_name?: string | null;
  surname: string;
  birthdate?: string | null;
  gender?: string | null;
  contact_number?: string | null;
  commuter_type: "REGULAR" | "STUDENT" | "SENIOR" | "PWD" | "Regular" | "Student" | "Senior" | "PWD";
  applied_type?: string | null;
  username: string;
  language_preference?: string | null;
  account_status: "ACTIVE" | "APPROVED" | "PENDING" | "REJECTED" | "SUSPENDED";
  id_image_url?: string | null;
  profile_image_url?: string | null;
  verified_at?: string | null;
  student_discount_expires_at?: string | null;
  effective_fare_type?: string;
}

export interface VehicleLocation {
  vehicle_id?: string;
  id?: string;
  unit_number: string;
  plate_number: string;
  latitude: number;
  longitude: number;
  available_seats?: number | null;
  speed?: number | null;
  bearing?: number | null;
  capacity_status?: "AVAILABLE" | "FULL" | "LAST_TRIP" | null;
  driver_name?: string | null;
  conductor_name?: string | null;
  updated_at?: string | null;
}

export interface FarePoint {
  id: string;
  route_id?: string;
  point_number?: number;
  sequence?: number;
  code?: string;
  name: string;
  landmarks?: string[] | string | null;
  sub_stops?: string[] | string | null;
  regular_fare?: number;
  discounted_fare?: number;
  km_from_start?: number;
  latitude?: number | null;
  longitude?: number | null;
}

export interface FareBreakdownLine {
  passenger_type: string;
  quantity: number;
  unit_fare: number;
  unit_discount_amount: number;
  subtotal: number;
}

export interface CalculatedFare {
  pickup: FarePoint;
  dropoff: FarePoint;
  pickup_name: string;
  dropoff_name: string;
  lines: FareBreakdownLine[];
  total_passengers: number;
  gross_amount: number;
  discount_amount: number;
  final_amount: number;
}

export interface HailRequest {
  id: string;
  pickup_name: string;
  passenger_count: number;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "COMPLETED" | "EXPIRED";
  expires_at?: string | null;
  created_at: string;
  accepted_by?: {
    unit_number: string;
    driver_name?: string;
  } | null;
}

export interface Trip {
  id: string;
  shift_id?: string | null;
  can_leave_feedback?: boolean;
  feedback?: Feedback | null;
  payment_reconciliation_status?: string | null;
  transaction_id?: string;
  route_name?: string;
  pickup_name?: string;
  dropoff_name?: string;
  origin_name?: string;
  destination_name?: string;
  gross_amount?: number;
  discount_amount?: number;
  final_amount?: number;
  fare_amount?: number;
  payment_method: "CASH" | "GCASH" | "VOUCHER";
  status?: "PAID" | "PENDING" | "FAILED" | "CANCELLED" | "EXPIRED" | "REFUNDED";
  paid_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
  unit_number?: string | null;
  plate_number?: string | null;
  driver_name?: string | null;
  conductor_name?: string | null;
  has_feedback?: boolean;
}

export interface RewardProgress {
  rides_completed?: number;
  rides_required?: number;
  cycle_progress_percentage?: number;
  current_rides?: number;
  target_rides?: number;
  free_rides_earned?: number;
  available_vouchers?: Voucher[];
  vouchers?: Voucher[];
  currentCycleRides?: number;
  ridesNeeded?: number;
  totalRides?: number;
  availableVoucherCount?: number;
  archivedVoucherCount?: number;
  progressPercent?: number;
  ridesRemaining?: number;
}

export interface Voucher {
  id: string;
  code: string;
  type?: "FREE_RIDE" | "DISCOUNT" | "REWARD";
  amount?: number | null;
  status?: "AVAILABLE" | "CLAIMED" | "USED" | "EXPIRED";
  discount_amount?: number;
  discount_type?: string;
  discount_value?: number;
  valid_until?: string;
  expires_at?: string | null;
  expiresAt?: string | null;
  rideOrigin?: string;
  is_used?: boolean;
}

export interface Feedback {
  id: string;
  shift_id: string;
  rating: number;
  category?: string | null;
  conductor_rating?: number | null;
  conductor_category?: string | null;
  conductor_comment?: string | null;
  comment?: string | null;
  created_at: string;
}

export interface LostItem {
  id: string;
  title: string;
  category: string;
  description: string;
  found_date?: string | null;
  found_at?: string | null;
  location_found?: string | null;
  unit_number?: string | null;
  status: "REPORTED" | "VERIFIED" | "CLAIMED" | "RETURNED" | "UNCLAIMED" | "AVAILABLE" | "APPROVED" | "RELEASED" | "CLOSED" | "EXPIRED";
  image_url?: string | null;
  imageUrl?: string | null;
  itemName?: string;
  plateNumber?: string | null;
  driverName?: string | null;
  conductorName?: string | null;
  estimatedTimeLost?: string | null;
  datePosted?: string | null;
  is_watched?: boolean;
}

export type ClaimStatus = "NONE" | "PENDING" | "VALIDATED" | "REJECTED" | "RELEASED";

export interface ClaimData {
  claimId: string;
  status: Exclude<ClaimStatus, "NONE">;
  proof: string;
  claimDate: string;
  reviewedAt?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  releasedAt?: string | null;
  rejectionReason?: string | null;
  item: LostItem | null;
}

export type AnnouncementType = "PROMO" | "SAFETY" | "SYSTEM" | "MAINTENANCE" | "CLAIM_UPDATE" | "CUSTOM" | "VOUCHER" | "SAVED_ITEM";

export interface Announcement {
  id: string;
  title: string;
  content?: string;
  message?: string;
  type?: AnnouncementType;
  rawType?: string | null;
  priority?: "NORMAL" | "IMPORTANT" | "URGENT";
  is_read?: boolean;
  isRead?: boolean;
  published_at?: string | null;
  created_at?: string | null;
  createdAt?: string | null;
}

export interface SosAlert {
  id: string;
  status: "TRIGGERED" | "ACKNOWLEDGED" | "RESOLVED" | "ACTIVE";
  latitude: number;
  longitude: number;
  created_at: string;
  acknowledged_at?: string | null;
}

export interface ResolvedCrew {
  shiftId: string;
  unitNumber?: string | null;
  plateNumber: string;
  driverName: string;
  conductorName: string;
  routeTitle?: string | null;
}

export type CommuterTab = "home" | "fare" | "lostfound" | "rewards" | "feedback" | "profile";

