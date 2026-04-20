import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SettingsNotifications } from "./settings-notifications";

/**
 * Figma 디자인 기반 Settings - Notifications 페이지 템플릿
 *
 * 사용자 알림 설정을 관리하는 완전한 설정 페이지입니다.
 *
 * 구현 기능:
 * - 사이드바 네비게이션 메뉴
 * - 라디오 그룹을 통한 알림 빈도 설정
 * - 이메일 알림 유형별 토글 스위치
 * - 모바일 설정 체크박스
 * - 설정 업데이트 버튼
 *
 * 사용된 컴포넌트:
 * - Button: 업데이트 액션 버튼
 * - Checkbox: 모바일 설정 옵션
 * - RadioGroup: 알림 빈도 선택
 * - Separator: 섹션 구분선
 * - Switch: 이메일 알림 토글
 * - Label: 폼 레이블
 */
const meta = {
  title: "templates/Test Settings Notifications",
  component: SettingsNotifications,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    design: {
      type: "figma",
      url: "https://www.figma.com/design/Q7c53iozMSDxpPnunZsEM6/shadcn-ui-kit-for-Figma---August-2025?node-id=23104-146258&m=dev",
    },
  },
} satisfies Meta<typeof SettingsNotifications>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 기본 Settings - Notifications 페이지입니다.
 * Figma 디자인과 동일한 레이아웃과 기능을 구현했습니다.
 *
 * 포함된 섹션:
 * - 페이지 헤더 (Settings 제목 및 설명)
 * - 사이드바 네비게이션 (Profile, Account, Appearance, Notifications, Display)
 * - 알림 빈도 설정 (All new messages, Direct messages and mentions, Nothing)
 * - 이메일 알림 설정 (Communication, Marketing, Social, Security)
 * - 모바일 설정 체크박스
 *
 * 🎯 테마 변경: Storybook 상단 툴바에서 14가지 테마 조합 선택 가능
 * 📱 뷰포트: 상단 툴바에서 Mobile, Tablet, Desktop 뷰 전환 가능
 */
export const Default: Story = {};
