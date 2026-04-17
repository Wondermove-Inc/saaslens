/**
 * AI 사이드 패널 전역 상태 (Zustand)
 * SMP-197
 */

import { create } from "zustand";

interface AiPanelState {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

export const useAiPanelStore = create<AiPanelState>((set) => ({
  isOpen: false,
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),
  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
}));
