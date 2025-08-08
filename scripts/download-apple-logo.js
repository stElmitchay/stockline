#!/usr/bin/env node

const https = require('https');
const fs = require('fs');
const path = require('path');

const appleLogoUrl = 'https://raw.githubusercontent.com/davidepalazzo/ticker-logos/main/ticker_icons/AAPL.png';
const outputPath = path.join(__dirname, '../public/apple-logo.png');

console.log('📥 Downloading Apple logo...');

https.get(appleLogoUrl, (response) => {
  if (response.statusCode === 200) {
    const file = fs.createWriteStream(outputPath);
    response.pipe(file);
    
    file.on('finish', () => {
      file.close();
      console.log('✅ Apple logo downloaded successfully!');
      console.log(`📁 Saved to: ${outputPath}`);
    });
  } else {
    console.error('❌ Failed to download Apple logo:', response.statusCode);
  }
}).on('error', (err) => {
  console.error('❌ Error downloading Apple logo:', err.message);
}); 