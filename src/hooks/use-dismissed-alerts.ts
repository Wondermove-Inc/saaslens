"use client";

import { useCallback, useState } from "react";

export function useDismissedAlerts() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  }, []);
  const isDismissed = useCallback(
    (id: string) => dismissed.has(id),
    [dismissed]
  );
  return { dismiss, isDismissed };
}
