// src/lib/services/export/chart-image.test.ts
import { describe, expect, it, vi } from "vitest";
import { createBarChartImage, createLineChartImage } from "./chart-image";

function mockCanvas() {
  const ctx = {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillRect: vi.fn(),
  };

  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn().mockReturnValue(ctx),
    toDataURL: vi.fn().mockReturnValue("data:image/png;base64,test"),
  } as unknown as HTMLCanvasElement;

  return { canvas, ctx };
}

describe("chart-image", () => {
  it("creates a line chart image", () => {
    const { canvas } = mockCanvas();
    const createElement = vi.fn().mockReturnValue(canvas);
    vi.stubGlobal("document", { createElement });

    const result = createLineChartImage([
      { label: "A", value: 10 },
      { label: "B", value: 20 },
    ]);

    expect(result).toBe("data:image/png;base64,test");
  });

  it("creates a bar chart image", () => {
    const { canvas } = mockCanvas();
    const createElement = vi.fn().mockReturnValue(canvas);
    vi.stubGlobal("document", { createElement });

    const result = createBarChartImage([
      { label: "A", value: 5 },
      { label: "B", value: 15 },
    ]);

    expect(result).toBe("data:image/png;base64,test");
  });
});
