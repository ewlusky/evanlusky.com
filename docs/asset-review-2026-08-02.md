# Asset review, August 2, 2026

> Historical review snapshot. The August 3 command-bridge review supersedes its production counts and default-scene recommendations. See `asset-review-2026-08-03.md`.

This is a working catalog of the newest character exports and the strongest environment candidates. Paths are relative to Evan's private `assets4site` library. Nothing listed here is public unless it also appears in `ASSETS.md`.

## Character candidates

### CustomEvanRed, August 2 default

Private source: `_EVAN/EvanCharacterAttempts/CustomEvanRed`

- 190 transparent 256 by 256 RGBA PNGs plus PixelLab v3.1 metadata in the private source
- Eight rotation stills and eight-direction walking with eight frames per direction
- Secondary hands-out state with four-direction idle, picking up, pushing, console interaction, standing motion, and guitar gestures
- No exported FPS or duration metadata
- Production subset: 81 files, consisting of eight rotation stills, 64 walk frames, and nine south-facing floating-screen interaction frames
- Current assessment: best primary avatar for this site. The red casual look resembles Evan more closely, and the eight-direction movement supports both orthographic and top-down presentation.
- Current runtime choice: use rotation stills while stopped so the breathing-style idle does not read as winded.
- Export gap: the floating-screen interaction is available only from the south. Workbench previews show other directions in progress, but they are not production assets.

### CustomEvanBusiness, retained alternative

Private source: `_EVAN/EvanCharacterAttempts/CustomEvanBusiness`

- 184 transparent 92 by 92 RGBA PNGs plus PixelLab v3.1 metadata
- Eight rotation stills
- Four-direction walking with eight frames per direction
- Four-direction interaction with 17 frames per direction
- Four-direction idle with eight or nine frames per direction
- Two south-facing guitar gestures with 17 frames each
- Additional eight-direction `Standing_holding_an` still state
- No exported FPS or duration metadata
- Current assessment: useful alternate for formal scenes or a future business mode, but Red is the chosen default because it resembles Evan more closely and has complete eight-direction walking.
- Loader caveat: idle sequences do not all have the same frame count.

## Current environment

### Celestial Bodies backdrop plus Scout spaceship

Private sources:

- `_UNSORTED/All_Exclusives_20260727/Addons/_Sci-fi/_Miscellany/Celestial_Bodies_Backdrop`
- `_UNSORTED/All_Exclusives_20260727/Addons/_Sci-fi/_Miscellany/Scout_Spaceship`

Selected production set:

- Four horizontally seamless 512 by 360 celestial layers
- One 144 by 288 planet sheet containing 72 by 72 frames
- Four separated 336 by 264 ship layers: engines, shadows, floor, and walls
- Blue-gray Phaser tint and a restrained drawn glow applied at runtime

Why this direction fits:

- The top-down ship and Red share a compatible camera angle.
- The hull, shadows, engine accents, and surrounding space make the platform read as floating.
- The celestial layers preserve the parallax effect while matching the established futuristic palette.
- The six stations retain their approved compass arrangement and glows, now with literal section labels.

License boundary:

- Evan explicitly authorized game-asset use from `assets4site` on August 2, 2026.
- No exact license file sits beside either selected add-on.
- License files elsewhere in the Minifantasy collection identify Krishna Palacio as creator, but they are not treated as proof of the selected add-ons' exact terms.
- Production credit is therefore recorded conservatively as `Minifantasy assets by Krishna Palacio`.

## Preserved environment comparisons

### Stormy Mountains

Private source: `_PACKS/parallax/Stormy_Mountains_Package/640 x 360`

- Seven selected 640 by 360 layers remain in the public production set.
- The atmosphere and parallax treatment were positively received.
- The perspective mismatch came from pairing the isometric floor with Red, not from the parallax itself.
- The scene remains available at `?background=mountains`.
- No adjacent pack-specific license file was found. Evan's direct authorization is recorded in `ASSETS.md`.

### Procedural archive

- Contains no licensed environment art.
- Preserves the original drawn isometric floor and architecture.
- Remains available at `?background=baseline` as the durable recovery and comparison mode.

## Unused shortlist

### Legacy Night Town

Private source: `_UNSORTED/Legacy Collection/Legacy Collection/Assets/Gothicvania/Environments/night-town-background-files`

- Seven dark teal town, forest, mountain, cloud, and sky layers
- Covered by the Legacy Collection CC0 license from Luis Zuno, also known as Ansimuz
- Attribution is not required
- Retained as a license-first fallback, but no longer the next visual test

### Cherry Blossom Parallax

Private source: `_PACKS/parallax/Cherry Blossom Parallax Background`

- Thirteen 480 by 270 transparent layers, including nine sky frames
- Navy, magenta, purple, and teal palette
- Includes GIF preview plus ASE and PSD sources
- No adjacent license file found. Locate the original store or license record before production use.

### Animated Pixel-Art Background 3

Private source: `_PACKS/parallax/Animated Pixel-Art Backgrounds Free/Art/Animations/Pixel-Art Background 3`

- 143 full-frame 480 by 270 PNGs totaling about 19.2 MB
- Dark parkland with a luminous futuristic structure
- Animation rather than true layered parallax
- Requires frame reduction or atlas optimization before production use
- No adjacent license file found

## Confirmed license anchors

- Legacy Collection: `_UNSORTED/Legacy Collection/Legacy Collection/public-license.pdf`, CC0
- Kenney isometric library: `_UNSORTED/kenney_isometricLibrary/License.txt`, CC0
- Parallax Forest: `_PACKS/parallax/parallax_forest_pack web/parallax_forest_pack web/public-license.pdf`, CC0
- Ice Castle: `_PACKS/parallax/Ice Castle Parallax BG/Frostwindz Asset License Agreement.docx`, present but terms not yet reviewed

## Historical next evaluation order

1. Review the default ship composition at desktop and mobile widths.
2. Export a calmer neutral Red idle sequence.
3. Export floating-screen interaction frames for the directions most likely at each terminal. South is sufficient for the current functional pass.
4. Tune station spacing, ship glow, or scale only in response to the visual review.
5. Keep both preserved comparison URLs working while the default is finalized.
