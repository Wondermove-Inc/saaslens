// src/components/apps/app-templates.ts

export interface AppTemplate {
  id: string;
  name: string;
  category: string;
  website: string;
  logoPath: string; // public 폴더 기준 경로
  tags?: Record<string, string>;
}

// 카테고리 타입 정의
export type AppCategory = "collaboration" | "design" | "ai";

// 카테고리 표시명 매핑
export const CATEGORY_LABELS: Record<AppCategory, string> = {
  collaboration: "협업",
  design: "디자인",
  ai: "AI",
};

export const APP_TEMPLATES: AppTemplate[] = [
  {
    id: "slack",
    name: "Slack",
    category: "collaboration",
    website: "https://slack.com",
    logoPath: "/app-logos/slack.svg",
    tags: {
      ko: "협업, 커뮤니케이션, 메시징",
      en: "Collaboration, Communication, Messaging",
    },
  },
  {
    id: "claude",
    name: "Claude",
    category: "ai",
    website: "https://claude.ai",
    logoPath: "/app-logos/claude.svg",
    tags: {
      ko: "AI, 생성형AI, 챗봇",
      en: "AI, Generative AI, Chatbot",
    },
  },
  {
    id: "openai",
    name: "ChatGPT",
    category: "ai",
    website: "https://chat.openai.com",
    logoPath: "/app-logos/openai.svg",
    tags: {
      ko: "AI, 생성형AI, 챗봇, OpenAI",
      en: "AI, Generative AI, Chatbot, OpenAI",
    },
  },
  {
    id: "cursor",
    name: "Cursor",
    category: "ai",
    website: "https://cursor.com",
    logoPath: "/app-logos/cursor.svg",
    tags: {
      ko: "개발, IDE, AI, 코딩",
      en: "Development, IDE, AI, Coding",
    },
  },
];
