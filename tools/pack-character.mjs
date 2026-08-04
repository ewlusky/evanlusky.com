/**
 * Packs the PixelLab character export into strip sheets for Phaser.
 *
 * Every frame is cropped to ONE shared bounding box computed across the whole
 * set, so the feet never drift between animations. Source frames are 256x256
 * with the character occupying a small centre column; cropping cuts texture
 * memory by roughly 8x without touching a single visible pixel.
 *
 * Usage: node tools/pack-character.mjs <sourceDir> <outDir>
 */
import { readdirSync, statSync, mkdirSync, writeFileSync, createReadStream, createWriteStream } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { PNG } from 'pngjs';

const [, , SRC, OUT] = process.argv;
if (!SRC || !OUT) {
  console.error('usage: node tools/pack-character.mjs <sourceDir> <outDir>');
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

const clips = collectClips(SRC);
if (clips.length === 0) {
  console.error(`no frame_*.png found under ${SRC}`);
  process.exit(1);
}
console.log(`found ${clips.length} clips, ${clips.reduce((n, c) => n + c.frames.length, 0)} frames`);

// Pass 1: union alpha bounding box across every frame in the set.
let minX = Infinity;
let minY = Infinity;
let maxX = -Infinity;
let maxY = -Infinity;
let frameW = 0;
let frameH = 0;
const ALPHA_FLOOR = 8;

for (const clip of clips) {
  for (const file of clip.frames) {
    const png = await readPng(file);
    frameW = png.width;
    frameH = png.height;
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

for (const clip of clips) {
  const key = keyFor(SRC, clip.dir);
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
