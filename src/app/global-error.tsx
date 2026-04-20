"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          fontFamily:
            'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          backgroundColor: "#ffffff",
          color: "#333333",
        }}
      >
        <main
          style={{
            display: "flex",
            minHeight: "100vh",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
            textAlign: "center",
          }}
        >
          <div style={{ maxWidth: "28rem" }}>
            <svg
              style={{ margin: "0 auto", height: "10rem", width: "100%" }}
              viewBox="0 0 400 300"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <ellipse
                cx="200"
                cy="250"
                rx="160"
                ry="20"
                fill="#f8f8f8"
                opacity="0.6"
              />
              <rect
                x="100"
                y="50"
                width="200"
                height="140"
                rx="8"
                fill="#f8f8f8"
                stroke="#e4e8ef"
                strokeWidth="2"
              />
              <rect
                x="115"
                y="65"
                width="170"
                height="105"
                rx="4"
                fill="#ffffff"
              />
              <rect x="175" y="190" width="50" height="20" fill="#e4e8ef" />
              <rect
                x="150"
                y="210"
                width="100"
                height="8"
                rx="4"
                fill="#e4e8ef"
              />
              <path
                d="M200 90 L230 140 L170 140 Z"
                fill="none"
                stroke="#333333"
                strokeWidth="3"
                strokeLinejoin="round"
              />
              <line
                x1="200"
                y1="106"
                x2="200"
                y2="124"
                stroke="#333333"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="200" cy="133" r="2" fill="#333333" />
            </svg>
            <h1
              style={{
                marginTop: "2rem",
                fontSize: "2.25rem",
                fontWeight: "bold",
                letterSpacing: "-0.025em",
                color: "#333333",
              }}
            >
              치명적 오류
            </h1>
            <p
              style={{
                marginTop: "1rem",
                fontSize: "1.125rem",
                color: "#6c727e",
                whiteSpace: "nowrap",
              }}
            >
              애플리케이션에 심각한 오류가 발생했습니다. 다시 시도해 주세요.
            </p>
            <button
              onClick={reset}
              style={{
                marginTop: "2rem",
                padding: "0.5rem 1.5rem",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#ffffff",
                backgroundColor: "#6366f1",
                border: "none",
                borderRadius: "9999px",
                cursor: "pointer",
              }}
            >
              다시 시도
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
