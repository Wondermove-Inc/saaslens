// src/lib/services/report/email-sender.ts
/**
 * 리포트 이메일 발송 서비스
 */

import { prisma } from "@/lib/db";
import { generateCSV } from "@/lib/services/export/csv";
import {
  generateExcelWorkbook,
  workbookToBuffer,
} from "@/lib/services/export/excel";
import { generatePDFReport, type PDFSection } from "@/lib/services/export/pdf";
import { Resend } from "resend";

// Lazy initialization to avoid build-time errors when API key is not set
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY || "dummy-key-for-build";
    resend = new Resend(apiKey);
  }
  return resend;
}

interface SendReportEmailParams {
  scheduleId: string;
  organizationId: string;
  organizationName: string;
  reportType: string;
  format: string;
  recipients: string[];
}

export async function sendReportEmail(
  params: SendReportEmailParams
): Promise<void> {
  const { organizationId, organizationName, reportType, format, recipients } =
    params;

  // 리포트 데이터 생성
  const reportData = await generateReportData(organizationId, reportType);

  // 리포트 파일 생성
  const { buffer, filename, mimeType } = await generateReportFile(
    reportData,
    reportType,
    format,
    organizationName
  );

  // 이메일 발송
  const reportTypeLabels: Record<string, string> = {
    COST_ANALYSIS: "비용 분석",
    RENEWAL: "구독 갱신",
    TERMINATED_USERS: "퇴사자 현황",
  };

  const reportLabel = reportTypeLabels[reportType] || reportType;

  await getResendClient().emails.send({
    from: "SaaS Management Platform <reports@resend.dev>",
    to: recipients,
    subject: `[${organizationName}] ${reportLabel} 리포트 - ${new Date().toLocaleDateString("ko-KR")}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">📊 ${reportLabel} 리포트</h2>
        <p>안녕하세요,</p>
        <p>${organizationName}의 ${reportLabel} 리포트가 생성되었습니다.</p>
        <p>첨부된 파일을 확인해 주세요.</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #666; font-size: 12px;">
          이 이메일은 SaaS Management Platform에서 자동으로 발송되었습니다.
        </p>
      </div>
    `,
    attachments: [
      {
        filename,
        content: Buffer.from(buffer).toString("base64"),
        contentType: mimeType,
      },
    ],
  });
}

interface ReportData {
  type: string;
  data: unknown;
  generatedAt: Date;
}

