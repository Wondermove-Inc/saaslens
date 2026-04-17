import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * KPI 카드 4개를 렌더링하는 스켈레톤 컴포넌트
 * 실제 KPI 카드 레이아웃과 동일한 구조를 가집니다
 */
export function KpiCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="transition-all">
          <CardContent className="flex h-full flex-col justify-between px-4 py-1.5">
            <div className="flex items-center gap-2">
              {/* 아이콘 placeholder */}
              <Skeleton className="h-8 w-8 rounded-lg" />
              {/* 라벨 */}
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="mt-2">
              {/* 값 (큰 숫자) */}
              <Skeleton className="h-8 w-24" />
              {/* 서브텍스트 */}
              <Skeleton className="mt-1 h-3 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * 차트 카드 스켈레톤 (MonthlyTrendChart 로딩 상태용)
 * 헤더, 필터 영역, 차트 영역으로 구성됨
 */
export function ChartCardSkeleton() {
  return (
    <Card className="border-border/50 min-h-[450px] rounded-sm shadow-sm">
      <CardHeader className="border-b pb-4">
        <div className="flex items-center justify-between">
          <div>
            {/* 타이틀 */}
            <Skeleton className="h-6 w-32" />
            {/* 설명 */}
            <Skeleton className="mt-2 h-4 w-48" />
          </div>
          <div className="flex items-center gap-2">
            {/* 필터 토글 버튼들 */}
            <Skeleton className="h-9 w-[130px]" />
            <Skeleton className="h-9 w-[130px]" />
            <Skeleton className="h-9 w-[70px]" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* 차트 영역 */}
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );
}

/**
 * 테이블 카드 스켈레톤 (앱별 비용 분포, 비용 이상 감지 섹션용)
 * rowCount prop으로 행 개수 조절 가능
 */
export function TableCardSkeleton({
  rowCount = 5,
  title = true,
}: {
  rowCount?: number;
  title?: boolean;
}) {
  return (
    <Card className="border-border/50 min-h-[450px] rounded-sm shadow-sm">
      {title && (
        <CardHeader className="border-b pb-4">
          <div>
            {/* 타이틀 */}
            <Skeleton className="h-6 w-32" />
            {/* 설명 */}
            <Skeleton className="mt-2 h-4 w-48" />
          </div>
        </CardHeader>
      )}
      <CardContent className="pt-6">
        <div className="space-y-3">
          {Array.from({ length: rowCount }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              {/* 아이콘/체크박스 */}
              <Skeleton className="h-8 w-8 rounded-lg" />
              {/* 이름 */}
              <Skeleton className="h-4 w-32" />
              {/* Badge */}
              <Skeleton className="h-5 w-16" />
              {/* 금액 */}
              <Skeleton className="ml-auto h-4 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 필터 바 스켈레톤 (TeamUserFilterRouter 로딩 상태용)
 * 팀 선택, 사용자 선택 필터 placeholder
 */
export function FilterBarSkeleton() {
  return (
    <div className="flex items-center gap-2">
      {/* 팀 선택 */}
      <Skeleton className="h-9 w-[180px]" />
      {/* 사용자 선택 */}
      <Skeleton className="h-9 w-[180px]" />
    </div>
  );
}

/**
 * SeatAnalysisSection 전체 스켈레톤
 * 낭비 분석 + 최적화 제안 섹션 포함
 */
export function SeatAnalysisSkeleton() {
  return (
    <div className="space-y-6">
      {/* 구분선 */}
      <Separator className="my-6" />

      {/* 낭비 분석 섹션 헤더 */}
      <div>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      {/* 낭비 KPI 카드 3개 */}
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-border/50 shadow-sm">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 낭비 테이블 */}
      <TableCardSkeleton rowCount={5} title={false} />

      {/* 최적화 제안 섹션 헤더 */}
      <div className="mt-8">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-2 h-4 w-64" />
      </div>

      {/* 최적화 KPI 카드 3개 */}
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-border/50 shadow-sm">
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-2 h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 최적화 테이블 */}
      <TableCardSkeleton rowCount={5} title={false} />
    </div>
  );
}

/**
 * 전체 페이지 스켈레톤 (loading.tsx에서 사용)
 * 모든 스켈레톤 컴포넌트를 조합하여 전체 페이지 레이아웃 구성
 */
export function CostReportPageSkeleton() {
  return (
    <div className="space-y-4">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-9 w-28" />
      </div>

      {/* KPI 카드 */}
      <KpiCardsSkeleton />

      {/* 필터 바 */}
      <FilterBarSkeleton />

      {/* 월별 비용 추이 차트 */}
      <ChartCardSkeleton />

      {/* 앱별 비용 분포 + 비용 이상 감지 */}
      <div className="grid gap-4 md:grid-cols-2">
        <TableCardSkeleton rowCount={5} />
        <TableCardSkeleton rowCount={5} />
      </div>

      {/* Seat 분석 섹션 */}
      <SeatAnalysisSkeleton />
    </div>
  );
}
