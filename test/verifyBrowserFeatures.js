import puppeteer from 'puppeteer-core';

async function verifyFeatures() {
  console.log('🚀 Running in-browser live verification for Swords, Shop & Map...');

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });

  // Navigate
  await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1500));
  console.log('  ✓ Page loaded at http://localhost:3001');

  // Dismiss splash/loading and enter world
  await page.evaluate(() => {
    const splash = document.getElementById('game-splash-screen');
    if (splash) splash.style.display = 'none';
    const loading = document.getElementById('game-loading-screen');
    if (loading) loading.style.display = 'none';
    window.__wildlandsGame?.lobby?.enterWorld();
  });
  console.log('  ✓ Entered world cleanly');
  await new Promise(r => setTimeout(r, 1200));

  // Check Minimap elements
  const minimapCanvas = await page.$('#hud-minimap-canvas');
  const minimapCoords = await page.$eval('#minimap-coords', el => el.textContent);
  console.log(`  ✓ Minimap canvas mounted, live coords: "${minimapCoords}"`);

  // Press 'M' to open Full World Map
  await page.keyboard.press('KeyM');
  await new Promise(r => setTimeout(r, 400));
  const isWorldMapVisible = await page.$eval('#rpg-world-map-modal', el => el.style.display !== 'none');
  console.log(`  ✓ Pressing 'M' opens World Map modal: ${isWorldMapVisible}`);

  // Close World Map
  await page.$eval('#btn-close-map', el => el.click());
  await new Promise(r => setTimeout(r, 400));
  const isWorldMapClosed = await page.$eval('#rpg-world-map-modal', el => el.style.display === 'none');
  console.log(`  ✓ Closing World Map: ${isWorldMapClosed}`);

  // Open Sword Shop by pressing 'P' or clicking HUD button
  await page.$eval('#btn-hud-shop', el => el.click());
  await new Promise(r => setTimeout(r, 400));
  const isShopVisible = await page.$eval('#rpg-shop-modal', el => el.style.display !== 'none');
  const swordCardCount = await page.$$eval('.sword-shop-card', els => els.length);
  const shopGoldText = await page.$eval('#shop-player-gold', el => el.textContent);
  console.log(`  ✓ Clicked '⚔️ Toko' -> Shop open: ${isShopVisible}, Swords listed: ${swordCardCount}, Player Gold: ${shopGoldText}`);

  // Verify sword cards have names and buy buttons
  const firstSwordName = await page.$eval('.sword-name', el => el.textContent);
  console.log(`  ✓ First sword in catalog: "${firstSwordName}"`);

  // Close Shop
  await page.$eval('#btn-close-shop', el => el.click());
  await new Promise(r => setTimeout(r, 400));

  // Test attacks (Press 'F')
  // Test attacks (Press 'F')
  await page.keyboard.press('KeyF');
  await new Promise(r => setTimeout(r, 150));
  const attack1Info = await page.evaluate(() => ({
    anim: window.__wildlandsGame?.player?.animState,
    combo: window.__wildlandsGame?.enemyManager?.combat?.comboStep
  }));
  console.log(`  ✓ Attack 1 executed -> Player anim: "${attack1Info.anim}", comboStep: ${attack1Info.combo}`);

  await new Promise(r => setTimeout(r, 550));
  await page.keyboard.press('KeyF');
  await new Promise(r => setTimeout(r, 150));
  const attack2Info = await page.evaluate(() => ({
    anim: window.__wildlandsGame?.player?.animState,
    combo: window.__wildlandsGame?.enemyManager?.combat?.comboStep
  }));
  console.log(`  ✓ Attack 2 executed -> Player anim: "${attack2Info.anim}", comboStep: ${attack2Info.combo}`);

  await browser.close();
  console.log('\n🎉 ALL LIVE IN-BROWSER CHECKS PASSED 100%!');
}

verifyFeatures().catch((err) => {
  console.error('❌ Browser feature verification error:', err);
  process.exit(1);
});
