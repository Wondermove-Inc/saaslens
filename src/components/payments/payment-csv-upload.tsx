// src/components/payments/payment-csv-upload.tsx
"use client";

import type { PaymentImportResult } from "@/actions/payments/payment-import";
import { getTeams } from "@/actions/teams";
import { getUsers } from "@/actions/users-read";
import {
  FieldMappingDialog,
  type FieldMappingResult,
} from "@/components/import/field-mapping-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseCSV } from "@/lib/csv";
import { detectCSVFormat } from "@/lib/payment-csv";
import {
  AlertCircle,
  Download,
  FileUp,
  Loader2,
  Settings2,
  Upload,
  User,
  Users,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { CsvUploadResultModal } from "./csv-upload-result-modal";

// SMP-78: 배정 타입 정의
type AssignmentType = "none" | "team" | "user";

interface Team {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  name: string | null;
  email: string;
}

interface ImportResult {
  success: boolean;
  message: string;
  imported?: number;
  matched?: number;
  unmatched?: number;
  duplicates?: number;
  batchId?: string;
  errors?: Array<{
    row: number;
    message: string;
  }>;
}

// 업로드 진행 상태
interface UploadProgress {
  index: number;
  total: number;
  merchantName: string;
  amount: number;
}

// CSV 템플릿 (헤더는 번역되지 않음 - CSV 파일 형식이므로)
const CARD_TEMPLATE = `결제일,가맹점명,결제금액,카드번호,승인번호
2024-01-15,SLACK TECHNOLOGIES,100000,1234-****-****-5678,12345678
2024-01-16,NOTION LABS INC,50000,1234-****-****-5678,12345679
2024-01-17,FIGMA INC,80000,1234-****-****-5678,12345680`;

const ERP_TEMPLATE = `거래일자,거래처명,출금액,계정과목,비고
2024-01-15,슬랙,100000,소프트웨어비,1월분 결제
2024-01-16,노션,50000,소프트웨어비,1월분 결제
2024-01-17,피그마,80000,소프트웨어비,1월분 결제`;

export function PaymentCsvUpload() {
  const t = useTranslations();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // 결과 모달 상태
  const [showResultModal, setShowResultModal] = useState(false);

  // 프로그레스 상태
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // DA-84: 커스텀 매핑 상태
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvSampleRows, setCsvSampleRows] = useState<Record<string, string>[]>(
    []
  );
  const [customMapping, setCustomMapping] = useState<FieldMappingResult | null>(
    null
  );
  const [detectedFormat, setDetectedFormat] = useState<string | null>(null);

  // SMP-78: Team/User 배정 상태
  const [assignmentType, setAssignmentType] = useState<AssignmentType>("none");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);

  // 팀/유저 목록 로드
  useEffect(() => {
    const loadOptions = async () => {
      setIsLoadingOptions(true);
      try {
        const [teamsResult, usersResult] = await Promise.all([
          getTeams(),
          getUsers({ limit: 1000 }),
        ]);

        if (teamsResult.success && teamsResult.data) {
          setTeams(teamsResult.data.map((t) => ({ id: t.id, name: t.name })));
        }
        if (usersResult.items) {
          setUsers(
            usersResult.items.map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
            }))
          );
        }
      } finally {
        setIsLoadingOptions(false);
      }
    };
    loadOptions();
  }, []);

  // 배정 타입 변경 시 선택값 초기화
  const handleAssignmentTypeChange = (value: AssignmentType) => {
    setAssignmentType(value);
    setSelectedTeamId("");
    setSelectedUserId("");
  };

  // DA-84: 파일 선택 시 CSV 포맷 감지 + 매핑 다이얼로그 트리거
  const analyzeCSVFile = useCallback(async (csvFile: File) => {
    try {
      const content = await csvFile.text();
      // BOM 제거
      const cleaned =
        content.charCodeAt(0) === 0xfeff ? content.substring(1) : content;
      const rows = parseCSV(cleaned);
      if (rows.length === 0) return;

      const headers = Object.keys(rows[0]);
      const format = detectCSVFormat(headers);

      setCsvHeaders(headers);
      setCsvSampleRows(rows.slice(0, 3));
      setDetectedFormat(format);
      setCustomMapping(null);

      // UNKNOWN 포맷이면 매핑 다이얼로그 자동 표시
      if (format === "UNKNOWN") {
        setShowMappingDialog(true);
      }
    } catch {
      // 분석 실패 시 무시 (업로드 시 서버에서 처리)
    }
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        const droppedFile = e.dataTransfer.files[0];
        if (
          droppedFile.type === "text/csv" ||
          droppedFile.name.endsWith(".csv")
        ) {
          setFile(droppedFile);
          setResult(null);
          analyzeCSVFile(droppedFile);
        }
      }
    },
    [analyzeCSVFile]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setResult(null);
      analyzeCSVFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    // SMP-78: 팀 또는 유저가 선택되어야 하는데 선택 안된 경우 차단
    if (assignmentType === "team" && !selectedTeamId) {
      setResult({
        success: false,
        message: t("payments.upload.assignment.selectTeam"),
      });
      return;
    }
    if (assignmentType === "user" && !selectedUserId) {
      setResult({
        success: false,
        message: t("payments.upload.assignment.selectUser"),
      });
      return;
    }

    const csvContent = await file.text();

    const body: {
      csvContent: string;
      teamId?: string;
      userId?: string;
      customMapping?: FieldMappingResult;
    } = {
      csvContent,
    };
    if (assignmentType === "team") body.teamId = selectedTeamId;
    if (assignmentType === "user") body.userId = selectedUserId;
    if (customMapping) body.customMapping = customMapping;

    setIsUploading(true);
    setProgress(null);
    setIsSaving(false);
    setResult(null);

    try {
      const response = await fetch("/api/v1/payments/import-stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok || !response.body) {
        const errorData = await response
          .json()
          .catch(() => ({ error: "알 수 없는 오류가 발생했습니다" }));
        setResult({
          success: false,
          message: errorData.error || "업로드에 실패했습니다",
        });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const chunk of lines) {
          const dataLine = chunk
            .split("\n")
            .find((l) => l.startsWith("data: "));
          if (!dataLine) continue;

          try {
            const event = JSON.parse(dataLine.slice(6));

            if (event.type === "start") {
              setProgress({
                index: 0,
                total: event.total,
                merchantName: "",
                amount: 0,
              });
            } else if (event.type === "processing") {
              setProgress({
                index: event.index,
                total: event.total,
                merchantName: event.merchantName,
                amount: event.amount,
              });
            } else if (event.type === "saving") {
              setIsSaving(true);
            } else if (event.type === "complete") {
              const importResult: PaymentImportResult = event.result;
              setResult({
                success: true,
                message: `${importResult.imported}개의 결제 내역을 가져왔습니다`,
                ...importResult,
              });
              setShowResultModal(true);
            } else if (event.type === "error") {
              setResult({ success: false, message: event.message });
            }
          } catch {
            // JSON 파싱 실패 무시
          }
        }
      }
    } catch {
      setResult({
        success: false,
        message: "네트워크 오류가 발생했습니다",
      });
    } finally {
      setIsUploading(false);
      setProgress(null);
      setIsSaving(false);
    }
  };

  const downloadTemplate = (type: "card" | "erp") => {
    const template = type === "card" ? CARD_TEMPLATE : ERP_TEMPLATE;
    const filename = t(`payments.upload.templateNames.${type}`);
    const blob = new Blob(["\uFEFF" + template], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  // 프로그레스 퍼센트 계산 (processing: index+1 / total, saving: 100%)
  const progressPercent = isSaving
    ? 100
    : progress && progress.total > 0
      ? Math.round(((progress.index + 1) / progress.total) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* 템플릿 다운로드 */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadTemplate("card")}
        >
          <Download className="mr-2 h-4 w-4" />
          {t("payments.upload.cardTemplate")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadTemplate("erp")}
        >
          <Download className="mr-2 h-4 w-4" />
          {t("payments.upload.erpTemplate")}
        </Button>
      </div>

      {/* 지원 형식 안내 */}
      <div className="text-muted-foreground space-y-1 text-sm">
        <p className="text-foreground font-medium">
          {t("payments.upload.supportedFormats")}
        </p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            <strong>{t("payments.upload.cardFormat")}</strong>{" "}
            {t("payments.upload.cardFormatDesc")}
          </li>
          <li>
            <strong>{t("payments.upload.erpFormat")}</strong>{" "}
            {t("payments.upload.erpFormatDesc")}
          </li>
        </ul>
      </div>

      {/* 파일 업로드 영역 */}
      <div
        className={`relative rounded-sm border-2 border-dashed p-8 text-center transition-colors ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
        <FileUp className="text-muted-foreground mx-auto mb-4 h-10 w-10" />
        <p className="mb-1 font-medium">{t("payments.upload.dragDrop")}</p>
        <p className="text-muted-foreground text-sm">
          {t("payments.upload.fileTypeHint")}
        </p>
      </div>

      {/* 선택된 파일 표시 */}
      {file && (
        <div className="bg-purple-gray rounded-sm p-4">
          <p className="font-medium">{file.name}</p>
          <p className="text-muted-foreground text-sm">
            {(file.size / 1024).toFixed(2)} KB
          </p>
        </div>
      )}

      {/* DA-84: 포맷 감지 결과 + 커스텀 매핑 버튼 */}
      {file && detectedFormat && (
        <div className="flex items-center gap-3 rounded-sm border p-3">
          <div className="flex-1">
            <p className="text-sm font-medium">
              {detectedFormat === "UNKNOWN"
                ? "포맷을 자동으로 인식할 수 없습니다"
                : `감지된 포맷: ${detectedFormat}`}
            </p>
            {customMapping && (
              <p className="text-muted-foreground text-xs">
                커스텀 매핑 적용됨 (
                {
                  Object.values(customMapping.fieldMappings).filter(Boolean)
                    .length
                }
                개 필드)
              </p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMappingDialog(true)}
          >
            <Settings2 className="mr-2 h-4 w-4" />
            {customMapping ? "매핑 수정" : "필드 매핑"}
          </Button>
        </div>
      )}

      {/* SMP-78: Team/User 배정 선택 */}
      {file && (
        <div className="space-y-4 rounded-sm border p-4">
          <div>
            <Label className="text-sm font-medium">
              {t("payments.upload.assignment.title")}
            </Label>
            <p className="text-muted-foreground text-sm">
              {t("payments.upload.assignment.description")}
            </p>
          </div>

          <RadioGroup
            value={assignmentType}
            onValueChange={(v) =>
              handleAssignmentTypeChange(v as AssignmentType)
            }
            className="flex flex-col gap-3"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="none" id="assign-none" />
              <Label htmlFor="assign-none" className="cursor-pointer">
                {t("payments.upload.assignment.none")}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="team" id="assign-team" />
              <Label
                htmlFor="assign-team"
                className="flex cursor-pointer items-center gap-1"
              >
                <Users className="h-4 w-4" />
                {t("payments.upload.assignment.team")}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="user" id="assign-user" />
              <Label
                htmlFor="assign-user"
                className="flex cursor-pointer items-center gap-1"
              >
                <User className="h-4 w-4" />
                {t("payments.upload.assignment.user")}
              </Label>
            </div>
          </RadioGroup>

          {/* 팀 선택 */}
          {assignmentType === "team" && (
            <div className="space-y-2">
              <Label htmlFor="team-select">
                {t("payments.upload.assignment.teamSelect")}
              </Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger id="team-select" disabled={isLoadingOptions}>
                  <SelectValue
                    placeholder={t(
                      "payments.upload.assignment.teamPlaceholder"
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {teams.length === 0 && !isLoadingOptions && (
                <p className="text-muted-foreground text-sm">
                  {t("payments.upload.assignment.noTeams")}
                </p>
              )}
            </div>
          )}

          {/* 유저 선택 */}
          {assignmentType === "user" && (
            <div className="space-y-2">
              <Label htmlFor="user-select">
                {t("payments.upload.assignment.userSelect")}
              </Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="user-select" disabled={isLoadingOptions}>
                  <SelectValue
                    placeholder={t(
                      "payments.upload.assignment.userPlaceholder"
                    )}
                  />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name || user.email}
                      {user.name && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          ({user.email})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {users.length === 0 && !isLoadingOptions && (
                <p className="text-muted-foreground text-sm">
                  {t("payments.upload.assignment.noUsers")}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* 업로드 버튼 */}
      <Button onClick={handleUpload} disabled={!file || isUploading}>
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("payments.upload.processing")}
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            {t("payments.upload.upload")}
          </>
        )}
      </Button>

      {/* 실시간 프로그레스 표시 */}
      {isUploading && (progress || isSaving) && (
        <div className="bg-purple-gray space-y-3 rounded-sm p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="max-w-[60%] truncate font-medium">
              {isSaving ? "저장 중..." : progress?.merchantName || "분석 중..."}
            </span>
            {progress && progress.total > 0 && (
              <span className="text-muted-foreground shrink-0">
                {isSaving ? progress.total : progress.index + 1} /{" "}
                {progress.total}건
              </span>
            )}
          </div>
          <Progress value={progressPercent} className="h-2" />
          <p className="text-muted-foreground text-xs">
            {isSaving
              ? "결제 내역을 저장하고 있습니다..."
              : "결제 내역 분석 중... (가맹점 검증 및 앱 매칭)"}
          </p>
        </div>
      )}

      {/* 실패 결과 표시 (성공 시에는 모달로 표시) */}
      {result && !result.success && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("payments.upload.error")}</AlertTitle>
          <AlertDescription>
            <p>{result.message}</p>
            {result.errors && result.errors.length > 0 && (
              <div className="mt-2">
                <p className="font-medium">
                  {t("payments.upload.parseErrors")}
                </p>
                <ul className="mt-1 list-inside list-disc text-sm">
                  {result.errors.slice(0, 5).map((error, i) => (
                    <li key={i}>{error.message}</li>
                  ))}
                  {result.errors.length > 5 && (
                    <li>
                      ... {t("payments.upload.moreErrors")}{" "}
                      {result.errors.length - 5}
                      {t("common.count")}
                    </li>
                  )}
                </ul>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* 업로드 성공 결과 모달 */}
      {result?.success && (
        <CsvUploadResultModal
          open={showResultModal}
          onOpenChange={(open) => {
            setShowResultModal(open);
            if (!open) {
              router.push("/subscriptions/suggestions");
            }
          }}
          imported={result.imported ?? 0}
          matched={result.matched ?? 0}
          unmatched={result.unmatched ?? 0}
          duplicates={result.duplicates ?? 0}
        />
      )}

      {/* DA-84: 필드 매핑 다이얼로그 */}
      <FieldMappingDialog
        open={showMappingDialog}
        onOpenChange={setShowMappingDialog}
        csvHeaders={csvHeaders}
        sampleRows={csvSampleRows}
        onConfirm={setCustomMapping}
        initialMapping={customMapping ?? undefined}
      />
    </div>
  );
}
