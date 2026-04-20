/**
 * SMP-206: AI 사이드탭 마크다운 렌더링 테스트
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AiMarkdown } from "./ai-markdown";

describe("AiMarkdown", () => {
  it("헤더를 렌더링한다", () => {
    render(<AiMarkdown content="## 제목입니다" />);
    const heading = screen.getByRole("heading", { level: 2 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent("제목입니다");
  });

  it("볼드 텍스트를 렌더링한다", () => {
    render(<AiMarkdown content="이것은 **굵은** 텍스트" />);
    const bold = screen.getByText("굵은");
    expect(bold.tagName).toBe("STRONG");
  });

  it("순서 없는 리스트를 렌더링한다", () => {
    render(<AiMarkdown content={"- 항목 1\n- 항목 2\n- 항목 3"} />);
    const items = screen.getAllByRole("listitem");
    expect(items.length).toBeGreaterThanOrEqual(3);
  });

  it("순서 있는 리스트를 렌더링한다", () => {
    render(<AiMarkdown content="1. 첫째\n2. 둘째\n3. 셋째" />);
    const list = screen.getByRole("list");
    expect(list.tagName).toBe("OL");
  });

  it("인라인 코드를 렌더링한다", () => {
    render(<AiMarkdown content={"이것은 `코드` 입니다"} />);
    const code = screen.getByText("코드");
    expect(code.tagName).toBe("CODE");
  });

  it("코드블록을 렌더링한다", () => {
    render(<AiMarkdown content={"```\nconst x = 1;\n```"} />);
    const code = screen.getByText("const x = 1;");
    expect(code.closest("pre")).toBeInTheDocument();
  });

  it("링크를 렌더링한다", () => {
    render(<AiMarkdown content="[구글](https://google.com)" />);
    const link = screen.getByRole("link", { name: "구글" });
    expect(link).toHaveAttribute("href", "https://google.com");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("테이블을 렌더링한다", () => {
    const md = "| 이름 | 값 |\n|------|----|\n| A | 1 |\n| B | 2 |";
    render(<AiMarkdown content={md} />);
    const table = screen.getByRole("table");
    expect(table).toBeInTheDocument();
    const rows = screen.getAllByRole("row");
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });

  it("일반 텍스트를 paragraph로 렌더링한다", () => {
    render(<AiMarkdown content="안녕하세요" />);
    expect(screen.getByText("안녕하세요")).toBeInTheDocument();
  });

  it("빈 문자열을 안전하게 처리한다", () => {
    const { container } = render(<AiMarkdown content="" />);
    expect(container).toBeInTheDocument();
  });
});
