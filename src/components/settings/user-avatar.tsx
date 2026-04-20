// src/components/settings/user-avatar.tsx
"use client";

import Avatar from "boring-avatars";

// 브랜드 컬러 팔레트 (5가지 색상)
const AVATAR_COLORS = ["#0a0310", "#49007e", "#ff005b", "#ff7d10", "#ffb238"];

// 사용 가능한 아바타 변형
type AvatarVariant =
  | "marble"
  | "beam"
  | "pixel"
  | "sunset"
  | "ring"
  | "bauhaus";

interface UserAvatarProps {
  /** 아바타 생성 시드 (이메일 또는 고유 식별자) */
  name: string;
  /** 아바타 크기 (픽셀) */
  size?: number;
  /** 아바타 변형 스타일 */
  variant?: AvatarVariant;
  /** 커스텀 색상 팔레트 (5가지 색상) */
  colors?: string[];
}

/**
 * boring-avatars 라이브러리를 활용한 랜덤 아바타 컴포넌트
 * - 동일한 name에 대해 항상 동일한 아바타 생성 (결정론적)
 * - 다양한 스타일 변형 지원
 */
export function UserAvatar({
  name,
  size = 40,
  variant = "beam",
  colors = AVATAR_COLORS,
}: UserAvatarProps) {
  return (
    <Avatar
      name={name}
      size={size}
      variant={variant}
      colors={colors}
      square={false}
    />
  );
}

/**
 * 아바타 미리보기 컴포넌트 (모든 변형을 표시)
 */
export function AvatarPreviewGrid({
  name,
  size = 48,
  onSelect,
  selectedVariant,
}: {
  name: string;
  size?: number;
  onSelect?: (variant: AvatarVariant) => void;
  selectedVariant?: AvatarVariant;
}) {
  const variants: AvatarVariant[] = [
    "beam",
    "marble",
    "pixel",
    "sunset",
    "ring",
    "bauhaus",
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {variants.map((variant) => (
        <button
          key={variant}
          type="button"
          onClick={() => onSelect?.(variant)}
          className={`rounded-full p-1 transition-all hover:scale-110 ${
            selectedVariant === variant
              ? "ring-primary ring-2 ring-offset-2"
              : "hover:ring-muted-foreground ring-1 ring-transparent hover:ring-2"
          }`}
          title={variant}
        >
          <UserAvatar name={name} size={size} variant={variant} />
        </button>
      ))}
    </div>
  );
}

export { AVATAR_COLORS, type AvatarVariant };
