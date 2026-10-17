// Leap Frog — Boss fight module.
// Depends on audio.js (Audio).
//
// How to use:
//   BossFight.start({
//     onWin:  () => { ...resume main game, give reward... },
//     onLose: () => { ...resume main game, apply penalty... },
//   });
//
// The fight runs entirely in its own overlay. The main game should pause while
// it's active (don't accept trivia input until onWin/onLose fires).

const BossFight = (() => {
  // ===== Config =====
  // Slower, more forgiving — the fun is landing the hit, not reflex twitch.
  const PLAYER_METER_SPEED = 1.3;   // % per frame
  const BOSS_METER_SPEED_MIN = 0.75;
  const BOSS_METER_SPEED_MAX = 1.1;
  // Comfortable strike zone — ~20% of the bar
  const STRIKE_ZONE_START = 65;
  const STRIKE_ZONE_END = 85;
  // Each fighter has 10 health; a landed strike drops the opponent by 1.
  const MAX_HEALTH = 10;
  const LIGHTNING_INTERVAL_MS = 2500;
  const INTRO_MS = 2900;            // "BOSS FIGHT" + name banner + jump-in time

  // ===== Boss roster — one is picked at random per fight =====
  // File paths come from Theme.sprite() so each theme can supply its own art.
  const BOSSES = [
    { id: 1, name: 'INFERNAL',  tagline: 'APPROACHES',    file: Theme.sprite('boss1') },
    { id: 2, name: 'BONEJAW',   tagline: 'RISES',         file: Theme.sprite('boss2') },
    { id: 3, name: 'TOAD KING', tagline: 'DEMANDS BLOOD', file: Theme.sprite('boss3') },
    { id: 4, name: 'CYBORG',    tagline: 'ENGAGED',       file: Theme.sprite('boss4') },
    { id: 5, name: 'PYRO',      tagline: 'IGNITES',       file: Theme.sprite('boss5') },
  ];

  function pickRandomBoss() {
    return BOSSES[Math.floor(Math.random() * BOSSES.length)];
  }

  // ===== State =====
  let active = false;
  let introing = false; // intro banner showing — strikes don't register
  let callbacks = {};
  let currentBoss = null; // the boss chosen for this fight
  let ducking = false;    // player is holding ↓ — dodges incoming tongue strikes
  // Both fighters start at full health; each strike drops the opponent by 1.
  // When either reaches 0, the fight ends.
  let playerHealth = MAX_HEALTH;
  let bossHealth = MAX_HEALTH;
  let playerMeter = 0;
  let bossMeter = 0;
  let bossMeterSpeed = 1.0;
  let rafId = null;
  let lightningTimer = null;
  let paused = false; // paused briefly after a hit (freeze frame)

  // ===== DOM =====
  const el = {};
  function cacheDom() {
    el.scene = document.getElementById('boss-scene');
    el.intro = document.getElementById('boss-intro');
    el.arena = document.getElementById('boss-arena');
    el.lightning = document.getElementById('lightning');
    el.instruction = document.getElementById('boss-instruction');
    el.result = document.getElementById('boss-result');
    el.resultText = document.getElementById('boss-result-text');
    el.playerSprite = document.getElementById('player-sprite');
    el.bossSprite = document.getElementById('boss-sprite');
    el.playerTongue = document.getElementById('player-tongue');
    el.bossTongue = document.getElementById('boss-tongue');
    el.playerMeterFill = document.getElementById('player-meter-fill');
    el.bossMeterFill = document.getElementById('boss-meter-fill');
    el.playerPower = document.getElementById('player-power-fill');
    el.bossPower = document.getElementById('boss-power-fill');
    el.bossName = document.getElementById('boss-name');
    el.bossNameSub = document.getElementById('boss-name-sub');
    el.bossLabel = document.getElementById('boss-label');
    el.playerStars = document.getElementById('player-stars');
    el.bossStars = document.getElementById('boss-stars');
    el.playerExplosion = document.getElementById('player-explosion');
    el.bossExplosion = document.getElementById('boss-explosion');
    el.playerMeterZone = document.getElementById('player-meter-zone');
    // Position the visible strike-zone band to match the hit window so what
    // you see is exactly what the code checks.
    if (el.playerMeterZone) {
      el.playerMeterZone.style.left = `${STRIKE_ZONE_START}%`;
      el.playerMeterZone.style.width = `${STRIKE_ZONE_END - STRIKE_ZONE_START}%`;
    }
  }

  // ===== Public: start a fight =====
  function start(cb) {
    if (active) return;
    if (!el.scene) cacheDom();
    callbacks = cb || {};
    active = true;
    introing = true;
    paused = false;
    playerHealth = MAX_HEALTH;
    bossHealth = MAX_HEALTH;
    playerMeter = 0;
    bossMeter = 0;
    bossMeterSpeed = randBossSpeed();
    ducking = false;

    renderPowerBars();
    // Player's fighter uses whichever frog they chose in the picker.
    // Fall back to frog1 if the chosen id is out of range OR excluded by the
    // active theme (e.g. Modern excludes 5 and 7).
    const chosenFrogId = parseInt(localStorage.getItem('leapfrog_frog_id') || '1', 10);
    const inRange = chosenFrogId >= 1 && chosenFrogId <= 11;
    const excluded = window.Theme && Theme.isFrogExcluded && Theme.isFrogExcluded(chosenFrogId);
    const effectiveId = inRange && !excluded ? chosenFrogId : 1;
    const frogFile = Theme.sprite(`frog${effectiveId}`);
    el.playerSprite.innerHTML = `<img src="${frogFile}" alt="frog" class="sprite-img">`;

    // Pick a random boss and apply his sprite + name to the intro.
    currentBoss = pickRandomBoss();
    el.bossSprite.innerHTML = `<img src="${currentBoss.file}" alt="${currentBoss.name}" class="sprite-img">`;
    if (el.bossName)    el.bossName.textContent = currentBoss.name;
    if (el.bossNameSub) el.bossNameSub.textContent = currentBoss.tagline;
    if (el.bossLabel)   el.bossLabel.textContent = currentBoss.name;

    el.playerSprite.classList.remove('hit', 'exploded', 'ducking');
    el.bossSprite.classList.remove('hit', 'exploded', 'entering');
    // Trigger the dramatic entrance on the next frame so the animation plays.
    requestAnimationFrame(() => el.bossSprite.classList.add('entering'));
    el.playerTongue.classList.remove('firing', 'missed');
    el.bossTongue.classList.remove('firing', 'missed');
    el.playerStars.classList.remove('showing');
    el.bossStars.classList.remove('showing');
    clearParticles(el.playerExplosion);
    clearParticles(el.bossExplosion);
    el.result.classList.add('hidden');
    el.intro.classList.remove('leaving');
    el.intro.style.display = '';
    el.scene.classList.remove('leaving', 'shaking');

    // Show the overlay
    el.scene.classList.remove('hidden');

    // Switch music to boss mode (each boss has their own theme)
    Audio.enterBossMode(currentBoss.id);
    Audio.sfxBossIntro();

    // Boss lands with a thud + screen shake (matches the entrance landing)
    setTimeout(() => {
      shakeScreen();
      Audio.sfxBossHit();
    }, 1180);

    // Start lightning flashes
    startLightning();

    // After intro banner, kick off the actual fight
    setTimeout(() => {
      el.intro.classList.add('leaving');
      el.bossSprite.classList.remove('entering');
      introing = false;
      startFightLoop();
    }, INTRO_MS);
  }

  function randBossSpeed() {
    return BOSS_METER_SPEED_MIN + Math.random() * (BOSS_METER_SPEED_MAX - BOSS_METER_SPEED_MIN);
  }

  // Compute color stage class from current health %.
  function stageFor(health) {
    const pct = (health / MAX_HEALTH) * 100;
    if (pct > 60) return 'stage-good';
    if (pct > 30) return 'stage-caution';
    if (pct > 15) return 'stage-danger';
    return 'stage-critical';
  }

  function renderPowerBars() {
    if (el.playerPower) {
      const pct = Math.max(0, (playerHealth / MAX_HEALTH) * 100);
      el.playerPower.style.width = `${pct}%`;
      el.playerPower.className = `power-fill ${stageFor(playerHealth)}`;
    }
    if (el.bossPower) {
      const pct = Math.max(0, (bossHealth / MAX_HEALTH) * 100);
      el.bossPower.style.width = `${pct}%`;
      el.bossPower.className = `power-fill ${stageFor(bossHealth)}`;
    }
  }

  // ===== Lightning atmosphere =====
  function startLightning() {
    const flashOnce = () => {
      el.lightning.classList.remove('flash');
      void el.lightning.offsetWidth;
      el.lightning.classList.add('flash');
      Audio.sfxThunder();
    };
    // One flash shortly after start, then on an interval
    setTimeout(flashOnce, 400);
    lightningTimer = setInterval(flashOnce, LIGHTNING_INTERVAL_MS + Math.random() * 2000);
  }

  function stopLightning() {
    if (lightningTimer) {
      clearInterval(lightningTimer);
      lightningTimer = null;
    }
  }

  // ===== Main fight loop =====
  function startFightLoop() {
    const tick = () => {
      if (!active) return;
      if (!paused) {
        playerMeter = Math.min(100, playerMeter + PLAYER_METER_SPEED);
        bossMeter = Math.min(100, bossMeter + bossMeterSpeed);
        el.playerMeterFill.style.width = `${playerMeter}%`;
        el.bossMeterFill.style.width = `${bossMeter}%`;

        // If player overshoots the strike zone, meter wraps back to 0 (missed window)
        if (playerMeter >= 100) {
          playerMeter = 0;
          el.playerMeterFill.style.width = `0%`;
        }

        // Boss strikes automatically when its meter is full
        if (bossMeter >= 100) {
          bossStrike();
          bossMeter = 0;
          el.bossMeterFill.style.width = `0%`;
          bossMeterSpeed = randBossSpeed();
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }

  // ===== Player strike (called on SPACE/click) =====
  function playerStrike() {
    if (!active || introing || paused) return;
    // Can't attack while ducking — crouch is purely defensive.
    if (ducking) return;
    const inZone = playerMeter >= STRIKE_ZONE_START && playerMeter <= STRIKE_ZONE_END;
    if (inZone) {
      // HIT! — tongue extends, lands, boss reels back
      Audio.sfxTongueWhip();
      fireTongue(el.playerTongue);
      setTimeout(() => {
        Audio.sfxBossHit();
        shakeScreen();
        bossHealth = Math.max(0, bossHealth - 1);
        renderPowerBars();

        if (bossHealth <= 0) {
          // KNOCKOUT — explode the boss
          explode(el.bossExplosion, el.bossSprite);
          paused = true;
          setTimeout(() => finish('win'), 950);
        } else {
          showStars(el.bossStars);
          el.bossSprite.classList.remove('hit');
          void el.bossSprite.offsetWidth;
          el.bossSprite.classList.add('hit');
        }
      }, 160);
    } else {
      // Mis-timed — tongue goes out but falls short
      Audio.sfxTongueWhip();
      fireTongue(el.playerTongue, true);
    }
    playerMeter = 0;
    el.playerMeterFill.style.width = `0%`;
  }

  // ===== Boss strike =====
  function bossStrike() {
    Audio.sfxTongueWhip();
    fireTongue(el.bossTongue);
    setTimeout(() => {
      // If the player is ducking, the tongue sails over them — no damage taken,
      // show a satisfying "DODGE!" bubble instead.
      if (ducking) {
        showDodgeBubble();
        Audio.sfxCorrect(); // victorious little blip
        return;
      }
      Audio.sfxBossHit();
      shakeScreen();
      playerHealth = Math.max(0, playerHealth - 1);
      renderPowerBars();

      if (playerHealth <= 0) {
        // KNOCKOUT — explode the player
        explode(el.playerExplosion, el.playerSprite);
        paused = true;
        setTimeout(() => finish('lose'), 950);
      } else {
        showStars(el.playerStars);
        el.playerSprite.classList.remove('hit');
        void el.playerSprite.offsetWidth;
        el.playerSprite.classList.add('hit');
      }
    }, 160);
  }

  // Public: toggle the player's duck pose (called from game.js on ↓ key).
  function setDucking(isDown) {
    ducking = isDown;
    if (!el.playerSprite) return;
    el.playerSprite.classList.toggle('ducking', isDown);
  }

  function showDodgeBubble() {
    if (!el.playerSprite) return;
    // Spawn an ephemeral DODGE bubble above the player's sprite
    let bubble = el.playerSprite.parentElement.querySelector('.dodge-bubble');
    if (!bubble) {
      bubble = document.createElement('div');
      bubble.className = 'dodge-bubble';
      bubble.textContent = 'DODGE!';
      el.playerSprite.parentElement.appendChild(bubble);
    }
    bubble.classList.remove('showing');
    void bubble.offsetWidth;
    bubble.classList.add('showing');
    setTimeout(() => bubble.classList.remove('showing'), 900);
  }

  function fireTongue(tongueEl, missed = false) {
    tongueEl.classList.remove('firing', 'missed');
    void tongueEl.offsetWidth;
    tongueEl.classList.add('firing');
    if (missed) tongueEl.classList.add('missed');
    // Keep the tongue extended briefly, then retract.
    setTimeout(() => {
      tongueEl.classList.remove('firing', 'missed');
    }, 280);
  }


  function shakeScreen() {
    el.scene.classList.remove('shaking');
    void el.scene.offsetWidth;
    el.scene.classList.add('shaking');
  }

  function showStars(starsEl) {
    starsEl.classList.remove('showing');
    void starsEl.offsetWidth;
    starsEl.classList.add('showing');
  }

  function clearParticles(container) {
    while (container.firstChild) container.removeChild(container.firstChild);
    container.classList.remove('active');
  }

  // Spawn chunky pixel particles flying outward in a burst.
  function explode(container, spriteEl) {
    clearParticles(container);
    const colors = ['p-yellow', 'p-orange', 'p-red', 'p-white', 'p-pink'];
    const particleCount = 18;
    for (let i = 0; i < particleCount; i++) {
      const p = document.createElement('div');
      p.className = `particle ${colors[i % colors.length]}`;
      // Random angle + distance so particles fan out in a chunky starburst
      const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.4;
      const distance = 80 + Math.random() * 70;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance - 20; // slight upward bias so it feels like it lifts
      p.style.setProperty('--dx', `${dx}px`);
      p.style.setProperty('--dy', `${dy}px`);
      p.style.setProperty('--sx', `${(Math.random() - 0.5) * 10}px`);
      p.style.setProperty('--sy', `${(Math.random() - 0.5) * 10}px`);
      container.appendChild(p);
      // Trigger the animation on next frame
      requestAnimationFrame(() => p.classList.add('flying'));
    }
    container.classList.add('active');
    // Hide the sprite after a brief flash so the explosion replaces it
    setTimeout(() => spriteEl.classList.add('exploded'), 150);
    // Clean up the particles after they finish animating
    setTimeout(() => clearParticles(container), 1100);
  }

  function finish(outcome) {
    if (!active) return;
    active = false;
    paused = true;
    cancelAnimationFrame(rafId);
    stopLightning();

    el.result.classList.remove('hidden');
    el.resultText.classList.remove('victory', 'defeat');

    if (outcome === 'win') {
      el.resultText.textContent = 'VICTORY!';
      el.resultText.classList.add('victory');
      Audio.sfxBossVictory();
    } else {
      el.resultText.textContent = 'DEFEATED';
      el.resultText.classList.add('defeat');
      Audio.sfxBossDefeat();
    }

    // Wait, then fade out and callback
    setTimeout(() => {
      el.scene.classList.add('leaving');
      setTimeout(() => {
        el.scene.classList.add('hidden');
        el.scene.classList.remove('leaving');
        Audio.exitBossMode();
        if (outcome === 'win' && callbacks.onWin) callbacks.onWin();
        else if (outcome === 'lose' && callbacks.onLose) callbacks.onLose();
      }, 500);
    }, 1600);
  }

  function isActive() { return active; }

  return { start, playerStrike, setDucking, isActive };
})();
