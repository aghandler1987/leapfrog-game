// Leap Frog — game logic
// Depends on facts.js (FROG_FACTS, getFactQueue)

// ========== Config ==========
// Sprite paths come from Theme.sprite(). Theme is loaded by theme.js before
// this script and defaults to 'retro'. See theme.js for registered themes.
function selectedFrogFile() {
  const id = parseInt(localStorage.getItem('leapfrog_frog_id') || '1', 10);
  // 1-10 are the standard variants, 11 is the Konami-unlocked golden frog.
  // A theme may exclude certain IDs (e.g. Modern excludes 5 and 7) — fall back
  // to frog1 so a saved pick from another theme doesn't 404 the sprite.
  const inRange = id >= 1 && id <= 11;
  const excluded = window.Theme && Theme.isFrogExcluded && Theme.isFrogExcluded(id);
  const effectiveId = inRange && !excluded ? id : 1;
  return Theme.sprite(`frog${effectiveId}`);
}

const SPRITES = {
  FROG: `<img src="${selectedFrogFile()}" alt="frog" class="sprite-img">`,
};

// Pick a random lilypad sprite from the 5 variants. Called per-spawn so each
// pad in the row is independently rolled, giving the course organic variety.
function randomLilypadHtml() {
  const id = 1 + Math.floor(Math.random() * 5);
  return `<img src="${Theme.sprite(`lilypad${id}`)}" alt="lilypad" class="sprite-img">`;
}

const LILYPAD_SPACING = 190;        // px between lilypad centers (pads are 160px wide → ~30px gap)
const MAX_VISIBLE_BEHIND = 2;       // lilypads kept behind the frog before pruning
const VISIBLE_AHEAD = 4;            // lilypads kept ahead of the frog
const WRONG_FEEDBACK_MS = 2800;     // how long to show wrong-answer explanation
const CORRECT_FEEDBACK_MS = 700;    // how long to show correct-answer explanation
const STARTING_LIVES = 3;

// ========== State ==========
const state = {
  score: 0,
  highScore: parseInt(localStorage.getItem('leapfrog_high') || '0', 10),
  lives: STARTING_LIVES,
  position: 0,
  factQueue: [],
  currentFact: null,
  locked: false,
  gameOver: false,
  streak: 0,              // consecutive correct answers — triggers boss at BOSS_STREAK
  lilypads: new Map(),    // Map<index, HTMLElement>
};

const BOSS_STREAK = 3;
const BOSS_WIN_SCORE_BONUS = 3;

// ========== DOM refs ==========
const el = {
  score: document.getElementById('score'),
  highScore: document.getElementById('high-score'),
  lives: document.getElementById('lives'),
  livesWrap: document.querySelector('.lives-wrap'),
  damageFlash: document.getElementById('damage-flash'),
  frog: document.getElementById('frog'),
  splash: document.getElementById('splash'),
  track: document.getElementById('track'),
  factCard: document.getElementById('fact-card'),
  factText: document.getElementById('fact-text'),
  btnTrue: document.getElementById('btn-true'),
  btnFalse: document.getElementById('btn-false'),
  feedback: document.getElementById('feedback'),
  gameOver: document.getElementById('game-over'),
  finalScore: document.getElementById('final-score'),
  newBest: document.getElementById('new-best'),
  btnRestart: document.getElementById('btn-restart'),
  btnMute: document.getElementById('btn-mute'),
  muteIcon: document.getElementById('mute-icon'),
  combo: document.getElementById('combo'),
  comboValue: document.getElementById('combo-value'),
  timerFill: document.getElementById('fact-timer-fill'),
  answerOrbs: document.getElementById('answer-orbs'),
  orbTrue:  document.getElementById('orb-true'),
  orbFalse: document.getElementById('orb-false'),
  orbTongue: document.getElementById('orb-tongue'),
};

// ========== Fact timer ==========
const FACT_TIMER_MS = 10000;
let factTimerRaf = null;
let factTimerStart = 0;

function stopFactTimer() {
  if (factTimerRaf) cancelAnimationFrame(factTimerRaf);
  factTimerRaf = null;
}

function startFactTimer() {
  stopFactTimer();
  if (!el.timerFill) return;
  factTimerStart = performance.now();
  el.timerFill.style.width = '100%';
  el.timerFill.classList.remove('caution', 'danger', 'critical');

  const tick = () => {
    const elapsed = performance.now() - factTimerStart;
    const remaining = Math.max(0, FACT_TIMER_MS - elapsed);
    const pct = (remaining / FACT_TIMER_MS) * 100;
    el.timerFill.style.width = `${pct}%`;

    // Color stages
    el.timerFill.classList.remove('caution', 'danger', 'critical');
    if (pct <= 15)      el.timerFill.classList.add('critical');
    else if (pct <= 30) el.timerFill.classList.add('danger');
    else if (pct <= 60) el.timerFill.classList.add('caution');

    if (remaining <= 0) {
      stopFactTimer();
      // Timeout = wrong answer (counts as a miss)
      handleTimeout();
      return;
    }
    factTimerRaf = requestAnimationFrame(tick);
  };
  factTimerRaf = requestAnimationFrame(tick);
}

