<p align="center">
  <img src="src/app/icon.svg" alt="Tweet Eraser" width="128" height="128">
</p>

<h1 align="center">Tweet Eraser</h1>

<p align="center">
  Twitter(X) 트윗을 조건에 따라 필터링하고, 미리보기 후 일괄 삭제할 수 있는 데스크톱 앱
</p>

<p align="center">
  <a href="https://github.com/ybbarng/tweet-manager/releases/latest">
    <img src="https://img.shields.io/github/v/release/ybbarng/tweet-manager" alt="Latest Release">
  </a>
  <a href="https://github.com/ybbarng/tweet-manager/releases">
    <img src="https://img.shields.io/github/downloads/ybbarng/tweet-manager/total" alt="Downloads">
  </a>
  <a href="./LICENSE">
    <img src="https://img.shields.io/github/license/ybbarng/tweet-manager" alt="License">
  </a>
</p>

<p align="center">
  <a href="https://github.com/ybbarng/tweet-manager/releases/latest">📥 다운로드</a>
</p>

## 주요 기능

- 트윗 아카이브 파일 업로드 또는 API를 통한 트윗 불러오기
- **강력한 필터 시스템** (DELETE FROM WHERE 방식):
  - 숫자 필터: 좋아요, 리트윗, 조회수 (비교 연산자 >=, >, <=, <, = 지원)
  - 키워드 필터: 텍스트 검색 (ANY OF/ALL OF 매칭, NOT 지원)
  - 미디어 필터: 사진 유무(has_photo), 동영상 유무(has_video)
  - 답글 필터: 답글만 또는 답글 제외
  - 타래 필터: 특정 타래 보존 (삭제 제외)
  - 날짜 범위 필터: 시작일/종료일 개별 설정
  - **AND/OR 조합**: 필터 간 논리 조합 선택 (기본값: AND)
- 삭제 대상 미리보기 및 개별 트윗 제외
- JSON 백업 후 일괄 삭제
- 삭제 히스토리 조회
- 다크모드 지원 (시스템/라이트/다크 전환)
- **자동 로그인**: 앱 재시작 시 이전 로그인 정보로 자동 인증 (암호화 저장)
- 인증 정보는 로컬에만 저장, 외부 전송 없음

## 스크린샷

<!-- TODO: 스크린샷 추가 -->
<!--
| 필터 설정 | 삭제 미리보기 |
|-----------|---------------|
| ![필터](docs/screenshots/filter.png) | ![미리보기](docs/screenshots/preview.png) |
-->

*스크린샷 준비 중*

## 사용 흐름

1. **인증** — "Twitter로 로그인" 버튼 클릭 후 로그인 (재실행 시 자동 로그인)
2. **트윗 불러오기** — 아카이브 파일(tweets.js) 업로드(추천) 또는 API로 가져오기
3. **필터 설정** — 삭제할 트윗 조건 설정 (좋아요/리트윗/조회수, 키워드, 미디어, 답글, 날짜 등)
4. **미리보기** — 삭제 대상 확인, 개별 체크 해제로 보존 가능
5. **삭제** — 백업 다운로드 후 일괄 삭제 실행

## 기술 스택

| 영역 | 기술 |
|------|------|
| Desktop | Electron + electron-builder |
| Frontend | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn/ui + lucide-react |
| 날짜 처리 | date-fns |
| 상태 관리 | Zustand |
| 서버 상태 | @tanstack/react-query |
| 가상 스크롤 | @tanstack/react-virtual |
| HTTP 클라이언트 | wretch |
| 린트/포맷 | Biome + Husky (pre-commit) |
| 테스트 | Vitest + Testing Library |
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
cd tweet-manager
pnpm install
```

### 설치 확인

```bash
pnpm test  # 121개 테스트 통과 확인
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
| Windows | `Tweet Eraser Setup x.x.x.exe` | `release/` |
| macOS | `Tweet Eraser-x.x.x.dmg` | `release/` |

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
   cd tweet-manager
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

   완료되면 `release/Tweet Eraser Setup x.x.x.exe` 파일이 생성됩니다.

