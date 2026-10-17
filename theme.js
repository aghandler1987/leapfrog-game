// Leap Frog — Theme System (Phase 1: single-theme architecture)
//
// This module centralizes everything the game needs to pick up a visual
// theme: sprite paths, display name, future hooks for fonts/effects.
// Theme is chosen from the splash screen only; switching reloads the page.
//
// Load order: theme.js MUST be included before any other game script because
// data initializers (e.g. boss.js's BOSSES array) call Theme.sprite() at
// module eval time.

(function () {
  // Each named sprite in the emoji theme is an OS emoji. We render these
  // as SVG data URIs so every existing <img src="..."> element in the game
  // just works — no HTML/JS changes needed.
  const EMOJI_MAP = {
    // All frogs are 🐸 in emoji mode — the golden distinction comes from the
    // CSS sparkle particles (which still work since .is-golden sits on the
    // frog element regardless of theme).
    frog1:  '🐸', frog2:  '🐸', frog3:  '🐸', frog4:  '🐸', frog5:  '🐸',
    frog6:  '🐸', frog7:  '🐸', frog8:  '🐸', frog9:  '🐸', frog10: '🐸',
    frog11: '🐸',
    // Bosses — 5 themed as "villain" emojis
    boss1: '👹', boss2: '💀', boss3: '🤴', boss4: '🤖', boss5: '🔥',
    // Lilypads — same emoji x5 (shape variety not needed in emoji mode)
    lilypad1: '🪷', lilypad2: '🪷', lilypad3: '🪷', lilypad4: '🪷', lilypad5: '🪷',
    // Scene
    cloud: '☁️', fish: '🐟', dragonfly: '🪰', fly: '🪰', ufo: '🛸', splash: '💦',
  };

  // Build a data URI with the emoji centered in a 100x100 SVG viewBox so it
  // scales to the parent <img> element's width/height.
  function emojiDataUri(glyph) {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<text x="50" y="52" text-anchor="middle" dominant-baseline="central" ' +
        'font-size="90" style="font-family:apple color emoji,segoe ui emoji,noto color emoji,sans-serif">' +
        glyph +
      '</text></svg>';
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
  }

  const THEMES = {
    retro: {
      id: 'retro',
      name: 'NES Arcade',
      spriteDir: 'sprites/retro',
      fontFamily: "'Press Start 2P', monospace",
      fontUrl: 'https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap',
      effects: {
        scanlines: true,
        pixelated: true,
        steppedAnimations: true,
      },
      resolveSprite(name) {
        return `${this.spriteDir}/${name}.svg`;
      },
    },
    emoji: {
      id: 'emoji',
      name: 'Emoji',
      // No sprite directory — sprites are generated on the fly from EMOJI_MAP.
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      fontUrl: null, // uses system font, no @import needed
      effects: {
        scanlines: false,
        pixelated: false,
        steppedAnimations: false,
      },
      resolveSprite(name) {
        const glyph = EMOJI_MAP[name] || '❔';
        return emojiDataUri(glyph);
      },
    },
    neon: {
      id: 'neon',
      name: 'Synthwave',
      spriteDir: 'sprites/neon',
      // VT323 is a retro-futurist pixel-y font that pairs well with glow effects
      fontFamily: "'VT323', 'Press Start 2P', monospace",
      fontUrl: 'https://fonts.googleapis.com/css2?family=VT323&display=swap',
      effects: {
        scanlines: true,       // keep CRT scanlines (fits the aesthetic)
        pixelated: true,
        steppedAnimations: false,
      },
      resolveSprite(name) {
        return `${this.spriteDir}/${name}.svg`;
      },
    },
    modern: {
      id: 'modern',
      name: 'Modern',
      spriteDir: 'sprites/modern',
      // Clean modern sans-serif font — no retro pixel feel
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
      fontUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800&display=swap',
      effects: {
        scanlines: false,
        pixelated: false,
        steppedAnimations: false,
      },
      // frog5 (hyper) and frog7 (vampire) felt out of place in testing — drop from picker.
      // Still rendered correctly if a saved frog ID lands on them (fallback to frog1).
      excludedFrogs: new Set([5, 7]),
      resolveSprite(name) {
        return `${this.spriteDir}/${name}.png`;
      },
    },
  };

  const STORAGE_KEY = 'leapfrog_theme';
  const DEFAULT_ID = 'retro';

  // Determine the active theme. Falls back to retro for unknown/missing IDs.
  const storedId = localStorage.getItem(STORAGE_KEY);
  const activeId = (storedId && THEMES[storedId]) ? storedId : DEFAULT_ID;
  const config = THEMES[activeId];

  // ===== Public API =====
  window.Theme = {
    id: activeId,
    config,

    // Returns the full URL for a named sprite in the active theme.
    // Each theme implements its own resolveSprite() — retro returns a file
    // path, emoji returns a data: URI, etc.
    sprite(name) {
      return config.resolveSprite(name);
    },

    // Returns an <img> tag string pre-wired for the given sprite + class.
    // Convenience helper used by the game code when building innerHTML.
    img(name, cls = 'sprite-img', alt = '') {
      return `<img src="${this.sprite(name)}" alt="${alt}" class="${cls}"/>`;
    },

    // List of all registered themes (for a future theme picker UI).
    list() {
      return Object.values(THEMES).map(t => ({ id: t.id, name: t.name }));
    },

    // Theme-specific: is this frog id excluded from the active theme's roster?
    // Themes may drop frogs that don't fit (e.g. Modern drops 5/7).
    isFrogExcluded(id) {
      return !!(config.excludedFrogs && config.excludedFrogs.has(id));
    },

    // Switch the active theme (persists to localStorage; caller reloads).
    set(id) {
      if (!THEMES[id]) return false;
      localStorage.setItem(STORAGE_KEY, id);
      return true;
    },
  };

  // Tag the <html> element so CSS can scope rules per theme in future phases.
  // Phase 1 only has retro so this attribute is primarily documentation + hook.
  if (document.documentElement) {
    document.documentElement.dataset.theme = activeId;
  }

  // After the DOM is ready, rewrite any <img data-sprite="name"> element so
  // the HTML stays declarative (no theme-aware src attribute) while the file
  // path comes from the active theme's spriteDir.
  function rewriteStaticSprites() {
    const imgs = document.querySelectorAll('img[data-sprite]');
    imgs.forEach(img => {
      const name = img.dataset.sprite;
      if (name) img.src = Theme.sprite(name);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', rewriteStaticSprites);
  } else {
    rewriteStaticSprites();
  }
})();
