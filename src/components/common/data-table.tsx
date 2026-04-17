"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns,
} from "lucide-react";
import * as React from "react";

/**
 * 정렬 방향 타입
 */
export type SortDirection = "asc" | "desc" | null;

/**
 * 컬럼 정의
 */
export interface DataTableColumn<T> {
  id: string;
  header: string | (() => React.ReactNode);
  accessorKey?: keyof T;
  accessorFn?: (row: T) => React.ReactNode;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  visible?: boolean;
  className?: string;
  headerClassName?: string;
}

/**
 * 정렬 상태
 */
export interface SortState {
  columnId: string;
  direction: SortDirection;
}

/**
 * 페이지네이션 상태
 */
export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

/**
 * DataTable Props
 */
interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  getRowId: (row: T) => string;
  // 행 선택
  enableRowSelection?: boolean;
  selectedRows?: Set<string>;
  onSelectedRowsChange?: (selectedRows: Set<string>) => void;
  // 컬럼 가시성
  enableColumnVisibility?: boolean;
  columnVisibility?: Record<string, boolean>;
  onColumnVisibilityChange?: (columnId: string, visible: boolean) => void;
  // 정렬
  enableSorting?: boolean;
  sortState?: SortState | null;
  onSortChange?: (sort: SortState | null) => void;
  // 페이지네이션
  enablePagination?: boolean;
  pagination?: PaginationState;
  onPaginationChange?: (pagination: PaginationState) => void;
  totalCount?: number;
  pageSizeOptions?: number[];
  // 기타
  emptyMessage?: string;
  className?: string;
  isLoading?: boolean;
  hideToolbar?: boolean;
  /** 툴바 왼쪽에 표시할 내용 (예: 필터 버튼). Columns 드롭다운과 같은 행에 배치됨 */
  toolbarLeft?: React.ReactNode;
  /** true면 하단 "1-10 of 10 items" 문구 숨김 (서버 페이지네이션 사용 시 중복 방지) */
  hideFooterItemCount?: boolean;
}

/**
 * 고급 데이터 테이블 컴포넌트
 * - 행 선택 (체크박스)
 * - 컬럼 가시성 토글
 * - 정렬
 * - 페이지네이션
 */
