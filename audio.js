// Leap Frog — chiptune audio via Web Audio API
// All music and SFX are synthesized in JS. No audio files.
//
// Browsers block audio until a user gesture, so we lazy-init on the first play.
//
// Music uses a proper lookahead scheduler (not setInterval) for tight timing.
// The theme is a 32-bar 80s arcade loop with four voices:
//   - LEAD (square): main melody
//   - ARP  (square): fast arpeggios, Mega Man style
//   - BASS (triangle): walking bassline
//   - DRUM (noise):   kick + snare pattern

const Audio = (() => {
  let ctx = null;
  let masterGain = null;
  let musicGain = null;
  let sfxGain = null;
  let muted = localStorage.getItem('leapfrog_muted') === '1';

  // Scheduler state
  let schedulerTimer = null;
  let nextStepTime = 0;
  let currentStep = 0;
  const SCHEDULE_AHEAD_SEC = 0.1;    // schedule 100ms ahead
  const SCHEDULER_INTERVAL_MS = 25;  // check every 25ms

  // ===== Note frequencies (equal temperament) =====
  const NOTES = {
    'C2': 65.41,  'D2': 73.42,  'E2': 82.41,  'F2': 87.31,  'G2': 98.00,  'A2': 110.00, 'B2': 123.47,
    'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'B3': 246.94,
    'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
    'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'B5': 987.77,
    'C6': 1046.50, 'D6': 1174.66, 'E6': 1318.51, 'F6': 1396.91, 'G6': 1567.98,
    // Sharps/flats
    'Fs4': 369.99, 'Gs4': 415.30, 'As4': 466.16, 'Cs5': 554.37, 'Ds5': 622.25, 'Fs5': 739.99, 'Gs5': 830.61,
    'Fs3': 185.00, 'Gs3': 207.65, 'As3': 233.08,
    REST: 0,
    '.': 0, // alias for REST — compact notation
  };

  // ===== Timing =====
  const BPM = 140;
  const STEP_SEC = (60 / BPM) / 4; // 16th note duration

  // ===== Theme: 64 steps (16 bars at 4 steps/bar) × 2 sections = 128 steps =====
  // Each voice has an array where each index is a 16th note.
  // Use '.' for a hold/rest. A note name = trigger a new note.
  //
  // Key: A minor (relative to C major) — classic arcade feel.
  //
  // Section A (steps 0-63): main theme
  // Section B (steps 64-127): bridge/contrast

  // ===== Main-game themes — 5 selectable tracks =====
  // Each: { name, bpm, lead, arp (nullable), bass, drum }
  // Shape is identical to BOSS_THEMES (arp is optional).

  const MAIN_THEMES = [
    // Track 1: ARCADE HOP — the original A-minor bouncy pentatonic
    {
      name: 'ARCADE HOP',
      bpm: 128,
      lead: [
        'A4','.', 'C5','.', 'E5','.', 'A5','.',  'G5','.', 'E5','.', 'C5','D5',  'E5','.',
        'F5','.', 'E5','.', 'D5','.', 'C5','.',  'B4','.', 'C5','D5', 'E5','.',  '.','.',
        'A4','.', 'C5','.', 'E5','.', 'A5','.',  'G5','.', 'E5','.', 'C5','D5',  'E5','.',
        'D5','.', 'C5','.', 'B4','.', 'A4','.',  'G4','.', 'A4','B4', 'A4','.',  '.','.',
        'E5','.', 'G5','.', 'A5','.', 'C6','.',  'B5','.', 'A5','.', 'G5','A5',  'B5','.',
        'C6','.', 'B5','.', 'A5','.', 'G5','.',  'F5','.', 'G5','A5', 'G5','.',  '.','.',
        'E5','.', 'G5','.', 'A5','.', 'C6','.',  'B5','.', 'G5','.', 'E5','G5',  'A5','.',
        'G5','.', 'F5','.', 'E5','.', 'D5','.',  'C5','.', 'B4','A4', 'A4','.',  '.','.',
      ],
      arp: [
        'A3','E4','A4','E4', 'A3','E4','A4','E4', 'A3','E4','A4','E4', 'A3','E4','A4','E4',
        'F3','C4','F4','C4', 'F3','C4','F4','C4', 'F3','C4','F4','C4', 'F3','C4','F4','C4',
        'C4','G4','C5','G4', 'C4','G4','C5','G4', 'C4','G4','C5','G4', 'C4','G4','C5','G4',
        'G3','D4','G4','D4', 'G3','D4','G4','D4', 'G3','D4','G4','D4', 'G3','D4','G4','D4',
        'F3','C4','F4','C4', 'F3','C4','F4','C4', 'F3','C4','F4','C4', 'F3','C4','F4','C4',
        'G3','D4','G4','D4', 'G3','D4','G4','D4', 'G3','D4','G4','D4', 'G3','D4','G4','D4',
        'C4','G4','C5','G4', 'C4','G4','C5','G4', 'C4','G4','C5','G4', 'C4','G4','C5','G4',
        'A3','E4','A4','E4', 'A3','E4','A4','E4', 'A3','E4','A4','E4', 'A3','E4','A4','E4',
      ],
      bass: [
        'A2','.', 'A2','.', 'E2','.', 'A2','.', 'A2','.', 'C3','.', 'E3','.', 'A2','.',
        'F2','.', 'F2','.', 'C3','.', 'F2','.', 'F2','.', 'A2','.', 'C3','.', 'F2','.',
        'C3','.', 'C3','.', 'G2','.', 'C3','.', 'C3','.', 'E3','.', 'G3','.', 'C3','.',
        'G2','.', 'G2','.', 'D3','.', 'G2','.', 'G2','.', 'B2','.', 'D3','.', 'G2','.',
        'F2','.', 'F2','.', 'C3','.', 'F2','.', 'F2','.', 'A2','.', 'C3','.', 'F2','.',
        'G2','.', 'G2','.', 'D3','.', 'G2','.', 'G2','.', 'B2','.', 'D3','.', 'G2','.',
        'C3','.', 'C3','.', 'G2','.', 'C3','.', 'C3','.', 'E3','.', 'G3','.', 'C3','.',
        'A2','.', 'A2','.', 'E2','.', 'A2','.', 'A2','.', 'C3','.', 'E3','.', 'A2','.',
      ],
      drum: [
        'K','.','H','.',  'S','.','H','.',  'K','.','H','K',  'S','.','H','.',
        'K','.','H','.',  'S','.','H','.',  'K','.','H','K',  'S','.','H','.',
        'K','.','H','.',  'S','.','H','.',  'K','.','H','K',  'S','.','H','.',
        'K','.','H','.',  'S','.','H','.',  'K','.','H','K',  'S','H','S','H',
        'K','.','H','.',  'S','.','H','.',  'K','.','H','K',  'S','.','H','.',
        'K','.','H','.',  'S','.','H','.',  'K','.','H','K',  'S','.','H','.',
        'K','.','H','.',  'S','.','H','.',  'K','.','H','K',  'S','.','H','.',
        'K','.','H','.',  'S','.','H','.',  'K','.','H','K',  'S','H','S','H',
      ],
    },

    // Track 2: SUNNY POND — bright, major-key, breezy
    {
      name: 'SUNNY POND',
      bpm: 118,
      lead: [
        'C5','.', 'E5','.', 'G5','.', 'C6','.',  'B5','.', 'G5','.', 'E5','G5',  'C6','.',
        'D5','.', 'F5','.', 'A5','.', 'D6','.',  'C6','.', 'A5','.', 'F5','A5',  'D6','.',
        'E5','.', 'G5','.', 'B5','.', 'E6','.',  'D6','.', 'B5','.', 'G5','B5',  'E6','.',
        'F5','.', 'E5','.', 'D5','.', 'C5','.',  'G4','.', 'G4','.',  'C5','.',  '.','.',
        'G5','.', 'E5','.', 'C5','.', 'E5','.',  'G5','.', 'C6','.', 'B5','A5',  'G5','.',
        'A5','.', 'F5','.', 'D5','.', 'F5','.',  'A5','.', 'D6','.', 'C6','B5',  'A5','.',
        'C6','.', 'B5','.', 'A5','.', 'G5','.',  'F5','.', 'E5','.', 'D5','E5',  'C5','.',
        'E5','.', 'G5','.', 'C6','.', 'E6','.',  'D6','C6','B5','A5','G5','F5',  'E5','.',
      ],
      arp: null,
      bass: [
        'C3','.', 'C3','.', 'G2','.', 'C3','.', 'C3','.', 'E3','.', 'G3','.', 'C3','.',
        'D3','.', 'D3','.', 'A2','.', 'D3','.', 'D3','.', 'Fs3','.','A3','.', 'D3','.',
        'E3','.', 'E3','.', 'B2','.', 'E3','.', 'E3','.', 'Gs3','.','B3','.', 'E3','.',
        'C3','.', 'C3','.', 'G2','.', 'C3','.', 'G2','.', 'G2','.', 'C3','.', '.','.',
        'C3','.', 'C3','.', 'G2','.', 'C3','.', 'C3','.', 'E3','.', 'G3','.', 'C3','.',
        'D3','.', 'D3','.', 'A2','.', 'D3','.', 'D3','.', 'Fs3','.','A3','.', 'D3','.',
        'F3','.', 'F3','.', 'C3','.', 'F3','.', 'G3','.', 'E3','.', 'D3','.', 'C3','.',
        'C3','.', 'E3','.', 'G3','.', 'C4','.', 'G3','.', 'E3','.', 'C3','.', 'C3','.',
      ],
      drum: [
        'K','.','H','.',  'S','.','H','.',  'K','.','H','.',  'S','.','H','.',
        'K','.','H','.',  'S','.','H','.',  'K','.','H','.',  'S','.','H','H',
        'K','.','H','.',  'S','.','H','.',  'K','.','H','.',  'S','.','H','.',
        'K','.','H','.',  'S','.','H','.',  'K','.','H','.',  'S','H','S','.',
        'K','.','H','.',  'S','.','H','.',  'K','.','H','.',  'S','.','H','.',
        'K','.','H','.',  'S','.','H','.',  'K','.','H','.',  'S','.','H','H',
        'K','.','H','.',  'S','.','H','.',  'K','.','H','.',  'S','.','H','.',
        'K','.','H','.',  'S','.','H','.',  'K','.','H','.',  'S','S','S','S',
      ],
    },

    // Track 3: NIGHT POND — slower, dreamy, minor
    {
      name: 'NIGHT POND',
      bpm: 90,
      lead: [
        'E5','.','.','.',  'G5','.','.','.',  'A5','.','.','.',  'B5','.','.','.',
        'A5','.','.','.',  'G5','.','.','.',  'E5','.','.','.',  '.','.','.','.',
        'C5','.','.','.',  'E5','.','.','.',  'G5','.','.','.',  'A5','.','.','.',
        'G5','.','.','.',  'E5','.','.','.',  'C5','.','.','.',  '.','.','.','.',
        'A4','.','.','.',  'C5','.','.','.',  'E5','.','.','.',  'A5','.','.','.',
        'G5','.','F5','.', 'E5','.','D5','.', 'C5','.','.','.',  '.','.','.','.',
        'E5','.','.','.',  'G5','.','.','.',  'A5','.','.','.',  'B5','.','.','.',
        'C6','B5','A5','G5','F5','E5','D5','C5','B4','A4','.','.','.','.','.','.',
      ],
      arp: null,
      bass: [
        'A2','.','.','.','.','.','.','.','A2','.','.','.','.','.','.','.',
        'A2','.','.','.','.','.','.','.','E3','.','.','.','.','.','.','.',
        'C3','.','.','.','.','.','.','.','C3','.','.','.','.','.','.','.',
        'C3','.','.','.','.','.','.','.','G2','.','.','.','.','.','.','.',
        'A2','.','.','.','.','.','.','.','A2','.','.','.','.','.','.','.',
        'F2','.','.','.','.','.','.','.','C3','.','.','.','.','.','.','.',
        'A2','.','.','.','.','.','.','.','E3','.','.','.','.','.','.','.',
        'A2','.','.','.','E2','.','.','.','A2','.','.','.','.','.','.','.',
      ],
      drum: [
        'K','.','.','.',  '.','.','.','.',  'S','.','.','.',  '.','.','.','.',
        'K','.','.','.',  '.','.','.','.',  'S','.','.','.',  '.','.','.','.',
        'K','.','.','.',  '.','.','.','.',  'S','.','.','.',  '.','.','.','.',
        'K','.','.','.',  '.','.','.','.',  'S','.','.','.',  '.','.','.','.',
        'K','.','.','.',  '.','.','.','.',  'S','.','.','.',  '.','.','.','.',
        'K','.','.','.',  '.','.','.','.',  'S','.','.','.',  '.','.','.','.',
        'K','.','.','.',  '.','.','.','.',  'S','.','.','.',  '.','.','.','.',
        'K','.','.','.',  '.','.','.','.',  'S','.','.','.',  'S','.','.','.',
      ],
    },

    // Track 4: FROG RAVE — fast, repetitive, pumping bass
    {
      name: 'FROG RAVE',
      bpm: 170,
      lead: [
        'A4','A4','E5','.', 'A4','A4','E5','.', 'A4','A4','G5','.', 'A4','A4','E5','.',
        'C5','C5','G5','.', 'C5','C5','G5','.', 'C5','C5','B5','.', 'C5','C5','G5','.',
        'A4','A4','E5','.', 'A4','A4','E5','.', 'A4','A4','G5','.', 'A4','A4','E5','.',
        'C5','E5','G5','C6','B5','G5','E5','C5','A4','E5','A5','E5','C6','A5','E5','A4',
        'E5','E5','A5','.', 'E5','E5','A5','.', 'E5','E5','C6','.', 'E5','E5','A5','.',
        'G5','G5','C6','.', 'G5','G5','C6','.', 'G5','G5','E6','.', 'G5','G5','C6','.',
        'A4','C5','E5','A5','C6','E6','.','.','G5','E5','C5','A4','E4','A4','C5','E5',
        'A4','.','.','.',  'A4','.','.','.',  'A4','A4','A4','A4','A4','A4','A4','A4',
      ],
      arp: [
        'A3','E4','A4','E4', 'A3','E4','A4','E4', 'A3','E4','A4','E4', 'A3','E4','A4','E4',
        'C4','G4','C5','G4', 'C4','G4','C5','G4', 'C4','G4','C5','G4', 'C4','G4','C5','G4',
        'A3','E4','A4','E4', 'A3','E4','A4','E4', 'A3','E4','A4','E4', 'A3','E4','A4','E4',
        'F3','C4','F4','C4', 'F3','C4','F4','C4', 'G3','D4','G4','D4', 'G3','D4','G4','D4',
        'A3','E4','A4','E4', 'A3','E4','A4','E4', 'A3','E4','A4','E4', 'A3','E4','A4','E4',
        'C4','G4','C5','G4', 'C4','G4','C5','G4', 'C4','G4','C5','G4', 'C4','G4','C5','G4',
        'A3','E4','A4','E4', 'A3','E4','A4','E4', 'C4','G4','C5','G4', 'C4','G4','C5','G4',
        'A3','E4','A4','E4', 'A3','E4','A4','E4', 'A3','E4','A4','E4', 'A3','E4','A4','E4',
      ],
      bass: [
        'A2','.','A2','.','A2','.','A2','.','A2','.','A2','.','A2','.','A2','.',
        'C3','.','C3','.','C3','.','C3','.','C3','.','C3','.','C3','.','C3','.',
        'A2','.','A2','.','A2','.','A2','.','A2','.','A2','.','A2','.','A2','.',
        'F2','.','F2','.','F2','.','F2','.','G2','.','G2','.','G2','.','G2','.',
        'A2','.','A2','.','A2','.','A2','.','A2','.','A2','.','A2','.','A2','.',
        'C3','.','C3','.','C3','.','C3','.','C3','.','C3','.','C3','.','C3','.',
        'A2','.','A2','.','A2','.','A2','.','C3','.','C3','.','C3','.','C3','.',
        'A2','.','A2','.','A2','.','A2','.','A2','A2','A2','A2','A2','A2','A2','A2',
      ],
      drum: [
        'K','H','H','H', 'K','H','H','H', 'K','H','H','H', 'K','H','H','H',
        'K','H','S','H', 'K','H','S','H', 'K','H','S','H', 'K','H','S','H',
        'K','H','H','H', 'K','H','H','H', 'K','H','H','H', 'K','H','H','H',
        'K','H','S','H', 'K','H','S','H', 'K','H','S','H', 'K','H','S','H',
        'K','H','H','H', 'K','H','H','H', 'K','H','H','H', 'K','H','H','H',
        'K','H','S','H', 'K','H','S','H', 'K','H','S','H', 'K','H','S','H',
        'K','H','H','H', 'K','H','H','H', 'K','H','H','H', 'K','H','H','H',
        'K','K','S','S', 'K','K','S','S', 'K','K','S','S', 'K','S','K','S',
      ],
    },

    // Track 5: SWAMP BLUES — slow, bluesy, 12-bar feel
    {
      name: 'SWAMP BLUES',
      bpm: 100,
      lead: [
        'C5','.', 'Ds5','.', 'E5','.', '.','.', 'G5','.', 'E5','Ds5', 'C5','.', '.','.',
        'C5','.', 'Ds5','.', 'E5','.', '.','.', 'G5','.', 'A5','.',   'G5','.', '.','.',
        'F5','.', 'Fs5','.', 'G5','.', '.','.', 'As5','.','G5','Fs5', 'F5','.', '.','.',
        'C5','.', 'Ds5','.', 'E5','.', '.','.', 'G5','.', 'E5','Ds5', 'C5','.', '.','.',
        'G5','.', 'A5','.',  'As5','.','G5','.','E5','.', 'G5','.',   'E5','.', 'C5','.',
        'C5','.', 'Ds5','.', 'E5','.', '.','.', 'G5','.', 'E5','Ds5', 'C5','.', '.','.',
        'A4','.', 'C5','.',  'E5','.', 'C5','.','A4','.', 'G4','.',   'E4','.', '.','.',
        'C5','.', 'Ds5','.', 'E5','.', 'G5','.','A5','G5','E5','Ds5', 'C5','.', '.','.',
      ],
      arp: null,
      bass: [
        'C2','.','G2','.','C3','.','G2','.','C2','.','G2','.','C3','.','G2','.',
        'C2','.','G2','.','C3','.','G2','.','C2','.','G2','.','C3','.','G2','.',
        'F2','.','C3','.','F3','.','C3','.','F2','.','C3','.','F3','.','C3','.',
        'C2','.','G2','.','C3','.','G2','.','C2','.','G2','.','C3','.','G2','.',
        'G2','.','D3','.','G3','.','D3','.','F2','.','C3','.','C2','.','G2','.',
        'C2','.','G2','.','C3','.','G2','.','C2','.','G2','.','C3','.','G2','.',
        'A2','.','E3','.','A3','.','E3','.','F2','.','C3','.','C2','.','G2','.',
        'C2','.','G2','.','C3','.','E3','.','G3','.','C3','.','C2','.','.','.',
      ],
      drum: [
        'K','.','.','.','S','.','H','.','K','.','.','.','S','.','H','.',
        'K','.','.','.','S','.','H','.','K','.','.','.','S','.','H','.',
        'K','.','.','.','S','.','H','.','K','.','.','.','S','.','H','.',
        'K','.','.','.','S','.','H','.','K','.','.','.','S','.','H','.',
        'K','.','.','.','S','.','H','.','K','.','.','.','S','.','H','.',
        'K','.','.','.','S','.','H','.','K','.','.','.','S','.','H','.',
        'K','.','.','.','S','.','H','.','K','.','.','.','S','.','H','.',
        'K','.','.','.','S','.','H','.','K','H','H','H','S','H','S','H',
      ],
    },
  ];

  let currentMainTrack = parseInt(localStorage.getItem('leapfrog_track') || '0', 10);
  if (currentMainTrack < 0 || currentMainTrack >= MAIN_THEMES.length) currentMainTrack = 0;
  let paused = false;

  // ===== Boss themes — one per boss, each with its own BPM/mood =====
  // Each theme: { bpm, lead[], bass[], drum[] }

  const BOSS_THEMES = {
    // Boss 1: INFERNAL — fiery minor, driving (the original boss theme)
    1: {
      bpm: 160,
      lead: [
        'A4','.', 'E5','.', 'A5','.', 'Gs5','.',  'A5','.', 'E5','.', 'C5','.', 'B4','.',
        'A4','.', 'E5','.', 'A5','.', 'Gs5','.',  'A5','B5','C6','.', 'B5','A5','Gs5','.',
        'A4','.', 'E5','.', 'A5','.', 'Gs5','.',  'A5','.', 'C6','.', 'E6','.', 'D6','.',
        'C6','.', 'B5','.', 'A5','.', 'Gs5','.',  'A5','.', '.','.',   '.','.',  '.','.',
      ],
      bass: [
        'A2','A2','.','.','A2','A2','.','.','A2','A2','A2','.','E2','E2','.','.',
        'F2','F2','.','.','F2','F2','.','.','F2','F2','F2','.','C3','C3','.','.',
        'G2','G2','.','.','G2','G2','.','.','G2','G2','G2','.','D3','D3','.','.',
        'E2','E2','.','.','E2','E2','.','.','E2','E2','E2','.','E2','Gs2','A2','.',
      ],
      drum: [
        'K','.','H','H', 'S','.','H','H', 'K','H','H','K', 'S','.','H','S',
        'K','.','H','H', 'S','.','H','H', 'K','H','H','K', 'S','.','H','S',
        'K','.','H','H', 'S','.','H','H', 'K','H','H','K', 'S','.','H','S',
        'K','.','H','H', 'S','.','H','H', 'K','H','H','K', 'S','S','S','S',
      ],
    },

    // Boss 2: BONEJAW — slow creepy, sparse rests, ominous
    2: {
      bpm: 95,
      lead: [
        'A4','.','.','.', 'C5','.','.','.',  'E5','.','.','.', 'D5','.','.','.',
        'C5','.','.','.', 'B4','.','.','.',  'A4','.','.','.', '.','.','.','.',
        'A4','.','.','.', 'C5','.','.','.',  'E5','.','.','.', 'F5','.','.','.',
        'E5','.','D5','.','C5','.','B4','.', 'A4','.','.','.', '.','.','.','.',
      ],
      bass: [
        'A2','.','.','.','.','.','.','.','A2','.','.','.','.','.','.','.',
        'F2','.','.','.','.','.','.','.','F2','.','.','.','.','.','.','.',
        'A2','.','.','.','.','.','.','.','A2','.','.','.','.','.','.','.',
        'E2','.','.','.','.','.','.','.','E2','.','.','.','.','.','.','.',
      ],
      drum: [
        'K','.','.','.', '.','.','.','.',  'S','.','.','.', '.','.','.','.',
        'K','.','.','.', '.','.','.','.',  'S','.','.','.', '.','.','.','.',
        'K','.','.','.', '.','.','.','.',  'S','.','.','.', '.','.','.','.',
        'K','.','.','.', '.','.','.','.',  'S','.','S','.', 'S','.','S','.',
      ],
    },

    // Boss 3: TOAD KING — regal royal march, dotted rhythms
    3: {
      bpm: 110,
      lead: [
        'C5','.','E5','G5', 'C6','.','.','.', 'B5','.','G5','.',  'E5','.','C5','.',
        'D5','.','F5','A5', 'D6','.','.','.', 'C6','.','A5','.',  'F5','.','D5','.',
        'E5','.','G5','C6', 'E6','.','.','.', 'D6','C6','B5','.', 'A5','G5','F5','.',
        'E5','.','D5','.',  'C5','.','.','.', 'C5','.','.','.',   '.','.','.','.',
      ],
      bass: [
        'C3','.','G2','.','C3','.','G2','.','C3','.','G2','.','C3','.','G2','.',
        'F2','.','C3','.','F2','.','C3','.','F2','.','C3','.','F2','.','C3','.',
        'C3','.','G2','.','C3','.','G2','.','C3','.','G2','.','C3','.','G2','.',
        'G2','.','D3','.','G2','.','D3','.','C3','.','G2','.','C3','.','.','.',
      ],
      drum: [
        'K','.','H','.', 'K','.','S','.',  'K','.','H','.', 'K','.','S','.',
        'K','.','H','.', 'K','.','S','.',  'K','.','H','.', 'K','.','S','.',
        'K','.','H','.', 'K','.','S','.',  'K','.','H','.', 'K','.','S','.',
        'K','.','H','.', 'K','.','S','.',  'K','.','S','.', 'K','S','K','S',
      ],
    },

    // Boss 4: CYBORG — synthwave 8-bit, repetitive mechanical arpeggios
    4: {
      bpm: 150,
      lead: [
        'E5','G5','B5','G5', 'E5','G5','B5','G5', 'D5','F5','A5','F5', 'D5','F5','A5','F5',
        'C5','E5','G5','E5', 'C5','E5','G5','E5', 'B4','D5','F5','D5', 'B4','D5','F5','D5',
        'E5','G5','B5','E6', 'D6','B5','G5','E5', 'D5','F5','A5','D6', 'C6','A5','F5','D5',
        'C5','E5','G5','C6', 'B5','G5','E5','C5', 'A4','B4','C5','D5', 'E5','.','.','.',
      ],
      bass: [
        'E2','E2','E3','E2','E2','E2','E3','E2','D2','D2','D3','D2','D2','D2','D3','D2',
        'C2','C2','C3','C2','C2','C2','C3','C2','B2','B2','B3','B2','B2','B2','B3','B2',
        'E2','E2','E3','E2','E2','E2','E3','E2','D2','D2','D3','D2','D2','D2','D3','D2',
        'C2','C2','C3','C2','C2','C2','C3','C2','A2','A2','A3','A2','E2','E2','E2','E2',
      ],
      drum: [
        'K','H','H','H','S','H','H','H','K','H','H','K','S','H','H','H',
        'K','H','H','H','S','H','H','H','K','H','H','K','S','H','H','H',
        'K','H','H','H','S','H','H','H','K','H','H','K','S','H','H','H',
        'K','H','H','H','S','H','H','H','K','H','H','K','S','S','S','S',
      ],
    },

    // Boss 5: PYRO — fast aggressive rising riff, chaos
    5: {
      bpm: 180,
      lead: [
        'A4','C5','E5','A5', 'C6','E6','.','.',  'G5','A5','.','.',  'E5','G5','.','.',
        'F5','A5','C6','F6', 'E6','D6','C6','.', 'B5','A5','.','.',  'G5','F5','.','.',
        'E5','G5','B5','E6', 'G6','.','.','.',   'F6','E6','D6','C6','B5','A5','G5','F5',
        'E5','.','D5','.',   'C5','.','B4','.',  'A4','.','.','.',   '.','.','.','.',
      ],
      bass: [
        'A2','A2','A2','.','A2','A2','A2','.','A2','A2','A2','.','A2','A2','A2','.',
        'F2','F2','F2','.','F2','F2','F2','.','F2','F2','F2','.','F2','F2','F2','.',
        'E2','E2','E2','.','E2','E2','E2','.','E2','E2','E2','.','E2','E2','E2','.',
        'A2','A2','C3','.','E3','.','A2','.','A2','A2','A2','.','.','.','.','.',
      ],
      drum: [
        'K','K','H','K','S','H','K','H','K','K','H','K','S','H','S','H',
        'K','K','H','K','S','H','K','H','K','K','H','K','S','H','S','H',
        'K','K','H','K','S','H','K','H','K','K','H','K','S','H','S','H',
        'K','K','H','K','S','H','K','H','S','S','K','K','S','S','S','S',
      ],
    },
  };

  let bossMode = false;
  let bossThemeId = 1;
  let partyMode = false;

  // ===== Party theme — upbeat disco/funk for the dance party celebration.
  // 160 BPM, 16-step pattern × 2 bars so it loops cleanly over ~6s and
  // plays twice through the 10s party. 4-on-the-floor kick, synth stabs,
  // walking bass, bright melody.
  const PARTY_THEME = {
    bpm: 160,
    lead: [
      'C5','.',  'E5','.',  'G5','.',  'C6','.',  'G5','.',  'E5','.',  'C5','.',  'G4','.',
      'A4','.',  'C5','.',  'E5','.',  'A5','.',  'E5','.',  'C5','.',  'A4','.',  'E4','.',
    ],
    arp: [
      'C4','E4','G4','C5','E5','G5','E5','C5', 'G4','E4','C4','E4','G4','C5','E5','C5',
      'A3','C4','E4','A4','C5','E5','C5','A4', 'E4','C4','A3','C4','E4','A4','C5','A4',
    ],
    bass: [
      'C3','.','.','.', 'C3','.','.','.', 'G2','.','.','.', 'G2','.','.','.',
      'A2','.','.','.', 'A2','.','.','.', 'E2','.','.','.', 'E2','.','.','.',
    ],
    drum: [
      'K','H','S','H','K','H','S','H','K','H','S','H','K','H','S','H',
      'K','H','S','H','K','H','S','H','K','H','S','H','K','K','S','S',
    ],
  };

  function ensureCtx() {
    if (ctx) {
      // Browsers may suspend an existing context after a tab is backgrounded,
      // or create it suspended. Always try to resume.
      if (ctx.state === 'suspended' && ctx.resume) {
        ctx.resume().catch(() => {});
      }
      return ctx;
    }
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : 0.55;
    masterGain.connect(ctx.destination);

    musicGain = ctx.createGain();
    musicGain.gain.value = 0.5;
    musicGain.connect(masterGain);

    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.6;
    sfxGain.connect(masterGain);

    if (ctx.state === 'suspended' && ctx.resume) {
      ctx.resume().catch(() => {});
    }
    return ctx;
  }

  // ===== Primitive sound builders =====

  // Play a tone with ADSR-ish envelope at an absolute time.
  function scheduleTone({ freq, type = 'square', when, dur, gain = 0.25, dest }) {
    if (!freq) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(gain, when + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(g);
    g.connect(dest || sfxGain);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }

  // Shared noise buffer for drums + SFX (cheap, allocates once)
  let noiseBuffer = null;
  function getNoiseBuffer() {
    if (noiseBuffer) return noiseBuffer;
    const bufferSize = ctx.sampleRate * 1.0;
    noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuffer;
  }

  function scheduleNoise({ when, dur, gain = 0.3, filterFreq = 1500, filterType = 'lowpass', dest }) {
    const src = ctx.createBufferSource();
    src.buffer = getNoiseBuffer();
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, when);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(dest || sfxGain);
    src.start(when);
    src.stop(when + dur);
  }

  // Drum sounds — all noise-based
  function scheduleDrum(kind, when) {
    if (kind === 'K') {
      // Kick: low-pass sweep on noise + a quick sine thump
      scheduleNoise({ when, dur: 0.08, gain: 0.35, filterFreq: 180, filterType: 'lowpass', dest: musicGain });
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(140, when);
      osc.frequency.exponentialRampToValueAtTime(50, when + 0.08);
      g.gain.setValueAtTime(0.5, when);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.1);
      osc.connect(g);
      g.connect(musicGain);
      osc.start(when);
      osc.stop(when + 0.12);
    } else if (kind === 'S') {
      // Snare: bright noise burst with band-pass
      scheduleNoise({ when, dur: 0.12, gain: 0.3, filterFreq: 2000, filterType: 'highpass', dest: musicGain });
    } else if (kind === 'H') {
      // Hi-hat: very short, very bright noise
      scheduleNoise({ when, dur: 0.03, gain: 0.12, filterFreq: 7000, filterType: 'highpass', dest: musicGain });
    }
  }

  // ===== Scheduler =====

  function scheduleStep(step, when) {
    let tracks;
    if (partyMode) {
      const stepSec = (60 / PARTY_THEME.bpm) / 4;
      tracks = { lead: PARTY_THEME.lead, arp: PARTY_THEME.arp, bass: PARTY_THEME.bass, drum: PARTY_THEME.drum, stepSec };
    } else if (bossMode) {
      const theme = BOSS_THEMES[bossThemeId] || BOSS_THEMES[1];
      const stepSec = (60 / theme.bpm) / 4;
      tracks = { lead: theme.lead, arp: null, bass: theme.bass, drum: theme.drum, stepSec };
    } else {
      const theme = MAIN_THEMES[currentMainTrack] || MAIN_THEMES[0];
      const stepSec = (60 / theme.bpm) / 4;
      tracks = { lead: theme.lead, arp: theme.arp, bass: theme.bass, drum: theme.drum, stepSec };
    }
    const i = step % tracks.lead.length;

    const lead = tracks.lead[i];
    if (lead && lead !== '.' && lead !== 'REST') {
      scheduleTone({
        freq: NOTES[lead],
        type: 'square',
        when,
        dur: tracks.stepSec * 1.8,
        gain: partyMode ? 0.22 : (bossMode ? 0.18 : 0.14),
        dest: musicGain,
      });
    }

    if (tracks.arp) {
      const arp = tracks.arp[i];
      if (arp && arp !== '.' && arp !== 'REST') {
        scheduleTone({
          freq: NOTES[arp],
          type: 'square',
          when,
          dur: tracks.stepSec * 0.85,
          gain: 0.07,
          dest: musicGain,
        });
      }
    }

    const bass = tracks.bass[i];
    if (bass && bass !== '.' && bass !== 'REST') {
      scheduleTone({
        freq: NOTES[bass],
        type: bossMode ? 'sawtooth' : 'triangle',
        when,
        dur: tracks.stepSec * 1.9,
        gain: bossMode ? 0.25 : 0.3,
        dest: musicGain,
      });
    }

    const drum = tracks.drum[i];
    if (drum && drum !== '.') {
      scheduleDrum(drum, when);
    }
  }

  function schedulerTick() {
    if (!ctx || paused) return;
    let stepSec;
    if (bossMode) {
      const theme = BOSS_THEMES[bossThemeId] || BOSS_THEMES[1];
      stepSec = (60 / theme.bpm) / 4;
    } else {
      const theme = MAIN_THEMES[currentMainTrack] || MAIN_THEMES[0];
      stepSec = (60 / theme.bpm) / 4;
    }
    while (nextStepTime < ctx.currentTime + SCHEDULE_AHEAD_SEC) {
      scheduleStep(currentStep, nextStepTime);
      nextStepTime += stepSec;
      currentStep++;
    }
  }

  function startMusic() {
    ensureCtx();
    if (schedulerTimer) return;

    // Wait for the context to be actually running before scheduling. If it's
    // suspended (common on first load), schedule the start as a continuation
    // of the resume() promise so the first beat lands immediately.
    const beginScheduling = () => {
      if (schedulerTimer) return;
      currentStep = 0;
      nextStepTime = ctx.currentTime + 0.05; // tiny lead-in so the first note isn't clipped
      schedulerTick();
      schedulerTimer = setInterval(schedulerTick, SCHEDULER_INTERVAL_MS);
    };

    if (ctx.state === 'running') {
      beginScheduling();
    } else if (ctx.resume) {
      ctx.resume().then(beginScheduling).catch(() => {
        // Even if resume rejects, try anyway — some browsers resume silently.
        beginScheduling();
      });
    } else {
      beginScheduling();
    }
  }

  function stopMusic() {
    if (schedulerTimer) {
      clearInterval(schedulerTimer);
      schedulerTimer = null;
    }
  }

  // ===== SFX (same shape as before; uses sfxGain so SFX stays audible even if music is quiet) =====

  function sfxCorrect() {
    ensureCtx();
    const t = ctx.currentTime;
    scheduleTone({ freq: NOTES.C5, type: 'square', when: t, dur: 0.08, gain: 0.4 });
    scheduleTone({ freq: NOTES.E5, type: 'square', when: t + 0.08, dur: 0.08, gain: 0.4 });
    scheduleTone({ freq: NOTES.G5, type: 'square', when: t + 0.16, dur: 0.14, gain: 0.4 });
  }

  function sfxWrong() {
    ensureCtx();
    const t = ctx.currentTime;
    scheduleTone({ freq: NOTES.E4, type: 'square', when: t, dur: 0.1, gain: 0.4 });
    scheduleTone({ freq: NOTES.D4, type: 'square', when: t + 0.1, dur: 0.1, gain: 0.4 });
    scheduleTone({ freq: NOTES.C4, type: 'square', when: t + 0.2, dur: 0.2, gain: 0.4 });
  }

  function sfxHop() {
    ensureCtx();
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    const start = ctx.currentTime;
    osc.frequency.setValueAtTime(400, start);
    osc.frequency.exponentialRampToValueAtTime(900, start + 0.1);
    g.gain.setValueAtTime(0.25, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.1);
    osc.connect(g);
    g.connect(sfxGain);
    osc.start(start);
    osc.stop(start + 0.12);
  }

  function sfxSplash() {
    ensureCtx();
    const t = ctx.currentTime;
    scheduleNoise({ when: t, dur: 0.4, gain: 0.5, filterFreq: 1800, filterType: 'lowpass' });
    scheduleNoise({ when: t + 0.08, dur: 0.3, gain: 0.3, filterFreq: 900, filterType: 'lowpass' });
  }

  function sfxGameOver() {
    ensureCtx();
    const t = ctx.currentTime;
    scheduleTone({ freq: NOTES.G4, type: 'square', when: t, dur: 0.2, gain: 0.4 });
    scheduleTone({ freq: NOTES.E4, type: 'square', when: t + 0.22, dur: 0.2, gain: 0.4 });
    scheduleTone({ freq: NOTES.C4, type: 'square', when: t + 0.44, dur: 0.2, gain: 0.4 });
    scheduleTone({ freq: NOTES.G3, type: 'triangle', when: t + 0.66, dur: 0.5, gain: 0.5 });
  }

  function sfxLifeLost() {
    ensureCtx();
    const t = ctx.currentTime;
    scheduleTone({ freq: NOTES.A4, type: 'square', when: t, dur: 0.08, gain: 0.4 });
    scheduleTone({ freq: NOTES.D4, type: 'square', when: t + 0.08, dur: 0.18, gain: 0.4 });
  }

  // ===== Main-game track controls =====
  function switchMainTrack(newIndex) {
    if (newIndex < 0) newIndex = MAIN_THEMES.length - 1;
    if (newIndex >= MAIN_THEMES.length) newIndex = 0;
    currentMainTrack = newIndex;
    localStorage.setItem('leapfrog_track', String(currentMainTrack));
    // Reset scheduler so the new track starts cleanly from step 0
    currentStep = 0;
    if (ctx) nextStepTime = ctx.currentTime + 0.05;
  }

  function nextTrack() { switchMainTrack(currentMainTrack + 1); }
  function prevTrack() { switchMainTrack(currentMainTrack - 1); }
  function getCurrentTrack() {
    return { index: currentMainTrack, name: MAIN_THEMES[currentMainTrack].name, total: MAIN_THEMES.length };
  }

  function togglePause() {
    paused = !paused;
    if (!paused && ctx) {
      // Resume scheduling from "now" so we don't blast a backlog
      nextStepTime = ctx.currentTime + 0.05;
    }
    return paused;
  }

  function isPaused() { return paused; }

  // ===== Switch to boss music / back =====
  function enterBossMode(themeId) {
    bossMode = true;
    bossThemeId = (themeId && BOSS_THEMES[themeId]) ? themeId : 1;
    // Reset step so the boss track starts from the beginning
    currentStep = 0;
    if (ctx) nextStepTime = ctx.currentTime + 0.05;
  }

  function exitBossMode() {
    bossMode = false;
    currentStep = 0;
    if (ctx) nextStepTime = ctx.currentTime + 0.05;
  }

  // ===== Party mode — plays the dedicated celebration track =====
  function enterPartyMode() {
    partyMode = true;
    currentStep = 0;
    if (ctx) nextStepTime = ctx.currentTime + 0.05;
  }

  function exitPartyMode() {
    partyMode = false;
    currentStep = 0;
    if (ctx) nextStepTime = ctx.currentTime + 0.05;
  }

  // ===== Boss SFX =====
  function sfxTongueWhip() {
    ensureCtx();
    // Fast descending whoosh — like a whip crack
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.12);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
    osc.connect(g);
    g.connect(sfxGain);
    osc.start(t);
    osc.stop(t + 0.17);
    // Noise crack layer
    scheduleNoise({ when: t, dur: 0.1, gain: 0.25, filterFreq: 3000, filterType: 'highpass' });
  }

  function sfxBossHit() {
    ensureCtx();
    const t = ctx.currentTime;
    // Big thuddy impact
    scheduleNoise({ when: t, dur: 0.15, gain: 0.5, filterFreq: 400, filterType: 'lowpass' });
    scheduleTone({ freq: NOTES.C3, type: 'square', when: t, dur: 0.15, gain: 0.4 });
    scheduleTone({ freq: NOTES.G3, type: 'square', when: t + 0.05, dur: 0.2, gain: 0.3 });
  }

  function sfxBossIntro() {
    ensureCtx();
    const t = ctx.currentTime;
    // Thunder-ish rumble + ominous chord
    scheduleNoise({ when: t, dur: 0.8, gain: 0.4, filterFreq: 300, filterType: 'lowpass' });
    scheduleTone({ freq: NOTES.A2, type: 'sawtooth', when: t, dur: 0.6, gain: 0.4, dest: sfxGain });
    scheduleTone({ freq: NOTES.E3, type: 'sawtooth', when: t, dur: 0.6, gain: 0.3, dest: sfxGain });
  }

  function sfxBossVictory() {
    ensureCtx();
    const t = ctx.currentTime;
    // Triumphant ascending chord
    const notes = ['C5', 'E5', 'G5', 'C6'];
    notes.forEach((n, i) => {
      scheduleTone({ freq: NOTES[n], type: 'square', when: t + i * 0.1, dur: 0.4, gain: 0.4 });
    });
  }

  function sfxBossDefeat() {
    ensureCtx();
    const t = ctx.currentTime;
    // Boss hits YOU — dark descending
    scheduleTone({ freq: NOTES.A4, type: 'sawtooth', when: t, dur: 0.2, gain: 0.4 });
    scheduleTone({ freq: NOTES.F4, type: 'sawtooth', when: t + 0.2, dur: 0.2, gain: 0.4 });
    scheduleTone({ freq: NOTES.D4, type: 'sawtooth', when: t + 0.4, dur: 0.4, gain: 0.4 });
    scheduleNoise({ when: t, dur: 0.3, gain: 0.4, filterFreq: 500, filterType: 'lowpass' });
  }

  function sfxFanfare() {
    ensureCtx();
    const t = ctx.currentTime;
    // Big triumphant ascending arpeggio with power chord
    const notes = ['C4','E4','G4','C5','E5','G5','C6'];
    notes.forEach((n, i) => {
      scheduleTone({ freq: NOTES[n], type: 'square', when: t + i*0.08, dur: 0.4, gain: 0.3 });
    });
    // Sustained chord at the end
    scheduleTone({ freq: NOTES.C5, type: 'triangle', when: t + 0.56, dur: 1.2, gain: 0.35 });
    scheduleTone({ freq: NOTES.E5, type: 'triangle', when: t + 0.56, dur: 1.2, gain: 0.3 });
    scheduleTone({ freq: NOTES.G5, type: 'triangle', when: t + 0.56, dur: 1.2, gain: 0.3 });
    // Rhythm hits
    scheduleTone({ freq: NOTES.C3, type: 'sawtooth', when: t + 0.56, dur: 0.15, gain: 0.4 });
    scheduleTone({ freq: NOTES.C3, type: 'sawtooth', when: t + 0.8, dur: 0.15, gain: 0.4 });
    scheduleTone({ freq: NOTES.C3, type: 'sawtooth', when: t + 1.04, dur: 0.15, gain: 0.4 });
  }

  function sfxThunder() {
    ensureCtx();
    const t = ctx.currentTime;
    // Deep thunder rumble
    scheduleNoise({ when: t, dur: 1.2, gain: 0.5, filterFreq: 250, filterType: 'lowpass' });
    scheduleNoise({ when: t + 0.3, dur: 0.6, gain: 0.3, filterFreq: 500, filterType: 'lowpass' });
  }

  // ===== Mute toggle =====
  function toggleMute() {
    muted = !muted;
    localStorage.setItem('leapfrog_muted', muted ? '1' : '0');
    if (masterGain) masterGain.gain.value = muted ? 0 : 0.55;
    return muted;
  }

  function isMuted() { return muted; }

  return {
    startMusic, stopMusic,
    enterBossMode, exitBossMode,
    enterPartyMode, exitPartyMode,
    nextTrack, prevTrack, getCurrentTrack, togglePause, isPaused,
    sfxCorrect, sfxWrong, sfxHop, sfxSplash, sfxGameOver, sfxLifeLost,
    sfxTongueWhip, sfxBossHit, sfxBossIntro, sfxBossVictory, sfxBossDefeat, sfxThunder, sfxFanfare,
    toggleMute, isMuted,
    ensureCtx,
  };
})();
