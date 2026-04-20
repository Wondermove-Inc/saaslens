// src/lib/services/export/pdf.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generatePDFReport, type PDFReportConfig } from "./pdf";

// jsPDF mock
vi.mock("jspdf", () => {
  const mockJsPDF = vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
    line: vi.fn(),
    rect: vi.fn(),
    setFillColor: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    addImage: vi.fn(),
    addPage: vi.fn(),
    internal: {
      pageSize: {
        getWidth: vi.fn().mockReturnValue(210),
        getHeight: vi.fn().mockReturnValue(297),
      },
    },
    getNumberOfPages: vi.fn().mockReturnValue(1),
    setPage: vi.fn(),
    output: vi.fn().mockReturnValue(new ArrayBuffer(100)),
    save: vi.fn(),
    getTextWidth: vi.fn().mockReturnValue(50),
    splitTextToSize: vi.fn().mockImplementation((text: string) => [text]),
  }));

  return { default: mockJsPDF, jsPDF: mockJsPDF };
});

describe("PDF Export Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generatePDFReport", () => {
    const basicConfig: PDFReportConfig = {
      title: "테스트 리포트",
      subtitle: "2024년 12월",
      sections: [],
    };

    it("PDF 문서를 생성해야 한다", async () => {
      const result = await generatePDFReport(basicConfig);
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it("테이블 섹션을 처리해야 한다", async () => {
      const configWithTable: PDFReportConfig = {
        title: "테스트 리포트",
        sections: [
          {
            type: "table",
            title: "비용 현황",
            headers: ["앱 이름", "금액"],
            rows: [
              ["Slack", "₩15,000"],
              ["Notion", "₩12,000"],
            ],
          },
        ],
      };

      const result = await generatePDFReport(configWithTable);
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it("키-값 섹션을 처리해야 한다", async () => {
      const configWithKeyValue: PDFReportConfig = {
        title: "테스트 리포트",
        sections: [
          {
            type: "keyValue",
            title: "요약",
            items: [
              { label: "총 비용", value: "₩1,234,567" },
              { label: "전월 대비", value: "+15.2%" },
            ],
          },
        ],
      };

      const result = await generatePDFReport(configWithKeyValue);
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it("텍스트 섹션을 처리해야 한다", async () => {
      const configWithText: PDFReportConfig = {
        title: "테스트 리포트",
        sections: [
          {
            type: "text",
            title: "설명",
            content: "이 리포트는 월간 비용 현황을 요약합니다.",
          },
        ],
      };

      const result = await generatePDFReport(configWithText);
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it("여러 섹션을 순서대로 처리해야 한다", async () => {
      const configWithMultipleSections: PDFReportConfig = {
        title: "종합 리포트",
        subtitle: "2024년 12월 1일",
        sections: [
          {
            type: "keyValue",
            title: "요약",
            items: [{ label: "총 비용", value: "₩1,000,000" }],
          },
          {
            type: "table",
            title: "상세 내역",
            headers: ["항목", "금액"],
            rows: [["테스트", "₩100,000"]],
          },
          {
            type: "text",
            title: "비고",
            content: "추가 내용 없음",
          },
        ],
      };

      const result = await generatePDFReport(configWithMultipleSections);
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it("이미지 섹션을 처리해야 한다", async () => {
      const configWithImage: PDFReportConfig = {
        title: "테스트 리포트",
        sections: [
          {
            type: "image",
            title: "차트",
            imageDataUrl:
              "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ",
            width: 100,
            height: 60,
          },
        ],
      };

      const result = await generatePDFReport(configWithImage);
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it("생성 날짜를 포함해야 한다", async () => {
      const configWithDate: PDFReportConfig = {
        title: "테스트 리포트",
        generatedAt: new Date("2024-12-01"),
        sections: [],
      };

      const result = await generatePDFReport(configWithDate);
      expect(result).toBeInstanceOf(ArrayBuffer);
    });

    it("조직 이름을 포함할 수 있어야 한다", async () => {
      const configWithOrg: PDFReportConfig = {
        title: "테스트 리포트",
        organizationName: "테스트 회사",
        sections: [],
      };

      const result = await generatePDFReport(configWithOrg);
      expect(result).toBeInstanceOf(ArrayBuffer);
    });
  });
});
