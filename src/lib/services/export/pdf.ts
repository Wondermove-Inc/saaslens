// src/lib/services/export/pdf.ts
/**
 * PDF 리포트 생성 서비스
 * jsPDF를 사용하여 텍스트 기반 PDF 생성
 * 한글 폰트(Noto Sans KR) 지원
 */

import { jsPDF } from "jspdf";

// 폰트 로드 상태 캐시
let fontLoaded = false;
let fontBase64Cache: string | null = null;

/**
 * 한글 폰트를 jsPDF에 등록
 */
async function loadKoreanFont(doc: jsPDF): Promise<void> {
  if (fontLoaded && fontBase64Cache) {
    doc.addFileToVFS("NotoSansKR-Regular.ttf", fontBase64Cache);
    doc.addFont("NotoSansKR-Regular.ttf", "NotoSansKR", "normal");
    doc.setFont("NotoSansKR");
    return;
  }

  try {
    // public 폴더에서 폰트 로드
    const response = await fetch("/fonts/NotoSansKR-Regular.ttf");
    if (!response.ok) {
      console.warn("한글 폰트 로드 실패, 기본 폰트 사용");
      return;
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);

    // 캐시에 저장
    fontBase64Cache = base64;
    fontLoaded = true;

    // jsPDF에 폰트 등록
    doc.addFileToVFS("NotoSansKR-Regular.ttf", base64);
    doc.addFont("NotoSansKR-Regular.ttf", "NotoSansKR", "normal");
    doc.setFont("NotoSansKR");
  } catch (error) {
    console.warn("한글 폰트 로드 중 오류 발생, 기본 폰트 사용:", error);
  }
}

/**
 * ArrayBuffer를 Base64 문자열로 변환
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export interface KeyValueItem {
  label: string;
  value: string;
}

export interface TableSection {
  type: "table";
  title: string;
  headers: string[];
  rows: string[][];
}

export interface KeyValueSection {
  type: "keyValue";
  title: string;
  items: KeyValueItem[];
}

export interface TextSection {
  type: "text";
  title: string;
  content: string;
}

export interface ImageSection {
  type: "image";
  title: string;
  imageDataUrl: string;
  width?: number;
  height?: number;
}

export type PDFSection =
  | TableSection
  | KeyValueSection
  | TextSection
  | ImageSection;

export interface PDFReportConfig {
  title: string;
  subtitle?: string;
  organizationName?: string;
  generatedAt?: Date;
  sections: PDFSection[];
}

// 색상 상수
const COLORS = {
  primary: [68, 114, 196] as [number, number, number], // #4472C4
  text: [51, 51, 51] as [number, number, number], // #333333
  lightGray: [240, 240, 240] as [number, number, number],
  gray: [128, 128, 128] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

// 여백 및 크기 상수
const MARGIN = 20;
const LINE_HEIGHT = 7;

/**
 * PDF 리포트 생성
 */
export async function generatePDFReport(
  config: PDFReportConfig
): Promise<ArrayBuffer> {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // 한글 폰트 로드
  await loadKoreanFont(doc);

  let yPosition = MARGIN;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - MARGIN * 2;

  // 헤더 섹션
  yPosition = addHeader(doc, config, yPosition, contentWidth);

  // 각 섹션 추가
  for (const section of config.sections) {
    // 페이지 넘김 확인
    if (yPosition > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      yPosition = MARGIN;
    }

    switch (section.type) {
      case "table":
        yPosition = addTableSection(doc, section, yPosition, contentWidth);
        break;
      case "keyValue":
        yPosition = addKeyValueSection(doc, section, yPosition);
        break;
      case "text":
        yPosition = addTextSection(doc, section, yPosition, contentWidth);
        break;
      case "image":
        yPosition = addImageSection(doc, section, yPosition, contentWidth);
        break;
    }

    yPosition += 10; // 섹션 간 간격
  }

  // 푸터 추가
  addFooter(doc);

  return doc.output("arraybuffer");
}

/**
 * 이미지 섹션 추가
 */
function addImageSection(
  doc: jsPDF,
  section: ImageSection,
  yPosition: number,
  contentWidth: number
): number {
  yPosition = addSectionTitle(doc, section.title, yPosition);

  const pageHeight = doc.internal.pageSize.getHeight();
  const imageWidth = section.width ?? contentWidth;
  const imageHeight = section.height ?? Math.round(imageWidth * 0.6);

  if (yPosition + imageHeight > pageHeight - 20) {
    doc.addPage();
    yPosition = MARGIN;
  }

  const format = section.imageDataUrl.includes("image/jpeg") ? "JPEG" : "PNG";
  doc.addImage(
    section.imageDataUrl,
    format,
    MARGIN,
    yPosition,
    imageWidth,
    imageHeight
  );

  return yPosition + imageHeight;
}

/**
 * 헤더 추가
 */
