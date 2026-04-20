// src/components/payments/use-rematch-selection.ts
"use client";

import { useCallback, useState } from "react";

/**
 * 재매칭을 위한 행 선택 상태 관리 훅
 */
export function useRematchSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleSelectedRowsChange = useCallback((newSelected: Set<string>) => {
    setSelectedIds(newSelected);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectedIdsArray = Array.from(selectedIds);

  return {
    selectedIds,
    selectedIdsArray,
    handleSelectedRowsChange,
    clearSelection,
  };
}
