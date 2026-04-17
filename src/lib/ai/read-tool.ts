/**
 * SMP AI Agent Read Tool
 * SMP-197: AI가 DB 데이터를 자연어로 조회할 수 있도록 Server Actions를 Tool로 래핑
 * SMP-203: Read Tool 정리 — 섹션 구분 + RT 번호 정비
 *
 * Read Tool은 사용자 승인 없이 자동 실행됩니다.
 * inputSchema 키 필수 (AI SDK v6 — parameters 사용 금지)
 *
 * 구성 (18종):
 *  - 앱 관리: search_apps, get_app_detail, get_dashboard_stats (3종)
 *  - 구독 관리: search_subscriptions, get_upcoming_renewals, get_renewal_alerts, get_subscription_suggestions (4종)
 *  - 비용 분석: get_monthly_cost_trend, detect_cost_anomalies, get_forecasted_cost, get_spend_by_category, get_top_spending_apps (5종)
 *  - 사용자/보안: get_users, get_security_insights, get_unused_apps, get_seat_optimization, get_teams, get_audit_logs (6종)
 */

import { jsonSchema, tool } from "ai";

// ─── 앱 관리 (3종) ───

const search_apps = tool({
  description:
    "앱을 이름으로 검색합니다. 사용자가 앱 이름을 언급하면 이 도구로 ID를 찾으세요.",
  inputSchema: jsonSchema<{
    query?: string;
    status?: string;
    category?: string;
    limit?: number;
  }>({
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "검색할 앱 이름 (예: Figma, Slack, Notion)",
      },
      status: {
        type: "string",
        description: "앱 상태 필터 (ACTIVE, INACTIVE 등)",
      },
      category: { type: "string", description: "카테고리 필터" },
      limit: { type: "number", description: "결과 수 (기본 10)" },
    },
    required: [],
  }),
  execute: async ({ query, status, category, limit }) => {
    const { getApps } = await import("@/actions/apps");
    const result = await getApps({
      filter: {
        ...(query && { search: query }),
        ...(status && { status: status as "ACTIVE" | "INACTIVE" }),
        ...(category && { category }),
      },
      page: 1,
      limit: limit ?? 10,
    });
    return {
      apps: result.items.map((app) => ({
        id: app.id,
        name: app.name,
        status: app.status,
        category: app.category ?? null,
        subscriptionCount: app.subscriptionCount,
      })),
      total: result.total,
    };
  },
});

const get_app_detail = tool({
  description:
    "앱 ID로 상세 정보를 조회합니다. 구독, 사용자 수, 비용 등 상세가 필요할 때 사용하세요.",
  inputSchema: jsonSchema<{ id: string }>({
    type: "object",
    properties: {
      id: { type: "string", description: "앱 ID" },
    },
    required: ["id"],
  }),
  execute: async ({ id }) => {
    const { getApp } = await import("@/actions/apps");
    const app = await getApp(id);
    if (!app) return { error: "앱을 찾을 수 없습니다." };
    return { app };
  },
});

const get_dashboard_stats = tool({
  description: "대시보드 통계를 조회합니다. 전체 앱 수, 활성 앱, 구독 수 등.",
  inputSchema: jsonSchema<Record<string, never>>({
    type: "object",
    properties: {},
    required: [],
  }),
  execute: async () => {
    const { getDashboardStats } = await import("@/actions/dashboard");
    return await getDashboardStats();
  },
});

// ─── 구독 관리 (4종) ───

const search_subscriptions = tool({
  description:
    "구독 목록을 조회합니다. 앱 ID, 상태, 이름으로 필터링할 수 있습니다.",
  inputSchema: jsonSchema<{
    appId?: string;
    status?: string;
    search?: string;
    limit?: number;
  }>({
    type: "object",
    properties: {
      appId: { type: "string", description: "앱 ID로 필터" },
      status: { type: "string", description: "구독 상태 필터" },
      search: { type: "string", description: "앱 이름으로 검색" },
      limit: { type: "number", description: "결과 수 (기본 10)" },
    },
    required: [],
  }),
  execute: async ({ appId, status, search, limit }) => {
    const { getSubscriptions } =
      await import("@/actions/subscriptions/subscription-crud-read");
    const result = await getSubscriptions({
      filter: {
        ...(appId && { appId }),
        ...(status && {
          status: status as "ACTIVE" | "EXPIRED" | "CANCELLED" | "PENDING",
        }),
        ...(search && { search }),
      },
      page: 1,
      limit: limit ?? 10,
    });
    return { subscriptions: result.items, total: result.total };
  },
});

