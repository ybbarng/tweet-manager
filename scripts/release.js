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

// .env.local에서 GH_TOKEN 로드
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

const GH_TOKEN = process.env.GH_TOKEN;
if (!GH_TOKEN) {
  console.error('오류: GH_TOKEN이 설정되지 않았습니다.');
  console.error('.env.local 파일에 GH_TOKEN을 설정해주세요.');
  process.exit(1);
}

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
    const tags = execSync('git tag --sort=-version:refname', { encoding: 'utf-8' })
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
    commits = execSync(`git log ${range} --pretty=format:"%s"`, { encoding: 'utf-8' })
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
  const others = [];

  for (const commit of commits) {
    // release 커밋은 제외
    if (commit.startsWith('chore: release')) continue;

    if (commit.startsWith('feat:') || commit.startsWith('feat(')) {
      features.push(commit.replace(/^feat(\([^)]+\))?:\s*/, ''));
    } else if (commit.startsWith('fix:') || commit.startsWith('fix(')) {
      fixes.push(commit.replace(/^fix(\([^)]+\))?:\s*/, ''));
    } else if (commit.startsWith('docs:') || commit.startsWith('chore:') || commit.startsWith('style:')) {
      // docs, chore, style은 릴리즈 노트에서 제외
    } else {
      others.push(commit);
    }
  }

  const sections = [];

  if (features.length > 0) {
    sections.push('### ✨ 새로운 기능\n' + features.map(f => `- ${f}`).join('\n'));
  }

  if (fixes.length > 0) {
    sections.push('### 🐛 버그 수정\n' + fixes.map(f => `- ${f}`).join('\n'));
  }

  if (others.length > 0) {
    sections.push('### 📦 기타 변경사항\n' + others.map(o => `- ${o}`).join('\n'));
  }

  if (sections.length === 0) {
    return '- 내부 개선 및 문서 업데이트';
  }

  return sections.join('\n\n');
}

const previousTag = getPreviousTag();
const releaseNotes = generateReleaseNotes(previousTag);

console.log('릴리즈 노트 미리보기:');
console.log('----------------------------------------');
console.log(releaseNotes);
console.log('----------------------------------------');
console.log('');

// 1. package.json 버전 업데이트
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log('✓ package.json 버전 업데이트');

// 2. Git commit + tag
const run = (cmd, description) => {
  console.log(`  ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit' });
  } catch (error) {
    console.error(`✗ ${description} 실패`);
    process.exit(1);
  }
};

const runSilent = (cmd) => {
  try {
    return execSync(cmd, { encoding: 'utf-8' }).trim();
  } catch (error) {
    return null;
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

// 3. 빌드 및 배포
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
  'macOS 빌드'
);

// Windows 빌드
console.log('');
console.log('Windows x64 빌드 중...');
run(
  'pnpm exec dotenv -e .env.local -- electron-builder --win --x64 --publish always',
  'Windows 빌드'
);

console.log('');
console.log('✓ 빌드 및 업로드 완료');

// 4. GitHub Release 본문 업데이트
console.log('');
console.log('GitHub Release 본문 업데이트 중...');

async function updateRelease() {
  const owner = 'ybbarng';
  const repo = 'tweet-manager';
  const tag = `v${newVersion}`;

  try {
    // 릴리즈 정보 가져오기
    const getReleaseRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`,
      {
        headers: {
          Authorization: `Bearer ${GH_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!getReleaseRes.ok) {
      console.log('  릴리즈를 찾을 수 없습니다. 수동으로 본문을 추가해주세요.');
      return false;
    }

    const release = await getReleaseRes.json();

    // 릴리즈 본문 업데이트
    const updateRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases/${release.id}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${GH_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          body: releaseNotes,
          name: `v${newVersion}`,
        }),
      }
    );

    if (updateRes.ok) {
      console.log('✓ GitHub Release 본문 업데이트 완료');
      return true;
    } else {
      console.log('  릴리즈 업데이트 실패. 수동으로 본문을 추가해주세요.');
      return false;
    }
  } catch (error) {
    console.log('  릴리즈 업데이트 중 오류 발생:', error.message);
    return false;
  }
}

updateRelease().then(() => {
  console.log('');
  console.log('========================================');
  console.log(`릴리즈 v${newVersion} 배포 완료!`);
  console.log('');
  console.log('GitHub Release (Draft) 공개하기:');
  console.log(`https://github.com/ybbarng/tweet-manager/releases/tag/v${newVersion}`);
  console.log('');
  console.log('위 링크에서 "Publish release" 클릭');
  console.log('========================================');
});
