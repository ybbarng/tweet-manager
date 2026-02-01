# CLAUDE.md

프로젝트 개요와 구조는 `README.md`를 참고할 것.

## 개발 명령어

```bash
pnpm install              # 의존성 설치
pnpm run dev              # Next.js 개발 서버만 실행
pnpm run electron:dev     # Electron + Next.js 동시 실행 (개발 모드)
pnpm run electron:compile # Electron TypeScript만 컴파일
pnpm run electron:build   # 프로덕션 빌드 + 패키징 (아이콘 빌드 포함)
pnpm run electron:publish # 빌드 + GitHub Releases에 자동 업로드 (단일 플랫폼)
pnpm run release <type>   # 린트/테스트 → 버전 bump → 빌드 → 배포 (patch|minor|major)
pnpm run icon:build       # 앱 아이콘 생성 (src/app/icon.svg → resources/icon.png)
pnpm run build            # Next.js 빌드만
pnpm run lint             # biome check --write (포맷 + 린트 자동 수정)
pnpm run check            # biome check (수정 없이 검사만)
pnpm test                 # vitest 실행
pnpm run test:watch       # vitest watch 모드
```

## 아키텍처 결정

- **Electron 이중 프로세스**: 메인 프로세스(Node.js)에서 Twitter API 호출(CORS 우회), 렌더러(React)에서 UI 담당. IPC로 통신.
- **필터 시스템**: "삭제 조건" 방식 (DELETE FROM WHERE). 각 필터는 삭제할 트윗을 반환.
  - **조합 모드**: AND(모든 조건 충족 시 삭제, 기본값) 또는 OR(하나라도 충족 시 삭제) 선택 가능
  - **NOT 조건**: 각 필터에 negate 옵션으로 결과 반전
  - **비교 연산자**: 숫자 필터에 >=, >, <=, <, = 지원
  - **필터 종류**: numeric(likes/retweets/replies/views), keyword, media, reply, dateRange
  - **thread 필터**: 보존 필터로 특별 처리. 지정된 타래는 다른 조건과 무관하게 삭제에서 제외.
  - 필터가 없으면 삭제 대상 없음 (안전 장치).
- **Next.js `output: 'export'`**: 정적 빌드하여 Electron에서 로드. 서버 기능 미사용.
- **Electron tsconfig 분리**: `tsconfig.electron.json`으로 `electron/` 디렉토리를 CommonJS 타겟으로 별도 컴파일. 출력 디렉토리는 `dist-electron/`.
- **HTTP 클라이언트**: Electron 메인 프로세스에서 wretch 사용 (fetch 래퍼). `electron/twitter/api.ts` 참고.
- **클라이언트 상태 관리**: zustand 사용 (`src/lib/store/app-store.ts`). 인증, 트윗, 필터, 삭제 진행 상태를 Single Source of Truth로 관리.
- **서버 상태 관리**: @tanstack/react-query 사용. mutation 훅은 `src/lib/queries.ts`에 정의.
- **electron-builder 패키징**: `files` 설정에서 `node_modules`를 제외하고 `wretch`만 포함. Next.js, React 등은 정적 빌드(`out/`) 후 런타임에 불필요. `sharp`는 아이콘 생성 스크립트용(devDependency).
- **프로덕션 정적 파일 서빙**: 커스텀 `app://` 프로토콜 사용. Next.js 정적 빌드의 절대 경로(`/_next/...`)를 `file://`에서 로드할 수 없어 `protocol.handle`로 해결. 개발 모드 판별은 `app.isPackaged` 사용.
- **아이콘 관리**: 원본은 `src/app/icon.svg` 하나만 유지. Next.js App Router가 이 파일을 favicon 및 `/icon.svg` 경로로 제공. Electron 앱 아이콘(`resources/icon.png`)은 `pnpm run icon:build` 또는 `electron:build` 시 자동 생성.
- **트윗 로딩 전략**: 한 번에 20개씩 페이지네이션으로 로드. 로그인 시 자동으로 첫 20개 로드, "더 불러오기" 버튼으로 추가 로드. rate limit 방지 및 UX 개선 목적.
- **API 안전 장치**:
  - 트윗 삭제 간격: 1~2초 랜덤 딜레이 (계정 보호)
  - 연속 5회 실패 시 자동 중단
  - Rate limit (429) 시 최대 3회 재시도, 대기 시간 점진적 증가 (5초, 10초, 15초)
  - fetch API 호출 최소 500ms 간격 유지
  - 중복 요청 방지 로직
