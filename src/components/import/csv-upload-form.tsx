// src/components/import/csv-upload-form.tsx
"use client";

import {
  bulkImportApps,
  bulkImportSubscriptions,
  importUsersChunk,
} from "@/actions/bulk-import";
import { CsvUploadProgressDialog } from "@/components/import/csv-upload-progress-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileUp,
  Loader2,
  Upload,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useState, useTransition } from "react";

type ImportType = "apps" | "subscriptions" | "users";

interface ImportResult {
  success: boolean;
  message: string;
  created?: number;
  errors?: Array<{
    row: number;
    field: string;
    message: string;
  }>;
}

const CHUNK_SIZE = 50;

// CSV 템플릿
const APP_TEMPLATE = `name,category,vendor,description,website
Slack,COLLABORATION,Slack Technologies,팀 커뮤니케이션 도구,https://slack.com
Notion,PRODUCTIVITY,Notion Labs,올인원 협업 도구,https://notion.so`;

const SUBSCRIPTION_TEMPLATE = `appName,planName,billingCycle,price,renewalDate,seats
Slack,Business+,MONTHLY,100000,2024-12-01,50
Notion,Team,YEARLY,1200000,2025-01-15,30`;

const USER_TEMPLATE = `email,name,role,department,jobTitle,employeeId
john@example.com,John Doe,MEMBER,Engineering,Software Engineer,EMP001
jane@example.com,Jane Smith,VIEWER,Marketing,Marketing Manager,EMP002`;

function splitCsvIntoChunks(csvText: string, chunkSize: number): string[] {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) return [];

  const header = lines[0];
  const dataLines = lines.slice(1).filter((l) => l.trim() !== "");
  const chunks: string[] = [];

  for (let i = 0; i < dataLines.length; i += chunkSize) {
    const chunkLines = dataLines.slice(i, i + chunkSize);
    chunks.push([header, ...chunkLines].join("\n"));
  }

  return chunks;
}

