import puppeteer from 'puppeteer-core';

async function auditGameplay(page, width, height, label) {
  await page.setViewport({ width, height });
  await new Promise(r => setTimeout(r, 400));

  const result = await page.evaluate((w, h) => {
    // Switch to gameplay state
    const lobby = document.getElementById('lobby-screen');
    if (lobby) lobby.classList.add('hidden');
    const controls = document.getElementById('mobile-controls');
    if (controls) {
      controls.classList.add('visible');
      controls.style.display = 'block';
    }

    const joystick = document.getElementById('joystick-zone');
    const bottomBar = document.getElementById('mobile-bottom-bar');
    const actions = document.getElementById('mobile-actions');

    const getRect = el => el ? {
      x: Math.round(el.getBoundingClientRect().x),
      y: Math.round(el.getBoundingClientRect().y),
      w: Math.round(el.getBoundingClientRect().width),
      h: Math.round(el.getBoundingClientRect().height)
    } : null;

    const jRect = getRect(joystick);
    const bRect = getRect(bottomBar);
    const aRect = getRect(actions);

    const boxesIntersect = (r1, r2) => {
      if (!r1 || !r2) return false;
      return !(
        r2.x >= r1.x + r1.w ||
        r2.x + r2.w <= r1.x ||
        r2.y >= r1.y + r1.h ||
        r2.y + r2.h <= r1.y
      );
    };

    // Check actual 2D collisions
    const joyBottomOverlap = boxesIntersect(jRect, bRect);
    const bottomActionOverlap = boxesIntersect(bRect, aRect);
    const joyActionOverlap = boxesIntersect(jRect, aRect);
    const joyOffscreen = jRect ? (jRect.y + jRect.h > h || jRect.x < 0) : true;
    const actionOffscreen = aRect ? (aRect.y + aRect.h > h || aRect.x + aRect.w > w) : true;

    return {
      viewport: `${w}x${h}`,
      joystick: jRect,
      bottomBar: bRect,
      actions: aRect,
      joyBottomOverlap,
      bottomActionOverlap,
      joyActionOverlap,
      joyOffscreen,
      actionOffscreen
    };
  }, width, height);

  console.log(`\n=== GAMEPLAY AUDIT [${label} - ${width}x${height}] ===`);
  console.log(JSON.stringify(result, null, 2));
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1000));

  await auditGameplay(page, 1920, 1080, 'Desktop');
  await auditGameplay(page, 844, 390, 'iPhone Landscape');
  await auditGameplay(page, 740, 360, 'Android Landscape');
  await auditGameplay(page, 390, 844, 'Mobile Portrait');

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
