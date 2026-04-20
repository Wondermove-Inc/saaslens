// src/components/import/field-mapping-dialog.tsx
"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertCircle, Check, Settings2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

// SMP PaymentRecord 필드 정의
const PAYMENT_FIELDS = [
  { key: "date", label: "날짜 (필수)", required: true },
  { key: "merchant", label: "SaaS명/거래처 (필수)", required: true },
  { key: "amount", label: "금액 (필수)", required: true },
  { key: "category", label: "계정과목", required: false },
  { key: "memo", label: "적요/비고", required: false },
  { key: "cardLast4", label: "카드번호 끝4자리", required: false },
  { key: "approvalNumber", label: "승인번호", required: false },
] as const;

type PaymentFieldKey = (typeof PAYMENT_FIELDS)[number]["key"];

/** 필드 매핑 결과 */
export interface FieldMappingResult {
  /** CSV 컬럼 → PaymentRecord 필드 매핑 */
  fieldMappings: Record<string, PaymentFieldKey | "">;
  /** 복식부기 활성화 여부 */
  doubleEntryEnabled: boolean;
  /** 복식부기 설정 */
  doubleEntryConfig?: {
    debitAccountColumn: string;
    creditAccountColumn: string;
    expensePrefix: string;
  };
  /** 프로필 이름 (저장 시) */
  profileName?: string;
}

interface FieldMappingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** CSV 헤더 목록 */
  csvHeaders: string[];
  /** CSV 샘플 데이터 (최대 3행) */
  sampleRows: Record<string, string>[];
  /** 매핑 확정 콜백 */
  onConfirm: (mapping: FieldMappingResult) => void;
  /** 기존 매핑 (편집 시) */
  initialMapping?: Partial<FieldMappingResult>;
}

export function FieldMappingDialog({
  open,
  onOpenChange,
  csvHeaders,
  sampleRows,
  onConfirm,
  initialMapping,
}: FieldMappingDialogProps) {
  // 필드 매핑 상태: { csvColumn: paymentField }
  const [mappings, setMappings] = useState<
    Record<string, PaymentFieldKey | "">
  >(() => initialMapping?.fieldMappings ?? {});

  const [doubleEntryEnabled, setDoubleEntryEnabled] = useState(
    initialMapping?.doubleEntryEnabled ?? false
  );
  const [debitColumn, setDebitColumn] = useState(
    initialMapping?.doubleEntryConfig?.debitAccountColumn ?? ""
  );
  const [creditColumn, setCreditColumn] = useState(
    initialMapping?.doubleEntryConfig?.creditAccountColumn ?? ""
  );
  const [expensePrefix, setExpensePrefix] = useState(
    initialMapping?.doubleEntryConfig?.expensePrefix ?? "8"
  );

  // 이미 매핑된 필드 추적 (중복 방지)
  const usedPaymentFields = useMemo(() => {
    const used = new Set<string>();
    for (const field of Object.values(mappings)) {
      if (field) used.add(field);
    }
    return used;
  }, [mappings]);

  // 필수 필드 매핑 완료 여부
  const requiredFieldsMapped = useMemo(() => {
    const requiredKeys = PAYMENT_FIELDS.filter((f) => f.required).map(
      (f) => f.key
    );
    return requiredKeys.every((key) => usedPaymentFields.has(key));
  }, [usedPaymentFields]);

  const handleMappingChange = useCallback(
    (csvColumn: string, paymentField: PaymentFieldKey | "") => {
      setMappings((prev) => ({ ...prev, [csvColumn]: paymentField }));
    },
    []
  );

  const handleConfirm = () => {
    const result: FieldMappingResult = {
      fieldMappings: mappings,
      doubleEntryEnabled,
    };
    if (doubleEntryEnabled && debitColumn) {
      result.doubleEntryConfig = {
        debitAccountColumn: debitColumn,
        creditAccountColumn: creditColumn,
        expensePrefix,
      };
    }
    onConfirm(result);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[95vw] max-w-5xl overflow-x-hidden overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            CSV 필드 매핑
          </DialogTitle>
          <DialogDescription>
            CSV 컬럼을 SMP 결제 데이터 필드에 매핑하세요. 필수 필드(날짜,
            SaaS명, 금액)는 반드시 매핑해야 합니다.
          </DialogDescription>
        </DialogHeader>

        {/* 샘플 데이터 미리보기 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">CSV 데이터 미리보기</Label>
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {csvHeaders.map((header) => (
                    <th
                      key={header}
                      className="px-3 py-2 text-left font-medium whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sampleRows.slice(0, 3).map((row, i) => (
                  <tr key={i} className="border-t">
                    {csvHeaders.map((header) => (
                      <td
                        key={header}
                        className="text-muted-foreground px-3 py-1.5 whitespace-nowrap"
                      >
                        {row[header] || "-"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 필드 매핑 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">필드 매핑</Label>
          <div className="space-y-2">
            {csvHeaders.map((csvColumn) => (
              <div
                key={csvColumn}
                className="flex items-center gap-3 rounded-md border px-3 py-2"
              >
                <span className="min-w-[140px] truncate font-mono text-sm">
                  {csvColumn}
                </span>
                <span className="text-muted-foreground text-xs">→</span>
                <Select
                  value={mappings[csvColumn] || ""}
                  onValueChange={(v) =>
                    handleMappingChange(
                      csvColumn,
                      v === "__none__" ? "" : (v as PaymentFieldKey)
                    )
                  }
                >
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="매핑 안 함" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">매핑 안 함</SelectItem>
                    {PAYMENT_FIELDS.map((field) => (
                      <SelectItem
                        key={field.key}
                        value={field.key}
                        disabled={
                          usedPaymentFields.has(field.key) &&
                          mappings[csvColumn] !== field.key
                        }
                      >
                        {field.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {mappings[csvColumn] && (
                  <Badge variant="secondary" className="text-xs">
                    <Check className="mr-1 h-3 w-3" />
                    매핑됨
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 복식부기 설정 */}
        <div className="space-y-3 rounded-md border p-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm font-medium">복식부기 모드</Label>
              <p className="text-muted-foreground text-xs">
                차변/대변 구조의 ERP 데이터인 경우 활성화하세요
              </p>
            </div>
            <Switch
              checked={doubleEntryEnabled}
              onCheckedChange={setDoubleEntryEnabled}
            />
          </div>

          {doubleEntryEnabled && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">차변 계정 컬럼</Label>
                  <Select value={debitColumn} onValueChange={setDebitColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {csvHeaders.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">대변 계정 컬럼</Label>
                  <Select value={creditColumn} onValueChange={setCreditColumn}>
                    <SelectTrigger>
                      <SelectValue placeholder="선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {csvHeaders.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">비용 계정 접두사 (쉼표 구분)</Label>
                <Input
                  value={expensePrefix}
                  onChange={(e) => setExpensePrefix(e.target.value)}
                  placeholder="예: 8, 6 (8xxx, 6xxx 계정만 추출)"
                  className="text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* 매핑 상태 요약 */}
        <div className="flex items-center gap-2 text-sm">
          {requiredFieldsMapped ? (
            <Badge variant="default" className="bg-green-600">
              <Check className="mr-1 h-3 w-3" />
              필수 필드 매핑 완료
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertCircle className="mr-1 h-3 w-3" />
              필수 필드를 모두 매핑하세요
            </Badge>
          )}
          <span className="text-muted-foreground">
            {Object.values(mappings).filter(Boolean).length}/{csvHeaders.length}{" "}
            컬럼 매핑됨
          </span>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleConfirm} disabled={!requiredFieldsMapped}>
            매핑 적용
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
