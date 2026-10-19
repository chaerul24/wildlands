export class InputManager {
  constructor(domElement) {
    this.domElement = domElement;

    this.keys = {
      KeyW: false,
      KeyA: false,
      KeyS: false,
      KeyD: false,
      ArrowUp: false,
      ArrowLeft: false,
      ArrowDown: false,
      ArrowRight: false,
      ShiftLeft: false,
      ShiftRight: false,
      Space: false,
      Tab: false,
      KeyF: false
    };

    // Virtual Touch Joystick & Action State
    this.touchJoystick = { x: 0, y: 0 };
    this.isTouchSprinting = false;

    // Mouse & Touch look delta
    this.mouseDelta = { x: 0, y: 0 };
    this.isPointerLocked = false;
    this.isMouseDown = false;
    this.isPaused = false;

    // Touch tracking state
    this.joystickTouchId = null;
    this.joystickCenter = { x: 0, y: 0 };
    this.cameraTouchId = null;
    this.lastCameraPos = { x: 0, y: 0 };

    // Callbacks
    this.onEscapePressed = null;
    this.onTabToggled = null;
    this.onAttackPressed = null;

    this.initKeyboardMouseListeners();
    this.initTouchListeners();
  }

  initKeyboardMouseListeners() {
    const handleKey = (e, state) => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;

      if (e.code in this.keys) {
        this.keys[e.code] = state;
      }

      // Fallback for case/layout variations
      const k = e.key ? e.key.toLowerCase() : '';
      if (k === 'w') this.keys.KeyW = state;
      if (k === 'a') this.keys.KeyA = state;
      if (k === 's') this.keys.KeyS = state;
      if (k === 'd') this.keys.KeyD = state;
      if (k === 'f') this.keys.KeyF = state;
      if (k === ' ' || k === 'spacebar') this.keys.Space = state;
      if (k === 'shift') {
        this.keys.ShiftLeft = state;
        this.keys.ShiftRight = state;
      }
      if (k === 'arrowup') this.keys.ArrowUp = state;
      if (k === 'arrowdown') this.keys.ArrowDown = state;
      if (k === 'arrowleft') this.keys.ArrowLeft = state;
      if (k === 'arrowright') this.keys.ArrowRight = state;
    };

    window.addEventListener('keydown', (e) => {
      handleKey(e, true);

      if (e.code === 'KeyF' || (e.key && e.key.toLowerCase() === 'f')) {
        if (this.onAttackPressed) this.onAttackPressed();
      }

      if (e.code === 'Tab') {
        e.preventDefault();
        if (this.onTabToggled) this.onTabToggled(true);
      }

      if (e.code === 'Escape') {
        if (this.onEscapePressed) this.onEscapePressed();
      }
    });

    window.addEventListener('keyup', (e) => {
      handleKey(e, false);

      if (e.code === 'Tab') {
        e.preventDefault();
        if (this.onTabToggled) this.onTabToggled(false);
      }
    });

    // Pointer Lock & Attack on Click
    this.domElement.addEventListener('click', () => {
      if (!this.isPointerLocked && !this.isPaused && !('ontouchstart' in window)) {
        this.requestPointerLock();
      } else if (this.isPointerLocked && !this.isPaused) {
        if (this.onAttackPressed) this.onAttackPressed();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.domElement;
    });

    // Mouse Movement
    window.addEventListener('mousemove', (e) => {
      if (this.isPointerLocked || this.isMouseDown) {
        this.mouseDelta.x += e.movementX || 0;
        this.mouseDelta.y += e.movementY || 0;
      }
    });

    window.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isMouseDown = true;
        // In gameplay with pointer lock, left mouse triggers attack
        if (this.isPointerLocked && !this.isPaused) {
          if (this.onAttackPressed) this.onAttackPressed();
        }
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.isMouseDown = false;
    });
  }

  initTouchListeners() {
    const joystickZone = document.getElementById('joystick-zone');
    const joystickKnob = document.getElementById('joystick-knob');
    const btnJump = document.getElementById('btn-mobile-jump');
    const btnSprint = document.getElementById('btn-mobile-sprint');
    const btnAttack = document.getElementById('btn-mobile-attack');

    // 0. Mobile Attack Button
    if (btnAttack) {
      btnAttack.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.onAttackPressed) this.onAttackPressed();
        btnAttack.classList.add('active');
      }, { passive: false });
      btnAttack.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        btnAttack.classList.remove('active');
      }, { passive: false });
    }

    // 1. Jump Button
    if (btnJump) {
      const startJump = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.keys.Space = true;
        btnJump.classList.add('active');
      };
      const endJump = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.keys.Space = false;
        btnJump.classList.remove('active');
      };

      btnJump.addEventListener('touchstart', startJump, { passive: false });
      btnJump.addEventListener('touchend', endJump, { passive: false });
      btnJump.addEventListener('touchcancel', endJump, { passive: false });
    }

    // 2. Sprint Button (Toggle on tap)
    if (btnSprint) {
      btnSprint.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.isTouchSprinting = !this.isTouchSprinting;
        this.keys.ShiftLeft = this.isTouchSprinting;
        if (this.isTouchSprinting) {
          btnSprint.classList.add('active');
        } else {
          btnSprint.classList.remove('active');
        }
      }, { passive: false });
    }

    // 3. Multi-Touch handling on window (Joystick & Camera)
    const MAX_JOYSTICK_RADIUS = 46;

    const onTouchStart = (e) => {
      if (this.isPaused) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const target = touch.target;

        // Skip if touching UI buttons or modal
        if (target && target.closest && (target.closest('.interactive') && !target.closest('#joystick-zone') && !target.closest('#game-canvas'))) {
          continue;
        }

        // Check if inside Joystick Zone or bottom-left screen
        if (joystickZone && (target.closest('#joystick-zone') || (touch.clientX < window.innerWidth * 0.42 && touch.clientY > window.innerHeight * 0.45))) {
          if (this.joystickTouchId === null) {
            this.joystickTouchId = touch.identifier;
            const rect = joystickZone.getBoundingClientRect();
            this.joystickCenter = {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2
            };
            this.updateJoystickPosition(touch.clientX, touch.clientY, MAX_JOYSTICK_RADIUS, joystickKnob);
          }
        } else {
          // Camera touch on right side or open areas
          if (this.cameraTouchId === null) {
            this.cameraTouchId = touch.identifier;
            this.lastCameraPos = { x: touch.clientX, y: touch.clientY };
          }
        }
      }
    };

    const onTouchMove = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];

        if (touch.identifier === this.joystickTouchId) {
          this.updateJoystickPosition(touch.clientX, touch.clientY, MAX_JOYSTICK_RADIUS, joystickKnob);
        } else if (touch.identifier === this.cameraTouchId) {
          const dx = touch.clientX - this.lastCameraPos.x;
          const dy = touch.clientY - this.lastCameraPos.y;

          this.mouseDelta.x += dx * 1.5;
          this.mouseDelta.y += dy * 1.5;

          this.lastCameraPos = { x: touch.clientX, y: touch.clientY };
        }
      }
    };

    const onTouchEnd = (e) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];

        if (touch.identifier === this.joystickTouchId) {
          this.joystickTouchId = null;
          this.touchJoystick.x = 0;
          this.touchJoystick.y = 0;
          this.keys.KeyW = false;
          this.keys.KeyS = false;
          this.keys.KeyA = false;
          this.keys.KeyD = false;

          if (joystickKnob) {
            joystickKnob.style.transform = 'translate(0px, 0px)';
          }
        } else if (touch.identifier === this.cameraTouchId) {
          this.cameraTouchId = null;
        }
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('touchcancel', onTouchEnd, { passive: true });
  }

  updateJoystickPosition(clientX, clientY, maxRadius, knobElement) {
    let dx = clientX - this.joystickCenter.x;
    let dy = clientY - this.joystickCenter.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }

    if (knobElement) {
      knobElement.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
    }

    // Normalized coordinates (-1 to 1)
    const normX = dx / maxRadius;
    const normY = dy / maxRadius;

    this.touchJoystick.x = normX;
    this.touchJoystick.y = normY;

    // Synchronize boolean keyboard keys for compatibility
    this.keys.KeyW = normY < -0.28;
    this.keys.KeyS = normY > 0.28;
    this.keys.KeyA = normX < -0.28;
    this.keys.KeyD = normX > 0.28;

    // Auto-sprint if joystick pushed to extreme edge (> 0.88)
    if (dist / maxRadius > 0.88) {
      this.keys.ShiftLeft = true;
    } else if (!this.isTouchSprinting) {
      this.keys.ShiftLeft = false;
    }
  }

  requestPointerLock() {
    if (this.domElement.requestPointerLock) {
      this.domElement.requestPointerLock();
    }
  }

  exitPointerLock() {
    if (document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  consumeMouseDelta() {
    const delta = { x: this.mouseDelta.x, y: this.mouseDelta.y };
    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;
    return delta;
  }
}
