/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require("playwright");

async function analyzeProgressBar() {
  console.log("=== Progress Bar 분석 시작 ===\n");

  const browser = await chromium.launch({
    headless: false,
    devtools: true,
  });
  const page = await browser.newPage();

  try {
    // Storybook Progress 문서 페이지로 이동
    console.log("1. Storybook 페이지 로딩...");
    await page.goto("http://localhost:6006/?path=/docs/atoms-progress--docs");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Storybook iframe 찾기
    console.log("2. iframe 검색 중...");
    const iframe = page.frame({ url: /iframe\.html/ });

    if (!iframe) {
      throw new Error("Storybook iframe을 찾을 수 없습니다");
    }

    console.log("3. Progress 요소 분석 중...\n");

    // Progress 컨테이너 찾기
    const progressElements = await iframe.$$('[data-slot="progress"]');
    console.log(`   - Progress 요소 개수: ${progressElements.length}`);

    // 첫 번째 Progress 요소 상세 분석
    if (progressElements.length > 0) {
      const progressInfo = await progressElements[0].evaluate((el) => {
        const computed = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();

        // 자식 요소들 확인
        const indicator = el.querySelector('[data-slot="progress-indicator"]');
        const indicatorInfo = indicator
          ? {
              className: indicator.className,
              style: indicator.getAttribute("style"),
              computedBg: window.getComputedStyle(indicator).backgroundColor,
              transform: window.getComputedStyle(indicator).transform,
              width: window.getComputedStyle(indicator).width,
              height: window.getComputedStyle(indicator).height,
            }
          : null;

        return {
          // Progress 컨테이너 정보
          container: {
            className: el.className,
            width: computed.width,
            height: computed.height,
            backgroundColor: computed.backgroundColor,
            display: computed.display,
            position: computed.position,
            overflow: computed.overflow,
            actualDimensions: `${rect.width}x${rect.height}px`,
          },
          // Progress 인디케이터 정보
          indicator: indicatorInfo,
          // HTML 구조
          innerHTML: el.innerHTML,
          outerHTML: el.outerHTML,
        };
      });

      console.log("=== Progress 컨테이너 정보 ===");
      console.log(JSON.stringify(progressInfo.container, null, 2));
      console.log("\n=== Progress 인디케이터 정보 ===");
      console.log(JSON.stringify(progressInfo.indicator, null, 2));
    }

    // Tailwind 클래스 테스트
    console.log("\n4. Tailwind CSS 클래스 테스트...");
    const tailwindTest = await iframe.evaluate(() => {
      const testColors = [
        "bg-gray-200",
        "bg-blue-600",
        "bg-primary",
        "bg-muted",
      ];
      const results = {};

      testColors.forEach((className) => {
        const div = document.createElement("div");
        div.className = className;
        document.body.appendChild(div);
        const color = window.getComputedStyle(div).backgroundColor;
        document.body.removeChild(div);
        results[className] = color;
      });

      return results;
    });

    console.log("=== Tailwind 색상 클래스 테스트 결과 ===");
    console.log(JSON.stringify(tailwindTest, null, 2));

    // CSS 변수 확인
    console.log("\n5. CSS 변수 확인...");
    const cssVars = await iframe.evaluate(() => {
      const root = document.documentElement;
      const computed = window.getComputedStyle(root);
      return {
        "--primary": computed.getPropertyValue("--primary"),
        "--muted": computed.getPropertyValue("--muted"),
        "--color-primary": computed.getPropertyValue("--color-primary"),
        "--color-muted": computed.getPropertyValue("--color-muted"),
        "--background": computed.getPropertyValue("--background"),
        "--foreground": computed.getPropertyValue("--foreground"),
      };
    });

    console.log("=== CSS 변수 값 ===");
    console.log(JSON.stringify(cssVars, null, 2));

    // 스크린샷 저장
    console.log("\n6. 스크린샷 저장 중...");
    await page.screenshot({
      path: "storybook-progress-full.png",
      fullPage: true,
    });
    await iframe.screenshot({
      path: "storybook-progress-iframe.png",
    });

    console.log("   - storybook-progress-full.png (전체 페이지)");
    console.log("   - storybook-progress-iframe.png (iframe 내용)");

    // 문제 진단
    console.log("\n=== 진단 결과 ===");

    // Tailwind 클래스 작동 여부
    const grayWorks = tailwindTest["bg-gray-200"] !== "rgba(0, 0, 0, 0)";
    const blueWorks = tailwindTest["bg-blue-600"] !== "rgba(0, 0, 0, 0)";

    if (grayWorks && blueWorks) {
      console.log("✅ Tailwind 기본 색상 클래스가 작동합니다");
    } else {
      console.log("❌ Tailwind 색상 클래스가 작동하지 않습니다");
    }

    if (progressElements.length === 0) {
      console.log("❌ Progress 요소를 찾을 수 없습니다");
    } else {
      console.log("✅ Progress 요소를 찾았습니다");
    }

    console.log("\n분석 완료! 브라우저는 10초 후 자동으로 닫힙니다.");
  } catch (error) {
    console.error("오류 발생:", error.message);
  } finally {
    await page.waitForTimeout(10000);
    await browser.close();
  }
}

// 스크립트 실행
console.log("Progress 바 분석을 시작합니다...\n");
analyzeProgressBar();