function addHeader(
  doc: jsPDF,
  config: PDFReportConfig,
  yPosition: number,
  contentWidth: number
): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  // 조직 이름
  if (config.organizationName) {
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.gray);
    doc.text(config.organizationName, MARGIN, yPosition);
    yPosition += LINE_HEIGHT;
  }

  // 메인 타이틀
  doc.setFontSize(24);
  doc.setTextColor(...COLORS.primary);
  doc.text(config.title, MARGIN, yPosition + 5);
  yPosition += 15;

  // 서브타이틀
  if (config.subtitle) {
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.gray);
    doc.text(config.subtitle, MARGIN, yPosition);
    yPosition += LINE_HEIGHT;
  }

  // 생성 날짜
  const generatedAt = config.generatedAt || new Date();
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.gray);
  const dateText = `Generated: ${formatDate(generatedAt)}`;
  doc.text(dateText, pageWidth - MARGIN - doc.getTextWidth(dateText), MARGIN);

  // 헤더 라인
  yPosition += 5;
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, yPosition, MARGIN + contentWidth, yPosition);

  return yPosition + 10;
}

/**
 * 테이블 섹션 추가
 */
function addTableSection(
  doc: jsPDF,
  section: TableSection,
  yPosition: number,
  contentWidth: number
): number {
  // 섹션 제목
  yPosition = addSectionTitle(doc, section.title, yPosition);

  const colCount = section.headers.length;
  const colWidth = contentWidth / colCount;
  const rowHeight = 8;

  // 헤더 배경
  doc.setFillColor(...COLORS.primary);
  doc.rect(MARGIN, yPosition, contentWidth, rowHeight, "F");

  // 헤더 텍스트
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.white);
  section.headers.forEach((header, index) => {
    doc.text(header, MARGIN + colWidth * index + 2, yPosition + 5.5);
  });

  yPosition += rowHeight;

  // 데이터 행
  doc.setTextColor(...COLORS.text);
  section.rows.forEach((row, rowIndex) => {
    // 짝수 행 배경
    if (rowIndex % 2 === 0) {
      doc.setFillColor(...COLORS.lightGray);
      doc.rect(MARGIN, yPosition, contentWidth, rowHeight, "F");
    }

    row.forEach((cell, cellIndex) => {
      // 긴 텍스트 잘라내기
      const maxWidth = colWidth - 4;
      let displayText = cell;
      while (
        doc.getTextWidth(displayText) > maxWidth &&
        displayText.length > 0
      ) {
        displayText = displayText.slice(0, -1);
      }
      if (displayText.length < cell.length) {
        displayText = displayText.slice(0, -2) + "...";
      }

      doc.text(displayText, MARGIN + colWidth * cellIndex + 2, yPosition + 5.5);
    });

    yPosition += rowHeight;

    // 페이지 넘김 확인
    if (yPosition > doc.internal.pageSize.getHeight() - 30) {
      doc.addPage();
      yPosition = MARGIN;
    }
  });

  return yPosition;
}

/**
 * 키-값 섹션 추가
 */
function addKeyValueSection(
  doc: jsPDF,
  section: KeyValueSection,
  yPosition: number
): number {
  // 섹션 제목
  yPosition = addSectionTitle(doc, section.title, yPosition);

  doc.setFontSize(11);

  section.items.forEach((item) => {
    // 라벨
    doc.setTextColor(...COLORS.gray);
    doc.text(item.label + ":", MARGIN, yPosition);

    // 값
    doc.setTextColor(...COLORS.text);
    doc.text(item.value, MARGIN + 60, yPosition);

    yPosition += LINE_HEIGHT;
  });

  return yPosition;
}

/**
 * 텍스트 섹션 추가
 */
function addTextSection(
  doc: jsPDF,
  section: TextSection,
  yPosition: number,
  contentWidth: number
): number {
  // 섹션 제목
  yPosition = addSectionTitle(doc, section.title, yPosition);

  doc.setFontSize(10);
  doc.setTextColor(...COLORS.text);

  // 텍스트 줄바꿈 처리
  const lines = doc.splitTextToSize(section.content, contentWidth);
  lines.forEach((line: string) => {
    doc.text(line, MARGIN, yPosition);
    yPosition += LINE_HEIGHT - 1;
  });

  return yPosition;
}

/**
 * 섹션 제목 추가
 */
function addSectionTitle(doc: jsPDF, title: string, yPosition: number): number {
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.primary);
  doc.text(title, MARGIN, yPosition);
  return yPosition + LINE_HEIGHT + 2;
}

/**
 * 푸터 추가
 */
function addFooter(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.gray);

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // 페이지 번호
    const pageText = `Page ${i} of ${pageCount}`;
    doc.text(
      pageText,
      pageWidth - MARGIN - doc.getTextWidth(pageText),
      pageHeight - 10
    );

    // 푸터 라인
    doc.setDrawColor(...COLORS.lightGray);
    doc.line(MARGIN, pageHeight - 15, pageWidth - MARGIN, pageHeight - 15);

    // 생성 정보
    doc.text("SaaS Management Platform", MARGIN, pageHeight - 10);
  }
}

/**
 * 날짜 포맷팅
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

/**
 * PDF Blob 생성 (다운로드용)
 */
export function createPDFBlob(buffer: ArrayBuffer): Blob {
  return new Blob([buffer], { type: "application/pdf" });
}

/**
 * PDF 다운로드 트리거 (클라이언트 사이드)
 */
export function downloadPDF(buffer: ArrayBuffer, filename: string): void {
  const blob = createPDFBlob(buffer);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".pdf") ? filename : `${filename}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