function handleTimeout() {
  if (state.locked || state.gameOver || !state.currentFact) return;
  // Fire a "wrong" with the opposite of the correct answer so handleAnswer
  // treats it as a miss. The player will see the right answer in the feedback.
  handleAnswer(!state.currentFact.isTrue);
}

// ========== Rendering ==========

function frogScreenX() {
  return window.innerWidth / 2;
}

function lilypadX(index) {
  const offset = index - state.position;
  return frogScreenX() + offset * LILYPAD_SPACING;
}

function ensureLilypad(index) {
  if (state.lilypads.has(index)) return state.lilypads.get(index);
  const pad = document.createElement('div');
  pad.className = 'lilypad';
  pad.innerHTML = randomLilypadHtml();
  // Spawn OFF-SCREEN to the right of its target so it slides in naturally
  // when the next render pass sets its real position.
  const target = lilypadX(index);
  const spawnX = target + LILYPAD_SPACING; // one slot further right than its destination
  pad.style.left = `${spawnX}px`;
  pad.style.opacity = '0';
  el.track.appendChild(pad);
  state.lilypads.set(index, pad);
  // Next frame: fade in and let the transition carry it to its target position.
  requestAnimationFrame(() => {
    pad.style.opacity = '1';
    pad.style.left = `${target}px`;
  });
  return pad;
}

function removeLilypad(index) {
  const pad = state.lilypads.get(index);
  if (!pad) return;
  state.lilypads.delete(index);
  // Slide off further to the left + fade, then remove.
  const current = parseFloat(pad.style.left) || 0;
  pad.style.left = `${current - LILYPAD_SPACING}px`;
  pad.style.opacity = '0';
  setTimeout(() => pad.remove(), 400);
}

// Scroll-only camera: lilypads behind the window just slide off to the left and vanish.
function renderLilypads() {
  const minVisibleIndex = state.position - MAX_VISIBLE_BEHIND;
  const maxVisibleIndex = state.position + VISIBLE_AHEAD;

  for (const [index, pad] of state.lilypads) {
    if (index < minVisibleIndex || index > maxVisibleIndex) {
      removeLilypad(index);
    } else {
      pad.style.left = `${lilypadX(index)}px`;
    }
  }

  for (let i = minVisibleIndex; i <= maxVisibleIndex; i++) {
    if (i < 0) continue;
    ensureLilypad(i);
  }
}

function padScore(n) {
  return String(n).padStart(3, '0');
}

function renderScore() {
  el.score.textContent = padScore(state.score);
  if (state.score > state.highScore) {
    state.highScore = state.score;
    localStorage.setItem('leapfrog_high', String(state.highScore));
  }
  el.highScore.textContent = padScore(state.highScore);
}

function renderLives() {
  if (!el.lives) return;
  const hearts = el.lives.querySelectorAll('.life');
  hearts.forEach((heart, i) => {
    heart.classList.remove('losing');
    if (i < state.lives) {
      heart.classList.remove('lost');
    } else {
      heart.classList.add('lost');
    }
  });
}

// Dramatic "you lost a life" feedback — plays the losing animation on the
// heart that just died + flashes the lives box and the whole screen.
function playLifeLostFx() {
  if (el.damageFlash) {
    el.damageFlash.classList.remove('flashing');
    void el.damageFlash.offsetWidth;
    el.damageFlash.classList.add('flashing');
  }
  if (el.livesWrap) {
    el.livesWrap.classList.remove('flashing');
    void el.livesWrap.offsetWidth;
    el.livesWrap.classList.add('flashing');
    setTimeout(() => el.livesWrap.classList.remove('flashing'), 1000);
  }
  if (!el.lives) return;
  const hearts = el.lives.querySelectorAll('.life');
  const dyingHeart = hearts[state.lives];
  if (dyingHeart) {
    dyingHeart.classList.remove('lost');
    dyingHeart.classList.add('losing');
    setTimeout(() => {
      dyingHeart.classList.remove('losing');
      dyingHeart.classList.add('lost');
    }, 600);
  }
}

// ========== Fact flow ==========

function nextFact() {
  if (state.gameOver) return;
  if (state.factQueue.length === 0) {
    state.factQueue = getFactQueue();
  }
  state.currentFact = state.factQueue.shift();
  el.factText.textContent = state.currentFact.text;
  el.feedback.classList.add('hidden');
  el.feedback.className = 'feedback hidden';
  el.btnTrue.disabled = false;
  el.btnFalse.disabled = false;
  startFactTimer();
  state.locked = false;
}

