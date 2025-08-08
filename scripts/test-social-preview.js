#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple server to test social media previews
const server = http.createServer((req, res) => {
  if (req.url === '/') {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Stockline</title>
  <meta property="og:title" content="Stockline" />
  <meta property="og:description" content="Own a piece of a company you use everyday" />
  <meta property="og:image" content="http://localhost:3001/og-image.png" />
  <meta property="og:url" content="http://localhost:3001" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="Stockline" />
  <meta name="twitter:description" content="Own a piece of a company you use everyday" />
  <meta name="twitter:image" content="http://localhost:3001/og-image.png" />
</head>
<body>
  <h1>Stockline</h1>
  <p>Own a piece of a company you use everyday</p>
  <p>Test your social preview by sharing this URL: <a href="http://localhost:3001">http://localhost:3001</a></p>
</body>
</html>`;
    
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } else if (req.url === '/og-image.png') {
    // Serve a placeholder image or redirect to your actual image
    res.writeHead(302, { 'Location': '/abstract-graphic.png' });
    res.end();
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(3001, () => {
  console.log('Social preview test server running at http://localhost:3001');
  console.log('You can test your social preview by:');
  console.log('1. Opening http://localhost:3001 in your browser');
  console.log('2. Using Facebook Debugger: https://developers.facebook.com/tools/debug/');
  console.log('3. Using Twitter Card Validator: https://cards-dev.twitter.com/validator');
  console.log('4. Using LinkedIn Post Inspector: https://www.linkedin.com/post-inspector/');
}); 