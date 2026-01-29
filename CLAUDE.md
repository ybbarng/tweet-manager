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
pnpm run release <type>   # 버전 bump + macOS/Windows 빌드 + 배포 (patch|minor|major)
pnpm run icon:build       # 앱 아이콘 생성 (src/app/icon.svg → resources/icon.png)
pnpm run build            # Next.js 빌드만
pnpm run lint             # biome check --write (포맷 + 린트 자동 수정)
pnpm run check            # biome check (수정 없이 검사만)
pnpm test                 # vitest 실행
pnpm run test:watch       # vitest watch 모드
```

## 아키텍처 결정

- **Electron 이중 프로세스**: 메인 프로세스(Node.js)에서 Twitter API 호출(CORS 우회), 렌더러(React)에서 UI 담당. IPC로 통신.
- **필터 시스템**: "보존 조건" 방식. 각 필터는 보존할 트윗을 반환하며, 여러 필터를 OR 조합으로 실행. 필터가 없으면 전체 트윗이 삭제 후보가 되어 사용자가 수동으로 보존할 트윗을 선택.
- **Next.js `output: 'export'`**: 정적 빌드하여 Electron에서 로드. 서버 기능 미사용.
- **Electron tsconfig 분리**: `tsconfig.electron.json`으로 `electron/` 디렉토리를 CommonJS 타겟으로 별도 컴파일. 출력 디렉토리는 `dist-electron/`.
- **HTTP 클라이언트**: Electron 메인 프로세스에서 wretch 사용 (fetch 래퍼). `electron/twitter/api.ts` 참고.
- **서버 상태 관리**: 렌더러에서 @tanstack/react-query 사용. mutation 훅은 `src/lib/queries.ts`에 정의.
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
- **자동 업데이트**: electron-updater 사용. 앱 시작 시 GitHub Releases에서 새 버전 확인 → 자동 다운로드 → 재시작 시 적용. `pnpm run electron:publish`로 배포.

## 코딩 컨벤션

- 응답 및 주석 언어: 한국어
- 한국어 주석은 복잡한 로직에만 추가. 자명한 코드에는 생략.
- **포맷/린트**: biome 사용 (ESLint 아님). `biome.json` 참고. 들여쓰기: space 2칸, 따옴표: single quote.
- **테스트**: vitest 사용. 테스트 파일은 `__tests__/` 디렉토리에 `*.test.ts` 패턴으로 작성.
- 모든 React 컴포넌트에 `'use client'` 지시문 사용 (App Router 클라이언트 컴포넌트)
- 공통 타입은 `src/types/index.ts`에 정의
- 필터 추가 시: `TweetFilter` 인터페이스 구현 → `src/lib/filters/`에 파일 추가 → `FilterPanel.tsx`에 UI 연결
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