function handleAnswer(playerAnswer) {
  if (state.locked || state.gameOver || !state.currentFact) return;
  stopFactTimer();
  state.locked = true;
  el.btnTrue.disabled = true;
  el.btnFalse.disabled = true;

  const correct = playerAnswer === state.currentFact.isTrue;

  if (correct) {
    Audio.sfxCorrect();
    state.streak += 1;
    showFeedback(true, state.currentFact.explanation);
    hopForward();

    if (state.streak >= BOSS_STREAK) {
      // Trigger boss AFTER the explanation reads a moment — don't advance to next fact.
      state.streak = 0;
      setTimeout(startBossFight, CORRECT_FEEDBACK_MS + 500);
    } else {
      setTimeout(nextFact, CORRECT_FEEDBACK_MS + 500);
    }
  } else {
    state.lives -= 1;
    state.streak = 0;  // any wrong answer breaks the streak
    renderCombo();
    Audio.sfxWrong();
    setTimeout(() => Audio.sfxLifeLost(), 180);
    playLifeLostFx();      // animate the dying heart BEFORE marking it lost
    setTimeout(renderLives, 650);  // finalize to greyed-out after the animation
    showFeedback(false, state.currentFact.explanation);

    if (state.lives <= 0) {
      // Final wrong — delay the splash so the player can read the explanation
      setTimeout(triggerGameOver, WRONG_FEEDBACK_MS - 400);
    } else {
      hopBack();
      setTimeout(nextFact, WRONG_FEEDBACK_MS);
    }
  }
}

// ========== Boss fight integration ==========

function startBossFight() {
  // Hide the trivia card during the fight
  el.factCard.classList.add('hidden-temporarily');
  setAnswerOrbsVisible(false);
  state.locked = true;
  stopFactTimer();
  setMusicPlayerLocked(true);

  BossFight.start({
    onWin: () => {
      // Reward: +3 score, regain a heart (cap at 3)
      state.score += BOSS_WIN_SCORE_BONUS;
      if (state.lives < STARTING_LIVES) {
        state.lives += 1;
        renderLives();
      }
      renderScore();
      el.factCard.classList.remove('hidden-temporarily');
      setAnswerOrbsVisible(true);
      state.locked = false;
      setMusicPlayerLocked(false);
      nextFact();
    },
    onLose: () => {
      // Penalty: lose a heart. If that was the last, game over.
      state.lives -= 1;
      playLifeLostFx();
      setTimeout(renderLives, 650);
      el.factCard.classList.remove('hidden-temporarily');
      setAnswerOrbsVisible(true);
      setMusicPlayerLocked(false);

      if (state.lives <= 0) {
        setTimeout(triggerGameOver, 400);
      } else {
        state.locked = false;
        nextFact();
      }
    },
  });
}

// ========== Answer via orb (tongue grabs the chosen floating orb) ==========
// Called from Up/Down arrow or clicks on the orb. Fires the diagonal tongue
// from the frog's mouth to the orb; when the tongue reaches, calls handleAnswer.
// A local flag that blocks re-entry while the tongue+grab animation is playing,
// without touching state.locked (which handleAnswer manages itself).
let orbAnimating = false;

function answerViaOrb(isTrue) {
  if (orbAnimating) return;
  if (state.locked || state.gameOver || !state.currentFact) return;
  if (typeof BossFight !== 'undefined' && BossFight.isActive()) return;
  const orb = isTrue ? el.orbTrue : el.orbFalse;
  if (!orb) {
    // No orb UI available — fall back to normal answer flow
    handleAnswer(isTrue);
    return;
  }
  orbAnimating = true;
  // Pause the countdown while the player's answer is "locking in"
  stopFactTimer();
  fireOrbTongue(orb);
  // Fly flash fires at the moment the tongue "lands" on it (mid-extension)
  setTimeout(() => {
    orb.classList.remove('grabbed');
    void orb.offsetWidth;
    orb.classList.add('grabbed');
  }, 200);
  // Wait for the tongue to fully retract into the mouth (0.4s animation) BEFORE
  // triggering the hop/feedback, so the tongue never visibly detaches when the
  // frog starts moving.
  setTimeout(() => {
    orbAnimating = false;
    handleAnswer(isTrue);
  }, 420);
}

