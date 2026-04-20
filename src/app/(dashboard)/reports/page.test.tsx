// src/app/(dashboard)/reports/page.test.tsx
import { describe, expect, it, vi } from "vitest";

// Mock next/navigation redirect
const mockRedirect = vi.fn();
vi.mock("next/navigation", () => ({
  redirect: (...args: unknown[]) => {
    mockRedirect(...args);
  },
}));

import ReportsPage from "./page";

describe("ReportsPage", () => {
  it("/reports/cost로 리다이렉트해야 한다", () => {
    ReportsPage();
    expect(mockRedirect).toHaveBeenCalledWith("/reports/cost");
  });
});
