# Asset ledger

Only production files listed here may be copied into `public/assets`. Source packs remain outside the public repository.

## Evan avatar, CustomEvanRed PixelLab export

- Public path: `public/assets/characters/evan/`
- Source: user-provided PixelLab.ai export named `CustomEvanRed`
- Original location: private `assets4site/_EVAN/EvanCharacterAttempts/CustomEvanRed` source library
- Ownership and permission: generated for Evan and explicitly authorized by Evan for this site
- Files used: eight static rotations, eight walking directions with eight frames each, nine east-facing console-tap frames, nine west-facing console-tap frames, and nine south-facing floating-screen interaction frames
- Public layout: `idle/{direction}.png`, `walk/{direction}/frame_000.png` through `frame_007.png`, and `interact/{east|south|west}/frame_000.png` through `frame_008.png`
- Processing: selected PNGs are copied and renamed only. Original pixel data is unchanged.
- Runtime use: static direction frames are used while stopped, east/west walk loops drive the default bridge, all eight walk loops remain available in preserved map modes, and the facing-appropriate console interaction plays before a nearby terminal opens when motion is allowed
- Technical notes: 99 files totaling 810,541 bytes. Every file is a 256 by 256 RGBA PNG with transparent padding. Runtime scale is 0.55 with a fixed foot origin at approximately 0.805.
- Export boundary: only the selected production frames above are public. The promised calmer idle and newer floating-screen variants had not arrived as of August 3, 2026.

## Evan-generated command bridge

- Public path: `public/assets/environment/command-bridge/`
- Source: Evan-generated Midjourney command-room still and ambient animation, explicitly supplied for this site on August 3, 2026
- Original locations: private `assets4site/_UNSORTED/NewIdea` source library for the still and Evan's Downloads folder for the supplied MP4
- Ownership and permission: Evan described the assets as ones he made and directly authorized their use in this site build
- Embedded metadata note: the files contain no author, prompt, license, or comment metadata. The provenance statement above comes from Evan's direct authorization, not inferred subscription terms.
- Files used: `bridge-poster.png` and `bridge-ambient-loop.mp4`
- Source mapping: `fischerkeltath_plain_empty_2.5d_pixel_art_sci_fi_control_room_c2ae4047-a71d-40c2-ba29-3ce50c545440_2.png` to `bridge-poster.png`; supplied `fischerkeltath_plain_empty_2.5d_pixel_art_sci_fi_control_room_08f7864a-7d26-4a62-831b-2c43c16b6a9e_0.mp4` to `bridge-ambient-loop.mp4`
- Processing: the 1456 by 816 RGB poster is copied unchanged. The non-seamless 5.208-second H.264 source video is concatenated with a reversed copy to make a 10.4167-second seamless ping-pong loop, re-encoded as muted 832 by 464 H.264/YUV420p at 24 fps with CRF 20 and fast-start metadata.
- Use: default fixed-camera 2.5D command bridge. Phaser center-crops the background, adds a restrained navy atmosphere, and overlays six holographic résumé consoles. The poster remains visible during load and is the complete reduced-motion and playback-failure fallback.
- Technical notes: two files totaling 3,368,953 bytes. The ambient loop contains no audio stream.
- Accessibility: the room is decorative. Every destination has literal canvas text plus a semantic HTML button, and no résumé content depends on the video.

## Celestial Bodies backdrop, preserved comparison

