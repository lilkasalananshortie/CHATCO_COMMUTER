import { del, post, put, request } from "./api-client";
import { normalizeRewards } from "../domain/rewards";
import { mapAnnouncementType } from "../domain/announcement-category";
import { mapTrip } from "../domain/trips";
import { notifyRewardsChanged } from "../domain/rewards-events";
import type { GroupSeat, VoucherOption } from "../domain/group-voucher-plan";
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
  Voucher,
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
  availableVoucher?: { id: string; type: "FREE_RIDE" | "DISCOUNT" | "REWARD"; amount: number | null } | null;
  isGroup?: boolean;
  availableVouchers?: VoucherOption[];
  seats?: GroupSeat[];
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

export interface PasswordChangeInput {
  current_password: string;
  password: string;
  password_confirmation: string;
}

function profileEnvelope(res: any): { user: User; profile: CommuterProfile } {
  if (!res?.user?.id || !res?.profile?.commuter_type) throw new Error("The server did not return a commuter profile.");
  return { user: res.user, profile: { ...res.profile, id: res.profile.id ?? res.user.id } };
}

export const commuterService = {
  // Profile
  async getProfile(): Promise<{ user: User; profile: CommuterProfile }> {
    try {
      return profileEnvelope(await request("/mobile/commuter/profile"));
    } catch (err: any) {
      // Only a missing route may use the legacy user envelope. Never mask 401/403/offline.
      if (err?.status !== 404) throw err;
      try {
        const userRes = await request<any>("/mobile/user");
        return profileEnvelope(userRes);
      } catch {
        throw err;
      }
    }
  },

  async updateProfile(data: { contact_number?: string; email?: string; language_preference?: string }): Promise<CommuterProfile> {
    return profileEnvelope(await put("/mobile/commuter/profile", data)).profile;
  },

  async uploadProfilePhoto(body: FormData): Promise<CommuterProfile> {
    return profileEnvelope(await post("/mobile/commuter/profile/photo", body)).profile;
  },

  async requestPasswordChangeCode(data: PasswordChangeInput): Promise<{ message: string }> {
    return post("/mobile/commuter/change-password/request-code", data);
  },

  async confirmPasswordChange(data: PasswordChangeInput & { code: string }): Promise<{ message: string }> {
    return post("/mobile/commuter/change-password/confirm", data);
  },

  // Live Vehicle Tracking
  async getVehicleLocations(): Promise<VehicleLocation[]> {
    const raw = await request<any[]>("/mobile/commuter/vehicles/locations");
    if (!Array.isArray(raw)) return [];
    return raw.map((item) => {
      const lat = Number(item.latitude ?? item.lat ?? 0);
      const lng = Number(item.longitude ?? item.lng ?? 0);
      return {
        ...item,
        id: item.id || item.vehicle_id || item.unit_number || "JEEP",
        vehicle_id: item.vehicle_id || item.id,
        unit_number: item.unit_number || "JEEP",
        plate_number: item.plate_number || "",
        latitude: lat,
        longitude: lng,
        lat,
        lng,
        speed: item.speed != null ? Number(item.speed) : null,
        bearing: item.bearing ?? item.heading ?? null,
        capacity_status: item.capacity_status ?? item.vehicle_capacity_status ?? "AVAILABLE",
        available_seats: item.available_seats ?? null,
        updated_at: item.updated_at,
      };
    });
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
    return request("/mobile/fare-matrix");
  },

  // Hail / "Pick Me Up"
  async sendHail(data: {
    vehicle_id: string;
    commuter_lat?: number;
    commuter_lng?: number;
    pickup_name?: string;
    latitude?: number;
    longitude?: number;
    passenger_count?: number;
  }): Promise<HailRequest> {
    const lat = Number(data.commuter_lat ?? data.latitude ?? 0);
    const lng = Number(data.commuter_lng ?? data.longitude ?? 0);
    const payload = {
      vehicle_id: data.vehicle_id,
      commuter_lat: lat,
      commuter_lng: lng,
    };
    const res = await post<any>("/mobile/commuter/hail", payload);
    return {
      id: res.id,
      pickup_name: data.pickup_name || "Commuter Location",
      passenger_count: data.passenger_count || 1,
      status: res.status || "PENDING",
      created_at: res.created_at || new Date().toISOString(),
      expires_at: res.expires_at ?? null,
      accepted_by: res.vehicle
        ? {
            unit_number: res.vehicle.unit_number || "JEEP",
            driver_name: res.vehicle.driver_name,
          }
        : null,
    };
  },

  async cancelHail(id: string): Promise<void> {
    return del(`/mobile/commuter/hail/${encodeURIComponent(id)}`);
  },

  async getHailStatus(id: string): Promise<HailRequest | null> {
    try {
      const res = await request<any>(`/mobile/commuter/hail/${encodeURIComponent(id)}`);
      const data = res?.data || res;
      if (!data || !data.id) return null;
      return {
        id: data.id,
        pickup_name: data.pickup_name || "Commuter Location",
        passenger_count: Number(data.passenger_count ?? 1),
        status: data.status || "PENDING",
        created_at: data.created_at || new Date().toISOString(),
        expires_at: data.expires_at ?? null,
        accepted_by: data.vehicle
          ? {
              unit_number: data.vehicle.unit_number || "JEEP",
              driver_name: data.vehicle.driver_name,
            }
          : null,
      };
    } catch (error) {
      if ((error as { status?: number }).status === 404) return null;
      throw error;
    }
  },

  async getActiveHail(): Promise<HailRequest | null> {
    try {
      const res = await request<any>("/mobile/commuter/hails/active");
      const data = res?.data || res;
      if (!data || !data.id) return null;
      return {
        id: data.id,
        pickup_name: data.pickup_name || "Commuter Location",
        passenger_count: Number(data.passenger_count ?? 1),
        status: data.status || "PENDING",
        created_at: data.created_at || new Date().toISOString(),
        expires_at: data.expires_at ?? null,
        accepted_by: data.vehicle
          ? {
              unit_number: data.vehicle.unit_number || "JEEP",
              driver_name: data.vehicle.driver_name,
            }
          : null,
      };
    } catch (error) {
      if ((error as { status?: number }).status === 404) return null;
      throw error;
    }
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
      availableVoucher: res.available_voucher ? { ...res.available_voucher, amount: res.available_voucher.amount == null ? null : Number(res.available_voucher.amount) } : null,
      isGroup: Boolean(res.is_group ?? (res.passenger_count > 1)),
      availableVouchers: (res.available_vouchers ?? []).map((voucher: any) => ({
        id: String(voucher.id), type: voucher.type, amount: voucher.amount == null ? null : Number(voucher.amount),
        expiresAt: voucher.expires_at ?? null,
      })),
      seats: (res.seats ?? []).map((seat: any) => ({
        position: Number(seat.position), fare: Number(seat.fare), passengerType: seat.passenger_type ?? null, isPayer: Boolean(seat.is_payer),
      })),
    };
  },

  async redeemVoucherForGcash(transactionId: string, voucherId?: string | string[]): Promise<ClaimGcashResult> {
    const body = Array.isArray(voucherId) ? { voucher_ids: voucherId } : voucherId ? { voucher_id: voucherId } : {};
    const res = await post<any>(`/mobile/commuter/payments/${encodeURIComponent(transactionId)}/redeem-voucher`, body);
    notifyRewardsChanged();
    return {
      transactionId: res.transaction_id || transactionId,
      amount: Number(res.amount ?? res.final_amount ?? 0),
      regularAmount: Number(res.regular_amount ?? res.gross_amount ?? res.amount ?? 0),
      discountAmount: Number(res.discount_amount ?? 0),
      pickupName: res.pickup_name ?? null,
      dropoffName: res.dropoff_name ?? null,
      checkoutUrl: res.checkout_url ?? null,
      voucherAvailable: false,
      availableVoucher: null,
      isGroup: Boolean(res.is_group),
    };
  },

  async simulatePayment(transactionId: string, status: "PAID" | "FAILED" = "PAID"): Promise<{ status: string }> {
    const result = await post<{ status: string }>(`/mobile/payments/${encodeURIComponent(transactionId)}/simulate`, { status });
    notifyRewardsChanged();
    return result;
  },

  async getPaymentStatus(transactionId: string): Promise<{ status: string }> {
    return request(`/mobile/payments/${encodeURIComponent(transactionId)}/status`);
  },

  async claimReceipt(receiptToken: string): Promise<ReceiptClaimResult> {
    const res = await post<any>("/mobile/commuter/receipts/claim", {
      qr_token: receiptToken,
      receipt_token: receiptToken,
    });
    notifyRewardsChanged();
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
    summary?: { total_spent: number; ride_count: number; average_fare: number };
  }> {
    const query = new URLSearchParams();
    query.set("page", String(page));
    query.set("per_page", String(perPage));
    if (filter && filter !== "all") query.set("filter", filter);

    const res = await request<any>(`/mobile/commuter/payments?${query.toString()}`);
    const rows = Array.isArray(res) ? res : res.data || [];
    return {
      items: rows.map(mapTrip),
      page: res.current_page ?? page,
      lastPage: res.last_page ?? 1,
      total: res.total ?? rows.length,
      summary: res.summary,
    };
  },

  // Trips & Ride History
  async getTrips(): Promise<Trip[]> {
    const res = await request<any>("/mobile/commuter/trips");
    const rows = Array.isArray(res) ? res : res.data || [];
    return rows.map(mapTrip);
  },

  // Share Ride
  async createShareRide(data: { lat?: number; lng?: number; rotate?: boolean }): Promise<{
    token: string;
    expires_at: string;
    share_url: string;
  }> {
    return post("/mobile/commuter/share-ride", data);
  },

  async updateShareRideLocation(data: { lat: number; lng: number; token: string }): Promise<void> {
    return post("/mobile/commuter/share-ride", { ...data, rotate: false });
  },

  async stopShareRide(): Promise<void> {
    return del("/mobile/commuter/share-ride");
  },

  // Rewards
  async getRewards(): Promise<RewardProgress> {
    const res = await request<any>("/mobile/commuter/rewards");
    return normalizeRewards(res);
  },

  async getVoucherWallet(status: "available" | "used" | "expired", cursor?: string | null): Promise<{
    items: Voucher[];
    nextCursor: string | null;
  }> {
    const query = new URLSearchParams({ status, per_page: "50" });
    if (cursor) query.set("cursor", cursor);
    let res: any;
    try {
      res = await request<any>(`/mobile/commuter/vouchers?${query.toString()}`);
    } catch (error: any) {
      // Older deployed API instances expose the same authoritative controller
      // at the shared commuter namespace. Only a missing route may fall back;
      // auth, validation, rate-limit, and offline failures must remain visible.
      if (error?.status !== 404) throw error;
      res = await request<any>(`/commuter/vouchers?${query.toString()}`);
    }
    const rows = Array.isArray(res?.vouchers) ? res.vouchers : Array.isArray(res) ? res : [];
    return {
      items: rows.map((voucher: any) => ({
        id: String(voucher.id),
        code: String(voucher.code ?? ""),
        type: voucher.type ?? "REWARD",
        amount: voucher.amount == null ? null : Number(voucher.amount),
        status: String(voucher.status ?? status).toUpperCase(),
        expiresAt: voucher.expiresAt ?? voucher.expires_at ?? null,
        expires_at: voucher.expiresAt ?? voucher.expires_at ?? null,
        rideOrigin: voucher.rideOrigin ?? voucher.ride_origin ?? "Reward",
        usedAt: voucher.usedAt ?? voucher.used_at ?? null,
        usedRoute: voucher.usedRoute ?? voucher.used_route ?? null,
      })),
      nextCursor: res?.nextCursor ?? res?.next_cursor ?? null,
    };
  },

  // Feedback & QR Resolution
  async scanQr(token: string): Promise<ResolvedCrew> {
    // Permanent unit QR is JSON with vehicle_id; signed QR remains on /scan.
    let vehicleId: string | undefined;
    let signedToken = token;
    try {
      const parsed = JSON.parse(token);
      if (typeof parsed.vehicle_id === "string") vehicleId = parsed.vehicle_id;
      else if (typeof (parsed.token ?? parsed.qr_token) === "string") signedToken = parsed.token ?? parsed.qr_token;
    } catch { /* Bare signed token. */ }
    const res = vehicleId
      ? await post<any>("/mobile/commuter/qr/scan-public", { vehicle_id: vehicleId })
      : await post<any>("/mobile/commuter/qr/scan", { token: signedToken });
    const data = res.data || res;
    if (!data.shift_id) throw new Error("No shift was returned for this unit. Please scan again.");
    return {
      shiftId: data.shift_id,
      unitNumber: data.unit_number || data.unitNumber,
      plateNumber: data.plate_number || data.plateNumber || "",
      driverName: data.driver_name || data.driverName || "Assigned Driver",
      conductorName: data.conductor_name || data.conductorName || "Assigned Conductor",
      routeTitle: data.route_name || data.routeTitle || "",
    };
  },

  async submitFeedback(data: {
    shift_id: string;
    rating: number;
    category?: string;
    comment?: string;
    conductor_rating: number;
    conductor_category?: string;
    conductor_comment?: string;
  }): Promise<void> {
    return post("/mobile/commuter/feedback", data);
  },

  async getFeedback(): Promise<Feedback[]> {
    return request<Feedback[]>("/mobile/commuter/feedback");
  },

  // Emergency SOS
  async triggerSos(data: {
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
    note?: string;
  }): Promise<SosAlert> {
    const lat = Number(data.lat ?? data.latitude ?? 0);
    const lng = Number(data.lng ?? data.longitude ?? 0);
    return post("/mobile/commuter/sos", {
      lat,
      lng,
      note: data.note || "Emergency distress triggered from Commuter Mobile App",
    });
  },

  async getSosStatus(id: string): Promise<SosAlert> {
    return request(`/mobile/commuter/sos/${encodeURIComponent(id)}`);
  },

  async stopSos(id: string): Promise<SosAlert> {
    return request(`/mobile/commuter/sos/${encodeURIComponent(id)}/stop`, { method: "PATCH" });
  },

  // Lost & Found
  async getLostItems(params: {
    category?: string;
    categories?: string[];
    search?: string;
    date?: string;
    date_from?: string;
    date_to?: string;
    range?: "today" | "week" | "month" | "year";
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
    for (const category of params.categories ?? []) query.append("categories[]", category);
    if (params.search?.trim()) query.set("search", params.search.trim());
    if (params.date) query.set("date", params.date);
    if (params.date_from) query.set("date_from", params.date_from);
    if (params.date_to) query.set("date_to", params.date_to);
    if (params.range) query.set("range", params.range);
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
        claimableUntil: r.claimable_until || null,
        photos: (r.photos || []).map((photo: any) => ({ id: String(photo.id), url: photo.url })).filter((photo: any) => photo.url),
        status: (r.status || "AVAILABLE").toUpperCase(),
        is_watched: Boolean(r.is_watched),
      })),
      page: res.current_page ?? params.page ?? 1,
      lastPage: res.last_page ?? 1,
      total: res.total ?? rows.length,
    };
  },

  async claimLostItem(itemId: string, data: { proof_description?: string; proof?: string; claimant_contact?: string; images?: Array<{ uri: string; name: string; type: string; file?: Blob }> }): Promise<void> {
    const form = new FormData();
    form.append("proof", data.proof || data.proof_description || "");
    if (data.claimant_contact?.trim()) form.append("claimant_contact", data.claimant_contact.trim());
    for (const [index, image] of (data.images ?? []).entries()) {
      if (image.file) form.append(`images[${index}]`, image.file, image.name);
      else form.append(`images[${index}]`, { uri: image.uri, name: image.name, type: image.type } as any);
    }
    return post(`/lost-found/${encodeURIComponent(itemId)}/claim`, form);
  },

  async cancelClaim(claimId: string): Promise<void> {
    return del(`/lost-found/claims/${encodeURIComponent(claimId)}`);
  },

  async getMyClaims(params: {
    page?: number;
    per_page?: number;
    status?: string;
    date?: string;
    categories?: string[];
    search?: string;
    date_from?: string;
    date_to?: string;
    range?: "today" | "week" | "month" | "year";
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
    for (const category of params.categories ?? []) query.append("categories[]", category);
    if (params.search?.trim()) query.set("search", params.search.trim());
    if (params.date_from) query.set("date_from", params.date_from);
    if (params.date_to) query.set("date_to", params.date_to);
    if (params.range) query.set("range", params.range);

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
         pickupLocation: r.pickup_location,
         pickupAt: r.pickup_at,
         pickupReminder: r.pickup_reminder,
         noShowAt: r.no_show_at,
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
               datePosted: r.item.created_at || r.item.found_at,
               claimableUntil: r.item.claimable_until || null,
               photos: (r.item.photos || []).map((photo: any) => ({ id: String(photo.id), url: photo.url })).filter((photo: any) => photo.url),
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
    categories?: string[];
    search?: string;
    date_from?: string;
    date_to?: string;
    range?: "today" | "week" | "month" | "year";
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
    for (const category of params.categories ?? []) query.append("categories[]", category);
    if (params.search?.trim()) query.set("search", params.search.trim());
    if (params.date_from) query.set("date_from", params.date_from);
    if (params.date_to) query.set("date_to", params.date_to);
    if (params.range) query.set("range", params.range);

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
            claimableUntil: r.claimable_until || null,
            photos: (r.photos || []).map((photo: any) => ({ id: String(photo.id), url: photo.url })).filter((photo: any) => photo.url),
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
      type: mapAnnouncementType(a.type),
      rawType: a.raw_type || a.rawType || a.type || null,
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
