// src/lib/services/erp/index.ts
// ERP 어댑터 레지스트리 + 팩토리

import type { IntegrationType } from "@prisma/client";
import { oracleAdapter } from "./oracle";
import { sapAdapter } from "./sap";
import type { ERPPaymentAdapter } from "./types";

export type {
  ERPCredentials,
  ERPPaymentAdapter,
  ERPPaymentItem,
  ERPSyncRequest,
  ERPSyncResult,
  OracleCredentials,
  SapCredentials,
} from "./types";

const ADAPTER_REGISTRY: Map<IntegrationType, ERPPaymentAdapter> = new Map([
  ["SAP_S4HANA", sapAdapter],
  ["ORACLE_ERP_CLOUD", oracleAdapter],
]);

/** IntegrationType에 해당하는 ERP 어댑터 반환 */
export function getERPAdapter(
  type: IntegrationType
): ERPPaymentAdapter | undefined {
  return ADAPTER_REGISTRY.get(type);
}

/** ERP 타입인지 확인 */
export function isERPIntegrationType(type: IntegrationType): boolean {
  return ADAPTER_REGISTRY.has(type);
}

/** 등록된 모든 ERP 어댑터 반환 */
export function getAllERPAdapters(): ERPPaymentAdapter[] {
  return Array.from(ADAPTER_REGISTRY.values());
}
