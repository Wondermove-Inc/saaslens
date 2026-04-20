import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

/**
 * 🎯 목적: Storybook 스토리 파일에 Figma URL을 자동으로 추가하는 스크립트
 *
 * 이 스크립트는 figma-mapping.json 파일에서 Figma URL 정보를 읽어
 * 각 스토리 파일의 meta 객체에 design parameter를 추가합니다.
 */

interface FigmaData {
  url: string;
  nodeId: string;
  componentSetName: string;
}

interface FigmaMapping {
  [key: string]: FigmaData;
}

// Figma URL 매핑 데이터 로드
const figmaMapping = JSON.parse(
  readFileSync("scripts/figma-mapping.json", "utf-8"),
) as FigmaMapping;

// 각 스토리 파일에 Figma URL 추가
Object.entries(figmaMapping).forEach(
  ([storyName, figmaData]: [string, FigmaData]) => {
    // 스토리 파일 경로 결정
    let storyPath: string;
    const componentName = storyName.replace("-story", "");

    // 경로 매핑 규칙
    if (storyName.includes("chart")) {
      // Chart 관련 스토리는 chart-story 폴더 안에 있음
      storyPath = `src/registry/atoms/chart-story/${componentName}.stories.tsx`;
    } else if (
      ["color", "typography", "spacing", "shadow", "radius"].includes(
        componentName,
      )
    ) {
      // 토큰 스토리
      storyPath = `src/registry/tokens/${storyName}/${componentName}.stories.tsx`;
    } else if (storyName === "typography-components-story") {
      // Foundation 스토리
      storyPath =
        "src/registry/foundation/typography-components-story/typography-components.stories.tsx";
    } else if (storyName === "dashboard-template-story") {
      // Template 스토리
      storyPath =
        "src/registry/templates/dashboard-template-story/dashboard-template.stories.tsx";
    } else {
      // 일반 Atoms
      storyPath = `src/registry/atoms/${storyName}/${componentName}.stories.tsx`;
    }

    try {
      const fullPath = join(process.cwd(), storyPath);
      let content = readFileSync(fullPath, "utf-8");

      // 이미 Figma URL이 있는지 확인
      if (content.includes("design:")) {
        console.log(`⏭️  건너뛰기: ${storyName} (이미 Figma URL이 있음)`);
        return;
      }

      // meta 객체에 design parameter 추가
      // parameters가 이미 있는 경우를 처리
      const parametersMatch = content.match(/parameters:\s*{([^}]*)}/);

      if (parametersMatch) {
        // parameters가 이미 있는 경우 - design 필드 추가
        const oldParameters = parametersMatch[0];
        const newParameters = oldParameters.replace(
          /parameters:\s*{/,
          `parameters: {\n    design: {\n      type: "figma",\n      url: "${figmaData.url}",\n    },`,
        );
        content = content.replace(oldParameters, newParameters);
      } else {
        // parameters가 없는 경우 - parameters 객체 자체를 추가
        const metaRegex = /(const meta.*?=\s*{[\s\S]*?)(tags:\s*\[.*?\],)/;
        content = content.replace(
          metaRegex,
          `$1$2\n  parameters: {\n    design: {\n      type: "figma",\n      url: "${figmaData.url}",\n    },\n  },`,
        );
      }

      writeFileSync(fullPath, content);
      console.log(`✅ 성공: ${storyName}`);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`❌ 오류: ${storyName} - ${errorMessage}`);
    }
  },
);

console.log("\n🎉 Figma URL 추가 작업 완료!");
console.log("⚠️  참고: node-id가 실제 값으로 업데이트되어야 합니다.");
