# X Manager

Twitter(X) 트윗을 조건에 따라 필터링하고, 미리보기 후 일괄 삭제할 수 있는 데스크톱 앱.

## 주요 기능

- 트윗 아카이브 파일 업로드 또는 API를 통한 트윗 불러오기
- 보존 조건 기반 필터링 (좋아요 수, 리트윗 수, 특정 타래 지정)
- 삭제 대상 미리보기 및 개별 트윗 제외
- JSON 백업 후 일괄 삭제
- 인증 정보는 로컬에만 저장, 외부 전송 없음

## 사용 흐름

1. **인증** — "Twitter로 로그인" 버튼 클릭 후 로그인 (또는 수동으로 토큰 입력)
2. **트윗 불러오기** — 아카이브 파일(tweets.js) 업로드(추천) 또는 API로 가져오기
3. **필터 설정** — 보존할 트윗 조건 설정 (좋아요 N개 이상, 리트윗 M개 이상, 특정 타래 등)
4. **미리보기** — 삭제 대상 확인, 개별 체크 해제로 보존 가능
5. **삭제** — 백업 다운로드 후 일괄 삭제 실행

## 기술 스택

| 영역 | 기술 |
|------|------|
| Desktop | Electron + electron-builder |
| Frontend | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS + lucide-react |
| 상태 관리 | React Context + useReducer |
| 서버 상태 | @tanstack/react-query |
| 가상 스크롤 | @tanstack/react-virtual |
| HTTP 클라이언트 | wretch |
| 린트/포맷 | Biome |
| 테스트 | Vitest |
| 패키지 매니저 | pnpm |

## 개발 환경 설정

### 필수 설치

| 도구 | 버전 | 설치 방법 |
|------|------|-----------|
| Node.js | 20 이상 | https://nodejs.org/ |
| pnpm | 9 이상 | `npm install -g pnpm` 또는 `corepack enable` |
| Git | - | https://git-scm.com/ |

### 프로젝트 설정

```bash
git clone <저장소 URL>
cd x-manager
pnpm install
```

### 설치 확인

```bash
pnpm test  # 44개 테스트 통과 확인
```

## 실행

```bash
# Electron 앱 개발 모드 (Next.js + Electron 동시 실행)
pnpm run electron:dev

# Next.js 개발 서버만 실행 (UI 작업 시)
pnpm run dev
```

## 빌드 및 배포

### 설치 파일 생성

현재 OS에 맞는 설치 파일이 `release/` 폴더에 생성됩니다.

```bash
pnpm run electron:build
```

| OS | 생성 파일 | 위치 |
|----|----------|------|
| Windows | `X Manager Setup x.x.x.exe` | `release/` |
| macOS | `X Manager-x.x.x.dmg` | `release/` |

### Windows에서 빌드

1. **개발 환경 구성**
   ```powershell
   # Node.js 설치 후
   npm install -g pnpm

   # 또는 corepack 사용
   corepack enable
   ```

2. **프로젝트 클론 및 의존성 설치**
   ```powershell
   git clone <저장소 URL>
   cd x-manager
   pnpm install
   ```

3. **테스트 실행 (선택)**
   ```powershell
   pnpm test
   ```

4. **설치 파일 생성**
   ```powershell
   pnpm run electron:build
   ```

   완료되면 `release/X Manager Setup x.x.x.exe` 파일이 생성됩니다.

### macOS에서 빌드

```bash
pnpm run electron:build
```

완료되면 `release/X Manager-x.x.x.dmg` 파일이 생성됩니다.

### 배포

생성된 설치 파일을 GitHub Releases 또는 원하는 방식으로 배포합니다.

- **Windows 사용자**: `.exe` 파일 다운로드 → 실행 → 설치 완료
- **macOS 사용자**: `.dmg` 파일 다운로드 → 열기 → Applications로 드래그

설치된 앱은 Node.js나 개발 도구 없이 독립 실행됩니다.

## 프로젝트 구조

```
electron/              Electron 메인 프로세스
  main.ts              앱 엔트리, 윈도우 생성, IPC 핸들러
  preload.ts           contextBridge를 통한 IPC 노출
  twitter/
    api.ts             Twitter GraphQL API 클라이언트
    types.ts           API 응답 타입
    endpoints.ts       엔드포인트 및 쿼리 파라미터
    archive.ts         아카이브 파일(tweets.js) 파싱

src/
  app/                 Next.js App Router
    page.tsx           메인 페이지 (스텝 기반 UI)
  components/
    auth/              인증 폼
    upload/            아카이브 업로드 / API 로드
    filters/           필터 패널 (좋아요, 리트윗, 타래)
    tweets/            트윗 카드, 목록 (가상 스크롤), 통계
    deletion/          삭제 미리보기 및 진행률
  lib/
    ipc.ts             Electron IPC 호출 래퍼
    filters/           필터 엔진 및 개별 필터 로직
    store/             React Context 기반 상태 관리
  types/               공통 타입 정의
```
