import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useDismissedAlerts } from "./use-dismissed-alerts";

describe("useDismissedAlerts", () => {
  it("should return isDismissed as false for unknown ids", () => {
    const { result } = renderHook(() => useDismissedAlerts());

    expect(result.current.isDismissed("alert-1")).toBe(false);
  });

  it("should dismiss an alert by id", () => {
    const { result } = renderHook(() => useDismissedAlerts());

    act(() => {
      result.current.dismiss("alert-1");
    });

    expect(result.current.isDismissed("alert-1")).toBe(true);
  });

  it("should not affect other alerts when dismissing one", () => {
    const { result } = renderHook(() => useDismissedAlerts());

    act(() => {
      result.current.dismiss("alert-1");
    });

    expect(result.current.isDismissed("alert-1")).toBe(true);
    expect(result.current.isDismissed("alert-2")).toBe(false);
  });

  it("should handle dismissing multiple alerts", () => {
    const { result } = renderHook(() => useDismissedAlerts());

    act(() => {
      result.current.dismiss("alert-1");
    });
    act(() => {
      result.current.dismiss("alert-2");
    });

    expect(result.current.isDismissed("alert-1")).toBe(true);
    expect(result.current.isDismissed("alert-2")).toBe(true);
  });

  it("should handle dismissing the same alert twice without error", () => {
    const { result } = renderHook(() => useDismissedAlerts());

    act(() => {
      result.current.dismiss("alert-1");
    });
    act(() => {
      result.current.dismiss("alert-1");
    });

    expect(result.current.isDismissed("alert-1")).toBe(true);
  });
});
