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
console.log('');
console.log('========================================');
console.log(`릴리즈 v${newVersion} 배포 완료!`);
console.log('');
console.log('GitHub Release (Draft) 공개하기:');
console.log(`https://github.com/ybbarng/tweet-manager/releases/tag/v${newVersion}`);
console.log('');
console.log('위 링크에서 "Edit" → "Publish release" 클릭');
console.log('========================================');