export function DataTable<T>({
  data,
  columns,
  getRowId,
  // 행 선택
  enableRowSelection = false,
  selectedRows = new Set(),
  onSelectedRowsChange,
  // 컬럼 가시성
  enableColumnVisibility = false,
  columnVisibility = {},
  onColumnVisibilityChange,
  // 정렬
  enableSorting = false,
  sortState = null,
  onSortChange,
  // 페이지네이션
  enablePagination = false,
  pagination = { pageIndex: 0, pageSize: 10 },
  onPaginationChange,
  totalCount,
  pageSizeOptions = [10, 20, 30, 50, 100],
  // 기타
  emptyMessage = "데이터가 없습니다",
  className,
  isLoading = false,
  hideToolbar = false,
  toolbarLeft,
  hideFooterItemCount = false,
}: DataTableProps<T>) {
  // 가시적인 컬럼 필터링
  const visibleColumns = React.useMemo(() => {
    return columns.filter((col) => {
      if (!enableColumnVisibility) return col.visible !== false;
      return columnVisibility[col.id] !== false;
    });
  }, [columns, columnVisibility, enableColumnVisibility]);

  // 전체 선택 상태 계산
  const allRowIds = React.useMemo(() => data.map(getRowId), [data, getRowId]);
  const isAllSelected =
    allRowIds.length > 0 && allRowIds.every((id) => selectedRows.has(id));
  const isSomeSelected = allRowIds.some((id) => selectedRows.has(id));

  // 전체 선택/해제 핸들러
  const handleSelectAll = (checked: boolean) => {
    if (!onSelectedRowsChange) return;
    if (checked) {
      onSelectedRowsChange(new Set(allRowIds));
    } else {
      onSelectedRowsChange(new Set());
    }
  };

  // 개별 행 선택/해제 핸들러
  const handleSelectRow = (rowId: string, checked: boolean) => {
    if (!onSelectedRowsChange) return;
    const newSelected = new Set(selectedRows);
    if (checked) {
      newSelected.add(rowId);
    } else {
      newSelected.delete(rowId);
    }
    onSelectedRowsChange(newSelected);
  };

  // 정렬 핸들러
  const handleSort = (columnId: string) => {
    if (!onSortChange) return;
    if (sortState?.columnId === columnId) {
      if (sortState.direction === "asc") {
        onSortChange({ columnId, direction: "desc" });
      } else if (sortState.direction === "desc") {
        onSortChange(null);
      } else {
        onSortChange({ columnId, direction: "asc" });
      }
    } else {
      onSortChange({ columnId, direction: "asc" });
    }
  };

  // 정렬 아이콘 렌더링
  const renderSortIcon = (columnId: string) => {
    if (sortState?.columnId !== columnId) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    if (sortState.direction === "asc") {
      return <ArrowUp className="ml-2 h-4 w-4" />;
    }
    if (sortState.direction === "desc") {
      return <ArrowDown className="ml-2 h-4 w-4" />;
    }
    return <ArrowUpDown className="ml-2 h-4 w-4" />;
  };

  // 페이지네이션 계산
  const total = totalCount ?? data.length;
  const totalPages = Math.ceil(total / pagination.pageSize);
  const currentPage = pagination.pageIndex + 1;
  const startItem = pagination.pageIndex * pagination.pageSize + 1;
  const endItem = Math.min(
    (pagination.pageIndex + 1) * pagination.pageSize,
    total
  );

  // 셀 내용 렌더링
  const renderCellContent = (
    column: DataTableColumn<T>,
    row: T
  ): React.ReactNode => {
    if (column.cell) {
      return column.cell(row);
    }
    if (column.accessorFn) {
      return column.accessorFn(row);
    }
    if (column.accessorKey) {
      return String(row[column.accessorKey] ?? "");
    }
    return null;
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* 상단 툴바 (매칭상태 필터 등 toolbarLeft + Columns) */}
      {(enableColumnVisibility || toolbarLeft) && !hideToolbar && (
        <div className="flex items-center justify-between gap-4 rounded-sm">
          {toolbarLeft ? (
            <div className="flex flex-wrap items-center gap-2">
              {toolbarLeft}
            </div>
          ) : (
            <div />
          )}
          {enableColumnVisibility && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Columns className="mr-2 h-4 w-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>표시 컬럼</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {columns
                  .filter((column) => typeof column.header === "string")
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={columnVisibility[column.id] !== false}
                      onCheckedChange={(checked) =>
                        onColumnVisibilityChange?.(column.id, checked)
                      }
                    >
                      {column.header as string}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* 테이블 */}
      <Card className="border-border/50 rounded-sm shadow-sm transition-shadow hover:shadow-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted/50">
                {enableRowSelection && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={isAllSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="전체 선택"
                      {...(isSomeSelected && !isAllSelected
                        ? { "data-state": "indeterminate" }
                        : {})}
                    />
                  </TableHead>
                )}
                {visibleColumns.map((column) => {
                  const headerContent =
                    typeof column.header === "function"
                      ? column.header()
                      : column.header;
                  return (
                    <TableHead
                      key={column.id}
                      className={cn(column.headerClassName)}
                    >
                      {enableSorting && column.sortable ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="data-[state=open]:bg-accent -ml-3 h-8"
                          onClick={() => handleSort(column.id)}
                        >
                          {headerContent}
                          {renderSortIcon(column.id)}
                        </Button>
                      ) : (
                        headerContent
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      visibleColumns.length + (enableRowSelection ? 1 : 0)
                    }
                    className="h-24 text-center"
                  >
                    로딩 중...
                  </TableCell>
                </TableRow>
              ) : data.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={
                      visibleColumns.length + (enableRowSelection ? 1 : 0)
                    }
                    className="h-24 text-center"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                data.map((row) => {
                  const rowId = getRowId(row);
                  const isSelected = selectedRows.has(rowId);
                  return (
                    <TableRow
                      key={rowId}
                      data-state={isSelected ? "selected" : undefined}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      {enableRowSelection && (
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) =>
                              handleSelectRow(rowId, !!checked)
                            }
                            aria-label="행 선택"
                          />
                        </TableCell>
                      )}
                      {visibleColumns.map((column) => (
                        <TableCell key={column.id} className={column.className}>
                          {renderCellContent(column, row)}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          {/* 하단 페이지네이션 및 선택 정보 (서버 페이지네이션 사용 시 hideFooterItemCount로 푸터 전체 숨김) */}
          {(!hideFooterItemCount || enablePagination) && (
            <div className="flex items-center justify-between border-t px-4 py-4">
              {!hideFooterItemCount && (
                <div className="text-muted-foreground flex-1 text-sm">
                  {enableRowSelection ? (
                    <span>
                      {selectedRows.size} of {total} row(s) selected.
                    </span>
                  ) : (
                    <span>
                      {startItem}-{endItem} of {total} items
                    </span>
                  )}
                </div>
              )}
              {hideFooterItemCount && !enablePagination && (
                <div className="flex-1" />
              )}

              {enablePagination && (
                <div className="flex items-center space-x-6 lg:space-x-8">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">Rows per page</p>
                    <Select
                      value={pagination.pageSize.toString()}
                      onValueChange={(value) =>
                        onPaginationChange?.({
                          pageIndex: 0,
                          pageSize: Number(value),
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-[70px]">
                        <SelectValue
                          placeholder={pagination.pageSize.toString()}
                        />
                      </SelectTrigger>
                      <SelectContent side="top">
                        {pageSizeOptions.map((size) => (
                          <SelectItem key={size} value={size.toString()}>
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex w-[100px] items-center justify-center text-sm font-medium">
                      Page {currentPage} of {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        onPaginationChange?.({
                          ...pagination,
                          pageIndex: pagination.pageIndex - 1,
                        })
                      }
                      disabled={pagination.pageIndex <= 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        onPaginationChange?.({
                          ...pagination,
                          pageIndex: pagination.pageIndex + 1,
                        })
                      }
                      disabled={currentPage >= totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * useDataTable 훅 - 테이블 상태 관리
 */
export function useDataTable({
  defaultPageSize = 10,
}: {
  defaultPageSize?: number;
} = {}) {
  const [selectedRows, setSelectedRows] = React.useState<Set<string>>(
    new Set()
  );
  const [columnVisibility, setColumnVisibility] = React.useState<
    Record<string, boolean>
  >({});
  const [sortState, setSortState] = React.useState<SortState | null>(null);
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: defaultPageSize,
  });

  const handleColumnVisibilityChange = React.useCallback(
    (columnId: string, visible: boolean) => {
      setColumnVisibility((prev) => ({
        ...prev,
        [columnId]: visible,
      }));
    },
    []
  );

  const clearSelection = React.useCallback(() => {
    setSelectedRows(new Set());
  }, []);

  const resetPagination = React.useCallback(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, []);

  return {
    selectedRows,
    setSelectedRows,
    columnVisibility,
    setColumnVisibility,
    handleColumnVisibilityChange,
    sortState,
    setSortState,
    pagination,
    setPagination,
    clearSelection,
    resetPagination,
  };
}
