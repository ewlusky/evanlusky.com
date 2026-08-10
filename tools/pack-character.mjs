/**
 * Packs the PixelLab character export into strip sheets for Phaser.
 *
 * Every frame is cropped to ONE shared bounding box computed across the whole
 * set, so the feet never drift between animations. Source frames are 256x256
 * with the character occupying a small centre column; cropping cuts texture
 * memory by roughly 8x without touching a single visible pixel.
 *
 * Takes one or more source roots. Later roots win when two exports contain the
 * same clip, so a newer export can be layered over an older one without losing
 * the clips it happens to omit.
 *
 * Frames whose canvas size differs from the set's dominant size are skipped
 * with a warning: one bad folder would otherwise poison the shared crop box
 * and make the blit read outside the image.
 *
 * Usage: node tools/pack-character.mjs <outDir> <sourceDir...>
 */
import { readdirSync, statSync, mkdirSync, writeFileSync, createReadStream, createWriteStream } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { PNG } from 'pngjs';

const [, , OUT, ...SOURCES] = process.argv;
if (!OUT || SOURCES.length === 0) {
  console.error('usage: node tools/pack-character.mjs <outDir> <sourceDir...>');
  process.exit(1);
}

const readPng = (path) =>
  new Promise((resolve, reject) => {
    createReadStream(path)
      .pipe(new PNG())
      .on('parsed', function () {
        resolve(this);
      })
      .on('error', reject);
  });

const writePng = (png, path) =>
  new Promise((resolve, reject) => {
    const stream = createWriteStream(path);
    png.pack().pipe(stream).on('finish', resolve).on('error', reject);
  });

/** Collect every animation/direction folder that contains frame_*.png files. */
function collectClips(root) {
  const clips = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
      }
    }
    const frames = readdirSync(dir)
      .filter((f) => /^frame_\d+\.png$/i.test(f))
      .sort();
    if (frames.length > 0) {
      clips.push({ dir, frames: frames.map((f) => join(dir, f)) });
    }
  };
  walk(root);
  return clips;
}

/** slugify "Hands_out_of_pockets/animations/Button_Push/east" -> "push-east" */
function keyFor(root, dir) {
  const parts = relative(root, dir).split(sep).filter((p) => p !== 'animations');
  const state = parts.shift() ?? '';
  const direction = parts.pop() ?? '';
  const name = parts.join('-');
  const shorten = (s) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 46);
  const statePrefix = state.toLowerCase().startsWith('hands') ? 'hop' : 'base';
  return `${statePrefix}-${shorten(name)}-${shorten(direction)}`.replace(/-+/g, '-');
}

// Later sources win, so a newer export layers over an older one by clip key.
const byKey = new Map();
for (const root of SOURCES) {
  const found = collectClips(root);
  console.log(`  ${root}: ${found.length} clips`);
  for (const clip of found) {
    byKey.set(keyFor(root, clip.dir), { ...clip, root });
  }
}
const clips = [...byKey.entries()].map(([key, clip]) => ({ ...clip, key }));
if (clips.length === 0) {
  console.error('no frame_*.png found under any source');
  process.exit(1);
}
console.log(`merged to ${clips.length} clips, ${clips.reduce((n, c) => n + c.frames.length, 0)} frames`);

// Pass 1: measure every frame, then union the alpha bounding box across only
// the frames that share the dominant canvas size.
const ALPHA_FLOOR = 8;
const sizeCount = new Map();
const measured = new Map();

for (const clip of clips) {
  for (const file of clip.frames) {
    const png = await readPng(file);
    const size = `${png.width}x${png.height}`;
    sizeCount.set(size, (sizeCount.get(size) ?? 0) + 1);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let y = 0; y < png.height; y++) {
      for (let x = 0; x < png.width; x++) {
        if (png.data[(png.width * y + x) * 4 + 3] > ALPHA_FLOOR) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }
    measured.set(file, { size, minX, minY, maxX, maxY });
  }
}

const dominant = [...sizeCount.entries()].sort((a, b) => b[1] - a[1])[0][0];
const [frameW, frameH] = dominant.split('x').map(Number);
for (const [size, count] of sizeCount) {
  if (size !== dominant) console.warn(`  ! skipping ${count} frame(s) sized ${size}; set is ${dominant}`);
}

const skipped = [];
for (const clip of clips) {
  const bad = clip.frames.filter((f) => measured.get(f).size !== dominant);
  if (bad.length > 0) {
    skipped.push(clip.key);
  }
}
const usable = clips.filter((c) => !skipped.includes(c.key));
if (skipped.length > 0) console.warn(`  ! dropped clips (wrong canvas size): ${skipped.join(', ')}`);

let minX = Infinity;
let minY = Infinity;
let maxX = -Infinity;
let maxY = -Infinity;
for (const clip of usable) {
  for (const file of clip.frames) {
    const m = measured.get(file);
    if (m.minX < minX) minX = m.minX;
    if (m.maxX > maxX) maxX = m.maxX;
    if (m.minY < minY) minY = m.minY;
    if (m.maxY > maxY) maxY = m.maxY;
  }
}

// A little breathing room so rim lighting and motion blur never clip.
const PAD = 2;
minX = Math.max(0, minX - PAD);
minY = Math.max(0, minY - PAD);
maxX = Math.min(frameW - 1, maxX + PAD);
maxY = Math.min(frameH - 1, maxY + PAD);
const cropW = maxX - minX + 1;
const cropH = maxY - minY + 1;
console.log(`source ${frameW}x${frameH} -> crop ${cropW}x${cropH} at (${minX},${minY})`);

// Pass 2: crop and pack each clip into a horizontal strip.
mkdirSync(OUT, { recursive: true });
const manifest = { frameWidth: cropW, frameHeight: cropH, source: { frameW, frameH, minX, minY }, clips: {} };

for (const clip of usable) {
  const key = clip.key;
  const strip = new PNG({ width: cropW * clip.frames.length, height: cropH });
  strip.data.fill(0);

  for (let i = 0; i < clip.frames.length; i++) {
    const png = await readPng(clip.frames[i]);
    png.bitblt(strip, minX, minY, cropW, cropH, i * cropW, 0);
  }

  const file = `${key}.png`;
  await writePng(strip, join(OUT, file));
  manifest.clips[key] = { file, frames: clip.frames.length };
}

// The feet sit at the bottom of the shared crop; a hair above the very edge
// reads better once a contact shadow is drawn under it.
manifest.footPivot = { x: 0.5, y: 0.98 };
writeFileSync(join(OUT, 'character.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`wrote ${Object.keys(manifest.clips).length} strips + character.json to ${OUT}`);
