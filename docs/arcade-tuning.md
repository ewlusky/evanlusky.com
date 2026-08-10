# Tuning the Command Deck

Everything here is a plain number in a plain file. Change it, run `npm run build`, reload.

## Seeing the floor: `?debug=1`

Open <http://localhost:5173/arcade.html?debug=1> (or `evanlusky.com/arcade?debug=1`).

You get:

- every collision rectangle drawn in red over the floor,
- a cyan grid: lines every `0.1` in **v** (depth) and every `0.2` in **u** (across),
- a readout in the top left showing the floor coordinate under your cursor and the one the character is standing on,
- the same coordinate logged to the browser console every time you click.

That readout is the whole trick. Point at a thing you want to block, write down the numbers.

## The floor coordinate system

Position is not pixels. It is two numbers:

| | meaning | range |
|---|---|---|
| `u` | left to right | `-1` at the port wall, `+1` at starboard |
| `v` | depth into the screen | `0` at the far consoles, `1` at the very front |

The scene converts those to a screen position, a sprite scale, and a draw order. That is why he gets bigger as he walks toward you without any of the code caring about pixels.

## Adding collision

`src/arcade/deck.ts`, the `DECK_BLOCKERS` array. Each entry is a rectangle in floor space:

```ts
export const DECK_BLOCKERS: Blocker[] = [
  { u0: -1.1, u1: 1.1, v0: -0.5, v1: 0.13 },  // back console bank
  { u0: 0.58, u1: 0.86, v0: 0.26, v1: 0.46 }, // pilot chair
];
```

`u0`/`u1` are the left and right edges, `v0`/`v1` the far and near edges. Order does not matter and they can overlap. Collision is resolved one axis at a time, so walking diagonally into a corner slides along it instead of sticking.

Two rules worth remembering:

1. **Do not cover a station.** If a blocker sits on top of a `DECK_STATIONS` entry, that station can never be reached on foot. The debug view makes this obvious because you can see both.
2. **Overshoot the edges.** Blockers that are meant to act as walls should extend past the floor (`-1.1` to `1.1` rather than `-1` to `1`) so he cannot squeeze around the corner.

## Sizing the character

Same file, `DECK_FLOOR`:

```ts
farScale: 0.92,    // his size at the back wall
nearScale: 1.88,   // his size at the very front
scaleCurve: 0.7,   // how fast he grows on the way forward
```

`scaleCurve` is the useful one. At `1` the growth is a straight line from back to front. Below `1` he reaches most of his size early, which fills out the middle of the room. Above `1` he stays small until he is right up against the camera. The back of the room was already right, so the curve is what lifted the middle and front without touching it.

`CORRIDOR_FLOOR` has the same three knobs for the hallway.

## Tuning the jump

`src/arcade/scenes/DeckScene.ts`, the `FLIP` block:

```ts
const FLIP = {
  hopPeak: 54,     // height of the arc in pixels, before depth scaling
  travel: 0.13,    // how far the flip carries him, in u units
  liftStart: 0.12, // when his feet leave the floor (fraction of the animation)
  liftEnd: 0.88,   // when he lands
};
```

The lift is multiplied by his depth scale, so a jump at the front of the room is automatically bigger than one at the back. If he looks like he floats before the tuck, raise `liftStart`. If he hangs after landing, lower `liftEnd`.

## Where the animations come from

`tools/pack-character.mjs` takes an output directory followed by any number of PixelLab export folders:

```bash
node tools/pack-character.mjs public/assets/characters/red <oldExport> <newExport>
```

Later folders win, so a new export layers over an old one without losing clips the new one happens to omit. Every frame is cropped to one shared bounding box so his feet never drift between animations, and any folder whose canvas size does not match the rest of the set is reported and skipped rather than corrupting the crop.

Animation names are registered in `src/arcade/character.ts`.
