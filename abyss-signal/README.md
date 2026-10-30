# ABYSS SIGNAL

A first-person survival horror campaign designed for iPad browsers. You wake alone in a deep-sea research station. Restore the pumps, recover the laboratory black box, disconnect the relay, and reach the ascent capsule. Something in the station has learned the crew’s voices.

The campaign features an explorable 3D station, a stalking creature, a pressure countdown, environmental scares, synthesized sound, and checkpoints after each completed objective. This is a standalone single-player game; it does not require a multiplayer server or an account.

## Play

[Play ABYSS SIGNAL](https://tuffm82-pixel.github.io/Horror-tips/abyss-signal/) · [Download for offline desktop play](https://tuffm82-pixel.github.io/Horror-tips/abyss-signal/downloads/ABYSS-SIGNAL.zip)

Open the game in Safari on iPad, preferably in landscape. Tap **DESCEND** to begin and enable sound. Headphones make the quiet sounds easier to hear. The game also runs in desktop browsers supporting WebGL 2. Display settings include brightness, look sensitivity, reduced camera motion, and battery-saver graphics. Safari can add the browser link to your Home Screen; this is a web game, not an App Store installation.

| Action | iPad | Desktop |
| --- | --- | --- |
| Walk | Left thumbstick | W A S D |
| Look | Swipe the right side | Drag the right side, or arrow keys |
| Use a nearby station | Interact button | E |
| Run | Sprint button | Shift |
| Hide near a locker | Hide button | H |
| Pause | Pause button | Escape |

Complete the stations in order: pumps → laboratory black box → relay → ascent capsule. Follow the current objective and approach its station to interact. Sprinting is noisy. Hiding can lower your threat, but the pressure timer keeps ticking. The relay triggers the final escape.

If the creature catches you or the station loses pressure, retry from the last completed objective. Checkpoints restore enough time for a fair attempt. Pausing stops the game.

## Development

The game lives in `abyss-signal/` alongside the original Horror Tips game. It uses the repository’s Three.js and Vite installation. Campaign rules are separate from graphics and controls in `campaign.js`; run their tests with `node --test abyss-signal/campaign.test.mjs`.

The station, creature, animation, textures, and sound are authored locally in the game. The creature uses articulated geometry, while the station batches static meshes for mobile rendering. No external model, audio, or texture downloads are required. These are custom models, not Tripo-generated assets; Tripo CLI was unavailable during development.

Run locally with `pnpm exec vite --config abyss-signal/vite.config.js`. Build with `pnpm exec vite build --config abyss-signal/vite.config.js`, then run `node abyss-signal/package-download.mjs` to create the standalone download. The existing Pages workflow publishes both games.