- **삭제 전 백업**: 기본 활성화된 백업 옵션 제공. 실패한 트윗 ID 및 에러 추적.
- **자동 업데이트**: electron-updater 사용. 앱 시작 시 GitHub Releases에서 새 버전 확인. 플랫폼별 동작:
  - **Windows**: 자동 다운로드 → 재시작 시 자동 설치
  - **macOS**: 알림만 표시 → GitHub Release 페이지에서 수동 다운로드 (코드 서명 없이는 자동 설치 불가)
  - 배포: `pnpm run release <patch|minor|major>`
- **다크모드**: `useTheme` 훅으로 상태 관리. system/light/dark 순환. localStorage에 저장. CSS는 `.dark` 클래스만 사용 (미디어 쿼리 제거하여 수동 전환과 충돌 방지).
- **삭제 히스토리**: `app.getPath('userData')/deletion-history.json`에 저장. IPC 채널: `history:load`, `history:save`. 최근 100개 유지.
- **자동 로그인**: Electron safeStorage API로 인증 정보 암호화 저장. 저장 위치: `app.getPath('userData')/credentials.dat`. IPC 채널: `auth:save`, `auth:load`, `auth:clear`. 앱 시작 시 저장된 정보로 `twitter:verify` 호출하여 유효성 검증, 실패 시 재로그인 안내.

## 코딩 컨벤션

- 응답 및 주석 언어: 한국어
- 한국어 주석은 복잡한 로직에만 추가. 자명한 코드에는 생략.
- **포맷/린트**: biome 사용 (ESLint 아님). `biome.json` 참고. 들여쓰기: space 2칸, 따옴표: single quote.
- **Pre-commit 훅**: husky + lint-staged로 커밋 전 자동 린트. 스테이징된 `*.{js,ts,tsx,json}` 파일만 검사.
- **테스트**: vitest 사용. 테스트 파일은 `__tests__/` 디렉토리에 `*.test.ts` 패턴으로 작성.
- 모든 React 컴포넌트에 `'use client'` 지시문 사용 (App Router 클라이언트 컴포넌트)
- 공통 타입은 `src/types/index.ts`에 정의
- 필터 추가 시: 필터 타입을 `src/lib/filters/types.ts`에 정의 → `src/lib/filters/`에 필터 파일 추가 → `app-store.ts`에 상태/액션 추가 → `create-filters.ts`에 필터 생성 로직 추가 → `QueryBuilder.tsx`에 UI 연결 (zustand에서 직접 상태 사용)
- **커스텀 훅**: `src/lib/hooks/`에 위치. `useTheme`는 다크모드 관리.
- **TweetManager 컴포넌트 구조**: 메인 화면은 다음 하위 컴포넌트로 구성:
  - `TweetStatusBar`: 트윗 수, 날짜 범위, 로드/새로고침/로그아웃 버튼
  - `DeletionStatus`: 삭제 진행/완료/중단 상태 표시
  - `TweetPreviewSection`: 삭제 후보 헤더, 전체 선택/해제, 트윗 목록
  - `DeleteActions`: 백업, 확인 체크박스, 삭제 버튼
- IPC 채널 추가 시: `electron/main.ts`에 핸들러 → `electron/preload.ts`에 노출 → `src/lib/ipc.ts`에 래퍼 함수 → `src/lib/queries.ts`에 query/mutation 훅

## 작업 완료 체크리스트

매 작업이 끝나면 다음을 확인:

1. **검증**: `pnpm run check`, `pnpm test`, `pnpm run electron:compile` 통과 확인
2. **문서화**: 작업 내용에 따라 README.md 또는 CLAUDE.md 업데이트
3. **커밋**: 의미 있는 단위로 분리하여 커밋 생성

## 작업 중 다른 이슈 발견 시

작업 중간에 다른 해야 할 일(린트 에러, 버그 등)이 발견되면:

1. 현재 작업 롤백 (`git restore .`)
2. 발견된 이슈 먼저 해결
3. 해결 내용 커밋
4. 기존에 하려던 작업 재개
