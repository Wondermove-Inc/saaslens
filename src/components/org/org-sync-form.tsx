"use client";
// src/components/org/org-sync-form.tsx

import { syncOrgsFromCSV, syncUsersFromCSV } from "@/actions/org-sync";
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
import { Input } from "@/components/ui/input";
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
  generateOrgCSVTemplate,
  generateUserSyncCSVTemplate,
} from "@/lib/csv-org";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Download,
  FileUp,
  Info,
  Loader2,
  Upload,
  Users,
} from "lucide-react";
import { useCallback, useState, useTransition } from "react";

// ==================== 타입 ====================

interface SyncResult {
  success: boolean;
  message: string;
  created?: number;
  updated?: number;
  errors?: Array<{ row: number; field: string; message: string }>;
}

// ==================== CSV 업로드 패널 ====================

function CsvUploadPanel({
  label,
  icon: Icon,
  template,
  templateFilename,
  onUpload,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  template: string;
  templateFilename: string;
  onUpload: (csvContent: string) => Promise<SyncResult>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (
      dropped &&
      (dropped.type === "text/csv" || dropped.name.endsWith(".csv"))
    ) {
      setFile(dropped);
      setResult(null);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleUpload = () => {
    if (!file) return;
    startTransition(async () => {
      const csvContent = await file.text();
      const res = await onUpload(csvContent);
      setResult(res);
    });
  };

  const downloadTemplate = () => {
    const blob = new Blob([template], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = templateFilename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* 템플릿 다운로드 */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="mr-2 h-4 w-4" />
          템플릿 다운로드
        </Button>
        <span className="text-muted-foreground text-sm">
          CSV 형식 가이드를 참고하세요
        </span>
      </div>

      {/* 드래그 앤 드롭 업로드 영역 */}
      <div
        className={`relative rounded-sm border-2 border-dashed p-8 text-center transition-colors ${
          dragActive
            ? "border-primary bg-purple-tertiary"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
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
        <Icon className="text-muted-foreground mx-auto mb-3 h-10 w-10" />
        <p className="mb-1 font-medium">
          {label} CSV 파일을 드래그하거나 클릭하여 선택
        </p>
        <p className="text-muted-foreground text-sm">CSV 파일만 지원합니다</p>
      </div>

      {/* 선택된 파일 */}
      {file && (
        <div className="bg-purple-gray flex items-center justify-between rounded-sm px-4 py-3">
          <div>
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-muted-foreground text-xs">
              {(file.size / 1024).toFixed(2)} KB
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFile(null);
              setResult(null);
            }}
          >
            제거
          </Button>
        </div>
      )}

      {/* 업로드 버튼 */}
      <Button
        onClick={handleUpload}
        disabled={!file || isPending}
        className="w-full"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            동기화 중...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            동기화 시작
          </>
        )}
      </Button>

      {/* 결과 표시 */}
      {result && (
        <Alert variant={result.success ? "default" : "destructive"}>
          {result.success ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertTitle>{result.success ? "완료" : "오류"}</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>{result.message}</p>
            {result.success &&
              (result.created !== undefined ||
                result.updated !== undefined) && (
                <p className="text-sm">
                  생성 {result.created ?? 0}개 · 업데이트 {result.updated ?? 0}
                  개
                </p>
              )}
            {result.errors && result.errors.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm">
                {result.errors.slice(0, 5).map((err, i) => (
                  <li key={i} className="text-destructive">
                    {err.message}
                  </li>
                ))}
                {result.errors.length > 5 && (
                  <li className="text-muted-foreground">
                    외 {result.errors.length - 5}건의 오류...
                  </li>
                )}
              </ul>
            )}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

// ==================== 메인 컴포넌트 ====================

export function OrgSyncForm() {
  const handleOrgSync = async (csvContent: string): Promise<SyncResult> => {
    const res = await syncOrgsFromCSV(csvContent);
    return {
      success: res.success,
      message: res.message ?? "",
      created: res.data?.created,
      updated: res.data?.updated,
      errors: res.data?.errors,
    };
  };

  const handleUserSync = async (csvContent: string): Promise<SyncResult> => {
    const res = await syncUsersFromCSV(csvContent);
    return {
      success: res.success,
      message: res.message ?? "",
      created: res.data?.created,
      updated: res.data?.updated,
      errors: res.data?.errors,
    };
  };

  return (
    <Tabs defaultValue="csv" className="w-full">
      {/* 연동 방식 선택 탭 */}
      <TabsList className="mb-6 grid w-full grid-cols-3">
        <TabsTrigger value="csv">CSV 파일</TabsTrigger>
        <TabsTrigger value="ad" disabled>
          Active Directory
          <Badge variant="secondary" className="ml-2 text-xs">
            준비 중
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="hr" disabled>
          HR 시스템
          <Badge variant="secondary" className="ml-2 text-xs">
            준비 중
          </Badge>
        </TabsTrigger>
      </TabsList>

      {/* ── Tab 1: CSV 파일 업로드 ── */}
      <TabsContent value="csv" className="space-y-6">
        {/* 권장 순서 안내 배너 */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>권장 업로드 순서</AlertTitle>
          <AlertDescription>
            <div className="mt-2 flex items-center gap-3">
              <span className="bg-primary/10 text-primary rounded-sm px-3 py-1.5 text-sm font-medium">
                Step 1. 조직 구조 CSV 업로드
              </span>
              <ArrowRight className="text-muted-foreground h-4 w-4 shrink-0" />
              <span className="bg-primary/10 text-primary rounded-sm px-3 py-1.5 text-sm font-medium">
                Step 2. 사용자 CSV 업로드
              </span>
            </div>
            <p className="text-muted-foreground mt-2 text-sm">
              조직 구조를 먼저 등록하면 사용자가 정확한 조직명으로 배정됩니다.
              순서가 다르더라도 기능은 정상 동작합니다.
            </p>
          </AlertDescription>
        </Alert>

        {/* 내부 탭: ① 조직 구조 / ② 사용자 연동 */}
        <Tabs defaultValue="org-struct">
          <TabsList className="mb-4">
            <TabsTrigger value="org-struct">① 조직 구조</TabsTrigger>
            <TabsTrigger value="user-sync">② 사용자 연동</TabsTrigger>
          </TabsList>

          <TabsContent value="org-struct">
            <Card className="border-l-primary/50 border-border/50 rounded-sm border-l-4 shadow-sm transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Building2 className="h-4 w-4" />
                  조직 구조 CSV 업로드
                </CardTitle>
                <CardDescription>
                  org_code, parent_code, org_name 컬럼을 포함한 CSV를
                  업로드하세요. 계층 구조는 parent_code로 지정하며, 없으면
                  최상위 조직으로 등록됩니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CsvUploadPanel
                  label="조직 구조"
                  icon={Building2}
                  template={generateOrgCSVTemplate()}
                  templateFilename="org_structure_template.csv"
                  onUpload={handleOrgSync}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="user-sync">
            <Card className="border-l-primary/50 border-border/50 rounded-sm border-l-4 shadow-sm transition-shadow hover:shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4" />
                  사용자 연동 CSV 업로드
                </CardTitle>
                <CardDescription>
                  employee_id, name, email, org_code 컬럼을 포함한 CSV를
                  업로드하세요. email 기준으로 upsert되며, org_code로 조직에
                  자동 배정됩니다.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CsvUploadPanel
                  label="사용자 연동"
                  icon={FileUp}
                  template={generateUserSyncCSVTemplate()}
                  templateFilename="user_sync_template.csv"
                  onUpload={handleUserSync}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </TabsContent>

      {/* ── Tab 2: Active Directory (비활성) ── */}
      <TabsContent value="ad">
        <Card className="border-l-primary/50 border-border/50 rounded-sm border-l-4 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Active Directory / LDAP 연동</CardTitle>
              <Badge variant="secondary">준비 중</Badge>
            </div>
            <CardDescription>
              AD 연동은 추후 업데이트에서 지원 예정입니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">LDAP 서버 URL</Label>
              <Input disabled placeholder="ldap://your-dc.company.com" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Bind DN</Label>
              <Input disabled placeholder="CN=admin,DC=company,DC=com" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Bind 비밀번호</Label>
              <Input type="password" disabled placeholder="••••••••••••" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Base DN</Label>
              <Input disabled placeholder="DC=company,DC=com" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">동기화 주기</Label>
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder="매일 자동 동기화" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">수동</SelectItem>
                  <SelectItem value="DAILY">매일 자동 동기화</SelectItem>
                  <SelectItem value="WEEKLY">매주 자동 동기화</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button disabled variant="outline">
                연결 테스트
              </Button>
              <Button disabled>동기화 시작</Button>
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                AD 연동은 추후 업데이트에서 지원 예정입니다
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Tab 3: HR 시스템 (비활성) ── */}
      <TabsContent value="hr">
        <Card className="border-l-primary/50 border-border/50 rounded-sm border-l-4 shadow-sm transition-shadow hover:shadow-md">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>HR 시스템 연동</CardTitle>
              <Badge variant="secondary">준비 중</Badge>
            </div>
            <CardDescription>
              HR 시스템 연동은 추후 업데이트에서 지원 예정입니다
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">시스템 유형</Label>
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder="HR 시스템 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAP">SAP</SelectItem>
                  <SelectItem value="DOUZONE">더존</SelectItem>
                  <SelectItem value="GROUPWARE">그룹웨어</SelectItem>
                  <SelectItem value="CUSTOM_API">커스텀 API</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">API Endpoint</Label>
              <Input disabled placeholder="https://hr.company.com/api" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">API Key</Label>
              <Input type="password" disabled placeholder="••••••••••••" />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">동기화 주기</Label>
              <Select disabled>
                <SelectTrigger>
                  <SelectValue placeholder="매일 자동 동기화" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MANUAL">수동</SelectItem>
                  <SelectItem value="DAILY">매일 자동 동기화</SelectItem>
                  <SelectItem value="WEEKLY">매주 자동 동기화</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <Button disabled variant="outline">
                연결 테스트
              </Button>
              <Button disabled>동기화 시작</Button>
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                HR 시스템 연동은 추후 업데이트에서 지원 예정입니다
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