export function CsvUploadForm() {
  const t = useTranslations("import.form");
  const [importType, setImportType] = useState<ImportType>("apps");
  const [file, setFile] = useState<File | null>(null);
  const [totalRecords, setTotalRecords] = useState<number | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [dragActive, setDragActive] = useState(false);

  // 진행률 다이얼로그 상태
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressProcessed, setProgressProcessed] = useState(0);
  const [progressErrors, setProgressErrors] = useState(0);
  const [progressComplete, setProgressComplete] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (
        droppedFile.type === "text/csv" ||
        droppedFile.name.endsWith(".csv")
      ) {
        processFile(droppedFile);
        setResult(null);
      }
    }
  }, []);

  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setResult(null);
    setTotalRecords(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
        setTotalRecords(Math.max(0, lines.length - 1)); // 헤더 제외
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    const csvContent = await file.text();

    if (importType === "users") {
      // 청크 업로드 + 진행률 다이얼로그
      const chunks = splitCsvIntoChunks(csvContent, CHUNK_SIZE);

      setProgressProcessed(0);
      setProgressErrors(0);
      setProgressComplete(false);
      setProgressOpen(true);

      let processed = 0;
      let errorCount = 0;

      for (const chunk of chunks) {
        const response = await importUsersChunk(chunk);
        if (response.success && response.data) {
          processed += response.data.processed;
          errorCount += response.data.errors.length;
        }
        setProgressProcessed(processed);
        setProgressErrors(errorCount);
      }

      setProgressComplete(true);
      setResult({
        success: true,
        message: `${processed}명의 사용자가 등록되었습니다`,
        created: processed,
      });
    } else {
      // 기존 방식 (apps, subscriptions)
      startTransition(async () => {
        let response;
        switch (importType) {
          case "apps":
            response = await bulkImportApps(csvContent);
            break;
          case "subscriptions":
            response = await bulkImportSubscriptions(csvContent);
            break;
          default:
            return;
        }

        setResult({
          success: response.success,
          message: response.message || "",
          created: response.data?.created,
          errors: response.data?.errors,
        });
      });
    }
  };

  const downloadTemplate = () => {
    let template: string;
    let filename: string;

    switch (importType) {
      case "apps":
        template = APP_TEMPLATE;
        filename = "apps_template.csv";
        break;
      case "subscriptions":
        template = SUBSCRIPTION_TEMPLATE;
        filename = "subscriptions_template.csv";
        break;
      case "users":
        template = USER_TEMPLATE;
        filename = "users_template.csv";
        break;
    }

    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isUploading = isPending || (progressOpen && !progressComplete);

  return (
    <>
      <CsvUploadProgressDialog
        open={progressOpen}
        total={totalRecords ?? 0}
        processed={progressProcessed}
        errorCount={progressErrors}
        isComplete={progressComplete}
        onClose={() => {
          setProgressOpen(false);
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t("title")}
          </CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* 등록 유형 선택 */}
          <div className="space-y-2">
            <Label>{t("importType")}</Label>
            <Select
              value={importType}
              onValueChange={(value) => {
                setImportType(value as ImportType);
                setFile(null);
                setTotalRecords(null);
                setResult(null);
              }}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="apps">{t("importTypeApps")}</SelectItem>
                <SelectItem value="subscriptions">
                  {t("importTypeSubscriptions")}
                </SelectItem>
                <SelectItem value="users">{t("importTypeUsers")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 템플릿 다운로드 */}
          <div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              {t("downloadTemplate")}
            </Button>
            <p className="text-muted-foreground mt-2 text-sm">
              {t("templateDescription")}
            </p>
          </div>

          {/* 파일 업로드 영역 */}
          <div
            className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
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
            <p className="mb-1 font-medium">{t("uploadArea.dragOrClick")}</p>
            <p className="text-muted-foreground text-sm">
              {t("uploadArea.csvOnly")}
            </p>
          </div>

          {/* 선택된 파일 표시 */}
          {file && (
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{file.name}</p>
                {totalRecords !== null && (
                  <Badge variant="secondary">
                    {t("recordsDetected", { count: totalRecords })}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm">
                {(file.size / 1024).toFixed(2)} KB
              </p>
            </div>
          )}

          {/* 업로드 버튼 */}
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("processing")}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                {t("upload")}
              </>
            )}
          </Button>

          {/* 결과 표시 */}
          {result && !progressOpen && (
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <AlertTitle>
                {result.success ? t("result.success") : t("result.error")}
              </AlertTitle>
              <AlertDescription>
                <p>{result.message}</p>
                {result.created !== undefined && result.created > 0 && (
                  <p className="mt-1">
                    {t("result.itemsCreated", { count: result.created })}
                  </p>
                )}
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium">
                      {t("result.validationErrors")}
                    </p>
                    <ul className="mt-1 list-inside list-disc text-sm">
                      {result.errors.slice(0, 5).map((error, i) => (
                        <li key={i}>{error.message}</li>
                      ))}
                      {result.errors.length > 5 && (
                        <li>
                          {t("result.moreErrors", {
                            count: result.errors.length - 5,
                          })}
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* 필드 설명 */}
          <Tabs defaultValue="apps">
            <TabsList>
              <TabsTrigger value="apps">{t("fields.apps")}</TabsTrigger>
              <TabsTrigger value="subscriptions">
                {t("fields.subscriptions")}
              </TabsTrigger>
              <TabsTrigger value="users">{t("fields.users")}</TabsTrigger>
            </TabsList>
            <TabsContent value="apps" className="mt-4">
              <div className="text-sm">
                <p className="mb-2 font-medium">{t("fields.appsTitle")}</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>
                    <code>name</code> {t("fields.appsName")}
                  </li>
                  <li>
                    <code>category</code> {t("fields.appsCategory")}
                  </li>
                  <li>
                    <code>vendor</code> {t("fields.appsVendor")}
                  </li>
                  <li>
                    <code>description</code> {t("fields.appsDescription")}
                  </li>
                  <li>
                    <code>website</code> {t("fields.appsWebsite")}
                  </li>
                </ul>
              </div>
            </TabsContent>
            <TabsContent value="subscriptions" className="mt-4">
              <div className="text-sm">
                <p className="mb-2 font-medium">
                  {t("fields.subscriptionsTitle")}
                </p>
                <ul className="text-muted-foreground space-y-1">
                  <li>
                    <code>appName</code> {t("fields.subscriptionsAppName")}
                  </li>
                  <li>
                    <code>planName</code> {t("fields.subscriptionsPlanName")}
                  </li>
                  <li>
                    <code>billingCycle</code>{" "}
                    {t("fields.subscriptionsBillingCycle")}
                  </li>
                  <li>
                    <code>price</code> {t("fields.subscriptionsPrice")}
                  </li>
                  <li>
                    <code>renewalDate</code>{" "}
                    {t("fields.subscriptionsRenewalDate")}
                  </li>
                  <li>
                    <code>seats</code> {t("fields.subscriptionsSeats")}
                  </li>
                </ul>
              </div>
            </TabsContent>
            <TabsContent value="users" className="mt-4">
              <div className="text-sm">
                <p className="mb-2 font-medium">{t("fields.usersTitle")}</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>
                    <code>email</code> {t("fields.usersEmail")}
                  </li>
                  <li>
                    <code>role</code> {t("fields.usersRole")}
                  </li>
                  <li>
                    <code>name</code> {t("fields.usersName")}
                  </li>
                  <li>
                    <code>department</code> {t("fields.usersDepartment")}
                  </li>
                  <li>
                    <code>jobTitle</code> {t("fields.usersJobTitle")}
                  </li>
                  <li>
                    <code>employeeId</code> {t("fields.usersEmployeeId")}
                  </li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </>
  );
}
