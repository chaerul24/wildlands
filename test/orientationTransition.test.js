import puppeteer from 'puppeteer-core';

async function runTest() {
  console.log('🚀 Starting Orientation Transition & Responsive Layout Test...');

  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/chromium',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);

  // Step 1: Initial load in Portrait mode (390 x 844)
  console.log('\n[TEST 1] Loading app in Portrait mode (390x844)...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await page.goto('http://127.0.0.1:3001', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise(r => setTimeout(r, 1200));

  // Track window reloads to prove seamless transition WITHOUT reloading
  let reloadCount = 0;
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      reloadCount++;
    }
  });

  // Dismiss splash/loading for layout evaluation
  await page.evaluate(() => {
    const splash = document.getElementById('game-splash-screen');
    if (splash) splash.style.display = 'none';
    const loading = document.getElementById('game-loading-screen');
    if (loading) loading.style.display = 'none';
  });
  await new Promise(r => setTimeout(r, 400));

  const statePortrait1 = await page.evaluate(() => {
    const overlay = document.getElementById('orientation-overlay');
    const canvas = document.getElementById('game-canvas');
    const playBtn = document.getElementById('btn-sidebar-play');
    const leftPanel = document.getElementById('hideout-left-panel');
    const rightPanel = document.getElementById('hideout-right-panel');

    return {
      overlayActive: overlay ? overlay.classList.contains('active') : false,
      canvasSize: `${canvas.width}x${canvas.height}`,
      playVisible: playBtn && window.getComputedStyle(playBtn).display !== 'none',
      rightPanelHidden: rightPanel && window.getComputedStyle(rightPanel).display === 'none'
    };
  });

  console.log('  Portrait State 1:', JSON.stringify(statePortrait1));
  if (!statePortrait1.overlayActive) {
    throw new Error('FAIL: Orientation overlay should be active in portrait mobile mode!');
  }
  console.log('  ✅ Orientation overlay active in portrait mobile.');

  // Step 2: Dismiss orientation overlay and verify portrait lobby layout
  console.log('\n[TEST 2] Dismissing overlay and verifying portrait layout...');
  await page.click('#btn-dismiss-orientation');
  await new Promise(r => setTimeout(r, 300));

  const portraitDismissed = await page.evaluate(() => {
    const overlay = document.getElementById('orientation-overlay');
    const left = document.getElementById('hideout-left-panel').getBoundingClientRect();
    const play = document.getElementById('btn-sidebar-play').getBoundingClientRect();
    const right = document.getElementById('hideout-right-panel');
    const rightVisible = right && window.getComputedStyle(right).display !== 'none';

    return {
      overlayActive: overlay.classList.contains('active'),
      leftPanelBottom: left.bottom,
      playVisible: play.height > 0 && play.bottom <= 844,
      rightPanelHidden: !rightVisible
    };
  });
  console.log('  Portrait Dismissed State:', JSON.stringify(portraitDismissed));
  if (portraitDismissed.overlayActive) throw new Error('FAIL: Overlay should be hidden after dismiss!');
  if (!portraitDismissed.playVisible) throw new Error('FAIL: Play button must be visible on screen in portrait lobby!');
  if (!portraitDismissed.rightPanelHidden) throw new Error('FAIL: Right panel should be hidden in portrait to prevent collision!');
  console.log('  ✅ Portrait layout cleanly frames character with Play button visible.');

  // Step 3: Transition to iPhone Landscape (844 x 390) WITHOUT reload
  console.log('\n[TEST 3] Transitioning to iPhone Landscape (844x390) without reload...');
  await page.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 500));

  const stateLandscape1 = await page.evaluate(() => {
    const overlay = document.getElementById('orientation-overlay');
    const canvas = document.getElementById('game-canvas');
    const left = document.getElementById('hideout-left-panel').getBoundingClientRect();
    const right = document.getElementById('hideout-right-panel').getBoundingClientRect();
    const play = document.getElementById('btn-sidebar-play').getBoundingClientRect();
    const topBar = document.getElementById('hideout-top-bar');

    return {
      overlayActive: overlay ? overlay.classList.contains('active') : false,
      canvasSize: `${canvas.width}x${canvas.height}`,
      playVisible: play.bottom <= 390 && play.top >= 0,
      leftRightClearance: right.left - (left.left + left.width),
      topBarOverflow: topBar.scrollWidth > topBar.clientWidth
    };
  });
  console.log('  Landscape 844x390 State:', JSON.stringify(stateLandscape1));
  if (stateLandscape1.overlayActive) throw new Error('FAIL: Overlay should auto-hide in landscape!');
  if (!stateLandscape1.playVisible) throw new Error('FAIL: Play button must be visible on screen in 844x390 landscape!');
  if (stateLandscape1.leftRightClearance < 200) throw new Error(`FAIL: Insufficient center clearance for 3D character: ${stateLandscape1.leftRightClearance}px`);
  if (stateLandscape1.topBarOverflow) throw new Error('FAIL: Top bar should not have horizontal overflow!');
  console.log(`  ✅ 844x390 landscape valid with ${stateLandscape1.leftRightClearance}px clear center space for 3D character.`);

  // Step 4: Transition to Standard Android Landscape (740 x 360) WITHOUT reload
  console.log('\n[TEST 4] Transitioning to Android Landscape (740x360) without reload...');
  await page.setViewport({ width: 740, height: 360, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 500));

  const stateLandscape2 = await page.evaluate(() => {
    const left = document.getElementById('hideout-left-panel').getBoundingClientRect();
    const right = document.getElementById('hideout-right-panel').getBoundingClientRect();
    const play = document.getElementById('btn-sidebar-play').getBoundingClientRect();
    const topBar = document.getElementById('hideout-top-bar');

    return {
      playVisible: play.bottom <= 360 && play.top >= 0,
      leftRightClearance: right.left - (left.left + left.width),
      topBarOverflow: topBar.scrollWidth > topBar.clientWidth
    };
  });
  console.log('  Landscape 740x360 State:', JSON.stringify(stateLandscape2));
  if (!stateLandscape2.playVisible) throw new Error('FAIL: Play button must be visible on screen in 740x360 landscape!');
  if (stateLandscape2.leftRightClearance < 200) throw new Error(`FAIL: Insufficient center clearance in 740x360: ${stateLandscape2.leftRightClearance}px`);
  if (stateLandscape2.topBarOverflow) throw new Error('FAIL: Top bar overflow detected on 740x360!');
  console.log(`  ✅ 740x360 landscape valid with ${stateLandscape2.leftRightClearance}px clear center space.`);

  // Step 5: Enter Gameplay and verify Mobile Controls
  console.log('\n[TEST 5] Entering gameplay and verifying mobile controls in landscape...');
  await page.click('#btn-sidebar-play');
  await new Promise(r => setTimeout(r, 600));

  const gameplayLandscape = await page.evaluate(() => {
    const controls = document.getElementById('mobile-controls');
    const joystick = document.getElementById('joystick-zone').getBoundingClientRect();
    const hotbar = document.getElementById('mobile-bottom-bar').getBoundingClientRect();
    const actions = document.getElementById('mobile-actions').getBoundingClientRect();

    const joyHotbarClearance = hotbar.left - joystick.right;
    const hotbarActionsClearance = actions.left - hotbar.right;

    return {
      controlsVisible: controls && controls.classList.contains('visible'),
      joystickValid: joystick.width > 0 && joystick.bottom <= 360,
      actionsValid: actions.width > 0 && actions.bottom <= 360,
      joyHotbarClearance,
      hotbarActionsClearance
    };
  });
  console.log('  Gameplay Controls State:', JSON.stringify(gameplayLandscape));
  if (!gameplayLandscape.controlsVisible) throw new Error('FAIL: Mobile controls should be visible in gameplay!');
  if (!gameplayLandscape.joystickValid || !gameplayLandscape.actionsValid) throw new Error('FAIL: Controls offscreen in landscape!');
  if (gameplayLandscape.joyHotbarClearance < 30 || gameplayLandscape.hotbarActionsClearance < 30) {
    throw new Error('FAIL: Controls overlap or too close in landscape gameplay!');
  }
  console.log('  ✅ Mobile controls active, proportional, and non-overlapping in landscape gameplay.');

  // Step 6: Rotate to Portrait during gameplay
  console.log('\n[TEST 6] Rotating to Portrait (390x844) during gameplay...');
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 500));

  const gameplayPortrait = await page.evaluate(() => {
    const overlay = document.getElementById('orientation-overlay');
    const controls = document.getElementById('mobile-controls');

    return {
      overlayActive: overlay.classList.contains('active'),
      controlsHiddenUnderOverlay: controls.style.display === 'none'
    };
  });
  console.log('  Gameplay Portrait State:', JSON.stringify(gameplayPortrait));
  if (!gameplayPortrait.overlayActive) throw new Error('FAIL: Orientation guidance overlay should appear in portrait gameplay!');
  console.log('  ✅ Orientation overlay successfully warns player during portrait gameplay.');

  // Step 7: Rotate back to Landscape (844x390) and verify gameplay resumed seamlessly
  console.log('\n[TEST 7] Rotating back to Landscape (844x390)...');
  await page.setViewport({ width: 844, height: 390, isMobile: true, hasTouch: true });
  await new Promise(r => setTimeout(r, 500));

  const resumedLandscape = await page.evaluate(() => {
    const overlay = document.getElementById('orientation-overlay');
    const controls = document.getElementById('mobile-controls');

    return {
      overlayActive: overlay.classList.contains('active'),
      controlsVisible: controls.classList.contains('visible') && controls.style.display !== 'none'
    };
  });
  console.log('  Resumed Landscape State:', JSON.stringify(resumedLandscape));
  if (resumedLandscape.overlayActive) throw new Error('FAIL: Overlay should disappear upon rotating back to landscape!');
  if (!resumedLandscape.controlsVisible) throw new Error('FAIL: Controls should restore upon rotating back to landscape!');

  // Verify zero unexpected page reloads
  console.log(`\nReload count during orientation changes: ${reloadCount}`);
  if (reloadCount > 0) {
    throw new Error(`FAIL: Page reloaded ${reloadCount} times during orientation changes! Must be 0 reloads!`);
  }
  console.log('  ✅ Zero page reloads! Transitions are completely reactive and seamless.');

  await browser.close();
  console.log('\n🎉 ALL ORIENTATION TRANSITION & RESPONSIVE LAYOUT TESTS PASSED 100%!');
}

runTest().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
