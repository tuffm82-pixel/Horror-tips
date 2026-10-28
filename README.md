# Horror Tips

## [▶ CLICK ME — PLAY IN BROWSER OR DOWNLOAD](CLICK%20ME.md)

[Play in your browser](https://tuffm82-pixel.github.io/Horror-tips/) · [Download the playable ZIP](https://github.com/tuffm82-pixel/Horror-tips/raw/refs/heads/main/downloads/Horror-Tips.zip)

For the download, extract the ZIP and open **Horror Tips.html**. The campaign needs no installation. Online multiplayer requires a hosted server.

A first-person browser horror game about a game of tips that continues after the school bell. Explore a night-time school, meet the spinner, learn the rules, and survive branching chase sequences. The creature and characters are original fictional designs. Attacks use atmosphere and cutaways rather than graphic injury.

## Models and timed walking

The current character models are continuous skinned meshes with weighted elbow/knee deformation, profiled faces, modeled eyes and eyelids, hands/fingers, collared polos, fitted trousers, shoe details and wavy hair. The creature has its own skinned body and jaw. Mesh buffers are shared while skeletons and materials stay independent for animation and multiplayer. Humans use roughly 12–13k triangles each; the creature roughly 8.6k. These are custom models authored in the project, not Tripo-generated assets.

The original Bathroom, Bottom oval, Top oval and Blue wall options remain. Selecting one starts an on-foot objective rather than teleporting. Follow the compass waypoints around walls and arrive before the countdown; being late triggers a creature attack and a retry from the route’s starting position. Route times account for walking distance. Pausing and continuing preserve progress.

The office chapter now continues through a blackout, a voice behind the canteen shutter, an outside breaker interaction, and a return to the unlocked chalk box before the last-bell escape.

## Animated campaign expansion

The spinner now points around a circle of players and selects a different person; the selected player transforms while the spinner stays human. Articulated rigs have keyframed idle, walk, run, pointing, recoil, grabbed, fall, stalking and lunging poses. Encounters use non-graphic struggle and shadow cutaways.

After the blue-wall encounter, walk through the gate, witness the creature charge and disappear on the street, return to the office, take the chalk mark, and sprint to the gate before the last bell ends. A compass and distance marker guide free exploration. School and street props add classroom notices, canteen details, lockers, gardens, sports equipment, road markings, suburban silhouettes and an escarpment skyline. All current models are authored locally; no Tripo-generated assets or paid generation tasks are included.

Turn with mouse drag, mouse capture, **Left/Right arrows** or **Q/E**. WASD moves and strafes; Up/Down arrows move forward/back. On touchscreens, swipe the scene to look, use the turning buttons, and toggle RUN for sprinting.

## Horror atmosphere update

The current build adds a darker night scene, shadow-casting torch, weathered materials, wet ground, organic foliage, rounded figures, a more detailed creature, spatial stereo cues, and dialogue-synchronized encounters. Pause/retry, checkpoint timing, touch look, and wall-aware multiplayer tags are covered by regression checks. The school remains an approximate fictional environment pending reference photos.

## Run locally

Install Node.js 22 or newer, then run these commands in the project folder:

```sh
npm install
npm run dev
```

Open `http://localhost:5173`. The development command starts Vite and the multiplayer WebSocket server on port 3000. Use two browser tabs to try a room locally.

For a production build served by the Node server:

```sh
npm run build
npm start
```

Open `http://localhost:3000`. `PORT` can override the production server port. Run `npm test` for the automated checks.

## Play

- Campaign follows the invitation, spinner, frozen feet, transformation and twenty-second hiding countdown, then branches through the bathroom, ovals, court and blue wall.
- Timing challenges use the on-screen action control; the oval balance challenge uses a held input.
- Multiplayer uses room codes and a shared tag round. Players need to connect to the same running server.
- Use WASD to move, Shift to sprint, Q/E or Left/Right arrows to turn, and the mouse to look. Click the game view to capture the mouse; Escape releases it. Touch controls are available on screen.
- Dialogue stays visible in captions. Browser speech synthesis supplies optional voiceover; available voices depend on the device. The ambient soundscape is synthesized locally after a player gesture.

## Hosting

The Node server serves the built game and its multiplayer connection together. Host the project on a Node-capable service, run `npm ci && npm run build` during deployment, and start it with `npm start`. A shared public server is needed for friends on different networks; a local development server is not automatically reachable over the internet.

The included **Publish campaign to GitHub Pages** workflow runs automatically when `main` changes, or manually from the repository's Actions tab. Enable GitHub Pages with **GitHub Actions** as its source first. Pages serves the static campaign; it cannot run the multiplayer server. In the multiplayer lobby, enter a separately hosted WebSocket server address when using a static host. Use `wss://` on HTTPS pages.

To regenerate the playable download after a build, run `node scripts/package-download.mjs`. This creates `downloads/Horror-Tips.zip` and includes a copy in the Pages build.

## Environment references and future photos

The setting is an atmospheric interpretation inspired by Wollongong West Public School and the requested landmarks, not an accurate survey or a navigation map. The school's [official website](https://wollongwst-p.schools.nsw.gov.au/) and [NSW School Infrastructure listing](https://www.schoolinfrastructure.nsw.gov.au/schools/3/3477.html) are public background references. The current grounds, building proportions and locations are procedural placeholders. Supplied reference photographs can guide a later environment revision.

This is an unofficial fictional game, with no school endorsement or affiliation. Named characters are fictional avatars and do not depict actual students. No student photographs, voices, school logos, copyrighted creature models or third-party art assets are bundled.

## Project layout

- `src/world.js`: Three.js scene, procedural materials, animated figures and first-person rendering.
- `src/audio.js`: synthesized ambience, footsteps, tension cues and optional speech.
- `src/network.js` and `server.mjs`: multiplayer client and room server.
- `.github/workflows/`: build checks and optional static campaign deployment.

The current release is a playable procedural 3D prototype. Photorealistic scanned school assets, recorded performances and a managed public multiplayer service are separate production work.
