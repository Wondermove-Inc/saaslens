// src/components/reports/export/report-export-button.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, File, FileSpreadsheet, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ExportFormat, UseReportExportOptions } from "./types";
import { useReportExport } from "./use-report-export";

const formatIcons: Record<ExportFormat, typeof FileText> = {
  csv: FileText,
  excel: FileSpreadsheet,
  pdf: File,
};

const formatLabelKeys: Record<ExportFormat, string> = {
  csv: "csvLabel",
  excel: "excelLabel",
  pdf: "pdfLabel",
};

interface ReportExportButtonProps extends UseReportExportOptions {
  formats: ExportFormat[];
  variant?: "outline" | "default" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ReportExportButton({
  loadData,
  formats,
  variant = "outline",
  size,
}: ReportExportButtonProps) {
  const t = useTranslations("reports.export");
  const { isExporting, handleExport } = useReportExport({ loadData });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} disabled={isExporting}>
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? t("exporting") : t("button")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {formats.map((format) => {
          const Icon = formatIcons[format];
          return (
            <DropdownMenuItem key={format} onClick={() => handleExport(format)}>
              <Icon className="mr-2 h-4 w-4" />
              {t(formatLabelKeys[format])}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
