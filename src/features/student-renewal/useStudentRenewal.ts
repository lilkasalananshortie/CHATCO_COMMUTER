import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { studentRenewalService } from "../../core/api/student-renewal-service";
import type { RenewalState } from "./renewal-types";

export function useStudentRenewal(userId?: string) {
  const [state, setState] = useState<RenewalState | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    if (!userId) return;
    const request = ++generation.current;
    setLoading(true);
    try {
      const result = await studentRenewalService.state();
      if (generation.current === request) { setState(result); setError(""); }
    } catch (e: any) {
      if (generation.current === request) {
        setState(null); // Do not display stale eligibility after a failed revalidation.
        setError(e?.status === 404 ? "Student renewal is not available on this API yet. Deploy the matching backend first." : e.message || "Unable to load student renewal.");
      }
    } finally { if (generation.current === request) setLoading(false); }
  }, [userId]);
  useEffect(() => {
    setState(null); setError(""); setLoading(false);
    if (!userId) return;
    void refresh();
    const interval = setInterval(() => { if (AppState.currentState === "active") void refresh(); }, 60000);
    const subscription = AppState.addEventListener("change", (next) => { if (next === "active") void refresh(); });
    return () => { generation.current++; clearInterval(interval); subscription.remove(); };
  }, [refresh, userId]);
  return { state, error, loading, refresh };
}
