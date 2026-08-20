# Images

These are **placeholder SVG illustrations**, drawn for this build. No stock photos were
downloaded, so there is nothing here with a licence attached — safe to keep or delete.

| File | Used on | Replace with |
|---|---|---|
| `hero-latte.svg` | `index.html` hero | A strong overhead or close-up drink shot, landscape, ~1600×1280 |
| `storefront.svg` | `index.html`, `about.html` | The shopfront from across the street, landscape ~1600×1200 |
| `interior.svg` | `index.html`, `about.html` | The counter / room with people in it, landscape ~1600×1200 |
| `favicon.svg` | all pages | The brand mark, square, simple enough to read at 16px |

## Swapping one in

Drop the photo in this folder and change the `src` — nothing else. The CSS handles sizing,
rounding, and the shadow. Example, in `index.html`:

```html
<!-- from -->
<img src="assets/img/hero-latte.svg" width="800" height="640"
     alt="Overhead view of a latte with heart-shaped latte art beside a pastry">

<!-- to -->
<img src="assets/img/hero-photo.jpg" width="1600" height="1280"
     alt="A barista pouring latte art at the counter of The Daily Grind">
```

Keep the `width` and `height` attributes accurate to the real file — they reserve space
while the image loads and stop the page from jumping around.

## If you use photos

- **Export at 2× the display size, then compress.** Squoosh (squoosh.app) or TinyPNG will
  usually get a hero image under 200KB with no visible loss.
- **Prefer WebP** with a JPEG fallback if you care about the last few kilobytes.
- **Write real alt text** — describe what's in the photo, not "coffee shop image". Screen
  readers and Google both use it.
- **Add `loading="lazy"`** to any image below the fold. Leave it *off* the hero image.

## If you need stock instead

Client photos are always better for a local business, but if you need filler:
Unsplash, Pexels, and Openverse all carry commercially usable coffee shop imagery.
Check the licence on each individual photo — some require attribution.