// Compute and animate the tongue from the frog's mouth to the orb center.
function fireOrbTongue(orbEl) {
  if (!el.orbTongue || !el.frog || !orbEl) return;
  const frogRect = el.frog.getBoundingClientRect();
  const orbRect  = orbEl.getBoundingClientRect();

  // The mouth's y-position within the sprite is theme-dependent — retro
  // sprites have the mouth at ~32% from top, Modern sprites at ~55%. Read
  // the same --mouth-y-ratio CSS variable that the CSS tongue positions use
  // so everything stays in sync.
  const mouthRatio = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--mouth-y-ratio')
  ) || 0.35;
  const mouthX = frogRect.left + frogRect.width / 2;
  const mouthY = frogRect.top  + frogRect.height * mouthRatio;
  const orbX   = orbRect.left + orbRect.width / 2;
  const orbY   = orbRect.top  + orbRect.height / 2;

  const dx = orbX - mouthX;
  const dy = orbY - mouthY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angleRad = Math.atan2(dy, dx);
  const angleDeg = angleRad * 180 / Math.PI;

  // Position + rotate the tongue so it points from mouth → orb
  el.orbTongue.style.top  = `${mouthY}px`;
  el.orbTongue.style.left = `${mouthX}px`;
  el.orbTongue.style.transform = `translateY(-50%) rotate(${angleDeg}deg)`;
  el.orbTongue.style.setProperty('--tongue-length', `${length}px`);

  el.orbTongue.classList.remove('firing');
  void el.orbTongue.offsetWidth;
  el.orbTongue.classList.add('firing');

  Audio.sfxTongueWhip && Audio.sfxTongueWhip();
}

function showFeedback(isCorrect, explanation) {
  el.feedback.innerHTML = `
    <span class="feedback-verdict">${isCorrect ? '✓ Correct!' : '✗ Wrong!'}</span>
    ${explanation}
  `;
  el.feedback.classList.remove('hidden');
  el.feedback.className = `feedback ${isCorrect ? 'correct' : 'wrong'}`;
}

// ========== Hop animation ==========

// Combo multiplier scales the per-correct point award with the streak.
// Streak 0-1 → x1, streak 2 → x2, streak 3 → x3, cap at x5.
function comboMultiplier() {
  return Math.min(5, Math.max(1, state.streak));
}

function renderCombo() {
  if (!el.combo) return;
  const multiplier = comboMultiplier();
  if (state.streak < 2) {
    el.combo.classList.add('hidden');
    return;
  }
  el.combo.classList.remove('hidden');
  el.comboValue.textContent = multiplier;
  // Re-trigger pop animation
  el.combo.classList.remove('pulsing');
  void el.combo.offsetWidth;
  el.combo.classList.add('pulsing');
}

function hopForward() {
  state.score += comboMultiplier();
  renderScore();
  renderCombo();

  Audio.sfxHop();
  el.frog.classList.remove('hopping-forward', 'hopping-back', 'wobbling');
  void el.frog.offsetWidth;
  el.frog.classList.add('hopping-forward');

  setTimeout(() => {
    state.position += 1;
    renderLilypads();
  }, 220);
}

function hopBack() {
  // At the starting lilypad there's nowhere to go — wobble in place instead.
  if (state.position === 0) {
    wobble();
    return;
  }

  Audio.sfxHop();
  el.frog.classList.remove('hopping-forward', 'hopping-back', 'wobbling');
  void el.frog.offsetWidth;
  el.frog.classList.add('hopping-back');

  setTimeout(() => {
    state.position -= 1;
    renderLilypads();
  }, 220);
}

function wobble() {
  el.frog.classList.remove('hopping-forward', 'hopping-back', 'wobbling');
  void el.frog.offsetWidth;
  el.frog.classList.add('wobbling');
  setTimeout(() => el.frog.classList.remove('wobbling'), 600);
}

// ========== Game over ==========

function triggerGameOver() {
  state.gameOver = true;

  // Hide the fact card so the drama is unobstructed
  el.factCard.classList.add('hidden-temporarily');
  setAnswerOrbsVisible(false);

  // Stop background music during the splashdown
  Audio.stopMusic();

  // Frog falls into the water
  el.frog.classList.remove('hopping-forward', 'hopping-back', 'wobbling');
  void el.frog.offsetWidth;
  el.frog.classList.add('falling');

  // Splash around the time the frog hits the water
  setTimeout(() => {
    Audio.sfxSplash();
    el.splash.classList.remove('hidden');
    void el.splash.offsetWidth;
    el.splash.classList.add('splashing');
  }, 500);

  // Game over jingle
  setTimeout(() => Audio.sfxGameOver(), 900);

  // Show the game over panel after the splash settles
  setTimeout(showGameOverPanel, 1700);
}

function showGameOverPanel() {
  const isNewBest = state.score > 0 && state.score >= state.highScore;
  el.finalScore.textContent = state.score;
  if (isNewBest && state.score > 0) {
    el.newBest.classList.remove('hidden');
  } else {
    el.newBest.classList.add('hidden');
  }
  el.gameOver.classList.remove('hidden');
}

