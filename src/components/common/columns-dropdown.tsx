"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Columns } from "lucide-react";
import { useTranslations } from "next-intl";

export interface ColumnDefinition {
  id: string;
  header: string;
}

interface ColumnsDropdownProps {
  columns: ColumnDefinition[];
  columnVisibility: Record<string, boolean>;
  onColumnVisibilityChange: (columnId: string, visible: boolean) => void;
}

/**
 * 컬럼 가시성 토글 드롭다운 컴포넌트
 * DataTable과 독립적으로 사용 가능
 */
export function ColumnsDropdown({
  columns,
  columnVisibility,
  onColumnVisibilityChange,
}: ColumnsDropdownProps) {
  const t = useTranslations("common.columnsDropdown");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <Columns className="mr-2 h-4 w-4" />
          {t("button")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>{t("label")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={columnVisibility[column.id] !== false}
            onCheckedChange={(checked) =>
              onColumnVisibilityChange(column.id, checked)
            }
          >
            {column.header}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
