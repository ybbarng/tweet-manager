#!/usr/bin/env node

const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

const currentVersion = packageJson.version;
const [major, minor, patch] = currentVersion.split('.').map(Number);

const bumpType = process.argv[2];

if (!['patch', 'minor', 'major'].includes(bumpType)) {
  console.log(`현재 버전: ${currentVersion}`);
  console.log('');
  console.log('사용법: pnpm run release <patch|minor|major>');
  console.log('');
  console.log('  patch: 버그 수정 (0.1.0 → 0.1.1)');
  console.log('  minor: 기능 추가 (0.1.0 → 0.2.0)');
  console.log('  major: 대규모 변경 (0.1.0 → 1.0.0)');
  process.exit(1);
}

// gh CLI 인증 확인
try {
  execSync('gh auth status', { stdio: 'pipe' });
} catch (_error) {
  console.error('오류: gh CLI 인증이 필요합니다.');
  console.error('`gh auth login` 명령어로 먼저 인증해주세요.');
  process.exit(1);
}

// .env.local에서 GH_TOKEN 로드 (electron-builder용)
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  }
}

if (!process.env.GH_TOKEN) {
  console.error('오류: GH_TOKEN이 설정되지 않았습니다.');
  console.error(
    '.env.local 파일에 GH_TOKEN을 설정해주세요. (electron-builder용)',
  );
  process.exit(1);
}

// 린트 및 테스트 실행
console.log('린트 검사 중...');
try {
  execSync('pnpm run check', { stdio: 'inherit' });
  console.log('✓ 린트 검사 통과');
} catch (_error) {
  console.error('');
  console.error('✗ 린트 검사 실패. 먼저 `pnpm run lint`로 수정해주세요.');
  process.exit(1);
}

console.log('');
console.log('테스트 실행 중...');
try {
  execSync('pnpm test', { stdio: 'inherit' });
  console.log('✓ 테스트 통과');
} catch (_error) {
  console.error('');
  console.error('✗ 테스트 실패. 테스트를 수정한 후 다시 시도해주세요.');
  process.exit(1);
}

console.log('');

// 새 버전 계산
let newVersion;
if (bumpType === 'patch') {
  newVersion = `${major}.${minor}.${patch + 1}`;
} else if (bumpType === 'minor') {
  newVersion = `${major}.${minor + 1}.0`;
} else {
  newVersion = `${major + 1}.0.0`;
}

console.log(`버전 업데이트: ${currentVersion} → ${newVersion}`);
console.log('');

// 이전 태그 찾기
function getPreviousTag() {
  try {
    const tags = execSync('git tag --sort=-version:refname', {
      encoding: 'utf-8',
    })
      .trim()
      .split('\n')
      .filter(Boolean);
    return tags[0] || null;
  } catch {
    return null;
  }
}

// 커밋 로그 수집 및 릴리즈 노트 생성
function generateReleaseNotes(previousTag) {
  const range = previousTag ? `${previousTag}..HEAD` : 'HEAD';

  let commits;
  try {
    commits = execSync(`git log ${range} --pretty=format:"%s"`, {
      encoding: 'utf-8',
    })
      .trim()
      .split('\n')
      .filter(Boolean);
  } catch {
    return '- 초기 릴리즈';
  }

  if (commits.length === 0) {
    return '- 변경사항 없음';
  }

  // 커밋 분류
  const features = [];
  const fixes = [];
  const improvements = []; // refactor, perf, test
  const others = [];

  for (const commit of commits) {
    // release 커밋은 제외
    if (commit.startsWith('chore: release')) continue;

    if (commit.startsWith('feat:') || commit.startsWith('feat(')) {
      features.push(commit.replace(/^feat(\([^)]+\))?:\s*/, ''));
    } else if (commit.startsWith('fix:') || commit.startsWith('fix(')) {
      fixes.push(commit.replace(/^fix(\([^)]+\))?:\s*/, ''));
    } else if (
      commit.startsWith('refactor:') ||
      commit.startsWith('refactor(')
    ) {
      improvements.push(commit.replace(/^refactor(\([^)]+\))?:\s*/, ''));
    } else if (commit.startsWith('perf:') || commit.startsWith('perf(')) {
      improvements.push(commit.replace(/^perf(\([^)]+\))?:\s*/, ''));
    } else if (commit.startsWith('test:') || commit.startsWith('test(')) {
      improvements.push(commit.replace(/^test(\([^)]+\))?:\s*/, ''));
    } else if (
      commit.startsWith('docs:') ||
      commit.startsWith('chore:') ||
      commit.startsWith('style:')
    ) {
      // docs, chore, style은 릴리즈 노트에서 제외
    } else {
      others.push(commit);
    }
  }

  const sections = [];

  if (features.length > 0) {
    sections.push(
      `### ✨ 새로운 기능\n${features.map((f) => `- ${f}`).join('\n')}`,
    );
  }

  if (fixes.length > 0) {
    sections.push(`### 🐛 버그 수정\n${fixes.map((f) => `- ${f}`).join('\n')}`);
  }

  if (improvements.length > 0) {
    sections.push(
      `### 📦 내부 개선\n${improvements.map((i) => `- ${i}`).join('\n')}`,
    );
  }

  if (others.length > 0) {
    sections.push(
      `### 🔧 기타 변경사항\n${others.map((o) => `- ${o}`).join('\n')}`,
    );
  }

  if (sections.length === 0) {
    return '- 내부 개선 및 문서 업데이트';
  }

  return sections.join('\n\n');
}

