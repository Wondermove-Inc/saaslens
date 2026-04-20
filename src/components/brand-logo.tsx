interface BrandLogoProps {
  size?: number;
}

export function BrandLogo({ size = 32 }: BrandLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="brand-bg"
          x1="0"
          y1="0"
          x2="1"
          y2="1"
          gradientUnits="objectBoundingBox"
        >
          <stop offset="0%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#4338ca" />
        </linearGradient>
      </defs>

      {/* 배경 */}
      <rect x="4" y="4" width="72" height="72" rx="18" fill="url(#brand-bg)" />

      {/* 레이어드 카드 — opacity 높여서 가시성 개선 */}
      {/* 뒤 카드 */}
      <rect
        x="18"
        y="33"
        width="24"
        height="22"
        rx="5"
        fill="rgba(255,255,255,0.30)"
        stroke="rgba(255,255,255,0.70)"
        strokeWidth="1.5"
      />
      {/* 중간 카드 */}
      <rect
        x="26"
        y="23"
        width="24"
        height="22"
        rx="5"
        fill="rgba(255,255,255,0.55)"
        stroke="rgba(255,255,255,0.85)"
        strokeWidth="1.5"
      />
      {/* 앞 카드 (불투명 흰색) */}
      <rect x="34" y="13" width="24" height="22" rx="5" fill="white" />

      {/* 돋보기 — stroke 굵게, 크기 키워서 선명도 개선 */}
      <circle
        cx="51"
        cy="51"
        r="11"
        fill="none"
        stroke="white"
        strokeWidth="3.5"
      />
      <line
        x1="59"
        y1="59"
        x2="67"
        y2="67"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
