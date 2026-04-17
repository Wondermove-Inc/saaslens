// src/components/dashboard/apps-by-category.test.tsx
import messages from "@/i18n/messages/ko.json";
import type { CategoryDistribution } from "@/types/dashboard";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// next-intl mock (dual React 이슈 방지를 위해 Provider 대신 mock 사용)
vi.mock("next-intl", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getNestedValue(obj: any, path: string): string | undefined {
    return path.split(".").reduce((acc, key) => acc?.[key], obj);
  }

  return {
    useTranslations: () => {
      const t = (key: string, values?: Record<string, string | number>) => {
        const value = getNestedValue(messages, key);
        if (!value || typeof value !== "string") return key;
        if (!values) return value;
        return Object.entries(values).reduce(
          (acc, [k, v]) => acc.replace(`{${k}}`, String(v)),
          value
        );
      };
      return t;
    },
    NextIntlClientProvider: ({ children }: { children: React.ReactNode }) =>
      children,
  };
});

// Recharts mock (ResponsiveContainer 이슈 방지)
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

import { AppsByCategory } from "./apps-by-category";

describe("AppsByCategory", () => {
  const mockData: CategoryDistribution[] = [
    { category: "Collaboration", count: 5, percentage: 50 },
    { category: "Development", count: 3, percentage: 30 },
    { category: "__UNCATEGORIZED__", count: 2, percentage: 20 },
  ];

  describe("렌더링", () => {
    it("카드 제목이 표시되어야 한다", () => {
      render(<AppsByCategory data={mockData} />);

      expect(screen.getByText("카테고리별 앱")).toBeInTheDocument();
    });

    it("차트가 렌더링되어야 한다", () => {
      render(<AppsByCategory data={mockData} />);

      expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
    });

    it("카테고리 목록이 표시되어야 한다", () => {
      render(<AppsByCategory data={mockData} />);

      expect(screen.getByText(/Collaboration/)).toBeInTheDocument();
      expect(screen.getByText(/Development/)).toBeInTheDocument();
      expect(screen.getByText(/기타/)).toBeInTheDocument();
    });
  });

  describe("빈 데이터 처리", () => {
    it("데이터가 없을 때 안내 메시지가 표시되어야 한다", () => {
      render(<AppsByCategory data={[]} />);

      expect(screen.getByText("등록된 앱이 없습니다.")).toBeInTheDocument();
      expect(screen.queryByTestId("pie-chart")).not.toBeInTheDocument();
    });
  });

  describe("퍼센트 표시", () => {
    it("각 카테고리의 퍼센트가 표시되어야 한다", () => {
      render(<AppsByCategory data={mockData} />);

      expect(screen.getByText(/50%/)).toBeInTheDocument();
      expect(screen.getByText(/30%/)).toBeInTheDocument();
      expect(screen.getByText(/20%/)).toBeInTheDocument();
    });
  });
});
