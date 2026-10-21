// Leap Frog — Dance Party stage show.
//
// Fires after every 3rd boss defeated OR via secret D-D-D keyboard shortcut.
// Full theatrical overlay sequence over 10 seconds:
//   1. Red velvet curtain drops down covering the game
//   2. Curtain splits open revealing dark theater backdrop + wooden stage
//   3. Spotlights sweep across; 6 backup dancers from the wings + the
//      PLAYER's selected frog takes center stage doing varied moves
//      (jump, spin, cartwheel, split-leap)
//   4. Dedicated chiptune party music plays throughout
//   5. Curtain closes, overlay fades, music swaps back
//
// Game is paused for the entire duration — all setTimeouts, animation
// frames, and timers hold until the party ends.

(function () {
  const PARTY_DURATION_MS = 10000;
  const CURTAIN_RISE_MS = 700;   // time for curtain to drop + split

  let partyActive = false;
  let overlay = null;

  function makeDancer(id, laneIdx, totalLanes) {
    const wrap = document.createElement('div');
    wrap.className = 'stage-dancer';
    wrap.style.setProperty('--lane', laneIdx);
    wrap.style.setProperty('--total-lanes', totalLanes);
    // Alternating entry side so dancers come from both wings of the stage
    wrap.classList.add(laneIdx % 2 === 0 ? 'from-wing-left' : 'from-wing-right');
    wrap.style.setProperty('--enter-delay', `${CURTAIN_RISE_MS + laneIdx * 100}ms`);
    wrap.style.setProperty('--hop-delay', `${CURTAIN_RISE_MS + 400 + laneIdx * 80}ms`);
    // Vary hop duration slightly per dancer so they don't move in lockstep
    wrap.style.setProperty('--hop-dur', `${440 + (laneIdx % 3) * 60}ms`);

    const img = document.createElement('img');
    img.src = Theme.sprite(`frog${id}`);
    img.alt = '';
    img.className = 'stage-dancer-img';
    wrap.appendChild(img);
    return wrap;
  }

  function makeStarDancer(frogId) {
    // The player's selected frog — center stage, larger, cycles through
    // 4 different moves (jump, spin, cartwheel, split-leap). Positioned
    // via its own CSS class, enters from below the stage.
    const wrap = document.createElement('div');
    wrap.className = 'stage-star-dancer';
    wrap.style.setProperty('--enter-delay', `${CURTAIN_RISE_MS + 100}ms`);

    const img = document.createElement('img');
    img.src = Theme.sprite(`frog${frogId}`);
    img.alt = '';
    img.className = 'stage-star-img';
    wrap.appendChild(img);
    return wrap;
  }

  function makeSpotlight(cx, color, delayMs) {
    const el = document.createElement('div');
    el.className = 'stage-spotlight';
    el.style.setProperty('--cx', `${cx}%`);
    el.style.setProperty('--spotlight-color', color);
    el.style.setProperty('--delay', `${delayMs}ms`);
    return el;
  }

  function selectedPlayerFrogId() {
    const id = parseInt(localStorage.getItem('leapfrog_frog_id') || '1', 10);
    const inRange = id >= 1 && id <= 11;
    const excluded = window.Theme && Theme.isFrogExcluded && Theme.isFrogExcluded(id);
    return inRange && !excluded ? id : 1;
  }

  function startParty(reason) {
    if (partyActive) return;
    partyActive = true;

    // Pause the background game — stop fact timer so the player's remaining
    // time isn't eaten by the celebration. Also notify ambient subsystem
    // via a global flag (ambient will check it before spawning).
    if (typeof stopFactTimer === 'function') stopFactTimer();
    window.__celebrationActive = true;

    // Build overlay DOM
    overlay = document.createElement('div');
    overlay.className = 'stage-overlay';

    // Dark theater backdrop (shown once curtain opens)
    const backdrop = document.createElement('div');
    backdrop.className = 'stage-backdrop';
    overlay.appendChild(backdrop);

    // Spotlights sweeping across the stage
    const spotlightsLayer = document.createElement('div');
    spotlightsLayer.className = 'stage-spotlights';
    spotlightsLayer.appendChild(makeSpotlight(20, '#ff6b9c', CURTAIN_RISE_MS + 200));
    spotlightsLayer.appendChild(makeSpotlight(50, '#ffee55', CURTAIN_RISE_MS + 400));
    spotlightsLayer.appendChild(makeSpotlight(80, '#5fdfff', CURTAIN_RISE_MS + 600));
    overlay.appendChild(spotlightsLayer);

    // Wooden stage floor
    const stage = document.createElement('div');
    stage.className = 'stage-floor';
    overlay.appendChild(stage);

    // Backup dancer row (6 dancers), on the stage flanking the star
    const dancerRow = document.createElement('div');
    dancerRow.className = 'stage-dancer-row';
    const playerFrog = selectedPlayerFrogId();
    // Pick 6 backup dancers — different variants from the player's frog
    const ids = [1, 3, 4, 6, 8, 9, 10].filter(id =>
      id !== playerFrog &&
      !(window.Theme && Theme.isFrogExcluded && Theme.isFrogExcluded(id))
    ).slice(0, 6);
    while (ids.length < 6) ids.push(1);
    // Split 3 on each side of the center (star takes middle spot)
    const left = ids.slice(0, 3);
    const right = ids.slice(3, 6);
    left.forEach((id, idx) => dancerRow.appendChild(makeDancer(id, idx, 7)));
    // Center placeholder — the star dancer is positioned absolutely so this
    // is just a flex spacer to keep backup dancers symmetric
    const spacer = document.createElement('div');
    spacer.className = 'stage-dancer-center-spacer';
    dancerRow.appendChild(spacer);
    right.forEach((id, idx) => dancerRow.appendChild(makeDancer(id, idx + 4, 7)));
    overlay.appendChild(dancerRow);

    // Star dancer — the player's selected frog, center stage
    const starDancer = makeStarDancer(playerFrog);
    overlay.appendChild(starDancer);

    // Banner above the stage — ALWAYS show both main and sub text so the
    // milestone context is clear even for the manual trigger.
    const banner = document.createElement('div');
    banner.className = 'stage-banner';
    const main = reason === 'manual'
      ? '🐸 DANCE PARTY 🐸'
      : '🎉 3 BOSSES DEFEATED! 🎉';
    const sub = reason === 'manual'
      ? 'CHEAT UNLOCKED'
      : 'DANCE BREAK';
    banner.innerHTML = `
      <div class="stage-banner-main">${main}</div>
      <div class="stage-banner-sub">${sub}</div>
    `;
    overlay.appendChild(banner);

    // Red velvet curtains — LAST in DOM so they sit on top
    const curtainLeft = document.createElement('div');
    curtainLeft.className = 'stage-curtain stage-curtain-left';
    overlay.appendChild(curtainLeft);
    const curtainRight = document.createElement('div');
    curtainRight.className = 'stage-curtain stage-curtain-right';
    overlay.appendChild(curtainRight);

    // Confetti layer above curtains for extra flair post-open
    for (let i = 0; i < 32; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'stage-confetti';
      confetti.style.left = `${Math.random() * 100}%`;
      confetti.style.animationDelay = `${CURTAIN_RISE_MS / 1000 + Math.random() * 3}s`;
      confetti.style.backgroundColor = ['#ff4d6a', '#ffcc33', '#33dd77', '#4fb0e8', '#c590f0', '#ff8800'][i % 6];
      confetti.style.setProperty('--spin', `${(Math.random() - 0.5) * 1440}deg`);
      overlay.appendChild(confetti);
    }

    document.body.appendChild(overlay);

    // Start party music (swap from main-game track)
    if (typeof Audio !== 'undefined' && Audio.enterPartyMode) {
      Audio.ensureCtx && Audio.ensureCtx();
      Audio.enterPartyMode();
    }

    // Auto-end after the full duration
    setTimeout(endParty, PARTY_DURATION_MS);
  }

  function endParty() {
    if (!partyActive) return;

    // Trigger curtain-close + fade animation
    if (overlay) overlay.classList.add('closing');

    // Restore main music
    if (typeof Audio !== 'undefined' && Audio.exitPartyMode) {
      Audio.exitPartyMode();
    }

    setTimeout(() => {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
      overlay = null;
      partyActive = false;
      // Un-pause: resume fact timer if a fact is still being asked.
      window.__celebrationActive = false;
      if (typeof startFactTimer === 'function' &&
          typeof state !== 'undefined' && state.currentFact &&
          !state.locked && !state.gameOver) {
        startFactTimer();
      }
    }, 800);
  }

  // ===== Secret manual trigger: D D D within 1.5s =====
  const SHORTCUT_WINDOW_MS = 1500;
  let dPresses = [];
  document.addEventListener('keydown', (e) => {
    if (!e.key || e.key.toLowerCase() !== 'd') return;
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    const now = Date.now();
    dPresses.push(now);
    dPresses = dPresses.filter(ts => now - ts <= SHORTCUT_WINDOW_MS);
    if (dPresses.length >= 3) {
      dPresses = [];
      startParty('manual');
    }
  });

  // ===== Public API =====
  window.Celebration = {
    isActive() { return partyActive; },
    start(reason) { startParty(reason || 'milestone'); },
    end() { endParty(); },
  };
})();
