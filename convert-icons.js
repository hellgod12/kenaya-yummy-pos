const sharp = require('sharp');
const fs = require('fs');

async function convertSvgToPng(svgPath, pngPath, size) {
  try {
    await sharp(svgPath)
      .resize(size, size)
      .png()
      .toFile(pngPath);
    console.log(`✓ Converted ${svgPath} to ${pngPath} (${size}x${size})`);
  } catch (error) {
    console.error(`✗ Error converting ${svgPath}:`, error);
  }
}

async function convertAllIcons() {
  console.log('Converting SVG icons to PNG format...\n');
  
  await convertSvgToPng('./public/icon-192.svg', './public/icon-192.png', 192);
  await convertSvgToPng('./public/icon-512.svg', './public/icon-512.png', 512);
  
  console.log('\n✓ Icon conversion complete!');
}

convertAllIcons();
