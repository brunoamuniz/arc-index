#!/usr/bin/env node
/**
 * Generate PNG icons from SVG
 * Run: node scripts/generate-icons.js
 * 
 * Note: This requires sharp or canvas. If not available, use an online tool
 * or install: npm install sharp
 */

const fs = require('fs');
const path = require('path');

async function generateIcons() {
  try {
    const sharp = require('sharp');
    
    const publicDir = path.join(__dirname, '..', 'public');
    const faviconSvg = path.join(publicDir, 'favicon.svg');
    const iconSvg = path.join(publicDir, 'icon.svg');

    // Generate 32x32 icons
    await sharp(faviconSvg)
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'icon-light-32x32.png'));

    await sharp(faviconSvg)
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'icon-dark-32x32.png'));

    // Generate apple icon 180x180
    await sharp(iconSvg)
      .resize(180, 180)
      .png()
      .toFile(path.join(publicDir, 'apple-icon.png'));

    // Generate favicon.png (32x32) - browsers will use this
    await sharp(faviconSvg)
      .resize(32, 32)
      .png()
      .toFile(path.join(publicDir, 'favicon.png'));

    // Create a simple favicon.ico placeholder
    // Note: For a proper multi-size .ico, use https://realfavicongenerator.net/
    // For now, we'll create a 32x32 PNG and rename it (some browsers accept this)
    const favicon32 = await sharp(faviconSvg)
      .resize(32, 32)
      .png()
      .toBuffer();
    
    fs.writeFileSync(path.join(publicDir, 'favicon.ico'), favicon32);

    console.log('✅ Icons generated successfully!');
    console.log('Note: favicon.ico should be created using https://realfavicongenerator.net/');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      console.log('❌ Sharp not installed. Install it with: npm install sharp');
      console.log('\nAlternatively, use an online tool:');
      console.log('1. Visit https://realfavicongenerator.net/');
      console.log('2. Upload public/favicon.svg');
      console.log('3. Download and extract to public/ folder');
    } else {
      console.error('Error generating icons:', error.message);
    }
  }
}

generateIcons();

