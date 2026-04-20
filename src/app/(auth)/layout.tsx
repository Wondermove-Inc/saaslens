/**
 * 인증 레이아웃
 * 좌: 보라/핑크 그라디언트 배경 + 브랜드/히어로 텍스트 (중앙)
 * 우: 다크 카드 + 폼 영역
 */
import { getTranslations } from "next-intl/server";
import Image from "next/image";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("auth.brand");

  return (
    <div className="flex min-h-screen flex-col bg-white lg:flex-row">
      {/* ── 좌측 패널: 보라/핑크 그라디언트 + 중앙 텍스트 (데스크톱 전용) ── */}
      <div className="relative hidden p-2 lg:flex lg:flex-1">
        <div className="relative flex w-full flex-col items-center justify-center overflow-hidden rounded-3xl bg-[#8794F6]">
          {/* SVG 배경 (애니메이션 포함) */}
          <object
            data="/sublex-hero.svg"
            type="image/svg+xml"
            className="absolute inset-0 h-full w-full"
            aria-hidden="true"
          />
          {/* 콘텐츠 */}
          <div
            className="relative z-10 flex flex-col items-center gap-6 px-16 text-center"
            style={{ animation: "auth-fade-up 0.6s ease-out 0.1s both" }}
          >
            {/* 브랜드 로고 */}
            <Image
              src="/logo-white.svg"
              alt="saaslens"
              width={240}
              height={38}
              priority
            />

            {/* 히어로 타이틀 */}
            <h1 className="text-[36px] leading-[40px] font-semibold text-white">
              {t("tagline")}
              <br />
              {t("taglineHighlight")}
            </h1>

            {/* 서브텍스트 */}
            <p className="text-sm leading-5 text-white">
              {t("feature1")}, {t("feature2")}, {t("feature3")}
              <br />
              {t("feature4")}로 SaaS 비용을 완벽하게 관리하세요.
            </p>
          </div>
        </div>
      </div>

      {/* ── 우측 패널: 폼 영역 ── */}
      <div
        className="relative flex w-full flex-col items-center justify-center px-14 py-14 lg:w-[520px] lg:shrink-0"
        style={{
          background: "var(--auth-panel-bg)",
          borderLeft: "1px solid var(--auth-border)",
        }}
      >
        {/* 모바일 전용 로고 */}
        <div className="mb-8 flex items-center lg:hidden">
          <Image
            src="/logo-white.svg"
            alt="saaslens"
            width={170}
            height={27}
            priority
          />
        </div>

        <div
          className="w-full max-w-[400px]"
          style={{ filter: "drop-shadow(0px 0px 4px rgba(0,0,0,0.15))" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
