import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { discountApplicationService } from "../../core/api/discount-application-service";
import type { ApplicationState } from "./application-types";

export function useDiscountApplication(userId?: string) {
  const [snapshot, setSnapshot] = useState<{ owner?: string; state: ApplicationState | null; error: string; loading: boolean }>({ state: null, error: "", loading: false });
  const owner = useRef(userId);
  owner.current = userId;
  const generation = useRef(0);
  const inFlight = useRef<{ owner: string; promise: Promise<void> } | null>(null);
  const refresh = useCallback((): Promise<void> => {
    if (!userId || owner.current !== userId) return Promise.resolve();
    if (inFlight.current?.owner === userId) return inFlight.current.promise;
    const epoch = generation.current;
    const valid = () => owner.current === userId && generation.current === epoch;
    setSnapshot((previous) => ({ owner: userId, state: previous.owner === userId ? previous.state : null, error: "", loading: true }));
    const promise = (async () => {
      try {
        const state = await discountApplicationService.state();
        if (valid()) setSnapshot({ owner: userId, state, error: "", loading: false });
      } catch (error) {
        if (valid()) setSnapshot({ owner: userId, state: null, loading: false, error: (error as { status?: number }).status === 404
          ? "Discount applications are not available on this API yet. The matching backend must be deployed first."
          : error instanceof Error ? error.message : "Unable to load discount applications." });
      } finally {
        if (valid()) inFlight.current = null;
      }
    })();
    inFlight.current = { owner: userId, promise };
    return promise;
  }, [userId]);
  useEffect(() => {
    void refresh();
    if (!userId) return;
    // Refresh on resume, with an active-only fallback for decisions made in Admin while this app remains open.
    const subscription = AppState.addEventListener("change", (next) => { if (next === "active") void refresh(); });
    const timer = setInterval(() => { if (AppState.currentState === "active") void refresh(); }, 60000);
    return () => { generation.current++; inFlight.current = null; subscription.remove(); clearInterval(timer); };
  }, [userId, refresh]);
  const current = snapshot.owner === userId && userId ? snapshot : { state: null, error: "", loading: false };
  const refreshAfterMutation = async () => {
    // A GET started before submission may still describe the previous state.
    // Finish it before fetching the authoritative post-write state.
    await inFlight.current?.promise;
    if (owner.current === userId) await refresh();
  };
  return { state: current.state, error: current.error, loading: current.loading, refresh, refreshAfterMutation };
}
