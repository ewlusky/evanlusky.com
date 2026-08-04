# Command-bridge asset review, August 3, 2026

This review covers only the assets evaluated for the final 2D/2.5D site pivot. Private source folders remain outside the repository.

## Selected room

Selected source:

`fischerkeltath_plain_empty_2.5d_pixel_art_sci_fi_control_room_c2ae4047-a71d-40c2-ba29-3ce50c545440_2.png`

Why it was selected:

- 1456 by 816 is close to the canvas aspect ratio and needs only a small centered crop.
- The fixed camera, open foreground floor, dark center, and paired console banks support a single-room menu.
- Cyan and coral details fit the existing palette without replacing the protected teal, gold, pink, violet, coral, and blue station identities.
- It supports profile east/west movement without perspective scaling or an isometric character redraw.

The `_1.png` room was the strongest alternate because of its clean central door. The orthographic hangar was the strongest potential scrolling level. Both were rejected for launch because multiple rooms, transitions, or a wide scrolling layout would hide destinations and increase interaction cost.

## Ambient video

Supplied source properties:

- H.264 High profile, YUV420p
- 832 by 464
- 24 fps
- 125 frames
- 5.208333 seconds
- 2,573,581 bytes
- no audio stream
- no alpha channel

The source is not seamless. Its first and last frames differ visibly in monitor contents, lighting, reflections, and fine generated geometry. The production copy is therefore a forward-and-reverse ping-pong loop rather than a raw repeating loop.

Production properties:

- `public/assets/environment/command-bridge/bridge-ambient-loop.mp4`
- 832 by 464 H.264/YUV420p
- 24 fps
- 10.416667 seconds
- 2,060,603 bytes
- no audio stream
- fast-start MP4 metadata

The higher-resolution still remains underneath the video, supplies the loading poster, and becomes the entire environment for reduced-motion users or video-load failure.

## Red animation boundary

The `CustomEvanRed` source export contains 190 transparent 256 by 256 PNGs and identifies an August 2 PixelLab-style export. No newer August 3 export was present during this review.

Production now uses 99 selected frames:

- eight static rotations
- eight walking directions with eight frames each
- east console tap with nine frames
- west console tap with nine frames
- south floating-screen interaction with nine frames

The fixed foot origin is approximately source Y 206 divided by 256, or 0.805. Frames remain on their common 256 by 256 canvas and are not auto-trimmed.

## Provenance boundary

Evan described the room assets as ones he made and explicitly supplied them for this site. Filenames support a Midjourney workflow, but the files contain no embedded author, prompt, license, or subscription metadata. The production ledger records Evan's direct authorization without inferring broader redistribution terms.

The unrelated POND5-watermarked preview and undocumented 4K video remain excluded. No source pack or private asset directory was copied wholesale.
