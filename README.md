# evanlusky.com

Personal site. Standard resume site up top, a small Phaser scene in the middle: a pixel version of me walking around a ship deck where the furniture is the nav menu.

## Dev

```
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build to dist/
```

Deploys to GitHub Pages via Actions on push to `main`. Custom domain is set through `public/CNAME`.

## Art

Current sprites are generated placeholders. Real assets drop into `public/assets/` and get wired up in `src/game/`.

Credits (required by asset licenses) live in the site footer once real assets land.
