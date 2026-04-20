// src/components/cards/card-list.tsx
"use client";

import type {
  CardAssignment,
  CardTransactionSummary,
} from "@/actions/corporate-cards";
import {
  deleteCorporateCard,
  syncCardTransactions,
} from "@/actions/corporate-cards";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CARD_COMPANIES,
  type CardCompanyCode,
} from "@/lib/services/hyphen/types";
import { formatDistanceToNow } from "date-fns";
import { enUS, ko } from "date-fns/locale";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  CreditCard,
  Eye,
  Loader2,
  RotateCcw,
  Trash2,
  User,
  Users,
  XCircle,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { CardFailureBadge } from "./card-failure-badge";
import { SyncDialog } from "./sync-dialog";

interface CorporateCardData {
  id: string;
  cardCd: string;
  cardNo: string;
  cardLast4: string | null;
  cardNm: string | null;
  isActive: boolean;
  lastSyncAt: Date | null;
  lastError: string | null;
  consecutiveFailCount?: number;
  createdAt: Date;
  _count?: { transactions: number };
  summary?: CardTransactionSummary;
  assignment?: CardAssignment;
}

interface CardListProps {
  cards: CorporateCardData[];
  onRefresh: () => void;
  registerButton?: React.ReactNode;
}

export function CardList({ cards, onRefresh, registerButton }: CardListProps) {
  const t = useTranslations("cards.list");
  const locale = useLocale();
  const dateLocale = locale === "en" ? enUS : ko;
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleRetry = async (cardId: string) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    const fmt = (d: Date) => d.toISOString().slice(0, 10).replace(/-/g, "");
    await handleSync(cardId, fmt(startDate), fmt(endDate));
  };

  const handleSync = async (
    cardId: string,
    startDate: string,
    endDate: string
  ) => {
    setSyncingId(cardId);
    startTransition(async () => {
      try {
        const result = await syncCardTransactions(cardId, {
          startDate,
          endDate,
        });
        if (result.success) {
          toast.success(
            t("sync.success", {
              created: result.data?.created || 0,
              updated: result.data?.updated || 0,
            })
          );
          onRefresh();
        } else {
          toast.error(result.message || t("sync.error"));
        }
      } catch {
        toast.error(t("sync.errorGeneric"));
      } finally {
        setSyncingId(null);
      }
    });
  };

  const handleDelete = async (cardId: string) => {
    setDeletingId(cardId);
    startTransition(async () => {
      try {
        const result = await deleteCorporateCard(cardId);
        if (result.success) {
          toast.success(t("deleteSuccess"));
          onRefresh();
        } else {
          toast.error(result.message || t("deleteError"));
        }
      } catch {
        toast.error(t("deleteErrorGeneric"));
      } finally {
        setDeletingId(null);
      }
    });
  };

  const getCardCompanyName = (code: string) => {
    return CARD_COMPANIES[code as CardCompanyCode] || code;
  };

  const getSyncStatus = (card: CorporateCardData) => {
    const transactionCount = card._count?.transactions ?? 0;

    if (card.lastError) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          {t("syncStatus.error")}
        </Badge>
      );
    }
    if (card.lastSyncAt) {
      return (
        <Badge variant="secondary" className="gap-1">
          <CheckCircle className="h-3 w-3" />
          {t("syncStatus.synced", { count: transactionCount.toLocaleString() })}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1">
        <Clock className="h-3 w-3" />
        {t("syncStatus.pending")}
      </Badge>
    );
  };

  const getClassificationStatus = (card: CorporateCardData) => {
    const { summary } = card;
    if (!summary || summary.totalCount === 0) {
      return <span className="text-muted-foreground text-sm">-</span>;
    }

    return (
      <div className="flex flex-wrap gap-1">
        {summary.saasMatchedCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            SaaS {summary.saasMatchedCount}
          </Badge>
        )}
        {summary.nonSaaSCount > 0 && (
          <Badge variant="outline" className="text-xs">
            Non {summary.nonSaaSCount}
          </Badge>
        )}
        {summary.unmatchedCount > 0 && (
          <Badge variant="destructive" className="gap-1 text-xs">
            <AlertCircle className="h-3 w-3" />
            {summary.unmatchedCount}
          </Badge>
        )}
      </div>
    );
  };

  const getAssignmentStatus = (card: CorporateCardData) => {
    const { assignment } = card;
    if (!assignment || assignment.type === "none") {
      return (
        <span className="text-muted-foreground text-sm">
          {t("assignment.none")}
        </span>
      );
    }

    if (assignment.type === "user") {
      return (
        <div className="flex items-center gap-1">
          <User className="text-muted-foreground h-3 w-3" />
          <span className="text-sm">{assignment.userName}</span>
          {assignment.userTeamName && (
            <span className="text-muted-foreground text-xs">
              ({assignment.userTeamName})
            </span>
          )}
        </div>
      );
    }

    // team
    return (
      <div className="flex items-center gap-1">
        <Users className="text-muted-foreground h-3 w-3" />
        <span className="text-sm">{assignment.teamName}</span>
      </div>
    );
  };

  if (cards.length === 0) {
    return (
      <>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{t("title")}</CardTitle>
            <CardDescription>{t("description")}</CardDescription>
          </div>
          {registerButton}
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <CreditCard className="text-muted-foreground mb-4 h-12 w-12" />
          <h3 className="mb-2 text-sm font-medium">{t("empty")}</h3>
          <p className="text-muted-foreground text-sm">
            {t("emptyDescription")}
          </p>
        </CardContent>
      </>
    );
  }

  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{t("title")}</CardTitle>
          <CardDescription>{t("descriptionWithSync")}</CardDescription>
        </div>
        {registerButton}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.cardCompany")}</TableHead>
              <TableHead>{t("columns.cardNumber")}</TableHead>
              <TableHead>{t("columns.nickname")}</TableHead>
              <TableHead>{t("columns.assignment")}</TableHead>
              <TableHead>{t("columns.sync")}</TableHead>
              <TableHead>{t("columns.saasClassification")}</TableHead>
              <TableHead>{t("columns.lastSync")}</TableHead>
              <TableHead className="text-right">
                {t("columns.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cards.map((card) => (
              <TableRow key={card.id}>
                <TableCell className="font-medium">
                  {getCardCompanyName(card.cardCd)}
                </TableCell>
                <TableCell>
                  <code className="bg-purple-gray rounded-sm px-2 py-1 text-sm">
                    **** {card.cardLast4 || "****"}
                  </code>
                </TableCell>
                <TableCell>{card.cardNm || "-"}</TableCell>
                <TableCell>{getAssignmentStatus(card)}</TableCell>
                <TableCell>
                  <CardFailureBadge
                    lastSyncAt={card.lastSyncAt}
                    lastError={card.lastError}
                    consecutiveFailCount={card.consecutiveFailCount ?? 0}
                  />
                </TableCell>
                <TableCell>{getClassificationStatus(card)}</TableCell>
                <TableCell>
                  {card.lastSyncAt ? (
                    <span className="text-muted-foreground text-sm">
                      {formatDistanceToNow(new Date(card.lastSyncAt), {
                        addSuffix: true,
                        locale: dateLocale,
                      })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {(card._count?.transactions ?? 0) > 0 && (
                      <Button variant="outline" size="sm" asChild>
                        <Link
                          href={`/payments/cards/${card.id}`}
                          title={t("viewDetails")}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="ml-1 hidden sm:inline">
                            {t("details")}
                          </span>
                        </Link>
                      </Button>
                    )}
                    {(card.lastError ||
                      (card.consecutiveFailCount ?? 0) > 0) && (
                      <Button
                        variant="outline"
                        size="sm"
                        title={t("retry")}
                        onClick={() => handleRetry(card.id)}
                        disabled={syncingId === card.id || isPending}
                      >
                        {syncingId === card.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <SyncDialog
                      card={{
                        id: card.id,
                        cardNm: card.cardNm,
                        cardLast4: card.cardLast4,
                        lastSyncAt: card.lastSyncAt,
                      }}
                      onSync={handleSync}
                      isPending={syncingId === card.id}
                      disabled={isPending}
                    />

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={deletingId === card.id || isPending}
                        >
                          {deletingId === card.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            {t("delete.title")}
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            {t("delete.description")}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>
                            {t("delete.cancel")}
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(card.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {t("delete.confirm")}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </>
  );
}
