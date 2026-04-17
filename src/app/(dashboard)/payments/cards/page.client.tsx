// src/app/(dashboard)/payments/cards/page.client.tsx
"use client";

import { CardList, CardRegisterForm } from "@/components/cards";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

interface CorporateCardData {
  id: string;
  cardCd: string;
  cardNo: string;
  cardLast4: string | null;
  cardNm: string | null;
  isActive: boolean;
  lastSyncAt: Date | null;
  lastError: string | null;
  createdAt: Date;
  assignment?: {
    type: "none" | "team" | "user";
    teamId: string | null;
    teamName: string | null;
    userId: string | null;
    userName: string | null;
    userTeamName: string | null;
  };
}

interface TeamOption {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  name: string | null;
  email: string;
  teamId: string | null;
  teamName: string | null;
}

interface CardsPageClientProps {
  initialCards: CorporateCardData[];
  isAdmin?: boolean;
  teams?: TeamOption[];
  users?: UserOption[];
}

export function CardsPageClient({
  initialCards,
  isAdmin,
  teams = [],
  users = [],
}: CardsPageClientProps) {
  const t = useTranslations("cards.info");
  const router = useRouter();

  const handleRefresh = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <>
      {/* 안내 메시지 */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>{t("title")}</AlertTitle>
        <AlertDescription>{t("description")}</AlertDescription>
      </Alert>

      {/* 카드 목록 (ADMIN일 때만 등록 버튼 표시) */}
      <CardList
        cards={initialCards}
        onRefresh={handleRefresh}
        registerButton={
          isAdmin ? (
            <CardRegisterForm
              onSuccess={handleRefresh}
              teams={teams}
              users={users}
            />
          ) : undefined
        }
      />
    </>
  );
}