### macOS에서 빌드

```bash
pnpm run electron:build
```

완료되면 `release/Tweet Eraser-x.x.x.dmg` 파일이 생성됩니다.

### 릴리즈 배포

GitHub Releases에 자동으로 빌드 파일을 업로드하고 공개합니다.

```bash
pnpm run release patch   # 버그 수정: 0.1.0 → 0.1.1
pnpm run release minor   # 기능 추가: 0.1.0 → 0.2.0
pnpm run release major   # 대규모 변경: 0.1.0 → 1.0.0
```

스크립트가 자동으로 처리하는 작업:
1. 린트 검사 및 테스트 실행
2. `package.json` 버전 업데이트
3. Git commit + tag 생성 및 push
4. GitHub Release 생성 (릴리즈 노트 자동 생성)
5. macOS (arm64) + Windows (x64) 빌드 및 업로드
6. Release 자동 공개

> **필수 조건**:
> - `.env.local` 파일에 `GH_TOKEN` 환경변수 필요 (`.env.local.example` 참고)
> - `gh` CLI 설치 및 인증 필요 (`brew install gh && gh auth login`)

**커스텀 릴리즈 노트**: 프로젝트 루트에 `RELEASE_NOTES.md` 파일을 생성하면 자동 생성 대신 해당 내용이 사용됩니다. 배포 후 파일은 자동 삭제됩니다.

### 자동 업데이트

배포된 앱은 시작 시 GitHub Releases에서 새 버전을 자동으로 확인합니다.

| OS | 동작 |
|----|------|
| Windows | 자동 다운로드 → 재시작 시 자동 설치 |
| macOS | 알림 표시 → GitHub Release 페이지에서 수동 다운로드 (코드 서명 없음) |

> **참고**: macOS에서 완전 자동 업데이트를 하려면 Apple Developer 인증서로 앱 서명이 필요합니다.

### 설치 방법 (사용자용)

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
    auth/              인증 폼, 자동 로그인 로더
    common/            공통 컴포넌트 (RandomTagline 등)
    upload/            아카이브 업로드 / API 로드
    filters/           SQL 스타일 쿼리 빌더 UI
    tweets/            트윗 카드, 목록 (가상 스크롤), 통계
    manager/           트윗 관리 메인 화면 (TweetManager, 상태바, 삭제 상태, 액션 등)
    history/           삭제 히스토리 모달
    ui/                shadcn/ui 컴포넌트, 테마 토글
  lib/
    ipc.ts             Electron IPC 호출 래퍼
    filters/           필터 엔진 및 개별 필터 로직
    hooks/             커스텀 훅 (useTheme 등)
    store/             zustand 기반 상태 관리
  types/               공통 타입 정의
```

## 문제 해결

### macOS에서 "개발자를 확인할 수 없음" 경고

코드 서명이 없어서 발생합니다. 다음 방법으로 실행하세요:

1. Finder에서 앱을 **Control + 클릭** → "열기" 선택
2. 또는 시스템 설정 → 개인정보 보호 및 보안 → "확인 없이 열기" 클릭

### 로그인이 안 될 때

1. Twitter 웹사이트에서 로그인이 정상적으로 되는지 확인
2. 2단계 인증(2FA)이 활성화되어 있다면 인증 코드 입력 필요
3. 계정이 잠겨 있거나 제한된 상태인지 확인

### 트윗이 로드되지 않을 때

1. 인터넷 연결 상태 확인
2. 앱을 재시작하고 다시 로그인
3. Twitter API 서버 상태 확인 (일시적 장애일 수 있음)

### 삭제가 느릴 때

계정 보호를 위해 의도적으로 1~2초 간격으로 삭제합니다. 1000개 트윗 삭제 시 약 20~30분 소요됩니다.

## 라이선스

[MIT License](./LICENSE) - 자유롭게 사용, 수정, 배포할 수 있습니다.
