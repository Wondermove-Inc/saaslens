/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require("playwright");

async function analyzeSlider() {
  console.log("=== Slider 분석 시작 ===\n");

  const browser = await chromium.launch({
    headless: false,
    devtools: true,
  });
  const page = await browser.newPage();

  try {
    // Storybook Slider 문서 페이지로 이동
    console.log("1. Storybook Slider 페이지 로딩...");
    await page.goto("http://localhost:6006/?path=/docs/atoms-slider--docs");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Storybook iframe 찾기
    console.log("2. iframe 검색 중...");
    const iframe = page.frame({ url: /iframe\.html/ });

    if (!iframe) {
      throw new Error("Storybook iframe을 찾을 수 없습니다");
    }

    console.log("3. Slider 요소 분석 중...\n");

    // Slider 컨테이너 찾기
    const sliderElements = await iframe.$$('[data-slot="slider"]');
    console.log(`   - Slider 요소 개수: ${sliderElements.length}`);

    // 첫 번째 Slider 요소 상세 분석
    if (sliderElements.length > 0) {
      const sliderInfo = await sliderElements[0].evaluate((el) => {
        const computed = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();

        // Track 요소 확인
        const track = el.querySelector('[data-slot="slider-track"]');
        const trackInfo = track
          ? {
              className: track.className,
              computedBg: window.getComputedStyle(track).backgroundColor,
              width: window.getComputedStyle(track).width,
              height: window.getComputedStyle(track).height,
              rect: track.getBoundingClientRect(),
            }
          : null;

        // Range 요소 확인
        const range = el.querySelector('[data-slot="slider-range"]');
        const rangeInfo = range
          ? {
              className: range.className,
              computedBg: window.getComputedStyle(range).backgroundColor,
              width: window.getComputedStyle(range).width,
              height: window.getComputedStyle(range).height,
              rect: range.getBoundingClientRect(),
            }
          : null;

        // Thumb 요소 확인
        const thumb = el.querySelector('[data-slot="slider-thumb"]');
        const thumbInfo = thumb
          ? {
              className: thumb.className,
              computedBg: window.getComputedStyle(thumb).backgroundColor,
              border: window.getComputedStyle(thumb).border,
              width: window.getComputedStyle(thumb).width,
              height: window.getComputedStyle(thumb).height,
            }
          : null;

        return {
          // Slider 컨테이너 정보
          container: {
            className: el.className,
            width: computed.width,
            height: computed.height,
            display: computed.display,
            position: computed.position,
            actualDimensions: `${rect.width}x${rect.height}px`,
          },
          // 하위 요소 정보
          track: trackInfo,
          range: rangeInfo,
          thumb: thumbInfo,
          // HTML 구조
          innerHTML: el.innerHTML,
        };
      });

      console.log("=== Slider 컨테이너 정보 ===");
      console.log(JSON.stringify(sliderInfo.container, null, 2));
      console.log("\n=== Slider Track 정보 ===");
      console.log(JSON.stringify(sliderInfo.track, null, 2));
      console.log("\n=== Slider Range 정보 ===");
      console.log(JSON.stringify(sliderInfo.range, null, 2));
      console.log("\n=== Slider Thumb 정보 ===");
      console.log(JSON.stringify(sliderInfo.thumb, null, 2));
    }

    // Tailwind 클래스 테스트
    console.log("\n4. Tailwind CSS 클래스 테스트...");
    const tailwindTest = await iframe.evaluate(() => {
      const testColors = [
        "bg-gray-200",
        "bg-blue-600",
        "bg-primary",
        "bg-muted",
        "bg-background",
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

    // 스크린샷 저장
    console.log("\n5. 스크린샷 저장 중...");
    await page.screenshot({
      path: "storybook-slider-full.png",
      fullPage: true,
    });

    // iframe만 캡처
    const sliderElement = await iframe.$('[data-slot="slider"]');
    if (sliderElement) {
      await sliderElement.screenshot({
        path: "storybook-slider-element.png",
      });
    }

    console.log("   - storybook-slider-full.png (전체 페이지)");
    console.log("   - storybook-slider-element.png (Slider 요소)");

    // 문제 진단
    console.log("\n=== 진단 결과 ===");

    const grayWorks = tailwindTest["bg-gray-200"] !== "rgba(0, 0, 0, 0)";
    const blueWorks = tailwindTest["bg-blue-600"] !== "rgba(0, 0, 0, 0)";

    if (grayWorks && blueWorks) {
      console.log("✅ Tailwind 색상 클래스가 작동합니다");
    } else {
      console.log("❌ Tailwind 색상 클래스가 작동하지 않습니다");
    }

    if (sliderElements.length === 0) {
      console.log("❌ Slider 요소를 찾을 수 없습니다");
    } else {
      console.log("✅ Slider 요소를 찾았습니다");
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
console.log("Slider 분석을 시작합니다...\n");
analyzeSlider();
