# Horror Tips

A first-person browser horror game about a game of tips that continues after the school bell. Explore a night-time school, meet the spinner, learn the rules, and survive branching chase sequences. The creature and characters are original fictional designs. Attacks use atmosphere and cutaways rather than graphic injury.

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
- Use WASD to move, Shift to sprint and the mouse to look. Click the game view to capture the mouse; Escape releases it. Touch controls are available on screen.
- Dialogue stays visible in captions. Browser speech synthesis supplies optional voiceover; available voices depend on the device. The ambient soundscape is synthesized locally after a player gesture.

## Hosting

The Node server serves the built game and its multiplayer connection together. Host the project on a Node-capable service, run `npm ci && npm run build` during deployment, and start it with `npm start`. A shared public server is needed for friends on different networks; a local development server is not automatically reachable over the internet.

The included **Publish campaign to GitHub Pages** workflow is started manually from the repository's Actions tab. Enable GitHub Pages with **GitHub Actions** as its source first. Pages serves the static campaign; it cannot run the multiplayer server. In the multiplayer lobby, enter a separately hosted WebSocket server address when using a static host. Use `wss://` on HTTPS pages.

## Environment references and future photos

The setting is an atmospheric interpretation inspired by Wollongong West Public School and the requested landmarks, not an accurate survey or a navigation map. The school's [official website](https://wollongwst-p.schools.nsw.gov.au/) and [NSW School Infrastructure listing](https://www.schoolinfrastructure.nsw.gov.au/schools/3/3477.html) are public background references. The current grounds, building proportions and locations are procedural placeholders. Supplied reference photographs can guide a later environment revision.

This is an unofficial fictional game, with no school endorsement or affiliation. Named characters are fictional avatars and do not depict actual students. No student photographs, voices, school logos, copyrighted creature models or third-party art assets are bundled.

## Project layout

- `src/world.js`: Three.js scene, procedural materials, animated figures and first-person rendering.
- `src/audio.js`: synthesized ambience, footsteps, tension cues and optional speech.
- `src/network.js` and `server.mjs`: multiplayer client and room server.
- `.github/workflows/`: build checks and optional static campaign deployment.

The current release is a playable procedural 3D prototype. Photorealistic scanned school assets, recorded performances and a managed public multiplayer service are separate production work.
