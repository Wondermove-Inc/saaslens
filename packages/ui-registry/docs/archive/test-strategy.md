# Shadcn UI 스토리북 테스트 전략

## 🎯 테스트 목표

shadcn/ui 최신 버전과 현재 스토리북 레지스트리의 완벽한 호환성을 확인하고,
누락된 컴포넌트를 식별하여 추가하는 것

## 📋 테스트 범위

### 1. 컴포넌트 커버리지 테스트

- ✅ **완료**: 51개 중 46개 컴포넌트 확인 (90.2%)
- ❌ **누락**: 5개 컴포넌트 (Combobox, Data Table, React Hook Form, Toast,
  Typography)

### 2. API 호환성 테스트

- **Button 컴포넌트 확인 완료**: variants와 sizes가 일치함
- **나머지 컴포넌트**: 각각의 props, variants, 기능 확인 필요

### 3. 시각적 테스트

- **Chromatic 통합**: 이미 설정되어 있음 (169개 스토리, 2개 오류 발견)
- **오류 수정**: 컴포넌트 오류 2개 해결 필요

## 🔧 테스트 접근 방법

### Phase 1: 자동화된 호환성 검사

1. **스크립트 작성**: shadcn/ui 공식 문서와 현재 스토리 비교
2. **Props 검증**: 각 컴포넌트의 API가 최신 버전과 일치하는지 확인
3. **의존성 확인**: registryDependencies가 올바른지 검증

### Phase 2: 누락 컴포넌트 추가

1. **Combobox 스토리 생성**
   - Select + Command 조합 구현
   - 검색 기능, 다중 선택 등 모든 기능 포함

2. **Data Table 스토리 생성**
   - 정렬, 필터링, 페이지네이션 포함
   - 실제 데이터 예제 사용

3. **Toast 기본 컴포넌트 스토리**
   - Sonner 외 기본 Toast 구현
   - 다양한 상태와 위치 옵션

4. **Typography 컴포넌트 스토리**
   - 기본 텍스트 스타일 컴포넌트
   - 토큰 스토리와 별개로 구현

### Phase 3: 통합 테스트

1. **설치 테스트**

   ```bash
   # 각 스토리가 올바르게 설치되는지 확인
   npx shadcn add @storybook/[component-name]
   ```

2. **빌드 테스트**

   ```bash
   # 레지스트리 빌드가 성공하는지 확인
   npm run registry:build
   ```

3. **Storybook 테스트**
   ```bash
   # 모든 스토리가 정상 렌더링되는지 확인
   npm run storybook:test
   ```

### Phase 4: 시각적 회귀 테스트

1. **Chromatic 활용**
   - 현재 2개 오류 수정
   - 모든 컴포넌트 스냅샷 확인

2. **접근성 테스트**
   - a11y 애드온으로 모든 스토리 검사
   - WCAG 2.1 AA 기준 충족 확인

## 📊 성공 기준

1. **100% 컴포넌트 커버리지**: 모든 shadcn/ui 컴포넌트에 대한 스토리 존재
2. **API 일치**: 모든 props, variants가 최신 버전과 동일
3. **빌드 성공**: registry:build가 오류 없이 완료
4. **테스트 통과**: 모든 유닛/통합 테스트 성공
5. **시각적 일치**: Chromatic에서 시각적 차이 없음

## 🚀 실행 계획

### 즉시 실행

1. Chromatic 오류 2개 확인 및 수정
2. 누락된 5개 컴포넌트 중 우선순위 높은 것부터 구현

### 단계적 실행

1. **Week 1**: Combobox, Data Table 구현
2. **Week 2**: Toast, Typography 구현
3. **Week 3**: 전체 통합 테스트 및 문서 업데이트

### 지속적 개선

- shadcn/ui 업데이트 모니터링
- 정기적인 호환성 검사 (월 1회)
- 사용자 피드백 수집 및 반영

## 📝 테스트 도구

- **Vitest**: 유닛 테스트
- **Playwright**: E2E 테스트
- **Chromatic**: 시각적 회귀 테스트
- **Storybook Test Runner**: 스토리 테스트
- **ESLint/Prettier**: 코드 품질 검사