async function generateReportData(
  organizationId: string,
  reportType: string
): Promise<ReportData> {
  const generatedAt = new Date();

  switch (reportType) {
    case "COST_ANALYSIS": {
      // 비용 분석 데이터
      const payments = await prisma.paymentRecord.findMany({
        where: {
          organizationId,
          matchStatus: { in: ["MANUAL", "AUTO_MATCHED"] },
        },
        include: {
          matchedApp: { select: { name: true } },
        },
        orderBy: { transactionDate: "desc" },
        take: 100,
      });

      return {
        type: reportType,
        data: payments.map((p) => ({
          date: p.transactionDate,
          description: p.merchantName,
          amount: Number(p.amount),
          appName: p.matchedApp?.name || "미매칭",
        })),
        generatedAt,
      };
    }

    case "RENEWAL": {
      // 구독 갱신 데이터
      const now = new Date();
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

      const subscriptions = await prisma.subscription.findMany({
        where: {
          organizationId,
          status: "ACTIVE",
          renewalDate: { gte: now, lte: ninetyDaysFromNow },
        },
        include: {
          app: { select: { name: true } },
        },
        orderBy: { renewalDate: "asc" },
      });

      return {
        type: reportType,
        data: subscriptions.map((s) => ({
          appName: s.app.name,
          renewalDate: s.renewalDate,
          amount: Number(s.amount),
          currency: s.currency,
          daysUntilRenewal: Math.ceil(
            (s.renewalDate!.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          ),
        })),
        generatedAt,
      };
    }

    case "TERMINATED_USERS": {
      // 퇴사자 현황 데이터
      const terminatedUsers = await prisma.user.findMany({
        where: {
          organizationId,
          status: "TERMINATED",
          appAccesses: { some: {} },
        },
        include: {
          _count: { select: { appAccesses: true } },
          appAccesses: {
            include: {
              app: { select: { name: true } },
            },
          },
        },
        orderBy: { terminatedAt: "desc" },
      });

      return {
        type: reportType,
        data: terminatedUsers.map((u) => ({
          name: u.name || u.email,
          email: u.email,
          department: u.department,
          terminatedAt: u.terminatedAt,
          unrevokedAccessCount: u._count.appAccesses,
          apps: u.appAccesses.map((a) => a.app.name).join(", "),
        })),
        generatedAt,
      };
    }

    default:
      throw new Error(`Unknown report type: ${reportType}`);
  }
}

async function generateReportFile(
  reportData: ReportData,
  reportType: string,
  format: string,
  organizationName: string
): Promise<{ buffer: ArrayBuffer; filename: string; mimeType: string }> {
  const dateStr = new Date().toISOString().slice(0, 10);
  const reportTypeLabels: Record<string, string> = {
    COST_ANALYSIS: "cost-analysis",
    RENEWAL: "renewal",
    TERMINATED_USERS: "terminated-users",
  };
  const typeLabel = reportTypeLabels[reportType] || reportType.toLowerCase();

  switch (format) {
    case "PDF": {
      const sections = generatePDFSections(reportData);
      const buffer = await generatePDFReport({
        title: getReportTitle(reportType),
        subtitle: `생성일: ${new Date().toLocaleDateString("ko-KR")}`,
        organizationName,
        generatedAt: reportData.generatedAt,
        sections,
      });
      return {
        buffer,
        filename: `${typeLabel}-report-${dateStr}.pdf`,
        mimeType: "application/pdf",
      };
    }

    case "EXCEL": {
      const workbook = await generateExcelWorkbook({
        sheetName: getReportTitle(reportType),
        columns: getExcelColumns(reportType),
        data: reportData.data as Record<string, unknown>[],
        title: `${getReportTitle(reportType)} - ${organizationName}`,
      });
      const excelBuffer = await workbookToBuffer(workbook);
      return {
        buffer: excelBuffer,
        filename: `${typeLabel}-report-${dateStr}.xlsx`,
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };
    }

    case "CSV": {
      const csv = generateCSV(
        getCSVColumns(reportType),
        reportData.data as Record<string, unknown>[],
        { includeBOM: true }
      );
      const encoder = new TextEncoder();
      const buffer = encoder.encode(csv).buffer as ArrayBuffer;
      return {
        buffer,
        filename: `${typeLabel}-report-${dateStr}.csv`,
        mimeType: "text/csv;charset=utf-8",
      };
    }

    default:
      throw new Error(`Unknown format: ${format}`);
  }
}

function getReportTitle(reportType: string): string {
  const titles: Record<string, string> = {
    COST_ANALYSIS: "비용 분석 리포트",
    RENEWAL: "구독 갱신 리포트",
    TERMINATED_USERS: "퇴사자 현황 리포트",
  };
  return titles[reportType] || "리포트";
}

function generatePDFSections(reportData: ReportData): PDFSection[] {
  const data = reportData.data as Record<string, unknown>[];

  switch (reportData.type) {
    case "COST_ANALYSIS":
      return [
        {
          type: "table",
          title: "결제 내역",
          headers: ["날짜", "설명", "금액", "앱"],
          rows: data
            .slice(0, 50)
            .map((d) => [
              new Date(d.date as Date).toLocaleDateString("ko-KR"),
              (d.description as string) || "-",
              `₩${(d.amount as number).toLocaleString()}`,
              (d.appName as string) || "-",
            ]),
        },
      ];

    case "RENEWAL":
      return [
        {
          type: "table",
          title: "갱신 예정 구독",
          headers: ["앱 이름", "갱신일", "금액", "D-Day"],
          rows: data.map((d) => [
            d.appName as string,
            new Date(d.renewalDate as Date).toLocaleDateString("ko-KR"),
            `${d.currency}${(d.amount as number).toLocaleString()}`,
            `D-${d.daysUntilRenewal}`,
          ]),
        },
      ];

    case "TERMINATED_USERS":
      return [
        {
          type: "table",
          title: "퇴사자 미회수 현황",
          headers: ["이름", "부서", "퇴사일", "미회수 앱"],
          rows: data.map((d) => [
            d.name as string,
            (d.department as string) || "-",
            d.terminatedAt
              ? new Date(d.terminatedAt as Date).toLocaleDateString("ko-KR")
              : "-",
            `${d.unrevokedAccessCount}개`,
          ]),
        },
      ];

    default:
      return [];
  }
}

function getExcelColumns(reportType: string) {
  switch (reportType) {
    case "COST_ANALYSIS":
      return [
        { key: "date", header: "날짜", width: 15 },
        { key: "description", header: "설명", width: 30 },
        { key: "amount", header: "금액", width: 15 },
        { key: "appName", header: "앱", width: 20 },
      ];
    case "RENEWAL":
      return [
        { key: "appName", header: "앱 이름", width: 20 },
        { key: "renewalDate", header: "갱신일", width: 15 },
        { key: "amount", header: "금액", width: 15 },
        { key: "daysUntilRenewal", header: "남은 일수", width: 12 },
      ];
    case "TERMINATED_USERS":
      return [
        { key: "name", header: "이름", width: 15 },
        { key: "email", header: "이메일", width: 25 },
        { key: "department", header: "부서", width: 15 },
        { key: "terminatedAt", header: "퇴사일", width: 15 },
        { key: "unrevokedAccessCount", header: "미회수 앱", width: 12 },
        { key: "apps", header: "앱 목록", width: 40 },
      ];
    default:
      return [];
  }
}

function getCSVColumns(reportType: string) {
  return getExcelColumns(reportType);
}