const previousTag = getPreviousTag();

// RELEASE_NOTES.md 파일이 있으면 사용, 없으면 자동 생성
const releaseNotesPath = path.join(__dirname, '..', 'RELEASE_NOTES.md');
let releaseNotes;
let usingCustomNotes = false;

if (fs.existsSync(releaseNotesPath)) {
  releaseNotes = fs.readFileSync(releaseNotesPath, 'utf-8').trim();
  usingCustomNotes = true;
  console.log('RELEASE_NOTES.md 파일 사용');
} else {
  releaseNotes = generateReleaseNotes(previousTag);
  console.log('릴리즈 노트 자동 생성 (RELEASE_NOTES.md 없음)');
}

console.log('');
console.log('릴리즈 노트 미리보기:');
console.log('----------------------------------------');
console.log(releaseNotes);
console.log('----------------------------------------');
console.log('');

// 1. package.json 버전 업데이트
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);
console.log('✓ package.json 버전 업데이트');

// 2. Git commit + tag
const run = (cmd, description) => {
  console.log(`  ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (_error) {
    console.error(`✗ ${description} 실패`);
    process.exit(1);
  }
};

console.log('');
console.log('Git 커밋 및 태그 생성...');
run('git add package.json', 'git add');
run(`git commit -m "chore: release v${newVersion}"`, 'git commit');
run(`git tag v${newVersion}`, 'git tag');
run('git push', 'git push');
run('git push --tags', 'git push tags');
console.log('✓ Git 커밋 및 태그 푸시 완료');

const tag = `v${newVersion}`;

// 3. GitHub에서 태그 확인 (최대 30초 대기)
console.log('');
console.log('GitHub에서 태그 확인 중...');
let tagVerified = false;
for (let i = 0; i < 6; i++) {
  try {
    execSync(`gh api repos/:owner/:repo/git/refs/tags/${tag}`, {
      stdio: 'pipe',
    });
    tagVerified = true;
    console.log('✓ GitHub에서 태그 확인됨');
    break;
  } catch {
    console.log(`  태그 전파 대기 중... (${(i + 1) * 5}초)`);
    execSync('sleep 5');
  }
}

if (!tagVerified) {
  console.error('✗ GitHub에서 태그를 찾을 수 없습니다.');
  console.error('  수동으로 태그를 확인한 후 다시 시도해주세요.');
  process.exit(1);
}

// 4. GitHub Release 먼저 생성 (draft)
console.log('');
console.log('GitHub Release 생성 중 (draft)...');
const notesPath = path.join(__dirname, '..', '.release-notes.tmp');
fs.writeFileSync(notesPath, releaseNotes);

try {
  execSync(
    `gh release create ${tag} --title "${tag}" --notes-file "${notesPath}" --draft`,
    {
      stdio: 'inherit',
    },
  );
  console.log('✓ GitHub Release 생성됨 (draft)');
} catch (_error) {
  console.error('✗ GitHub Release 생성 실패');
  if (fs.existsSync(notesPath)) fs.unlinkSync(notesPath);
  process.exit(1);
}

// 5. 빌드 및 배포
console.log('');
console.log('macOS + Windows 빌드 및 GitHub Release 배포...');
console.log('(몇 분 정도 소요됩니다)');
console.log('');

run('pnpm run icon:build', '아이콘 빌드');
run('pnpm run build', 'Next.js 빌드');
run('pnpm run electron:compile', 'Electron 컴파일');

// macOS 빌드
console.log('');
console.log('macOS arm64 빌드 중...');
run(
  'pnpm exec dotenv -e .env.local -- electron-builder --mac --arm64 --publish always',
  'macOS 빌드',
);

// Windows 빌드
console.log('');
console.log('Windows x64 빌드 중...');
run(
  'pnpm exec dotenv -e .env.local -- electron-builder --win --x64 --publish always',
  'Windows 빌드',
);

console.log('');
console.log('✓ 빌드 및 업로드 완료');

// 6. GitHub Release 공개
console.log('');
console.log('GitHub Release 공개 중...');

try {
  execSync(`gh release edit ${tag} --draft=false`, { stdio: 'inherit' });
  console.log('✓ GitHub Release 공개 완료');
} catch (_error) {
  console.log('  gh release edit 실패. 수동으로 공개해주세요.');
  console.log(`  https://github.com/ybbarng/tweet-manager/releases/tag/${tag}`);
} finally {
  // 임시 파일 삭제
  if (fs.existsSync(notesPath)) {
    fs.unlinkSync(notesPath);
  }
  // RELEASE_NOTES.md 파일 삭제 (사용한 경우)
  if (usingCustomNotes && fs.existsSync(releaseNotesPath)) {
    fs.unlinkSync(releaseNotesPath);
    console.log('✓ RELEASE_NOTES.md 파일 삭제됨');
  }
}

console.log('');
console.log('========================================');
console.log(`릴리즈 v${newVersion} 배포 완료!`);
console.log('');
console.log(`https://github.com/ybbarng/tweet-manager/releases/tag/${tag}`);
console.log('========================================');