- Public path: `public/assets/environment/celestial-backdrop/`
- Source: Minifantasy `Celestial_Bodies_Backdrop` add-on from Evan's `All_Exclusives_20260727` collection
- Original location: private `assets4site/_UNSORTED/All_Exclusives_20260727/Addons/_Sci-fi/_Miscellany/Celestial_Bodies_Backdrop` source library
- Permission: Evan stated on August 2, 2026 that every game asset in `assets4site` is free to use, covered by a license he owns, or both, and explicitly authorized use on this site
- Pack-specific license note: no separate license text was found beside this exact selected add-on. Neighboring Minifantasy license files identify Krishna Palacio as the creator, but their terms are not treated as proof of this add-on's exact license.
- Conservative credit: Minifantasy assets by Krishna Palacio
- Files used: four background layers and one planet sprite sheet
- Source mapping: `d-Space_background.png` to `background.png`, `c-Galactic_plane_1.png` to `galactic-near.png`, `b-Galactic_plane_2.png` to `galactic-far.png`, `a-Intergalactic_space_borders.png` to `star-borders.png`, and `Props/Planets.png` to `planets.png`
- Processing: selected PNGs are copied and renamed only. Pixel data is unchanged.
- Use: optional `?background=space` comparison. The four 512 by 360 layers tile horizontally across the 960 by 560 canvas with movement-linked parallax; selected 72 by 72 frames from the 144 by 288 planet sheet provide two decorative depth cues
- Technical notes: five RGBA files totaling 99,139 bytes
- Excluded: mockup GIF, star-field prop, animated sun, source information files, and all unrelated collection files
- Accessibility: the art carries no résumé information, receives no input, and remains static when reduced motion is requested

## Scout spaceship, preserved comparison

- Public path: `public/assets/environment/scout-spaceship/`
- Source: Minifantasy `Scout_Spaceship` add-on from Evan's `All_Exclusives_20260727` collection
- Original location: private `assets4site/_UNSORTED/All_Exclusives_20260727/Addons/_Sci-fi/_Miscellany/Scout_Spaceship` source library
- Permission: Evan's August 2, 2026 blanket game-asset authorization applies to this selected production use
- Pack-specific license note: no separate license text was found beside this exact selected add-on. Do not infer redistribution rights from licenses included with different Minifantasy packs.
- Conservative credit: Minifantasy assets by Krishna Palacio
- Files used: `Premade/Separate_Layers/a-shadows.png`, `c-walls.png`, `d-floor.png`, and `e-engines.png`
- Public names: `shadows.png`, `walls.png`, `floor.png`, and `engines.png`
- Processing: selected PNGs are copied and renamed only. Phaser applies blue-gray tint, alpha, scale, and a drawn glow at runtime; source pixel data is unchanged.
- Use: four-layer floating top-down command ship retained at `?background=space`
- Technical notes: four 336 by 264 RGBA files totaling 14,366 bytes. Runtime scale is 1.72.
- Excluded: source Aseprite file, composite preview, props layer, background layer, tileset, animated doors, mockups, and all unrelated collection files
- Accessibility: the ship is decorative; literal station labels and all résumé content remain available in semantic HTML

## Stormy Mountains parallax environment, preserved comparison

- Public path: `public/assets/environment/stormy-mountains/`
- Source: user-provided game-art pack named `Stormy_Mountains_Package`, 640 by 360 export
- Original location: private `assets4site/_PACKS/parallax/Stormy_Mountains_Package/640 x 360` source library
- Permission: Evan's August 2, 2026 blanket game-asset authorization applies to this selected production use
- Pack-specific license note: no separate license text was found beside this selected export during review. Keep the source pack private and do not infer broader redistribution rights for unused files.
- Files used: background, two background-cloud layers, three mountain layers, and one front-cloud layer
- Public names: `background.png`, `cloud-far.png`, `cloud-mid.png`, `mountain-far.png`, `mountain-mid.png`, `mountain-near.png`, and `cloud-front.png`
- Processing: selected PNGs are copied and renamed only. Pixel data is unchanged.
- Use: optional layered environment behind the preserved isometric archive at `?background=mountains`
- Technical notes: seven 640 by 360 RGBA files totaling 124,098 bytes
- Excluded: composite preview, rain GIF, lighting variants, front path, grass, and stone layers
- Accessibility: the art carries no résumé information, receives no input, and remains static when reduced motion is requested

## Downloadable résumé

- Public path: `public/Evan-Lusky-Resume.docx`
- Source: verified `master-ai-enablement.docx` in Evan's private CareerPrep résumé collection
- Ownership and permission: Evan's own résumé, explicitly authorized for public contact and recruiting use
- Processing: copied and renamed only

## Private source library warning

`assets4site` is a large private source library. It includes paid and free packs, duplicate archives, executables, source files, unrelated repositories, and personal records. It must never be copied wholesale into this repository. License and provenance notes are required pack by pack before any additional production export is selected.
