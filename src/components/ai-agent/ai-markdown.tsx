/**
 * SMP-206: AI 응답 마크다운 렌더링 컴포넌트
 *
 * react-markdown + remark-gfm으로 AI 응답의 마크다운 문법을
 * 포맷된 HTML로 렌더링한다.
 *
 * 보안: react-markdown은 기본적으로 raw HTML 렌더링을 차단 (XSS 안전)
 */

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface AiMarkdownProps {
  content: string;
}

export function AiMarkdown({ content }: AiMarkdownProps) {
  if (!content) return null;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        a: ({ children, href, ...props }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline hover:no-underline"
            {...props}
          >
            {children}
          </a>
        ),
        h1: ({ children, ...props }) => (
          <h1 className="mt-3 mb-2 text-base font-bold" {...props}>
            {children}
          </h1>
        ),
        h2: ({ children, ...props }) => (
          <h2 className="mt-3 mb-2 text-sm font-bold" {...props}>
            {children}
          </h2>
        ),
        h3: ({ children, ...props }) => (
          <h3 className="mt-2 mb-1 text-sm font-semibold" {...props}>
            {children}
          </h3>
        ),
        ul: ({ children, ...props }) => (
          <ul className="my-1 ml-4 list-disc space-y-0.5" {...props}>
            {children}
          </ul>
        ),
        ol: ({ children, ...props }) => (
          <ol className="my-1 ml-4 list-decimal space-y-0.5" {...props}>
            {children}
          </ol>
        ),
        li: ({ children, ...props }) => (
          <li className="text-sm" {...props}>
            {children}
          </li>
        ),
        code: ({ children, className, ...props }) => {
          const isBlock = className?.startsWith("language-");
          if (isBlock) {
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }
          return (
            <code
              className="bg-muted rounded px-1 py-0.5 font-mono text-xs"
              {...props}
            >
              {children}
            </code>
          );
        },
        pre: ({ children, ...props }) => (
          <pre
            className="bg-muted my-2 overflow-x-auto rounded-md p-3 text-xs"
            {...props}
          >
            {children}
          </pre>
        ),
        table: ({ children, ...props }) => (
          <div className="my-2 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm" {...props}>
              {children}
            </table>
          </div>
        ),
        th: ({ children, ...props }) => (
          <th
            className="bg-muted border-border border px-2 py-1 text-left text-xs font-semibold"
            {...props}
          >
            {children}
          </th>
        ),
        td: ({ children, ...props }) => (
          <td className="border-border border px-2 py-1 text-xs" {...props}>
            {children}
          </td>
        ),
        p: ({ children, ...props }) => (
          <p className="my-1 text-sm leading-relaxed" {...props}>
            {children}
          </p>
        ),
        hr: ({ ...props }) => <hr className="border-border my-2" {...props} />,
        strong: ({ children, ...props }) => (
          <strong className="font-semibold" {...props}>
            {children}
          </strong>
        ),
        em: ({ children, ...props }) => (
          <em className="italic" {...props}>
            {children}
          </em>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
