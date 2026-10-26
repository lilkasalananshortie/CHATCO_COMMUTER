import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

export function useHoldToConfirm(onConfirm: () => void, enabled: boolean, delay = 600) {
  const [holding, setHolding] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const completed = useRef(false);
  const confirm = useRef(onConfirm);
  confirm.current = onConfirm;
  const allowed = useRef(enabled);
  allowed.current = enabled;
  const cancel = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null; setHolding(false);
  }, []);
  const start = useCallback(() => {
    cancel(); completed.current = false;
    if (!allowed.current) return;
    setHolding(true);
    timer.current = setTimeout(() => {
      timer.current = null; setHolding(false);
      if (!allowed.current) return;
      completed.current = true; confirm.current();
    }, delay);
  }, [cancel, delay]);
  const consumeCompleted = useCallback(() => {
    const value = completed.current; completed.current = false; return value;
  }, []);
  useEffect(() => { if (!enabled) cancel(); }, [enabled, cancel]);
  useEffect(() => {
    const listener = AppState.addEventListener("change", state => { if (state !== "active") cancel(); });
    return () => { if (timer.current) clearTimeout(timer.current); listener.remove(); };
  }, [cancel]);
  return { holding, start, cancel, consumeCompleted };
}
