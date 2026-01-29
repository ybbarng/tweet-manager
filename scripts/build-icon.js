const sharp = require('sharp');
const path = require('node:path');

const src = path.join(__dirname, '..', 'src', 'app', 'icon.svg');
const dest = path.join(__dirname, '..', 'resources', 'icon.png');

sharp(src)
  .resize(512, 512)
  .png()
  .toFile(dest)
  .then(() => console.log('Icon built:', dest))
  .catch((err) => {
    console.error('Failed to build icon:', err);
    process.exit(1);
  });
