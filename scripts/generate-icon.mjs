import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const svgPath = join(rootDir, 'resources', 'icon.svg');
const pngPath = join(rootDir, 'resources', 'icon.png');

// 1024x1024 PNG 생성 (electron-builder가 icns로 자동 변환)
const svg = readFileSync(svgPath);

await sharp(svg)
  .resize(1024, 1024)
  .png()
  .toFile(pngPath);

console.log('icon.png 생성 완료:', pngPath);
