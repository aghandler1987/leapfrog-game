// Leap Frog — ambient background life.
// Spawns fish jumps, dragonflies, and the UFO easter egg.
// Pure visual flair, no gameplay effect.

(function () {
  const scene = document.getElementById('game');

  // ========== Jumping fish ==========
  // A fish arcs out of the water, flips, and dives back in at a random x position.
  const FISH_MIN_MS = 7000;
  const FISH_MAX_MS = 16000;

  function spawnFish() {
    const fish = document.createElement('div');
    fish.className = 'ambient-fish';
    fish.innerHTML = `<img src="${Theme.sprite('fish')}" alt=""/>`;
    // Random spawn x within a reasonable range (not right where frog is)
    const w = window.innerWidth;
    const x = 100 + Math.random() * (w - 200);
    fish.style.left = `${x}px`;
    // Randomize the arc direction (face left or right)
    if (Math.random() < 0.5) fish.classList.add('flipped');
    scene.appendChild(fish);
    // Clean up after animation
    setTimeout(() => fish.remove(), 2200);
  }

  function fishLoop() {
    const delay = FISH_MIN_MS + Math.random() * (FISH_MAX_MS - FISH_MIN_MS);
    setTimeout(() => {
      spawnFish();
      fishLoop();
    }, delay);
  }

  // ========== Dragonflies / bugs ==========
  const BUG_MIN_MS = 5000;
  const BUG_MAX_MS = 12000;

  function spawnBug() {
    const bug = document.createElement('div');
    const isDragonfly = Math.random() < 0.7;
    bug.className = isDragonfly ? 'ambient-bug dragonfly' : 'ambient-bug bug';
    if (isDragonfly) {
      bug.innerHTML = `<img src="${Theme.sprite('dragonfly')}" alt=""/>`;
    } else {
      // Simple dot bug — black square
      bug.innerHTML = '';
    }
    // Random height (above waterline), random direction, random speed
    const yPct = 15 + Math.random() * 45; // 15-60% from top
    const goingLeft = Math.random() < 0.5;
    bug.style.top = `${yPct}%`;
    if (goingLeft) bug.classList.add('leftward');
    const speed = 7 + Math.random() * 6; // 7-13 seconds across
    bug.style.animationDuration = `${speed}s`;
    scene.appendChild(bug);
    setTimeout(() => bug.remove(), speed * 1000 + 500);
  }

  function bugLoop() {
    const delay = BUG_MIN_MS + Math.random() * (BUG_MAX_MS - BUG_MIN_MS);
    setTimeout(() => {
      spawnBug();
      bugLoop();
    }, delay);
  }

  // ========== UFO easter egg (press A three times fast) ==========
  // Was M, but M is the mute toggle — triple-M would both mute and spawn.
  // A is unused by the game.
  const UFO_WINDOW_MS = 1500;
  let aPresses = [];
  let ufoActive = false;

  function spawnUFO() {
    if (ufoActive) return;
    ufoActive = true;
    const ufo = document.createElement('div');
    ufo.className = 'ambient-ufo';
    ufo.innerHTML = `<img src="${Theme.sprite('ufo')}" alt=""/>`;
    scene.appendChild(ufo);
    // A little whoosh sound (reuse hop SFX, but ramp lower)
    if (typeof Audio !== 'undefined' && Audio.sfxTongueWhip) Audio.sfxTongueWhip();
    setTimeout(() => {
      ufo.remove();
      ufoActive = false;
    }, 6500);
  }

  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'a') return;
    const now = Date.now();
    aPresses.push(now);
    // Keep only presses within the window
    aPresses = aPresses.filter(t => now - t <= UFO_WINDOW_MS);
    if (aPresses.length >= 3) {
      aPresses = [];
      spawnUFO();
    }
  });

  // Public: start the ambient loops. Called after the page loads.
  function start() {
    // Initial first-bug comes quickly so you see life immediately
    setTimeout(spawnBug, 2500);
    setTimeout(spawnFish, 6000);
    bugLoop();
    fishLoop();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
