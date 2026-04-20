// src/lib/services/export/chart-image.ts
/**
 * Canvas-based chart image helpers for PDF exports.
 */

export interface ChartPoint {
  label: string;
  value: number;
}

interface ChartOptions {
  width?: number;
  height?: number;
  strokeColor?: string;
  fillColor?: string;
}

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 400;

function createCanvas(width: number, height: number): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function createLineChartImage(
  data: ChartPoint[],
  options: ChartOptions = {}
): string {
  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;
  const canvas = createCanvas(width, height);
  if (!canvas) return "";

  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const maxValue = Math.max(1, ...data.map((d) => d.value));

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  if (data.length > 0) {
    ctx.strokeStyle = options.strokeColor ?? "#3b82f6";
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((point, index) => {
      const x = padding + (index / Math.max(1, data.length - 1)) * chartWidth;
      const y = height - padding - (point.value / maxValue) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  }

  return canvas.toDataURL("image/png");
}

export function createBarChartImage(
  data: ChartPoint[],
  options: ChartOptions = {}
): string {
  const width = options.width ?? DEFAULT_WIDTH;
  const height = options.height ?? DEFAULT_HEIGHT;
  const canvas = createCanvas(width, height);
  if (!canvas) return "";

  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const maxValue = Math.max(1, ...data.map((d) => d.value));
  const barWidth = data.length > 0 ? chartWidth / data.length : chartWidth;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  ctx.fillStyle = options.fillColor ?? "#60a5fa";
  data.forEach((point, index) => {
    const barHeight = (point.value / maxValue) * chartHeight;
    const x = padding + index * barWidth + barWidth * 0.1;
    const y = height - padding - barHeight;
    const widthWithGap = barWidth * 0.8;

    ctx.fillRect(x, y, widthWithGap, barHeight);
  });

  return canvas.toDataURL("image/png");
}
