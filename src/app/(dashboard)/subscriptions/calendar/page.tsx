// src/app/(dashboard)/subscriptions/calendar/page.tsx
import { getRenewalCalendar } from "@/actions/subscriptions";
import { auth } from "@/lib/auth";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { RenewalCalendarPageClient } from "./page.client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("subscriptions.calendar");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

interface PageProps {
  searchParams: Promise<{
    year?: string;
    month?: string;
  }>;
}

export default async function RenewalCalendarPage({ searchParams }: PageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const params = await searchParams;

  // URL에서 연/월 파라미터 가져오기, 없으면 현재 날짜 사용
  const today = new Date();
  const year = params.year ? parseInt(params.year, 10) : today.getFullYear();
  const month = params.month
    ? parseInt(params.month, 10)
    : today.getMonth() + 1;

  // 유효성 검증
  const validYear = year >= 2020 && year <= 2100 ? year : today.getFullYear();
  const validMonth = month >= 1 && month <= 12 ? month : today.getMonth() + 1;

  // 초기 캘린더 데이터 로드
  const calendarData = await getRenewalCalendar(validYear, validMonth);

  const t = await getTranslations("subscriptions.calendar");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>

      <RenewalCalendarPageClient initialData={calendarData} />
    </div>
  );
}
