import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3001';

console.log('🧪 ========================================================');
console.log('🧪 WILDLANDS MULTIPLAYER AUTOMATED INTEGRATION TEST');
console.log('🧪 ========================================================');

async function runTest() {
  let player1 = null;
  let player2 = null;

  try {
    // 1. Connect Player 1 (Alpha)
    console.log('[Test] Step 1: Connecting Player 1 (Alpha)...');
    player1 = io(SERVER_URL, { timeout: 4000 });

    let alphaSpawn = { x: 0, y: 0, z: 0 };
    await new Promise((resolve, reject) => {
      player1.on('connect', () => {
        console.log(`[Test] ✓ Player 1 connected with socket id: ${player1.id}`);
        player1.emit('player:join', { name: 'Alpha' });
      });

      player1.on('world:init', (data) => {
        alphaSpawn = data.self.position;
        console.log(`[Test] ✓ Player 1 received world:init at (${alphaSpawn.x.toFixed(1)}, ${alphaSpawn.z.toFixed(1)}). Existing players: ${data.players.length}`);
        resolve();
      });

      player1.on('connect_error', reject);
    });

    // 2. Connect Player 2 (Bravo)
    console.log('[Test] Step 2: Connecting Player 2 (Bravo)...');
    player2 = io(SERVER_URL, { timeout: 4000 });

    let player1SawBravoJoin = false;
    player1.on('player:joined', (p) => {
      if (p.name === 'Bravo') {
        player1SawBravoJoin = true;
        console.log(`[Test] ✓ Player 1 received player:joined notification for Bravo!`);
      }
    });

    await new Promise((resolve, reject) => {
      player2.on('connect', () => {
        console.log(`[Test] ✓ Player 2 connected with socket id: ${player2.id}`);
        player2.emit('player:join', { name: 'Bravo' });
      });

      player2.on('world:init', (data) => {
        console.log(`[Test] ✓ Player 2 received world:init. Found player: ${data.players.map(p => p.name).join(', ')}`);
        const foundAlpha = data.players.some(p => p.name === 'Alpha');
        if (foundAlpha) {
          console.log(`[Test] ✓ Player 2 correctly sees Player 1 in world list.`);
          resolve();
        } else {
          reject(new Error('Player 2 did not see Alpha in existing players!'));
        }
      });

      player2.on('connect_error', reject);
    });

    if (!player1SawBravoJoin) {
      await new Promise(r => setTimeout(r, 200));
    }

    if (!player1SawBravoJoin) {
      throw new Error('Player 1 did not receive player:joined event for Bravo');
    }

    // 3. Movement Synchronization Test
    console.log('[Test] Step 3: Testing movement synchronization...');
    const testPos = {
      x: parseFloat((alphaSpawn.x + 2.5).toFixed(2)),
      y: parseFloat((alphaSpawn.y + 0.5).toFixed(2)),
      z: parseFloat((alphaSpawn.z + 2.5).toFixed(2))
    };

    const movementReceived = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for position tick')), 3000);

      player2.on('world:tick', (data) => {
        const alphaUpdate = data.players.find(p => p.id === player1.id);
        if (alphaUpdate && Math.abs(alphaUpdate.position.x - testPos.x) < 0.2 && Math.abs(alphaUpdate.position.y - testPos.y) < 0.2) {
          clearTimeout(timeout);
          console.log(`[Test] ✓ Player 2 received Alpha move update at (${alphaUpdate.position.x.toFixed(2)}, Y=${alphaUpdate.position.y.toFixed(2)}, ${alphaUpdate.position.z.toFixed(2)})`);
          resolve();
        }
      });
    });

    // Send realistic movement from Alpha
    player1.emit('player:move', {
      position: testPos,
      rotation: { yaw: 1.57 },
      animation: 'run'
    });

    await movementReceived;

    // 4. Disconnect Test
    console.log('[Test] Step 4: Testing disconnect and cleanup...');
    const player1Id = player1.id;
    const leaveReceived = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out waiting for player:left')), 3000);

      player2.on('player:left', (data) => {
        if (data.id === player1Id) {
          clearTimeout(timeout);
          console.log(`[Test] ✓ Player 2 received player:left for Alpha (${data.id})`);
          resolve();
        }
      });
    });

    player1.disconnect();
    await leaveReceived;

    console.log('🧪 ========================================================');
    console.log('🧪 ALL MULTIPLAYER QA TESTS PASSED SUCCESSFULLY! (100%)');
    console.log('🧪 ========================================================');

    player2.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ [Test Error]:', err.message);
    if (player1) player1.disconnect();
    if (player2) player2.disconnect();
    process.exit(1);
  }
}

runTest();
