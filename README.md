# EvanWallaceLusky.com

Evan Lusky's personal résumé and portfolio site. The primary experience is a conventional semantic HTML résumé. An optional Phaser command bridge adds a memorable navigation layer without hiding any résumé content.

Live site: [evanwallacelusky-com.pages.dev](https://evanwallacelusky-com.pages.dev/)

## Requirements

- Node.js 22 or a current supported LTS release
- npm 11 or a compatible npm release

## Install and run

Run these commands from the repository root:

```powershell
npm install
npm run dev
```

Vite prints the local URL, usually `http://localhost:5173`.

## Validate and build

```powershell
npm run check
npm run build
```

The production output is written to `dist`. Preview it locally with:

```powershell
npm run preview
```

## Controls

- On the default command bridge, move with A/D or the left and right arrow keys.
- Use Enter or E near a résumé console. Red taps toward the console before the section opens when motion is allowed.
- Click or tap any terminal to open its named section directly.
- Use the left, E, and right controls on touch devices to walk and open a nearby station.
- Use the terminal directory below the canvas for a readable, direct section picker at any screen size.
- Press Escape or use the visible close button to close a résumé panel.
- Use the conventional navigation or the full résumé below the game at any time.
- Use Hide game to remove and pause the interactive interface.

The preserved map scenes continue to support WASD, arrow-key, and eight-direction movement. Red uses static directional poses while stopped. This deliberately avoids treating the current breathing-style idle export as a neutral resting loop.

## Background comparison

The fixed-camera 2.5D command bridge is the default scene:

`http://localhost:5173/#interactive`

Three preserved comparison modes remain available:

- `http://localhost:5173/?background=space#interactive` loads the earlier top-down Scout command ship and celestial parallax.
- `http://localhost:5173/?background=mountains#interactive` loads the Stormy Mountains parallax and isometric archive platform.
- `http://localhost:5173/?background=baseline#interactive` loads the original procedural archive.

The bridge uses a repaired ambient room loop over a sharp poster fallback. Reduced-motion preferences, or the explicit `?motion=reduce` review URL, use the still poster and skip interaction flourishes. Hiding the game pauses Phaser and the room video.

## Accessibility and fallback

- Every résumé section exists as semantic HTML outside the canvas.
- The conventional header navigation and full résumé remain usable without Phaser.
- Each in-game terminal includes a literal section-purpose label as well as its themed station name.
- Keyboard, pointer, and touch navigation are available.
- Dialogs close with Escape, the visible close button, or a click outside the panel.
- The game can be hidden, and focus moves into the conventional résumé.
- Reduced-motion preferences suppress decorative movement and skip the interaction flourish.
- Print styles and the downloadable DOCX provide conventional résumé formats.

## Architecture

- `src/data/resume.ts`: typed public résumé content
- `src/site/resumeInterface.ts`: semantic rendering, dialog behavior, and non-game controls
- `src/game/createGame.ts`: Phaser startup, pause control, and canvas accessibility
- `src/game/config/gameConstants.ts`: canvas, player, station, and preserved-map layout values
- `src/game/config/parallaxBackdrops.ts`: selected celestial and mountain layer definitions
- `src/game/scenes/PortfolioScene.ts`: default command bridge plus preserved comparison scenes
- `public/assets`: reviewed production exports only
- `ASSETS.md`: provenance and licensing record
- `docs/design-baseline.md`: protected wording, visual guardrails, and recovery paths
- `AGENTS.md`: durable development rules

The default stage uses one fixed command-room perspective, a non-scrolling foreground lane, six always-visible holographic consoles, and a poster-backed ambient video. The earlier Scout, mountain, and procedural scenes remain isolated behind URL modes for comparison and recovery.

## Avatar export contract

The current Red production export uses:

- eight 256 by 256 static direction frames
- eight walk directions with eight frames each
- east and west console-tap interactions with nine frames each
- one south-facing floating-screen interaction with nine frames

Before adding or replacing an animation:

1. Inspect frame dimensions, alpha, directions, frame counts, and intended camera angle.
2. Export processed files separately from the private originals.
3. Copy only frames used by the site into `public/assets/characters/evan`.
4. Update `ASSETS.md` before any commit.
5. Update the paths, frame counts, and animation definitions in `PortfolioScene.ts` if the export contract changed.

The most useful next export is a calmer neutral idle. Do not copy complete PixelLab projects or asset packs into the repository.

## Résumé content

Public facts are maintained in the typed data module and sourced from Evan's verified résumé masters, direct statements, and supporting records where needed. Sensitive source material is intentionally excluded.

The site deliberately generalizes client engagements. Public copy should describe the domain, system, scale, and outcome clearly enough for an informed reader to understand the work without naming the client. A client name is an intentional exception, not the default, even where disclosure may be permitted. The downloadable DOCX currently uses the AI enablement résumé master. The print button produces a conventional résumé from the visible HTML content.

## Current milestone

The local launch candidate is complete. The default command bridge matches Red's orthographic profile movement, keeps all six destinations visible, uses literal résumé-purpose labels, supports keyboard, pointer, and touch access, and falls back to a still image for reduced motion or video failure. The earlier top-down ship, mountain scene, and procedural archive remain available as explicit recovery modes.

## Future refinements, not launch blockers

- Which calmer idle sequence becomes Red's default resting state
- Final canonical downloadable résumé variant
- Whether a business-specific email eventually replaces the current public email
- Whether a specific client name ever adds enough value to justify an intentional exception to the generalization rule
