// src/actions/payments/payment-import.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock 설정 (import 전에 선언)
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    team: {
      findFirst: vi.fn(),
    },
    user: {
      findFirst: vi.fn(),
    },
    app: {
      findMany: vi.fn(),
    },
    saaSCatalog: {
      findMany: vi.fn(),
    },
    merchantPattern: {
      findMany: vi.fn(),
    },
    paymentRecord: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/payment-csv", () => ({
  parsePaymentCSV: vi.fn(),
}));

vi.mock("@/lib/services/payment/process-payment-records", () => ({
  processPaymentRecords: vi.fn(),
}));

vi.mock("@/lib/services/payment/sync-history-service", () => ({
  createSyncHistory: vi.fn().mockResolvedValue({ id: "sync-history-csv-1" }),
  completeSyncHistory: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/services/saas-matcher", () => ({
  checkNonSaaSCache: vi.fn().mockResolvedValue(new Set()),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parsePaymentCSV } from "@/lib/payment-csv";
import { processPaymentRecords } from "@/lib/services/payment/process-payment-records";
import {
  completeSyncHistory,
  createSyncHistory,
} from "@/lib/services/payment/sync-history-service";
import { importPaymentCSV } from "./payment-import";

const mockSession = {
  user: {
    id: "user-1",
    organizationId: "org-1",
    role: "ADMIN",
  },
};

const mockParsedData = [
  {
    merchantName: "AWS",
    approvalNumber: "APPR001",
    amount: 10000,
    date: "2025-01-15",
  },
];

describe("importPaymentCSV", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(mockSession as never);
    vi.mocked(prisma.app.findMany).mockResolvedValue([]);
    vi.mocked(prisma.saaSCatalog.findMany).mockResolvedValue([]);
    vi.mocked(prisma.merchantPattern.findMany).mockResolvedValue([]);
    vi.mocked(prisma.paymentRecord.findMany).mockResolvedValue([]);
    vi.mocked(prisma.paymentRecord.createMany).mockResolvedValue({
      count: 1,
    } as never);
    vi.mocked(parsePaymentCSV).mockReturnValue({
      success: true,
      data: mockParsedData,
      errors: [],
    } as never);
    vi.mocked(processPaymentRecords).mockResolvedValue({
      paymentRecords: [{}],
      matchedCount: 1,
    } as never);
    vi.mocked(createSyncHistory).mockResolvedValue({
      id: "sync-history-csv-1",
    } as never);
    vi.mocked(completeSyncHistory).mockResolvedValue({} as never);
  });

  describe("인증 검증", () => {
    it("세션이 없으면 인증 오류 반환", async () => {
      vi.mocked(auth).mockResolvedValue(null as never);

      const result = await importPaymentCSV("csv-content");

      expect(result.success).toBe(false);
      expect(result.message).toBe("인증이 필요합니다");
    });

    it("ADMIN이 아니면 권한 오류 반환", async () => {
      vi.mocked(auth).mockResolvedValue({
        ...mockSession,
        user: { ...mockSession.user, role: "MEMBER" },
      } as never);

      const result = await importPaymentCSV("csv-content");

      expect(result.success).toBe(false);
      expect(result.message).toBe("관리자만 결제 내역을 가져올 수 있습니다");
    });
  });

  describe("SyncHistory 기록", () => {
    it("가져오기 시작 시 SyncHistory를 RUNNING 상태로 생성", async () => {
      await importPaymentCSV("csv-content");

      expect(createSyncHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: "org-1",
          type: "CSV_IMPORT",
          triggeredBy: "USER",
          userId: "user-1",
        })
      );
    });

    it("fileName 옵션이 있으면 SyncHistory에 fileName 포함", async () => {
      await importPaymentCSV("csv-content", { fileName: "payments.csv" });

      expect(createSyncHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          fileName: "payments.csv",
        })
      );
    });

    it("성공 시 completeSyncHistory가 SUCCESS 상태로 호출됨", async () => {
      await importPaymentCSV("csv-content");

      expect(completeSyncHistory).toHaveBeenCalledWith(
        "sync-history-csv-1",
        expect.objectContaining({ status: "SUCCESS" })
      );
    });

    it("성공 시 completeSyncHistory에 올바른 카운트 전달", async () => {
      vi.mocked(prisma.paymentRecord.createMany).mockResolvedValue({
        count: 1,
      } as never);
      vi.mocked(processPaymentRecords).mockResolvedValue({
        paymentRecords: [{}],
        matchedCount: 1,
      } as never);

      await importPaymentCSV("csv-content");

      expect(completeSyncHistory).toHaveBeenCalledWith(
        "sync-history-csv-1",
        expect.objectContaining({
          status: "SUCCESS",
          totalRecords: 1,
          successCount: 1,
          failedCount: 0,
          matchedCount: 1,
          unmatchedCount: 0,
        })
      );
    });

    it("에러 발생 시 completeSyncHistory가 FAILED 상태로 호출됨", async () => {
      vi.mocked(prisma.paymentRecord.createMany).mockRejectedValue(
        new Error("DB 저장 실패")
      );

      await importPaymentCSV("csv-content");

      expect(completeSyncHistory).toHaveBeenCalledWith(
        "sync-history-csv-1",
        expect.objectContaining({
          status: "FAILED",
          errorMessage: "DB 저장 실패",
        })
      );
    });

    it("createSyncHistory 실패해도 메인 가져오기 흐름은 계속 진행", async () => {
      vi.mocked(createSyncHistory).mockRejectedValue(
        new Error("SyncHistory DB 오류")
      );

      const result = await importPaymentCSV("csv-content");

      // SyncHistory 실패해도 메인 가져오기는 성공
      expect(result.success).toBe(true);
    });
  });

  describe("CSV 파싱 오류 처리", () => {
    it("CSV 파싱 실패 시 오류 반환", async () => {
      vi.mocked(parsePaymentCSV).mockReturnValue({
        success: false,
        error: "잘못된 CSV 형식",
      } as never);

      const result = await importPaymentCSV("invalid-csv");

      expect(result.success).toBe(false);
      expect(result.message).toBe("잘못된 CSV 형식");
    });

    it("데이터가 없으면 오류 반환", async () => {
      vi.mocked(parsePaymentCSV).mockReturnValue({
        success: true,
        data: [],
      } as never);

      const result = await importPaymentCSV("empty-csv");

      expect(result.success).toBe(false);
      expect(result.message).toBe("가져올 결제 내역이 없습니다");
    });
  });

  describe("정상 가져오기", () => {
    it("성공적으로 결제 내역 가져오기", async () => {
      const result = await importPaymentCSV("csv-content");

      expect(result.success).toBe(true);
      expect(result.data?.imported).toBe(1);
    });
  });
});