const get_upcoming_renewals = tool({
  description:
    "갱신 예정 구독을 조회합니다. 곧 갱신되는 구독을 확인할 때 사용하세요.",
  inputSchema: jsonSchema<Record<string, never>>({
    type: "object",
    properties: {},
    required: [],
  }),
  execute: async () => {
    const { getUrgentRenewals } = await import("@/actions/dashboard2-renewals");
    return await getUrgentRenewals();
  },
});

const get_renewal_alerts = tool({
  description: "갱신 알림 목록을 조회합니다.",
  inputSchema: jsonSchema<{ sentOnly?: boolean }>({
    type: "object",
    properties: {
      sentOnly: {
        type: "boolean",
        description: "발송된 알림만 필터",
      },
    },
    required: [],
  }),
  execute: async ({ sentOnly }) => {
    const { getRenewalAlerts } = await import("@/actions/renewal-alerts");
    return await getRenewalAlerts({ sentOnly });
  },
});

// ─── 비용 분석 (5종) ───

const get_monthly_cost_trend = tool({
  description: "월별 비용 추이를 조회합니다.",
  inputSchema: jsonSchema<{ months?: number }>({
    type: "object",
    properties: {
      months: {
        type: "number",
        description: "추이 기간(개월, 기본 6)",
      },
    },
    required: [],
  }),
  execute: async ({ months }) => {
    const { getMonthlyCostTrend } =
      await import("@/actions/cost-analytics-trend");
    return await getMonthlyCostTrend({ months: months ?? 6 });
  },
});

const detect_cost_anomalies = tool({
  description: "비용 이상 감지. 평소보다 높은 지출이 발생한 앱을 찾습니다.",
  inputSchema: jsonSchema<Record<string, never>>({
    type: "object",
    properties: {},
    required: [],
  }),
  execute: async () => {
    const { getCostAnomalies } =
      await import("@/actions/cost-analytics-forecast");
    return await getCostAnomalies();
  },
});

const get_forecasted_cost = tool({
  description: "비용 예측. 특정 월의 예상 비용을 계산합니다.",
  inputSchema: jsonSchema<{ targetMonth?: string }>({
    type: "object",
    properties: {
      targetMonth: {
        type: "string",
        description: "예측 대상 월 (YYYY-MM 형식, 기본 다음 달)",
      },
    },
    required: [],
  }),
  execute: async ({ targetMonth }) => {
    const { getForecastedCost } =
      await import("@/actions/cost-analytics-forecast");
    return await getForecastedCost({ targetMonth });
  },
});

const get_spend_by_category = tool({
  description: "카테고리별 지출 현황을 조회합니다.",
  inputSchema: jsonSchema<Record<string, never>>({
    type: "object",
    properties: {},
    required: [],
  }),
  execute: async () => {
    const { getSpendByCategory } = await import("@/actions/dashboard2-cost");
    return await getSpendByCategory();
  },
});

const get_top_spending_apps = tool({
  description: "지출 상위 앱을 조회합니다.",
  inputSchema: jsonSchema<{ limit?: number }>({
    type: "object",
    properties: {
      limit: { type: "number", description: "상위 N개 (기본 10)" },
    },
    required: [],
  }),
  execute: async ({ limit }) => {
    const { getTopSpendingApps } = await import("@/actions/dashboard2-cost");
    return await getTopSpendingApps(limit ?? 10);
  },
});

// ─── 사용자/보안 (6종) ───

const get_users = tool({
  description: "사용자 목록을 조회합니다.",
  inputSchema: jsonSchema<{ search?: string; limit?: number }>({
    type: "object",
    properties: {
      search: { type: "string", description: "이름/이메일 검색" },
      limit: { type: "number", description: "결과 수 (기본 20)" },
    },
    required: [],
  }),
  execute: async ({ search, limit }) => {
    const { getUsers } = await import("@/actions/users-read");
    return await getUsers({
      filter: search ? { search } : {},
      page: 1,
      limit: limit ?? 20,
    });
  },
});

const get_security_insights = tool({
  description: "보안 인사이트를 조회합니다. 보안 점수, 위험 요소 등.",
  inputSchema: jsonSchema<Record<string, never>>({
    type: "object",
    properties: {},
    required: [],
  }),
  execute: async () => {
    const { getSecurityInsights } = await import("@/actions/security-insights");
    return await getSecurityInsights();
  },
});

const get_unused_apps = tool({
  description: "미사용 앱을 조회합니다. 비용 절감 대상을 찾을 때 유용합니다.",
  inputSchema: jsonSchema<Record<string, never>>({
    type: "object",
    properties: {},
    required: [],
  }),
  execute: async () => {
    const { getUnusedApps } = await import("@/actions/unused-apps");
    return await getUnusedApps();
  },
});

