import puppeteer from 'puppeteer-core';

async function auditViewport(page, width, height, label) {
  await page.setViewport({ width, height, isMobile: width < 1000, hasTouch: width < 1000 });
  await new Promise(r => setTimeout(r, 600));

  const result = await page.evaluate((w, h) => {
    const topBar = document.getElementById('hideout-top-bar');
    const leftPanel = document.getElementById('hideout-left-panel');
    const rightPanel = document.getElementById('hideout-right-panel');
    const playBtn = document.getElementById('btn-sidebar-play');
    const overlay = document.getElementById('orientation-overlay');
    const canvas = document.getElementById('game-canvas');
    const topNav = document.querySelector('.top-nav-menu');

    const getRect = el => el ? {
      x: Math.round(el.getBoundingClientRect().x),
      y: Math.round(el.getBoundingClientRect().y),
      w: Math.round(el.getBoundingClientRect().width),
      h: Math.round(el.getBoundingClientRect().height),
      visible: window.getComputedStyle(el).display !== 'none' && window.getComputedStyle(el).visibility !== 'hidden' && window.getComputedStyle(el).opacity !== '0'
    } : null;

    const topBarRect = getRect(topBar);
    const leftRect = getRect(leftPanel);
    const rightRect = getRect(rightPanel);
    const playRect = getRect(playBtn);
    const overlayRect = getRect(overlay);
    const canvasRect = getRect(canvas);
    const topNavRect = getRect(topNav);

    // Overlap checks
    const leftRightOverlap = (leftRect && rightRect && leftRect.visible && rightRect.visible)
      ? (leftRect.x + leftRect.w > rightRect.x && leftRect.x < rightRect.x + rightRect.w)
      : false;

    // Off-screen checks
    const playOffscreen = playRect ? (playRect.y + playRect.h > h || playRect.y < 0) : true;
    const topBarOverflowX = topBar ? topBar.scrollWidth > topBar.clientWidth : false;
    const bodyOverflowX = document.body.scrollWidth > w;

    return {
      viewport: `${w}x${h}`,
      topBar: topBarRect,
      topNav: topNavRect,
      leftPanel: leftRect,
      rightPanel: rightRect,
      playBtn: playRect,
      playOffscreen,
      leftRightOverlap,
      topBarOverflowX,
      bodyOverflowX,
      overlayVisible: overlay ? overlay.classList.contains('active') : false,
      canvasSize: canvasRect ? `${canvasRect.w}x${canvasRect.h}` : null
    };
  }, width, height);

  console.log(`\n=== AUDIT [${label} - ${width}x${height}] ===`);
  console.log(JSON.stringify(result, null, 2));
  return result;
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1000));

  // Dismiss splash screen if visible
  await page.evaluate(() => {
    const splash = document.getElementById('game-splash-screen');
    if (splash) splash.style.display = 'none';
    const loading = document.getElementById('game-loading-screen');
    if (loading) loading.style.display = 'none';
  });

  await auditViewport(page, 1920, 1080, 'Desktop 1080p');
  await auditViewport(page, 844, 390, 'iPhone 12/13/14 Landscape');
  await auditViewport(page, 740, 360, 'Android Landscape');
  await auditViewport(page, 390, 844, 'Mobile Portrait');

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