function restart() {
  // Reset state
  state.score = 0;
  state.lives = STARTING_LIVES;
  state.position = 0;
  state.streak = 0;
  state.currentFact = null;
  state.locked = false;
  state.gameOver = false;
  state.factQueue = getFactQueue();
  renderCombo();

  // Clear lilypads
  for (const [index] of state.lilypads) {
    const pad = state.lilypads.get(index);
    if (pad) pad.remove();
  }
  state.lilypads.clear();

  // Reset frog + splash
  el.frog.classList.remove('falling', 'hopping-forward', 'hopping-back');
  el.splash.classList.remove('splashing');
  el.splash.classList.add('hidden');

  // Reset UI
  el.factCard.classList.remove('hidden-temporarily');
  el.gameOver.classList.add('hidden');
  el.newBest.classList.add('hidden');
  setAnswerOrbsVisible(true);

  renderScore();
  renderLives();
  renderLilypads();
  nextFact();

  if (!Audio.isMuted()) Audio.startMusic();
}

// ========== Input ==========

// Audio needs a user gesture to start (browser requirement). The "PRESS ANY
// KEY" splash is both the attract screen AND the required gesture target —
// any input on it dismisses it AND kicks the audio in the same tick.
const startSplash = document.getElementById('start-splash');
let audioStarted = false;

// ===== Splash theme picker =====
// Renders a row of theme tiles on the splash screen. Clicking a tile saves
// the choice to localStorage and reloads the page with the new theme.
// Lives on the splash ONLY — can't be changed mid-game.
function renderThemePickerInto(containerId) {
  const picker = document.getElementById(containerId);
  if (!picker || !window.Theme) return;
  const themes = Theme.list();
  const currentId = Theme.id;
  picker.innerHTML = themes.map(t =>
    `<button class="theme-tile${t.id === currentId ? ' selected' : ''}" data-theme-id="${t.id}">${t.name.toUpperCase()}</button>`
  ).join('');
  picker.addEventListener('click', (e) => {
    const tile = e.target.closest('.theme-tile');
    if (!tile) return;
    const id = tile.dataset.themeId;
    if (id && id !== currentId && Theme.set(id)) {
      location.reload();
    }
  });
}
renderThemePickerInto('splash-theme-picker');
renderThemePickerInto('game-over-theme-picker');

function kickAudio() {
  if (audioStarted) return;
  audioStarted = true;
  if (!Audio.isMuted()) {
    // startMusic internally resumes the AudioContext and waits for it before
    // scheduling, so the music begins the moment the browser allows it.
    Audio.startMusic();
  } else {
    Audio.ensureCtx();
  }
  if (startSplash) {
    startSplash.classList.add('dismissed');
    setTimeout(() => startSplash.remove(), 400);
  }
}

// Any user gesture anywhere kicks audio. The splash itself is a huge click
// target but we also listen on window for key presses.
// EXCEPTION: clicks on splash theme-picker tiles must NOT kick audio, because
// those trigger a page reload — we don't want to dismiss the splash first.
function kickAudioMaybe(e) {
  if (e && e.target && e.target.closest && e.target.closest('.theme-tile')) return;
  kickAudio();
}
['pointerdown', 'keydown', 'touchstart'].forEach(evt => {
  window.addEventListener(evt, kickAudioMaybe, { capture: true, passive: true });
});

function updateMuteIcon() {
  const m = Audio.isMuted();
  el.muteIcon.textContent = m ? '×' : '♪';
  el.btnMute.classList.toggle('muted', m);
}
updateMuteIcon();

el.btnMute.addEventListener('click', () => {
  const nowMuted = Audio.toggleMute();
  updateMuteIcon();
  if (nowMuted) {
    Audio.stopMusic();
  } else {
    Audio.ensureCtx();
    Audio.startMusic();
  }
});

el.btnTrue.addEventListener('click', () => { kickAudio(); answerViaOrb(true); });
el.btnFalse.addEventListener('click', () => { kickAudio(); answerViaOrb(false); });
el.btnRestart.addEventListener('click', () => { kickAudio(); restart(); });

// Clicks on the floating TRUE/FALSE orbs
if (el.orbTrue)  el.orbTrue.addEventListener('click',  () => { kickAudio(); answerViaOrb(true); });
if (el.orbFalse) el.orbFalse.addEventListener('click', () => { kickAudio(); answerViaOrb(false); });

// ===== Music player controls =====
const btnPrevTrack = document.getElementById('btn-prev-track');
const btnPlayPause = document.getElementById('btn-play-pause');
const btnNextTrack = document.getElementById('btn-next-track');
const trackNameEl  = document.getElementById('track-name');

function renderTrackName() {
  if (!trackNameEl) return;
  const t = Audio.getCurrentTrack();
  trackNameEl.textContent = `${t.index + 1}. ${t.name}`;
}

function renderPlayPauseIcon() {
  if (!btnPlayPause) return;
  const p = Audio.isPaused();
  btnPlayPause.textContent = p ? '►' : 'II';
  btnPlayPause.classList.toggle('paused', p);
  btnPlayPause.classList.toggle('playing', !p);
}

