// src/hooks/use-element-size.test.ts
import { act, renderHook } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useElementSize } from "./use-element-size";

describe("useElementSize", () => {
  let resizeObserverCallback: ResizeObserverCallback;
  const mockObserve = vi.fn();
  const mockUnobserve = vi.fn();
  const mockDisconnect = vi.fn();

  beforeEach(() => {
    // Mock ResizeObserver
    global.ResizeObserver = vi.fn((callback) => {
      resizeObserverCallback = callback;
      return {
        observe: mockObserve,
        unobserve: mockUnobserve,
        disconnect: mockDisconnect,
      };
    }) as unknown as typeof ResizeObserver;

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return { width: 0, height: 0 } when ref is null", () => {
    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(null);
      return useElementSize(ref);
    });

    expect(result.current).toEqual({ width: 0, height: 0 });
  });

  it("should return element size when ref has an element", () => {
    const mockElement = document.createElement("div");
    Object.defineProperty(mockElement, "offsetWidth", { value: 200 });
    Object.defineProperty(mockElement, "offsetHeight", { value: 100 });

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(mockElement);
      return useElementSize(ref);
    });

    expect(mockObserve).toHaveBeenCalledWith(mockElement);
    expect(result.current).toEqual({ width: 200, height: 100 });
  });

  it("should update size when ResizeObserver fires", () => {
    const mockElement = document.createElement("div");
    Object.defineProperty(mockElement, "offsetWidth", {
      value: 200,
      writable: true,
    });
    Object.defineProperty(mockElement, "offsetHeight", {
      value: 100,
      writable: true,
    });

    const { result } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(mockElement);
      return useElementSize(ref);
    });

    expect(result.current).toEqual({ width: 200, height: 100 });

    // Simulate resize
    Object.defineProperty(mockElement, "offsetWidth", { value: 300 });
    Object.defineProperty(mockElement, "offsetHeight", { value: 150 });

    // Trigger ResizeObserver callback wrapped in act
    act(() => {
      resizeObserverCallback(
        [
          {
            target: mockElement,
            contentRect: { width: 300, height: 150 } as DOMRectReadOnly,
            borderBoxSize: [] as unknown as ReadonlyArray<ResizeObserverSize>,
            contentBoxSize: [] as unknown as ReadonlyArray<ResizeObserverSize>,
            devicePixelContentBoxSize:
              [] as unknown as ReadonlyArray<ResizeObserverSize>,
          },
        ],
        {} as ResizeObserver
      );
    });

    expect(result.current).toEqual({ width: 300, height: 150 });
  });

  it("should disconnect observer on unmount", () => {
    const mockElement = document.createElement("div");

    const { unmount } = renderHook(() => {
      const ref = useRef<HTMLDivElement>(mockElement);
      return useElementSize(ref);
    });

    unmount();

    expect(mockDisconnect).toHaveBeenCalled();
  });
});
