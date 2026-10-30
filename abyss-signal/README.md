# ABYSS SIGNAL

An original first-person survival horror campaign designed for iPad browsers. You wake alone in a failing deep-sea research station, 1,840 metres below the surface. Dr. Mara Voss offers to guide you over the radio. Something in the station has learned the crew’s voices.

The expanded campaign crosses eight distinct rooms connected by a long industrial passage. Ten operations send you between the old station and its lower wing, with machinery puzzles, recovered recordings, a stalking creature, hiding places, a pressure countdown, and an extraction holdout. This is a single-player web game; no account or multiplayer server is needed.

## Play

[Play ABYSS SIGNAL](https://tuffm82-pixel.github.io/Horror-tips/abyss-signal/) · [Download for offline desktop play](https://tuffm82-pixel.github.io/Horror-tips/abyss-signal/downloads/ABYSS-SIGNAL.zip)

Open the game in Safari on iPad, preferably in landscape. Tap **DESCEND** to begin and enable sound. Headphones make the quiet sounds easier to hear. Desktop browsers need WebGL 2. Display settings include brightness, look sensitivity, reduced camera motion, and battery-saver graphics. Safari can add the browser link to your Home Screen; this is a web game, not an App Store installation.

| Action | iPad | Desktop |
| --- | --- | --- |
| Walk | Left thumbstick | W A S D |
| Look | Swipe the right side | Drag the right side, or arrow keys |
| Use a nearby station | Interact button | E |
| Run | Sprint button | Shift |
| Hide near a locker | Hide button | H |
| Pause | Pause button | Escape |

Approach the marked station and use it to begin its operation. Physical travel connects every objective:

1. **Flood pumps:** balance the pressure needle to stop the lower deck flooding.
2. **Emergency generator:** reconnect the circuits in Engineering.
3. **Laboratory black box:** return to Observation and recover the crew’s last recording.
4. **Mara’s cabin:** search the crew wing for the archive access clue.
5. **Sealed archive:** enter the recovered code and uncover the specimen report.
6. **Signal relay:** return to the original wing and tune out the infected transmission.
7. **Reactor coolant:** stabilise the cooling system beneath the ascent rail.
8. **Surface uplink:** tune the communications equipment and request clearance.
9. **Launch controls:** complete the capsule circuit sequence to start preparation.
10. **Ascent capsule:** survive the 45-second pressure cycle, then reach the boarding hatch.

A new run starts with twenty minutes of reserve pressure. This is a countdown, not a promised completion time. Sprinting is noisy; leave the creature’s sight before entering a locker. The preparation timer and pressure timer stop when the game is paused. If you are caught, retry from the last completed objective with restored pressure. A retry at the final checkpoint restarts the 45-second preparation cycle.

## Story and sound

The story develops through mission transmissions, recovered logs, and the changing behaviour of the radio guide. Mission text remains visible as subtitles. Spoken narration uses the browser’s speech synthesis when supported; available voices and pronunciation vary by device. If speech is unavailable, the campaign remains playable through subtitles. The game also synthesizes its own sea ambience, machinery, breathing, footfalls, and scare effects.

## Development

The game lives in `abyss-signal/` alongside Horror Tips. It uses the repository’s Three.js and Vite installation. `layout.js` owns the map and operation order. `campaign.js` owns progression, story, inventory, checkpoints, and both countdowns; graphics, creature perception, controls, and puzzle interactions are separate.

Run campaign tests with `node --test abyss-signal/campaign.test.mjs`. Run locally with `pnpm exec vite --config abyss-signal/vite.config.js`. Build with `pnpm exec vite build --config abyss-signal/vite.config.js`, then run `node abyss-signal/package-download.mjs` to create the standalone download. The Pages workflow publishes both games.

The station, creature, animation, textures, and sound effects are authored locally in the game. The creature uses articulated geometry, while the station batches static meshes for mobile rendering. These are custom models, not Tripo-generated assets; Tripo CLI was unavailable during development. No external model or texture downloads are required to run the bundled game.