if (btnPrevTrack) btnPrevTrack.addEventListener('click', () => {
  kickAudio();
  Audio.prevTrack();
  renderTrackName();
});
if (btnNextTrack) btnNextTrack.addEventListener('click', () => {
  kickAudio();
  Audio.nextTrack();
  renderTrackName();
});
if (btnPlayPause) btnPlayPause.addEventListener('click', () => {
  kickAudio();
  Audio.togglePause();
  renderPlayPauseIcon();
});

// Initial render once audio is ready
renderTrackName();
renderPlayPauseIcon();

// Show/hide the floating TRUE/FALSE orbs
function setAnswerOrbsVisible(visible) {
  if (!el.answerOrbs) return;
  el.answerOrbs.classList.toggle('hidden-temporarily', !visible);
}

// Lock/unlock the music player during boss fights (track swap doesn't make
// sense while the boss theme is playing).
function setMusicPlayerLocked(locked) {
  const cluster = document.querySelector('.audio-cluster');
  [btnPrevTrack, btnPlayPause, btnNextTrack].forEach(b => {
    if (b) b.disabled = locked;
  });
  if (cluster) cluster.classList.toggle('boss-locked', locked);
}

document.addEventListener('keydown', (e) => {
  kickAudio();
  // If the frog picker modal is open, don't dispatch game controls — the
  // only accepted key is Escape, handled by the picker's own listener.
  if (picker.modal && !picker.modal.classList.contains('hidden')) return;
  if (e.key.toLowerCase() === 'm') {
    el.btnMute.click();
    return;
  }
  // Dev hotkey: Shift+B triggers a boss fight on demand (for testing).
  // Uses Shift so the plain "B" of the Konami Code doesn't fire a boss.
  if (e.shiftKey && e.key.toLowerCase() === 'b' && !BossFight.isActive() && !state.gameOver) {
    state.streak = 0;
    startBossFight();
    return;
  }
  // Boss fight input: SPACE to strike
  if (BossFight.isActive()) {
    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      BossFight.playerStrike();
    }
    return;
  }
  if (state.gameOver) {
    if (e.key === 'Enter' || e.key === ' ') restart();
    return;
  }
  // T / F answer the trivia (the tongue flicks at the matching fly).
  // Arrow keys are deliberately NOT bound to answers so they stay free for
  // Konami (↑↑↓↓...), the upward-tongue (↑+Space), and ducking (↓ in boss).
  if (e.key.toLowerCase() === 't') {
    answerViaOrb(true);
  } else if (e.key.toLowerCase() === 'f') {
    answerViaOrb(false);
  } else if (e.key === ' ' || e.code === 'Space') {
    e.preventDefault();
    // Hold Up + press Space → fire the tongue upward (and maybe eat a bug!)
    if (upArrowHeld) {
      fireTongueUp();
    } else {
      flickTongue();
    }
  }
});

// Fidget: pop the frog's tongue briefly. Cosmetic only; purely for fun.
const frogTongueEl   = document.getElementById('frog-tongue');
const frogTongueUpEl = document.getElementById('frog-tongue-up');
const yumBubbleEl    = document.getElementById('yum-bubble');

function flickTongue() {
  if (!frogTongueEl) return;
  frogTongueEl.classList.remove('flicking');
  // Force reflow so the animation restarts if SPACE is mashed repeatedly
  void frogTongueEl.offsetWidth;
  frogTongueEl.classList.add('flicking');
  Audio.sfxHop();  // short chirp — reuse the hop sound as a cheap "tongue" SFX
}

// Fire tongue straight up. If it overlaps a dragonfly/fish, eat it and show YUM.
function fireTongueUp() {
  if (!frogTongueUpEl) return;
  frogTongueUpEl.classList.remove('firing');
  void frogTongueUpEl.offsetWidth;
  frogTongueUpEl.classList.add('firing');
  Audio.sfxHop();

  // Check for collisions over the ~400ms the tongue is extended. We sample at
  // multiple times to catch bugs that are moving fast.
  const checkTimes = [120, 180, 240];
  checkTimes.forEach(t => setTimeout(checkTongueUpCollisions, t));
}

function checkTongueUpCollisions() {
  if (!frogTongueUpEl) return;
  const tongueRect = frogTongueUpEl.getBoundingClientRect();
  if (tongueRect.height < 20) return; // Not extended yet

  const prey = document.querySelectorAll('.ambient-bug, .ambient-fish');
  let ate = false;
  for (const p of prey) {
    if (p.dataset.eaten === '1') continue;
    const r = p.getBoundingClientRect();
    const overlap = !(r.right  < tongueRect.left  ||
                      r.left   > tongueRect.right ||
                      r.bottom < tongueRect.top   ||
                      r.top    > tongueRect.bottom);
    if (overlap) {
      p.dataset.eaten = '1';
      // Little shrink-and-fade
      p.style.transition = 'transform 0.15s ease-out, opacity 0.15s ease-out';
      p.style.transform  = (p.style.transform || '') + ' scale(0.1)';
      p.style.opacity    = '0';
      setTimeout(() => p.remove(), 180);
      ate = true;
    }
  }
  if (ate) {
    showYum();
    Audio.sfxCorrect();  // satisfying little blip
  }
}

