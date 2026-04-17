import { describe, expect, it } from "vitest";
import {
  batchMatchTransactions,
  extractSaaSCandidates,
  matchTransactionToApp,
  type AppForMatching,
} from "./matcher";
import type { ApprovalItem } from "./types";

// Mock App 데이터
const mockApps: AppForMatching[] = [
  { id: "app1", name: "Slack" },
  { id: "app2", name: "Notion" },
  { id: "app3", name: "GitHub" },
  { id: "app4", name: "AWS" },
  { id: "app5", name: "Custom App" },
];

// Mock Transaction 생성 헬퍼
function createMockTransaction(
  useStore: string,
  storeBizNo?: string
): ApprovalItem {
  return {
    useDt: "20241201",
    useTm: "120000",
    apprNo: "123456",
    useCard: "신한카드",
    useStore,
    useAmt: "10000",
    useDiv: "승인",
    storeBizNo,
  };
}

describe("matcher", () => {
  describe("matchTransactionToApp", () => {
    describe("글로벌 SaaS 패턴 매칭", () => {
      it("should match Slack transaction", () => {
        const transaction = createMockTransaction("SLACK TECHNOLOGIES");
        const result = matchTransactionToApp(transaction, mockApps);

        expect(result.appId).toBe("app1");
        expect(result.appName).toBe("Slack");
        expect(result.confidence).toBeGreaterThanOrEqual(0.85);
        // 앱 이름이 가맹점명에 포함되면 exact 매칭 (우선순위: 커스텀 > exact > pattern)
        expect(["exact", "pattern"]).toContain(result.matchedBy);
      });

      it("should match Korean Slack name", () => {
        const transaction = createMockTransaction("슬랙 결제");
        const result = matchTransactionToApp(transaction, mockApps);

        expect(result.appId).toBe("app1");
        expect(result.appName).toBe("Slack");
      });

      it("should match Notion transaction", () => {
        const transaction = createMockTransaction("NOTION LABS INC");
        const result = matchTransactionToApp(transaction, mockApps);

        expect(result.appId).toBe("app2");
        expect(result.appName).toBe("Notion");
      });

      it("should match AWS transaction", () => {
        const transaction = createMockTransaction("AMAZON WEB SERVICES");
        const result = matchTransactionToApp(transaction, mockApps);

        expect(result.appId).toBe("app4");
        expect(result.appName).toBe("AWS");
      });

      it("should match GitHub transaction", () => {
        const transaction = createMockTransaction("GITHUB INC");
        const result = matchTransactionToApp(transaction, mockApps);

        expect(result.appId).toBe("app3");
        expect(result.appName).toBe("GitHub");
      });
    });

    describe("앱 이름 직접 매칭", () => {
      it("should match by exact app name in merchant", () => {
        const transaction = createMockTransaction("Custom App 결제");
        const result = matchTransactionToApp(transaction, mockApps);

        expect(result.appId).toBe("app5");
        expect(result.appName).toBe("Custom App");
        expect(result.matchedBy).toBe("exact");
      });

      it("should be case-insensitive", () => {
        const transaction = createMockTransaction("custom app PAYMENT");
        const result = matchTransactionToApp(transaction, mockApps);

        expect(result.appId).toBe("app5");
      });
    });

    describe("커스텀 패턴 매칭", () => {
      it("should prioritize custom patterns", () => {
        const transaction = createMockTransaction("SPECIAL VENDOR");
        const customPatterns = [{ pattern: "SPECIAL", appId: "app5" }];
        const result = matchTransactionToApp(
          transaction,
          mockApps,
          customPatterns
        );

        expect(result.appId).toBe("app5");
        expect(result.confidence).toBe(1.0);
        expect(result.matchedBy).toBe("pattern");
      });
    });

    describe("매칭 실패", () => {
      it("should return null when no match found", () => {
        const transaction = createMockTransaction("일반 음식점");
        const result = matchTransactionToApp(transaction, mockApps);

        expect(result.appId).toBeNull();
        expect(result.appName).toBeNull();
        expect(result.confidence).toBe(0);
        expect(result.matchedBy).toBeNull();
      });
    });

    describe("글로벌 패턴 - 앱 미등록", () => {
      it("should identify SaaS even if app is not registered", () => {
        const transaction = createMockTransaction("FIGMA INC");
        const result = matchTransactionToApp(transaction, []);

        expect(result.appId).toBeNull();
        expect(result.appName).toBe("Figma");
        expect(result.confidence).toBeGreaterThan(0);
        expect(result.matchedBy).toBe("pattern");
      });
    });
  });

  describe("batchMatchTransactions", () => {
    it("should match multiple transactions", () => {
      const transactions = [
        { ...createMockTransaction("SLACK"), apprNo: "001" },
        { ...createMockTransaction("NOTION"), apprNo: "002" },
        { ...createMockTransaction("일반 상점"), apprNo: "003" },
      ];

      const results = batchMatchTransactions(transactions, mockApps);

      expect(results.size).toBe(3);
    });

    it("should use unique key for each transaction", () => {
      const transactions = [
        { ...createMockTransaction("SLACK"), apprNo: "001", useDt: "20241201" },
        { ...createMockTransaction("SLACK"), apprNo: "002", useDt: "20241201" },
      ];

      const results = batchMatchTransactions(transactions, mockApps);

      expect(results.size).toBe(2);
      expect(results.get("001_20241201")).toBeDefined();
      expect(results.get("002_20241201")).toBeDefined();
    });
  });

  describe("extractSaaSCandidates", () => {
    it("should extract SaaS candidates from transactions", () => {
      const transactions = [
        createMockTransaction("SLACK"),
        createMockTransaction("SLACK"),
        createMockTransaction("NOTION"),
        createMockTransaction("일반 상점"),
      ];

      const candidates = extractSaaSCandidates(transactions);

      expect(candidates.length).toBeGreaterThanOrEqual(2);

      const slackCandidate = candidates.find((c) => c.name === "Slack");
      expect(slackCandidate).toBeDefined();
      expect(slackCandidate?.count).toBe(2);
      expect(slackCandidate?.totalAmount).toBe(20000);

      const notionCandidate = candidates.find((c) => c.name === "Notion");
      expect(notionCandidate).toBeDefined();
      expect(notionCandidate?.count).toBe(1);
    });

    it("should sort by total amount descending", () => {
      const transactions = [
        { ...createMockTransaction("SLACK"), useAmt: "50000" },
        { ...createMockTransaction("NOTION"), useAmt: "100000" },
      ];

      const candidates = extractSaaSCandidates(transactions);

      expect(candidates[0].name).toBe("Notion");
      expect(candidates[0].totalAmount).toBe(100000);
    });

    it("should return empty array when no SaaS found", () => {
      const transactions = [
        createMockTransaction("일반 음식점"),
        createMockTransaction("주유소"),
      ];

      const candidates = extractSaaSCandidates(transactions);

      expect(candidates).toEqual([]);
    });
  });
});
