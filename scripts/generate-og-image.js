#!/usr/bin/env node

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

async function generateOGImage() {
  console.log('🚀 Generating social preview image...');
  
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set viewport to 1200x630 (optimal for social media)
    await page.setViewport({
      width: 1200,
      height: 630,
      deviceScaleFactor: 2 // Higher resolution
    });
    
    // Load the HTML file
    const htmlPath = path.join(__dirname, '../public/og-image.html');
    await page.goto(`file://${htmlPath}`, {
      waitUntil: 'networkidle0'
    });
    
    // Wait a bit for any images to load
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take screenshot
    const outputPath = path.join(__dirname, '../public/og-image.png');
    await page.screenshot({
      path: outputPath,
      type: 'png',
      fullPage: false
    });
    
    console.log('✅ Social preview image generated successfully!');
    console.log(`📁 Saved to: ${outputPath}`);
    console.log('🔗 You can now test it with:');
    console.log('   - Facebook Debugger: https://developers.facebook.com/tools/debug/');
    console.log('   - Twitter Card Validator: https://cards-dev.twitter.com/validator');
    console.log('   - LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/');
    
  } catch (error) {
    console.error('❌ Error generating image:', error);
  } finally {
    await browser.close();
  }
}

// Run the script
generateOGImage(); 