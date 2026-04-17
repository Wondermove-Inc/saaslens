"use client";

import {
  Bell,
  Building,
  ChevronRight,
  CreditCard,
  Download,
  Info,
  LucideIcon,
  Monitor,
  ScanSearch,
  Settings,
  Shield,
  Upload,
  User,
  Users,
  type LucideProps,
} from "lucide-react";
import Link from "next/link";
import { ForwardRefExoticComponent, RefAttributes } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Icon name mapping for serializable props from Server Components
const iconMap: Record<
  string,
  ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
  >
> = {
  user: User,
  users: Users,
  settings: Settings,
  bell: Bell,
  shield: Shield,
  "credit-card": CreditCard,
  building: Building,
  monitor: Monitor,
  upload: Upload,
  "scan-search": ScanSearch,
  info: Info,
  download: Download,
};

interface PageHeaderAction {
  label: string;
  /** Icon name string (e.g., "info", "download") - use this from Server Components */
  iconName?: keyof typeof iconMap;
  /** @deprecated Use iconName instead when calling from Server Components */
  icon?: LucideIcon;
  variant?: "default" | "outline" | "secondary" | "ghost" | "destructive";
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}

interface PageHeaderBreadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderBadge {
  label: string;
  /** Icon name string (e.g., "user", "users") - use this from Server Components */
  iconName?: keyof typeof iconMap;
  /** @deprecated Use iconName instead when calling from Server Components */
  icon?: LucideIcon;
}

interface PageHeaderProps {
  title: string;
  /** @deprecated description is no longer rendered */
  description?: string;
  backHref?: string;
  showBack?: boolean;
  actions?: PageHeaderAction[];
  badge?: PageHeaderBadge;
  breadcrumbs?: PageHeaderBreadcrumb[];
  className?: string;
  children?: React.ReactNode;
}

/**
 * 페이지 헤더 컴포넌트
 * - 제목 + 설명
 * - 뒤로가기 버튼 (옵션)
 * - 액션 버튼 그룹 (Discard, Save Draft, Publish 등)
 * - 배지 (카테고리 표시, 옵션)
 * - 브레드크럼 (경로 표시, 옵션)
 */
export function PageHeader({
  title,
  actions = [],
  badge,
  breadcrumbs,
  className,
  children,
}: PageHeaderProps) {
  // Support both iconName (from Server Components) and icon (from Client Components)
  const BadgeIcon = badge?.iconName ? iconMap[badge.iconName] : badge?.icon;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="text-muted-foreground flex items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <span key={index} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="h-3.5 w-3.5" />}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  className="hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Badge */}
      {badge && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            {BadgeIcon && <BadgeIcon className="h-3.5 w-3.5" />}
            {badge.label}
          </Badge>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        </div>
        {actions.length > 0 && (
          <div className="flex items-center gap-2">
            {actions.map((action, index) => {
              // Support both iconName (from Server Components) and icon (from Client Components)
              const ActionIcon = action.iconName
                ? iconMap[action.iconName]
                : action.icon;
              const buttonContent = (
                <>
                  {ActionIcon && <ActionIcon className="mr-2 h-4 w-4" />}
                  {action.label}
                </>
              );

              if (action.href) {
                return (
                  <Button
                    key={index}
                    variant={action.variant || "default"}
                    disabled={action.disabled}
                    asChild
                  >
                    <Link href={action.href}>{buttonContent}</Link>
                  </Button>
                );
              }

              return (
                <Button
                  key={index}
                  variant={action.variant || "default"}
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  {buttonContent}
                </Button>
              );
            })}
          </div>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * 폼 페이지 헤더 컴포넌트
 * - Discard, Save Draft, Publish 버튼 패턴
 */
interface FormPageHeaderProps {
  title: string;
  onDiscard?: () => void;
  onSaveDraft?: () => void;
  onPublish?: () => void;
  isSubmitting?: boolean;
  isDraft?: boolean;
  className?: string;
}

export function FormPageHeader({
  title,
  onDiscard,
  onSaveDraft,
  onPublish,
  isSubmitting = false,
  isDraft = true,
  className,
}: FormPageHeaderProps) {
  const actions: PageHeaderAction[] = [];

  if (onDiscard) {
    actions.push({
      label: "취소",
      variant: "ghost",
      onClick: onDiscard,
      disabled: isSubmitting,
    });
  }

  if (onSaveDraft && isDraft) {
    actions.push({
      label: "임시 저장",
      variant: "outline",
      onClick: onSaveDraft,
      disabled: isSubmitting,
    });
  }

  if (onPublish) {
    actions.push({
      label: isDraft ? "등록" : "저장",
      variant: "default",
      onClick: onPublish,
      disabled: isSubmitting,
    });
  }

  return <PageHeader title={title} actions={actions} className={className} />;
}
