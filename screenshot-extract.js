#!/usr/bin/env node
/**
 * 从 Lsprint 提取 4 个页面的真实 UI 截图，宽度 1920px
 * 使用: node screenshot-extract.js
 * 需要: npm install puppeteer
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const http = require('http');

const WIDTH = 1920;
const HEIGHT = 1080;
const PAGES = ['login', 'sprint', 'notes', 'signals'];
const OUT_DIR = path.join(__dirname, '_screenshots');

function startServer() {
  const dir = __dirname;
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = req.url.split('?')[0] || '/';
      const file = url === '/' ? 'screenshot-extract.html' : url.slice(1);
      const filePath = path.join(dir, file);
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end(); return; }
        const ext = path.extname(file);
        const ct = ext === '.html' ? 'text/html' : ext === '.js' ? 'application/javascript' : 'text/plain';
        res.writeHead(200, { 'Content-Type': ct });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, url: `http://127.0.0.1:${port}` });
    });
  });
}

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const { server, url: baseUrl } = await startServer();

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();

  await page.setViewport({ width: WIDTH, height: HEIGHT });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);

  for (const pageName of PAGES) {
    const url = `${baseUrl}/screenshot-extract.html?page=${pageName}`;
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });
    await page.waitForSelector('#root', { visible: true, timeout: 5000 });
    await new Promise(r => setTimeout(r, 1200));
    const outPath = path.join(OUT_DIR, `${pageName}.png`);
    await page.screenshot({ path: outPath });
    console.log('Saved:', outPath);
  }

  await browser.close();
  server.close();
  console.log('Done. Screenshots in', OUT_DIR);
}

main().catch(console.error);
