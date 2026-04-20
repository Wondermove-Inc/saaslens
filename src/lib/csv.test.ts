// src/lib/csv.test.ts
import { describe, expect, it } from "vitest";
import { parseCSV, validateAppCSV, validateSubscriptionCSV } from "./csv";

describe("CSV Utils", () => {
  describe("parseCSV", () => {
    it("기본 CSV를 파싱해야 한다", () => {
      const csv = `name,category,vendor
Slack,COLLABORATION,Slack Technologies
Notion,PRODUCTIVITY,Notion Labs`;

      const result = parseCSV(csv);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: "Slack",
        category: "COLLABORATION",
        vendor: "Slack Technologies",
      });
      expect(result[1]).toEqual({
        name: "Notion",
        category: "PRODUCTIVITY",
        vendor: "Notion Labs",
      });
    });

    it("쉼표가 포함된 인용 필드를 처리해야 한다", () => {
      const csv = `name,description
"Slack, Inc","Team messaging, file sharing"`;

      const result = parseCSV(csv);

      expect(result[0]).toEqual({
        name: "Slack, Inc",
        description: "Team messaging, file sharing",
      });
    });

    it("빈 CSV는 빈 배열을 반환해야 한다", () => {
      const csv = `name,category`;

      const result = parseCSV(csv);

      expect(result).toHaveLength(0);
    });

    it("헤더만 있는 CSV는 빈 배열을 반환해야 한다", () => {
      const csv = `name,category,vendor
`;

      const result = parseCSV(csv);

      expect(result).toHaveLength(0);
    });

    it("줄바꿈을 올바르게 처리해야 한다", () => {
      const csv = `name,category\r\nSlack,COLLABORATION\r\nNotion,PRODUCTIVITY`;

      const result = parseCSV(csv);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Slack");
      expect(result[1].name).toBe("Notion");
    });
  });

  describe("validateAppCSV", () => {
    it("유효한 앱 데이터를 검증해야 한다", () => {
      const rows: Record<string, string>[] = [
        { name: "Slack", category: "COLLABORATION", vendor: "Slack Inc" },
        { name: "Notion", category: "PRODUCTIVITY", vendor: "" },
      ];

      const result = validateAppCSV(rows);

      expect(result.valid).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it("필수 필드가 누락된 행을 에러로 처리해야 한다", () => {
      const rows = [
        { name: "", category: "COLLABORATION" },
        { name: "Slack", category: "" },
      ];

      const result = validateAppCSV(rows);

      expect(result.valid).toHaveLength(0);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].row).toBe(1);
      expect(result.errors[0].message).toContain("이름");
      expect(result.errors[1].row).toBe(2);
      expect(result.errors[1].message).toContain("카테고리");
    });

    it("잘못된 카테고리를 에러로 처리해야 한다", () => {
      const rows = [{ name: "Slack", category: "INVALID_CATEGORY" }];

      const result = validateAppCSV(rows);

      expect(result.valid).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("카테고리");
    });

    it("유효한 카테고리를 허용해야 한다", () => {
      const validCategories = [
        "COLLABORATION",
        "PRODUCTIVITY",
        "DEVELOPMENT",
        "DESIGN",
        "MARKETING",
        "SALES",
        "HR",
        "FINANCE",
        "ANALYTICS",
        "SECURITY",
        "IT_INFRA",
        "COMMUNICATION",
        "OTHER",
      ];

      validCategories.forEach((category) => {
        const rows = [{ name: "Test App", category }];
        const result = validateAppCSV(rows);

        expect(result.valid).toHaveLength(1);
        expect(result.errors).toHaveLength(0);
      });
    });
  });

  describe("validateSubscriptionCSV", () => {
    it("유효한 구독 데이터를 검증해야 한다", () => {
      const rows = [
        {
          appName: "Slack",
          planName: "Business+",
          billingCycle: "MONTHLY",
          price: "100000",
          renewalDate: "2024-12-01",
        },
        {
          appName: "Notion",
          planName: "Team",
          billingCycle: "YEARLY",
          price: "120000",
          renewalDate: "2025-01-15",
        },
      ];

      const result = validateSubscriptionCSV(rows);

      expect(result.valid).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it("필수 필드가 누락된 행을 에러로 처리해야 한다", () => {
      const rows = [
        { appName: "", planName: "Business", billingCycle: "MONTHLY" },
        { appName: "Slack", planName: "", billingCycle: "MONTHLY" },
      ];

      const result = validateSubscriptionCSV(rows);

      expect(result.valid).toHaveLength(0);
      expect(result.errors).toHaveLength(2);
    });

    it("잘못된 결제 주기를 에러로 처리해야 한다", () => {
      const rows = [
        { appName: "Slack", planName: "Business", billingCycle: "WEEKLY" },
      ];

      const result = validateSubscriptionCSV(rows);

      expect(result.valid).toHaveLength(0);
      expect(result.errors[0].message).toContain("결제 주기");
    });

    it("잘못된 날짜 형식을 에러로 처리해야 한다", () => {
      const rows = [
        {
          appName: "Slack",
          planName: "Business",
          billingCycle: "MONTHLY",
          renewalDate: "not-a-date",
        },
      ];

      const result = validateSubscriptionCSV(rows);

      expect(result.valid).toHaveLength(0);
      expect(result.errors[0].message).toContain("날짜");
    });

    it("숫자가 아닌 가격을 에러로 처리해야 한다", () => {
      const rows = [
        {
          appName: "Slack",
          planName: "Business",
          billingCycle: "MONTHLY",
          price: "not-a-number",
        },
      ];

      const result = validateSubscriptionCSV(rows);

      expect(result.valid).toHaveLength(0);
      expect(result.errors[0].message).toContain("가격");
    });
  });

  describe("validateUserCSV", () => {
    it("유효한 사용자 CSV를 검증해야 한다", async () => {
      const { validateUserCSV } = await import("./csv");
      const rows = [
        {
          email: "john@example.com",
          name: "John Doe",
          role: "MEMBER",
          department: "Engineering",
          jobTitle: "Software Engineer",
          employeeId: "EMP001",
        },
        {
          email: "jane@example.com",
          name: "Jane Smith",
          role: "ADMIN",
          department: "HR",
          jobTitle: "HR Manager",
          employeeId: "EMP002",
        },
      ];

      const result = validateUserCSV(rows);

      expect(result.valid).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.valid[0].email).toBe("john@example.com");
      expect(result.valid[0].role).toBe("MEMBER");
      expect(result.valid[1].role).toBe("ADMIN");
    });

    it("필수 필드 누락 시 에러를 반환해야 한다", async () => {
      const { validateUserCSV } = await import("./csv");
      const rows = [
        { email: "", name: "John", role: "MEMBER" }, // email 누락
        { email: "jane@example.com", name: "Jane", role: "" }, // role 누락
      ];

      const result = validateUserCSV(rows);

      expect(result.valid).toHaveLength(0);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].field).toBe("email");
      expect(result.errors[0].message).toContain("이메일");
      expect(result.errors[1].field).toBe("role");
      expect(result.errors[1].message).toContain("역할");
    });

    it("잘못된 역할 값에 에러를 반환해야 한다", async () => {
      const { validateUserCSV } = await import("./csv");
      const rows = [
        { email: "john@example.com", name: "John", role: "SUPERADMIN" },
      ];

      const result = validateUserCSV(rows);

      expect(result.valid).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe("role");
      expect(result.errors[0].message).toContain("역할");
    });

    it("잘못된 이메일 형식에 에러를 반환해야 한다", async () => {
      const { validateUserCSV } = await import("./csv");
      const rows = [
        { email: "invalid-email", name: "John", role: "MEMBER" },
        { email: "no-at-sign.com", name: "Jane", role: "ADMIN" },
      ];

      const result = validateUserCSV(rows);

      expect(result.valid).toHaveLength(0);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].field).toBe("email");
      expect(result.errors[0].message).toContain("이메일");
    });

    it("중복 이메일에 에러를 반환해야 한다", async () => {
      const { validateUserCSV } = await import("./csv");
      const rows = [
        { email: "john@example.com", name: "John", role: "MEMBER" },
        { email: "john@example.com", name: "John Duplicate", role: "ADMIN" },
      ];

      const result = validateUserCSV(rows);

      expect(result.valid).toHaveLength(1); // 첫 번째만 유효
      expect(result.errors).toHaveLength(1); // 두 번째는 중복 에러
      expect(result.errors[0].message).toContain("중복");
    });

    it("유효한 역할을 허용해야 한다", async () => {
      const { validateUserCSV } = await import("./csv");
      const validRoles = ["ADMIN", "MEMBER", "VIEWER"];

      validRoles.forEach((role) => {
        const rows = [
          { email: `test-${role}@example.com`, name: "Test", role },
        ];
        const result = validateUserCSV(rows);

        expect(result.valid).toHaveLength(1);
        expect(result.errors).toHaveLength(0);
      });
    });

    it("대소문자 구분 없이 역할을 허용해야 한다", async () => {
      const { validateUserCSV } = await import("./csv");
      const rows = [
        { email: "john@example.com", name: "John", role: "member" },
        { email: "jane@example.com", name: "Jane", role: "Admin" },
      ];

      const result = validateUserCSV(rows);

      expect(result.valid).toHaveLength(2);
      expect(result.valid[0].role).toBe("MEMBER");
      expect(result.valid[1].role).toBe("ADMIN");
    });

    it("선택 필드가 없어도 유효해야 한다", async () => {
      const { validateUserCSV } = await import("./csv");
      const rows = [{ email: "john@example.com", role: "MEMBER" }];

      const result = validateUserCSV(rows);

      expect(result.valid).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.valid[0].name).toBeUndefined();
      expect(result.valid[0].department).toBeUndefined();
    });
  });
});
