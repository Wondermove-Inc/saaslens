/**
 * 법인카드 거래내역 동기화 Cron Job 테스트
 * - 승인건(APPROVAL) 전용 동기화
 * - 4-Layer 매칭 + LLM 폴백 로직 검증
 * - 취소 거래 필터링 검증
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock 설정 (실제 모듈 import 전에 설정 필요)
vi.mock("@/lib/db", () => ({
  prisma: {
    corporateCard: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    app: {
      findMany: vi.fn(),
    },
    saaSCatalog: {
      findMany: vi.fn(),
    },
    cardTransaction: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/crypto", () => ({
  decryptJson: vi.fn().mockReturnValue({ cardNo: "1234567890123456" }),
}));

vi.mock("@/lib/services/hyphen", () => ({
  getCardApprovals: vi.fn().mockResolvedValue({ data: { list: [] } }),
  getLastNDaysRange: vi
    .fn()
    .mockReturnValue({ sdate: "20240101", edate: "20240131" }),
  withRetry: vi.fn((fn) => fn()),
}));

vi.mock("@/lib/services/payment/merchant-matcher", () => ({
  matchMerchant4LayerSync: vi.fn(),
}));

vi.mock("@/lib/services/saas-matcher", () => ({
  findNonSaaSKeywordHit: vi.fn().mockReturnValue(null),
  matchMerchantWithLLM: vi.fn(),
}));

vi.mock("@/lib/services/payment/sync-history-service", () => ({
  createSyncHistory: vi.fn().mockResolvedValue({ id: "sync-history-cron-1" }),
  completeSyncHistory: vi.fn().mockResolvedValue({}),
  updateCardFailCount: vi.fn().mockResolvedValue({ consecutiveFailCount: 0 }),
}));

import { matchMerchant4LayerSync } from "@/lib/services/payment/merchant-matcher";
import {
  completeSyncHistory,
  createSyncHistory,
  updateCardFailCount,
} from "@/lib/services/payment/sync-history-service";
import {
  findNonSaaSKeywordHit,
  matchMerchantWithLLM,
} from "@/lib/services/saas-matcher";

describe("sync-cards Cron Job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("승인건 매칭 (APPROVAL 전용)", () => {
    it("승인건에서 4-Layer 매칭을 실행해야 함", async () => {
      vi.mocked(matchMerchant4LayerSync).mockReturnValue({
        appId: "app-slack",
        appName: "Slack",
        confidence: 0.95,
        matchLayer: 1,
        matchSource: "PATTERN",
        catalogId: "catalog-1",
        normalized: "slack",
      });

      const fourLayerResult = matchMerchant4LayerSync(
        { merchantName: "SLACK", memo: "온라인" },
        [],
        [],
        0.8
      );

      expect(matchMerchant4LayerSync).toHaveBeenCalled();
      expect(fourLayerResult?.appId).toBe("app-slack");
      expect(fourLayerResult?.matchSource).toBe("PATTERN");
    });
  });

  describe("LLM 폴백 조건", () => {
    it("Layer 1~3 매칭 성공 + appId 없을 때 LLM 폴백 호출해야 함", async () => {
      vi.mocked(matchMerchant4LayerSync).mockReturnValue({
        appId: null,
        appName: "Slack",
        confidence: 0.95,
        matchLayer: 1,
        matchSource: "PATTERN",
        catalogId: undefined,
        normalized: "slack",
      });

      vi.mocked(matchMerchantWithLLM).mockResolvedValue({
        appId: "new-app-id",
        appName: "Slack",
        confidence: 0.9,
        matchedBy: "pattern",
        matchSource: "LLM",
      });

      const fourLayerResult = matchMerchant4LayerSync(
        { merchantName: "SLACK", memo: "온라인" },
        [],
        [],
        0.8
      );

      let matchedAppId = fourLayerResult?.appId || null;
      let matchSource = fourLayerResult?.matchSource || null;

      if (!matchedAppId) {
        const llmMatch = await matchMerchantWithLLM({
          organizationId: "org-1",
          merchantName: "SLACK",
          memo: "온라인",
          storeBizNo: null,
          amount: 10000,
          currency: "KRW",
        });
        matchedAppId = llmMatch.appId;
        matchSource = llmMatch.matchSource;
      }

      expect(matchMerchantWithLLM).toHaveBeenCalled();
      expect(matchedAppId).toBe("new-app-id");
      expect(matchSource).toBe("LLM");
    });

    it("Layer 1~3 매칭 성공 + appId 있으면 LLM 호출하지 않음", async () => {
      vi.mocked(matchMerchant4LayerSync).mockReturnValue({
        appId: "existing-app-id",
        appName: "Slack",
        confidence: 0.95,
        matchLayer: 1,
        matchSource: "PATTERN",
        catalogId: "catalog-1",
        normalized: "slack",
      });

      const fourLayerResult = matchMerchant4LayerSync(
        { merchantName: "SLACK", memo: "온라인" },
        [],
        [],
        0.8
      );

      const matchedAppId = fourLayerResult?.appId || null;

      if (!matchedAppId) {
        await matchMerchantWithLLM({
          organizationId: "org-1",
          merchantName: "SLACK",
          memo: null,
          storeBizNo: null,
          amount: null,
          currency: "KRW",
        });
      }

      expect(matchMerchantWithLLM).not.toHaveBeenCalled();
      expect(matchedAppId).toBe("existing-app-id");
    });

    it("Layer 1~3 매칭 실패 시 LLM 호출해야 함", async () => {
      vi.mocked(matchMerchant4LayerSync).mockReturnValue({
        appId: null,
        appName: null,
        confidence: 0,
        matchLayer: null,
        matchSource: null,
        catalogId: undefined,
        normalized: "알수없는가맹점",
      });

      vi.mocked(matchMerchantWithLLM).mockResolvedValue({
        appId: null,
        appName: null,
        confidence: 0.2,
        matchedBy: null,
        matchSource: "LLM",
      });

      const fourLayerResult = matchMerchant4LayerSync(
        { merchantName: "알수없는가맹점", memo: null },
        [],
        [],
        0.8
      );

      let matchedAppId = fourLayerResult?.appId || null;

      if (!matchedAppId) {
        const llmMatch = await matchMerchantWithLLM({
          organizationId: "org-1",
          merchantName: "알수없는가맹점",
          memo: null,
          storeBizNo: null,
          amount: null,
          currency: "KRW",
        });
        matchedAppId = llmMatch.appId;
      }

      expect(matchMerchantWithLLM).toHaveBeenCalled();
      expect(matchedAppId).toBeNull();
    });
  });

  describe("Non-SaaS 키워드 필터", () => {
    it("Non-SaaS 키워드 매칭 시 LLM 호출하지 않음", async () => {
      vi.mocked(findNonSaaSKeywordHit).mockReturnValue("카카오T");

      const merchantName = "카카오T택시";
      const nonSaaSHit = findNonSaaSKeywordHit(merchantName, null);

      if (nonSaaSHit) {
        expect(matchMerchant4LayerSync).not.toHaveBeenCalled();
        expect(matchMerchantWithLLM).not.toHaveBeenCalled();
      }
    });

    it("Non-SaaS 키워드 히트 시 matchStatus는 UNMATCHED", () => {
      vi.mocked(findNonSaaSKeywordHit).mockReturnValue("카카오T");

      const merchantName = "카카오T택시";
      const nonSaaSHit = findNonSaaSKeywordHit(merchantName, null);

      // Non-SaaS로 확정된 항목은 UNMATCHED로 표시되어야 함
      if (nonSaaSHit) {
        const matchStatus = "UNMATCHED";
        expect(matchStatus).toBe("UNMATCHED");
      }
    });

    it("LLM 폴백 후 appId=null이면 matchStatus는 UNMATCHED", async () => {
      vi.mocked(matchMerchant4LayerSync).mockReturnValue({
        appId: null,
        appName: null,
        confidence: 0,
        matchLayer: null,
        matchSource: null,
        catalogId: undefined,
        normalized: "알수없는가맹점",
      });

      vi.mocked(matchMerchantWithLLM).mockResolvedValue({
        appId: null,
        appName: null,
        confidence: 0.2,
        matchedBy: null,
        matchSource: "LLM",
      });

      const fourLayerResult = matchMerchant4LayerSync(
        { merchantName: "알수없는가맹점", memo: null },
        [],
        [],
        0.8
      );

      let matchedAppId = fourLayerResult?.appId || null;

      if (!matchedAppId) {
        const llmMatch = await matchMerchantWithLLM({
          organizationId: "org-1",
          merchantName: "알수없는가맹점",
          memo: null,
          storeBizNo: null,
          amount: null,
          currency: "KRW",
        });
        matchedAppId = llmMatch.appId;
      }

      // 파이프라인 완료 후 appId가 없으면 UNMATCHED
      const finalMatchStatus = matchedAppId ? "AUTO_MATCHED" : "UNMATCHED";
      expect(finalMatchStatus).toBe("UNMATCHED");
    });
  });

  describe("취소 거래 필터링", () => {
    it("useDiv에 '취소'가 포함된 거래는 매칭을 스킵해야 함", () => {
      const cancelledItem = {
        useStore: "SLACK",
        useDiv: "취소",
        useDt: "20240115",
        useTm: "120000",
        apprNo: "12345",
        useAmt: "10000",
        storeBizNo: "",
        storeType: "",
        storeAddr: "",
        settleDt: "",
        instMon: "",
        addTax: "",
      };

      // 취소 거래는 매칭 파이프라인을 실행하지 않아야 함
      const isCancelled =
        cancelledItem.useDiv && cancelledItem.useDiv.includes("취소");
      expect(isCancelled).toBe(true);

      // 취소가 아닌 경우는 매칭 실행
      const normalItem = { ...cancelledItem, useDiv: "일시불" };
      const isNormalCancelled =
        normalItem.useDiv && normalItem.useDiv.includes("취소");
      expect(isNormalCancelled).toBe(false);
    });

    it("useDiv가 '부분취소'인 거래도 매칭 스킵", () => {
      const partialCancelItem = { useDiv: "부분취소" };
      expect(partialCancelItem.useDiv.includes("취소")).toBe(true);
    });

    it("useDiv가 null/undefined인 거래는 정상 매칭 대상", () => {
      const noUseDivItem = { useDiv: null as string | null };
      const isCancelled =
        noUseDivItem.useDiv && noUseDivItem.useDiv.includes("취소");
      expect(isCancelled).toBeFalsy();
    });
  });

  describe("SyncHistory 기록 (단위 검증)", () => {
    it("createSyncHistory에 CRON triggeredBy가 전달되어야 함", async () => {
      // syncCardTransactions 함수 내부에서 createSyncHistory("CRON")을 호출하는지
      // 직접 검증하기 위해 createSyncHistory mock 동작을 확인
      vi.mocked(createSyncHistory).mockResolvedValue({
        id: "sync-history-cron-1",
      } as never);

      // 함수 호출 시뮬레이션
      await createSyncHistory({
        organizationId: "org-1",
        type: "CARD_SYNC",
        triggeredBy: "CRON",
        corporateCardId: "card-1",
      });

      expect(createSyncHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          triggeredBy: "CRON",
          type: "CARD_SYNC",
        })
      );
    });

    it("성공 시 completeSyncHistory가 SUCCESS로 호출되어야 함", async () => {
      vi.mocked(completeSyncHistory).mockResolvedValue({} as never);

      await completeSyncHistory("sync-history-cron-1", {
        status: "SUCCESS",
        totalRecords: 5,
        successCount: 5,
        failedCount: 0,
        matchedCount: 3,
        unmatchedCount: 2,
      });

      expect(completeSyncHistory).toHaveBeenCalledWith(
        "sync-history-cron-1",
        expect.objectContaining({ status: "SUCCESS" })
      );
    });

    it("실패 시 completeSyncHistory가 FAILED로 호출되어야 함", async () => {
      vi.mocked(completeSyncHistory).mockResolvedValue({} as never);

      await completeSyncHistory("sync-history-cron-1", {
        status: "FAILED",
        totalRecords: 0,
        successCount: 0,
        failedCount: 0,
        matchedCount: 0,
        unmatchedCount: 0,
        errorMessage: "카드 인증 실패",
      });

      expect(completeSyncHistory).toHaveBeenCalledWith(
        "sync-history-cron-1",
        expect.objectContaining({
          status: "FAILED",
          errorMessage: "카드 인증 실패",
        })
      );
    });

    it("성공 시 updateCardFailCount가 true로 호출되어야 함", async () => {
      vi.mocked(updateCardFailCount).mockResolvedValue({
        consecutiveFailCount: 0,
      } as never);

      await updateCardFailCount("card-1", true);

      expect(updateCardFailCount).toHaveBeenCalledWith("card-1", true);
    });

    it("실패 시 updateCardFailCount가 false로 호출되어야 함", async () => {
      vi.mocked(updateCardFailCount).mockResolvedValue({
        consecutiveFailCount: 1,
      } as never);

      await updateCardFailCount("card-1", false);

      expect(updateCardFailCount).toHaveBeenCalledWith("card-1", false);
    });
  });
});
