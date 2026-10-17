# 🐸 Leap Frog

A simple trivia game where a frog leaps across lilypads. Answer True/False questions about frogs — get it right and leap forward, get it wrong and hop back.

## Play locally

Double-click `index.html`. That's it. No build step, no `npm install`.

(If something looks off, try opening it in Chrome, Safari, or Firefox — any modern browser works.)

## Controls

- **Click** True or False buttons
- Or press **← / T** for True, **→ / F** for False

## Host it on GitHub Pages (free)

1. Create a new GitHub repo (e.g. `leap-frog`), set it to public.
2. Push these files to the repo:
   ```bash
   cd leap-frog
   git init
   git add .
   git commit -m "Initial Leap Frog game"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/leap-frog.git
   git push -u origin main
   ```
3. On GitHub: **Settings → Pages → Source: Deploy from a branch → Branch: `main` / `(root)`**
4. Save. In ~30 seconds your game is live at `https://YOUR_USERNAME.github.io/leap-frog/`

## Project structure

```
leap-frog/
├── index.html   # markup
├── styles.css   # pond, frog, lilypad styles + hop animations
├── game.js      # game loop, scoring, hop logic
├── facts.js     # the fact database (edit to add more!)
└── README.md
```

## Adding your own facts

Open `facts.js` and append to the `FROG_FACTS` array:

```js
{
  text: "Your fact here.",
  isTrue: true,  // or false
  explanation: "Short explanation shown after the player answers."
}
```

## Swapping emoji for pixel art sprites

In `game.js`, find the `SPRITES` config at the top and replace:

```js
const SPRITES = {
  FROG: '<img src="sprites/frog.png" alt="frog">',
  LILYPAD: '<img src="sprites/lilypad.png" alt="lilypad">',
};
```

Drop your sprite PNGs in a `sprites/` folder. You'll probably also want to tweak the `font-size` on `.frog` and `.lilypad` in `styles.css` to match your sprite dimensions (or switch to `width`/`height`).

**Free sprite sources:**
- [itch.io free assets](https://itch.io/game-assets/free)
- [OpenGameArt.org](https://opengameart.org/)
- Search "frog pixel art CC0"

## Later: LLM-generated facts

The `getFactQueue()` function in `facts.js` is where facts come from. Swap it for an async fetch to an LLM API (Claude, OpenAI, etc.) and the game will keep working. Shape of each fact: `{ text, isTrue, explanation }`.