function showYum() {
  if (!yumBubbleEl) return;
  yumBubbleEl.classList.remove('showing', 'hidden');
  void yumBubbleEl.offsetWidth;
  yumBubbleEl.classList.add('showing');
  // Hide after animation
  setTimeout(() => {
    yumBubbleEl.classList.remove('showing');
    yumBubbleEl.classList.add('hidden');
  }, 1100);
}

// Track Up-arrow hold state so Space can tell "regular tongue" from "upward tongue".
let upArrowHeld = false;
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowUp') upArrowHeld = true;
  // Hold ↓ to duck. In the main game it's cosmetic; in a boss fight it dodges
  // the boss's tongue strike. Routes to the right sprite depending on mode.
  // ↓ now = answer FALSE in the main game, so the duck is only active in boss mode
  if (e.key === 'ArrowDown' && !state.gameOver &&
      typeof BossFight !== 'undefined' && BossFight.isActive()) {
    e.preventDefault();
    BossFight.setDucking(true);
  }
});
document.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowUp') upArrowHeld = false;
  if (e.key === 'ArrowDown' &&
      typeof BossFight !== 'undefined' && BossFight.isActive()) {
    BossFight.setDucking(false);
  }
});

// Tap/click anywhere during boss fight = strike (for mobile/touch)
document.addEventListener('pointerdown', (e) => {
  if (!BossFight.isActive()) return;
  // Don't let UI clicks (mute, frog-picker) also fire a strike
  if (e.target && e.target.closest &&
      (e.target.closest('.mute-btn') ||
       e.target.closest('.variants-link') ||
       e.target.closest('.frog-picker'))) return;
  BossFight.playerStrike();
});

window.addEventListener('resize', renderLilypads);

// ========== Init ==========

// Replace the frog image in the main-game HTML with the selected variant.
// The HTML ships with frog.svg hardcoded; this swaps it on load.
function applySelectedFrogSprite() {
  const file = selectedFrogFile();
  const img = el.frog && el.frog.querySelector('img');
  if (img) img.src = file;
  // Toggle sparkle effect only when the Konami-unlocked golden frog is both
  // (a) selected AND (b) actually unlocked AND (c) not excluded by the active
  // theme. Previously this fired on any `leapfrog_frog_id === 11`, so a stale
  // localStorage value could leave sparkles twinkling around the classic hero.
  if (el.frog) {
    const chosenId = parseInt(localStorage.getItem('leapfrog_frog_id') || '1', 10);
    const excluded = window.Theme && Theme.isFrogExcluded && Theme.isFrogExcluded(chosenId);
    const showSparkles = chosenId === 11 && isGoldenUnlocked() && !excluded;
    el.frog.classList.toggle('is-golden', showSparkles);
  }
}

// ========== Frog picker modal ==========

const FROG_VARIANTS = [
  { id: 1,  name: 'CLASSIC' },
  { id: 2,  name: 'HAPPY YELLOW' },
  { id: 3,  name: 'BLUE DART' },
  { id: 4,  name: 'TOMATO' },
  { id: 5,  name: 'SPACE' },
  { id: 6,  name: 'TALL TREE' },
  { id: 7,  name: 'BULLFROG' },
  { id: 8,  name: 'HORNED' },
  { id: 9,  name: 'GLASS' },
  { id: 10, name: 'BIG HEAD' },
  // id 11 is the gold frog — only shown in the picker after Konami unlock.
  { id: 11, name: 'GOLDEN', secret: true },
];

function isGoldenUnlocked() {
  return localStorage.getItem('leapfrog_konami') === '1';
}

function visibleFrogVariants() {
  return FROG_VARIANTS.filter(f => {
    if (f.secret && !isGoldenUnlocked()) return false;
    if (window.Theme && Theme.isFrogExcluded && Theme.isFrogExcluded(f.id)) return false;
    return true;
  });
}

const picker = {
  modal: document.getElementById('frog-picker'),
  grid:  document.getElementById('frog-picker-grid'),
  btnOpen:  document.getElementById('btn-frog-picker'),
  btnClose: document.getElementById('btn-close-picker'),
};