const get_seat_optimization = tool({
  description:
    "좌석 최적화 제안을 조회합니다. 남는 라이선스를 줄여 비용을 절감합니다.",
  inputSchema: jsonSchema<Record<string, never>>({
    type: "object",
    properties: {},
    required: [],
  }),
  execute: async () => {
    const { getSeatOptimizationSuggestions } =
      await import("@/actions/seat-optimization");
    return await getSeatOptimizationSuggestions();
  },
});

const get_teams = tool({
  description: "팀 목록을 조회합니다.",
  inputSchema: jsonSchema<Record<string, never>>({
    type: "object",
    properties: {},
    required: [],
  }),
  execute: async () => {
    const { getTeams } = await import("@/actions/teams");
    return await getTeams();
  },
});

const get_audit_logs = tool({
  description: "감사 로그를 조회합니다. 누가 언제 무엇을 했는지 확인합니다.",
  inputSchema: jsonSchema<{
    action?: string;
    userId?: string;
    limit?: number;
  }>({
    type: "object",
    properties: {
      action: { type: "string", description: "액션 타입 필터" },
      userId: { type: "string", description: "사용자 ID 필터" },
      limit: { type: "number", description: "결과 수 (기본 20)" },
    },
    required: [],
  }),
  execute: async ({ action, userId, limit }) => {
    const { getAuditLogs } = await import("@/actions/audit");
    return await getAuditLogs({
      action,
      userId,
      page: 1,
      limit: limit ?? 20,
    });
  },
});

// ─── 구독 추천 (구독 관리에 포함) ───

const get_subscription_suggestions = tool({
  description:
    "결제 내역 기반 구독 추천 목록을 조회합니다. 결제 패턴에서 감지된 앱별 추천 정보(금액, 주기, Seat/정액 판단, 배정 가능 유저)를 반환합니다. 사용자가 '구독 등록해줘', '추천 확인' 등을 말하면 이 Tool을 먼저 호출하세요.",
  inputSchema: jsonSchema<{ appName?: string }>({
    type: "object",
    properties: {
      appName: {
        type: "string",
        description: "특정 앱만 필터 (예: Datadog). 생략하면 전체 추천 반환",
      },
    },
    required: [],
  }),
  execute: async ({ appName }) => {
    const { suggestSubscriptionsFromPayments, suggestFromCardTransactions } =
      await import("@/actions/subscriptions/subscription-suggestions");

    const [paymentResult, cardResult] = await Promise.all([
      suggestSubscriptionsFromPayments(),
      suggestFromCardTransactions(),
    ]);

    const allSuggestions = [
      ...(paymentResult.success && paymentResult.data
        ? paymentResult.data.map((s) => ({
            ...s,
            source: "payment_record" as const,
          }))
        : []),
      ...(cardResult.success && cardResult.data
        ? cardResult.data.map((s) => ({
            ...s,
            source: "card_transaction" as const,
          }))
        : []),
    ];

    // 앱 이름 필터
    const filtered = appName
      ? allSuggestions.filter((s) =>
          s.appName.toLowerCase().includes(appName.toLowerCase())
        )
      : allSuggestions;

    return {
      suggestions: filtered.map((s) => ({
        appId: s.appId,
        appName: s.appName,
        source: s.source,
        suggestedAction: s.suggestedAction,
        suggestedAmount: s.suggestedAmount,
        suggestedBillingCycle: s.suggestedBillingCycle,
        currency: s.currency,
        billingType: s.billingType,
        perSeatPrice: s.perSeatPrice,
        suggestedSeats: s.suggestedSeats,
        seatDetectionMethod: s.seatDetectionMethod ?? null,
        seatDetectionConfidence: s.seatDetectionConfidence ?? null,
        confidence: s.confidence,
        paymentCount: s.paymentCount,
        firstPaymentDate: s.firstPaymentDate,
        lastPaymentDate: s.lastPaymentDate,
        teamId: s.teamId,
        teamName: s.teamName,
        availableUsers: s.availableUsers.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          teamName: u.teamName,
        })),
      })),
      total: filtered.length,
    };
  },
});

// ─── Export ───

export const readTools = {
  // 앱 관리 (3종)
  search_apps,
  get_app_detail,
  get_dashboard_stats,
  // 구독 관리 + 추천 (4종)
  search_subscriptions,
  get_upcoming_renewals,
  get_renewal_alerts,
  get_subscription_suggestions,
  // 비용 분석 (5종)
  get_monthly_cost_trend,
  detect_cost_anomalies,
  get_forecasted_cost,
  get_spend_by_category,
  get_top_spending_apps,
  // 사용자/보안 (6종)
  get_users,
  get_security_insights,
  get_unused_apps,
  get_seat_optimization,
  get_teams,
  get_audit_logs,
};
