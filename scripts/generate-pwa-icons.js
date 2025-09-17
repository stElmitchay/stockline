const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

(async () => {
  const srcSvg = path.resolve(__dirname, '..', 'public', 'favicon.svg');
  const outDir = path.resolve(__dirname, '..', 'public', 'icons');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const sizes = [
    48,
    72,
    96,
    128,
    144,
    152,
    192,
    256,
    384,
    512,
    1024,
  ];

  for (const size of sizes) {
    const filename = path.join(outDir, `icon-${size}x${size}.png`);
    await sharp(srcSvg).resize(size, size).png({ quality: 90 }).toFile(filename);
  }

  // Apple touch icon (180)
  const appleIcon = path.resolve(__dirname, '..', 'public', 'apple-touch-icon.png');
  await sharp(srcSvg).resize(180, 180).png({ quality: 90 }).toFile(appleIcon);

  console.log('Generated PWA icons in public/icons and apple-touch-icon.png');
})();
