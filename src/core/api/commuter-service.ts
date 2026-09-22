import { del, post, put, request } from "./api-client";
import type {
  Announcement,
  ClaimData,
  CommuterProfile,
  FarePoint,
  Feedback,
  HailRequest,
  LostItem,
  ResolvedCrew,
  RewardProgress,
  SosAlert,
  Trip,
  User,
  VehicleLocation,
} from "../domain/types";

export interface ClaimGcashResult {
  transactionId: string;
  amount: number;
  regularAmount: number;
  discountAmount: number;
  passengerRole?: string | null;
  pickupName?: string | null;
  dropoffName?: string | null;
  checkoutUrl?: string | null;
  voucherAvailable?: boolean;
  isGroup?: boolean;
}

export interface ReceiptClaimResult {
  transactionId: string;
  amount: number;
  regularAmount: number;
  discountAmount: number;
  pickupName?: string | null;
  dropoffName?: string | null;
  alreadyClaimed: boolean;
  message: string;
}

export const commuterService = {
  // Profile
  async getProfile(): Promise<{ user: User; profile: CommuterProfile }> {
    const res = await request<any>("/mobile/commuter/profile");
    return {
      user: res.user || res,
      profile: res.profile || res,
    };
  },

  async updateProfile(data: { contact_number?: string; email?: string; language_preference?: string }): Promise<CommuterProfile> {
    return put("/mobile/commuter/profile", data);
  },

  async requestPasswordChangeCode(): Promise<{ message: string }> {
    return post("/mobile/commuter/change-password/request-code");
  },

  async confirmPasswordChange(data: { code: string; new_password: string; new_password_confirmation: string }): Promise<{ message: string }> {
    return post("/mobile/commuter/change-password/confirm", data);
  },

  // Live Vehicle Tracking
  async getVehicleLocations(): Promise<VehicleLocation[]> {
    return request<VehicleLocation[]>("/mobile/commuter/vehicles/locations");
  },

  // Fare Matrix
  async getFareMatrix(): Promise<{
    route: { id: string; name: string };
    points: FarePoint[];
    config: {
      baseBarangayCount: number;
      baseFareRegular: number;
      baseFareDiscounted: number;
      succeedingFareRegular: number;
      succeedingFareDiscounted: number;
      totalPoints: number;
    };
  }> {
    return request("/fare-matrix");
  },

  // Hail / "Pick Me Up"
  async sendHail(data: {
    pickup_name: string;
    latitude: number;
    longitude: number;
    passenger_count: number;
  }): Promise<HailRequest> {
    return post("/mobile/commuter/hail", data);
  },

  async cancelHail(id: string): Promise<void> {
    return del(`/mobile/commuter/hail/${encodeURIComponent(id)}`);
  },

  // Payments & GCash Claim
  async claimGcash(qrToken: string): Promise<ClaimGcashResult> {
    const res = await post<any>("/mobile/commuter/payments/claim", { qr_token: qrToken });
    return {
      transactionId: res.transaction_id || res.id || "",
      amount: Number(res.amount ?? res.final_amount ?? 0),
      regularAmount: Number(res.regular_amount ?? res.gross_amount ?? res.amount ?? 0),
      discountAmount: Number(res.discount_amount ?? 0),
      passengerRole: res.passenger_role ?? res.applied_type ?? null,
      pickupName: res.pickup_name ?? res.origin_name ?? null,
      dropoffName: res.dropoff_name ?? res.destination_name ?? null,
      checkoutUrl: res.checkout_url ?? null,
      voucherAvailable: Boolean(res.voucher_available ?? res.can_redeem_voucher),
      isGroup: Boolean(res.is_group ?? (res.passenger_count > 1)),
    };
  },

  async redeemVoucherForGcash(transactionId: string): Promise<ClaimGcashResult> {
    const res = await post<any>(`/mobile/commuter/payments/${encodeURIComponent(transactionId)}/redeem-voucher`);
    return {
      transactionId: res.transaction_id || transactionId,
      amount: Number(res.amount ?? res.final_amount ?? 0),
      regularAmount: Number(res.regular_amount ?? res.gross_amount ?? res.amount ?? 0),
      discountAmount: Number(res.discount_amount ?? 0),
      pickupName: res.pickup_name ?? null,
      dropoffName: res.dropoff_name ?? null,
      checkoutUrl: res.checkout_url ?? null,
      voucherAvailable: false,
      isGroup: Boolean(res.is_group),
    };
  },

  async simulatePayment(transactionId: string, status: "PAID" | "FAILED" = "PAID"): Promise<{ status: string }> {
    return post(`/payments/${encodeURIComponent(transactionId)}/simulate`, { status });
  },

  async claimReceipt(receiptToken: string): Promise<ReceiptClaimResult> {
    const res = await post<any>("/mobile/commuter/receipts/claim", { receipt_token: receiptToken });
    return {
      transactionId: res.transaction_id || res.id || "",
      amount: Number(res.amount ?? res.final_amount ?? 0),
      regularAmount: Number(res.regular_amount ?? res.gross_amount ?? res.amount ?? 0),
      discountAmount: Number(res.discount_amount ?? 0),
      pickupName: res.pickup_name ?? null,
      dropoffName: res.dropoff_name ?? null,
      alreadyClaimed: Boolean(res.already_claimed),
      message: res.message || "Receipt claimed successfully.",
    };
  },

  // Payment History
  async getPaymentHistory(page = 1, perPage = 20, filter?: string): Promise<{
    items: Trip[];
    page: number;
    lastPage: number;
    total: number;
  }> {
    const query = new URLSearchParams();
    query.set("page", String(page));
    query.set("per_page", String(perPage));
    if (filter && filter !== "all") query.set("filter", filter);

    const res = await request<any>(`/mobile/commuter/payments?${query.toString()}`);
    const rows = Array.isArray(res) ? res : res.data || [];
    return {
      items: rows.map((r: any) => ({
        id: r.id,
        transaction_id: r.transaction_id || r.reference_no,
        route_name: r.route_name || "Calumpit - Meycauayan Line",
        pickup_name: r.pickup_name || r.origin_name,
        dropoff_name: r.dropoff_name || r.destination_name,
        gross_amount: Number(r.gross_amount || r.regular_amount || r.amount || 0),
        discount_amount: Number(r.discount_amount || 0),
        final_amount: Number(r.final_amount || r.amount || 0),
        fare_amount: Number(r.final_amount || r.amount || 0),
        payment_method: (r.payment_method || "GCASH").toUpperCase(),
        status: (r.status || "PAID").toUpperCase(),
        paid_at: r.paid_at || r.created_at,
        completed_at: r.completed_at || r.paid_at || r.created_at,
        created_at: r.created_at,
        unit_number: r.unit_number || "J-04",
        plate_number: r.plate_number || "NDB-5821",
        driver_name: r.driver_name,
        conductor_name: r.conductor_name,
        has_feedback: Boolean(r.has_feedback),
      })),
      page: res.current_page ?? page,
      lastPage: res.last_page ?? 1,
      total: res.total ?? rows.length,
    };
  },

  // Trips & Ride History
  async getTrips(): Promise<Trip[]> {
    const res = await request<any>("/mobile/commuter/trips");
    const rows = Array.isArray(res) ? res : res.data || [];
    return rows.map((r: any) => ({
      id: r.id,
      transaction_id: r.transaction_id || r.reference_no,
      route_name: r.route_name || "Calumpit - Meycauayan Line",
      pickup_name: r.pickup_name || r.origin_name,
      dropoff_name: r.dropoff_name || r.destination_name,
      gross_amount: Number(r.gross_amount || r.regular_amount || r.amount || 0),
      discount_amount: Number(r.discount_amount || 0),
      final_amount: Number(r.final_amount || r.amount || 0),
      fare_amount: Number(r.final_amount || r.amount || 0),
      payment_method: (r.payment_method || "GCASH").toUpperCase(),
      status: (r.status || "PAID").toUpperCase(),
      paid_at: r.paid_at || r.created_at,
      completed_at: r.completed_at || r.paid_at || r.created_at,
      created_at: r.created_at,
      unit_number: r.unit_number || "J-04",
      plate_number: r.plate_number || "NDB-5821",
      driver_name: r.driver_name,
      conductor_name: r.conductor_name,
      has_feedback: Boolean(r.has_feedback),
    }));
  },

  // Share Ride
  async createShareRide(data: { lat?: number; lng?: number; rotate?: boolean }): Promise<{
    token: string;
    expires_at: string;
    share_url: string;
  }> {
    return post("/mobile/commuter/share-ride", data);
  },

  async updateShareRideLocation(data: { lat: number; lng: number }): Promise<void> {
    return post("/mobile/commuter/location", data);
  },

  async stopShareRide(): Promise<void> {
    return del("/mobile/commuter/share-ride");
  },

  // Rewards
  async getRewards(): Promise<RewardProgress> {
    const res = await request<any>("/mobile/commuter/rewards");
    const currentCycleRides = Number(res.current_cycle_rides ?? res.current_rides ?? res.rides_completed ?? 0);
    const ridesNeeded = Number(res.rides_needed ?? res.target_rides ?? res.rides_required ?? 10);
    const totalRides = Number(res.total_rides ?? res.rides_completed ?? 0);
    const vouchers = (res.vouchers || []).map((v: any) => ({
      id: v.id,
      code: v.code,
      status: (v.status || "AVAILABLE").toUpperCase(),
      discount_amount: Number(v.discount_amount || 100),
      valid_until: v.valid_until || v.expires_at,
      expires_at: v.expires_at,
      expiresAt: v.expires_at,
      rideOrigin: v.ride_origin || "Cashless Ride Promo",
      is_used: Boolean(v.is_used || v.status === "USED"),
    }));

    return {
      rides_completed: totalRides,
      current_rides: currentCycleRides,
      target_rides: ridesNeeded,
      currentCycleRides,
      ridesNeeded,
      totalRides,
      availableVoucherCount: vouchers.filter((v: any) => v.status === "AVAILABLE").length,
      archivedVoucherCount: vouchers.filter((v: any) => v.status !== "AVAILABLE").length,
      progressPercent: Math.min(100, Math.round((currentCycleRides / ridesNeeded) * 100)),
      ridesRemaining: Math.max(0, ridesNeeded - currentCycleRides),
      vouchers,
    };
  },

  // Feedback & QR Resolution
  async scanQr(token: string): Promise<ResolvedCrew> {
    const res = await post<any>("/mobile/commuter/qr/scan", { token });
    const data = res.data || res;
    return {
      unitNumber: data.unit_number || data.unitNumber,
      plateNumber: data.plate_number || data.plateNumber || "NDB-5821",
      driverName: data.driver_name || data.driverName || "Assigned Driver",
      conductorName: data.conductor_name || data.conductorName || "Assigned Conductor",
      routeTitle: data.route_name || data.routeTitle || "Calumpit - Meycauayan Line",
    };
  },

  async submitFeedback(data: {
    token?: string;
    shift_id?: string;
    rating?: number;
    comment?: string;
    driver_rating?: number;
    driver_tags?: string[];
    driver_comment?: string;
    conductor_rating?: number;
    conductor_tags?: string[];
    conductor_comment?: string;
  }): Promise<void> {
    return post("/mobile/commuter/feedback", data);
  },

  async getFeedback(): Promise<Feedback[]> {
    return request<Feedback[]>("/mobile/commuter/feedback");
  },

  // Emergency SOS
  async triggerSos(data: { latitude: number; longitude: number; note?: string }): Promise<SosAlert> {
    return post("/mobile/commuter/sos", data);
  },

  async getSosStatus(id: string): Promise<SosAlert> {
    return request(`/mobile/commuter/sos/${encodeURIComponent(id)}`);
  },

  // Lost & Found
  async getLostItems(params: {
    category?: string;
    search?: string;
    date?: string;
    page?: number;
    per_page?: number;
  } = {}): Promise<{
    items: LostItem[];
    page: number;
    lastPage: number;
    total: number;
  }> {
    const query = new URLSearchParams();
    if (params.category && params.category !== "ALL") query.set("category", params.category);
    if (params.search?.trim()) query.set("search", params.search.trim());
    if (params.date) query.set("date", params.date);
    if (params.page) query.set("page", String(params.page));
    if (params.per_page) query.set("per_page", String(params.per_page));

    const res = await request<any>(`/lost-found?${query.toString()}`);
    const rows = Array.isArray(res) ? res : res.data || [];
    return {
      items: rows.map((r: any) => ({
        id: r.id,
        title: r.item_name || r.title || "Found Item",
        itemName: r.item_name || r.title || "Found Item",
        category: (r.category || "OTHER").toUpperCase(),
        description: r.description || "No description available.",
        imageUrl: r.image_url || r.imageUrl || null,
        image_url: r.image_url || r.imageUrl || null,
        plateNumber: r.plate_number || null,
        driverName: r.driver_name || null,
        conductorName: r.conductor_name || null,
        estimatedTimeLost: r.estimated_time_lost || null,
        found_at: r.found_at || r.created_at,
        datePosted: r.created_at || r.found_at,
        status: (r.status || "AVAILABLE").toUpperCase(),
        is_watched: Boolean(r.is_watched),
      })),
      page: res.current_page ?? params.page ?? 1,
      lastPage: res.last_page ?? 1,
      total: res.total ?? rows.length,
    };
  },

  async claimLostItem(itemId: string, data: { proof_description?: string; proof?: string; contact_number?: string }): Promise<void> {
    return post(`/lost-found/${encodeURIComponent(itemId)}/claim`, {
      proof: data.proof || data.proof_description,
      contact_number: data.contact_number,
    });
  },

  async cancelClaim(claimId: string): Promise<void> {
    return del(`/lost-found/claims/${encodeURIComponent(claimId)}`);
  },

  async getMyClaims(params: {
    page?: number;
    per_page?: number;
    status?: string;
    date?: string;
    search?: string;
  } = {}): Promise<{
    claims: ClaimData[];
    page: number;
    lastPage: number;
    total: number;
  }> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.per_page) query.set("per_page", String(params.per_page));
    if (params.status && params.status !== "ALL") query.set("status", params.status);
    if (params.date) query.set("date", params.date);
    if (params.search?.trim()) query.set("search", params.search.trim());

    const res = await request<any>(`/mobile/commuter/claims?${query.toString()}`);
    const rows = Array.isArray(res) ? res : res.data || [];
    return {
      claims: rows.map((r: any) => ({
        claimId: r.id,
        status: (r.status === "APPROVED" ? "VALIDATED" : r.status || "PENDING").toUpperCase() as any,
        proof: r.proof || "",
        claimDate: r.claim_date || r.created_at,
        reviewedAt: r.reviewed_at,
        approvedAt: r.approved_at,
        rejectedAt: r.rejected_at,
        releasedAt: r.released_at,
        rejectionReason: r.rejection_reason,
        item: r.item
          ? {
              id: r.item.id,
              title: r.item.item_name || r.item.title || "Item",
              itemName: r.item.item_name || r.item.title || "Item",
              category: (r.item.category || "OTHER").toUpperCase(),
              description: r.item.description || "",
              imageUrl: r.item.image_url,
              image_url: r.item.image_url,
              plateNumber: r.item.plate_number,
              driverName: r.item.driver_name,
              conductorName: r.item.conductor_name,
              status: (r.item.status || "AVAILABLE").toUpperCase(),
            }
          : null,
      })),
      page: res.current_page ?? params.page ?? 1,
      lastPage: res.last_page ?? 1,
      total: res.total ?? rows.length,
    };
  },

  async getMyWatchlist(params: {
    page?: number;
    per_page?: number;
    date?: string;
    search?: string;
  } = {}): Promise<{
    items: LostItem[];
    page: number;
    lastPage: number;
    total: number;
  }> {
    const query = new URLSearchParams();
    if (params.page) query.set("page", String(params.page));
    if (params.per_page) query.set("per_page", String(params.per_page));
    if (params.date) query.set("date", params.date);
    if (params.search?.trim()) query.set("search", params.search.trim());

    const res = await request<any>(`/mobile/commuter/watchlist?${query.toString()}`);
    const rows = Array.isArray(res) ? res : res.data || [];
    return {
      items: rows
        .map((entry: any) => {
          const r = entry.item || entry;
          if (!r?.id) return null;
          return {
            id: r.id,
            title: r.item_name || r.title || "Found Item",
            itemName: r.item_name || r.title || "Found Item",
            category: (r.category || "OTHER").toUpperCase(),
            description: r.description || "No description available.",
            imageUrl: r.image_url || null,
            image_url: r.image_url || null,
            plateNumber: r.plate_number || null,
            driverName: r.driver_name || null,
            conductorName: r.conductor_name || null,
            estimatedTimeLost: r.estimated_time_lost || null,
            datePosted: r.created_at || r.found_at,
            status: (r.status || "AVAILABLE").toUpperCase(),
            is_watched: true,
          };
        })
        .filter(Boolean),
      page: res.current_page ?? params.page ?? 1,
      lastPage: res.last_page ?? 1,
      total: res.total ?? rows.length,
    };
  },

  async toggleWatchlist(itemId: string, watch: boolean): Promise<void> {
    if (watch) {
      return post(`/lost-found/${encodeURIComponent(itemId)}/watchlist`);
    }
    return del(`/lost-found/${encodeURIComponent(itemId)}/watchlist`);
  },

  // Announcements
  async getAnnouncements(): Promise<Announcement[]> {
    const res = await request<any>("/mobile/commuter/announcements");
    const rows = Array.isArray(res) ? res : res.data || [];
    return rows.map((a: any) => ({
      id: a.id,
      title: a.title,
      content: a.message || a.content || "",
      message: a.message || a.content || "",
      type: (a.type || "SYSTEM").toUpperCase(),
      rawType: a.raw_type || a.rawType || null,
      is_read: Boolean(a.is_read ?? a.isRead),
      isRead: Boolean(a.is_read ?? a.isRead),
      created_at: a.created_at,
      createdAt: a.created_at,
    }));
  },

  async getUnreadAnnouncementCount(): Promise<number> {
    const res = await request<{ count: number }>("/mobile/commuter/announcements/unread-count");
    return res.count ?? 0;
  },

  async markAnnouncementRead(id: string): Promise<void> {
    return post(`/mobile/commuter/announcements/${encodeURIComponent(id)}/read`);
  },

  async markAllAnnouncementsRead(): Promise<void> {
    return post("/mobile/commuter/announcements/mark-all-read");
  },
};
