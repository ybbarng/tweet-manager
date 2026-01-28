# CLAUDE.md

프로젝트 개요와 구조는 `README.md`를 참고할 것.

## 개발 명령어

```bash
pnpm install              # 의존성 설치
pnpm run dev              # Next.js 개발 서버만 실행
pnpm run electron:dev     # Electron + Next.js 동시 실행 (개발 모드)
pnpm run electron:compile # Electron TypeScript만 컴파일
pnpm run electron:build   # 프로덕션 빌드 + 패키징
pnpm run build            # Next.js 빌드만
pnpm run lint             # biome check --write (포맷 + 린트 자동 수정)
pnpm run check            # biome check (수정 없이 검사만)
pnpm test                 # vitest 실행
pnpm run test:watch       # vitest watch 모드
```

## 아키텍처 결정

- **Electron 이중 프로세스**: 메인 프로세스(Node.js)에서 Twitter API 호출(CORS 우회), 렌더러(React)에서 UI 담당. IPC로 통신.
- **필터 시스템**: "보존 조건" 방식. 각 필터는 보존할 트윗을 반환하며, 여러 필터를 OR 조합으로 실행. 어떤 필터에도 보존되지 않은 트윗이 삭제 대상.
- **Next.js `output: 'export'`**: 정적 빌드하여 Electron에서 로드. 서버 기능 미사용.
- **Electron tsconfig 분리**: `tsconfig.electron.json`으로 `electron/` 디렉토리를 CommonJS 타겟으로 별도 컴파일. 출력 디렉토리는 `dist-electron/`.
- **HTTP 클라이언트**: Electron 메인 프로세스에서 wretch 사용 (fetch 래퍼). `electron/twitter/api.ts` 참고.
- **서버 상태 관리**: 렌더러에서 @tanstack/react-query 사용. mutation 훅은 `src/lib/queries.ts`에 정의.

## 코딩 컨벤션

- 응답 및 주석 언어: 한국어
- 한국어 주석은 복잡한 로직에만 추가. 자명한 코드에는 생략.
- **포맷/린트**: biome 사용 (ESLint 아님). `biome.json` 참고. 들여쓰기: space 2칸, 따옴표: single quote.
- **테스트**: vitest 사용. 테스트 파일은 `__tests__/` 디렉토리에 `*.test.ts` 패턴으로 작성.
- 모든 React 컴포넌트에 `'use client'` 지시문 사용 (App Router 클라이언트 컴포넌트)
- 공통 타입은 `src/types/index.ts`에 정의
- 필터 추가 시: `TweetFilter` 인터페이스 구현 → `src/lib/filters/`에 파일 추가 → `FilterPanel.tsx`에 UI 연결
- IPC 채널 추가 시: `electron/main.ts`에 핸들러 → `electron/preload.ts`에 노출 → `src/lib/ipc.ts`에 래퍼 함수 → `src/lib/queries.ts`에 query/mutation 훅