function renderFrogPicker() {
  if (!picker.grid) return;
  const currentId = parseInt(localStorage.getItem('leapfrog_frog_id') || '1', 10);
  picker.grid.innerHTML = visibleFrogVariants().map(f => {
    const sparkles = f.id === 11 ? `
      <div class="golden-sparkles">
        <span class="sparkle sparkle-1">✦</span>
        <span class="sparkle sparkle-2">✦</span>
        <span class="sparkle sparkle-3">✦</span>
        <span class="sparkle sparkle-4">✦</span>
        <span class="sparkle sparkle-5">✦</span>
        <span class="sparkle sparkle-6">✦</span>
      </div>` : '';
    const extraClass =
      (f.id === currentId ? ' selected' : '') +
      (f.secret ? ' frog-pick-secret' : '') +
      (f.id === 11 ? ' golden-sparkle-pick' : '');
    return `
    <div class="frog-pick${extraClass}" data-frog-id="${f.id}">
      ${sparkles}
      <img src="${Theme.sprite(`frog${f.id}`)}" alt="${f.name}" class="frog-pick-img"/>
      <div class="frog-pick-name">${f.name}</div>
    </div>
  `;
  }).join('');
}

function openFrogPicker() {
  if (!picker.modal) return;
  stopFactTimer(); // pause the countdown while browsing
  renderFrogPicker();
  picker.modal.classList.remove('hidden');
}

function closeFrogPicker() {
  if (!picker.modal) return;
  picker.modal.classList.add('hidden');
  // Resume the fact timer only if we're mid-fact and not game-over or in boss
  if (state.currentFact && !state.locked && !state.gameOver &&
      typeof BossFight !== 'undefined' && !BossFight.isActive()) {
    startFactTimer();
  }
}

function chooseFrog(id) {
  const valid = id >= 1 && id <= 11;
  localStorage.setItem('leapfrog_frog_id', String(valid ? id : 1));
  // Live swap: update the SPRITES map (used for future renders) and the
  // on-pond frog image right now so there's no reload needed.
  SPRITES.FROG = `<img src="${selectedFrogFile()}" alt="frog" class="sprite-img">`;
  applySelectedFrogSprite();
  closeFrogPicker();
}

// ========== Konami Code easter egg ==========
// ↑↑↓↓←→←→BA → unlocks the golden frog, auto-selects it, plays fanfare + flash.
// Arrows are not bound to answers, so no conflict and no suppression needed.
const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
let konamiIndex = 0;

document.addEventListener('keydown', (e) => {
  const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (key === KONAMI[konamiIndex]) {
    konamiIndex++;
    if (konamiIndex === KONAMI.length) {
      konamiIndex = 0;
      triggerKonamiUnlock();
    }
  } else {
    // Wrong key — but it might restart the sequence from index 0
    konamiIndex = (key === KONAMI[0]) ? 1 : 0;
  }
});

function triggerKonamiUnlock() {
  // Already unlocked? Still fire the banner but skip the save.
  const wasLocked = !isGoldenUnlocked();
  localStorage.setItem('leapfrog_konami', '1');
  // Auto-select the golden frog
  chooseFrog(11);
  // Fanfare + banner
  if (typeof Audio !== 'undefined' && Audio.sfxFanfare) Audio.sfxFanfare();
  const banner = document.getElementById('konami-banner');
  if (banner) {
    banner.classList.remove('hidden');
    // Reset animations by removing/reflowing/re-adding the show state
    void banner.offsetWidth;
    setTimeout(() => banner.classList.add('hidden'), 3100);
  }
}

if (picker.btnOpen) picker.btnOpen.addEventListener('click', openFrogPicker);
if (picker.btnClose) picker.btnClose.addEventListener('click', closeFrogPicker);
if (picker.modal) {
  // Click outside the card closes
  picker.modal.addEventListener('click', (e) => {
    if (e.target === picker.modal) closeFrogPicker();
  });
  // Click on a frog tile selects
  picker.grid.addEventListener('click', (e) => {
    const tile = e.target.closest('.frog-pick');
    if (!tile) return;
    const id = parseInt(tile.dataset.frogId, 10);
    chooseFrog(id);
  });
}

// Escape closes the picker; C opens it (any screen except boss/game-over)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && picker.modal && !picker.modal.classList.contains('hidden')) {
    closeFrogPicker();
    return;
  }
  // C opens the frog picker — matches the footer legend hint
  if (e.key && e.key.toLowerCase() === 'c') {
    // Don't hijack C while typing in an input (future-proofing — no inputs today)
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
    // Don't open during active boss fight or game-over
    if (typeof BossFight !== 'undefined' && BossFight.isActive && BossFight.isActive()) return;
    if (state.gameOver) return;
    if (picker.modal && picker.modal.classList.contains('hidden')) {
      openFrogPicker();
    }
  }
});

function init() {
  applySelectedFrogSprite();
  state.factQueue = getFactQueue();
  renderScore();
  renderLives();
  renderLilypads();
  nextFact();
}

init();
