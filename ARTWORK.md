# Artwork

Created for Midnight Pawn with the built-in image generation tool. All final raster assets are included locally; the game has no external image dependencies.

- `shop.webp`: 1536 × 1024 pixel-art midnight pawnshop interior. Dark walnut shelves of antique clocks, books, potions and celestial relics. Teal rainy window left, amber lamp right, empty central visitor space and wooden counter. Crisp 16-bit pixel clusters, dark plum and navy shadows. No text, UI or people.
- `characters-0.webp`: 1536 × 1024 transparent sprite sheet, 4 columns × 2 rows. Calico merchant, crow broker, ghost girl, witch; courier, brass robot, sea captain, professor.
- `characters-1.webp`: same format. Goblin, rabbit tailor, aristocrat, streamer; undertaker, plant person, red-mask swordswoman, plague doctor.
- `characters-2.webp`: same format. Fox-eared woman, space explorer, repairwoman, rogue; antlered librarian, aquarium-headed gentleman, miner, masked collector.

Character prompt: production 16-bit pixel-art sprite sheet for a cozy mysterious pawnshop. Genuine transparent background; strict equal 4×2 grid; exactly eight centered frontal full-body sprites; consistent scale, clear margins, distinct faces and silhouettes; dark plum/amber/teal palette; no text, UI, lines, scenery or overlapping cells. Each sheet used the cast and costumes above in row order.

Item graphics: 144 individual treasure illustrations were generated with the built-in image generation tool, in the exact `PAWN_ITEMS` order. Six transparent 1536 × 1024 sheets each contain a 6-column × 4-row arrangement of 24 objects:

- `item-art-0.webp`: indices 0–23; clocks and jewelry.
- `item-art-1.webp`: indices 24–47; weapons and books.
- `item-art-2.webp`: indices 48–71; potions and relics.
- `item-art-3.webp`: indices 72–95; instruments and tools.
- `item-art-4.webp`: indices 96–119; masks and toys.
- `item-art-5.webp`: indices 120–143; artwork and cosmic curios.

Each item prompt included its actual Korean name and visual clue from `items.js`. Shared prompt: premium 16-bit pixel-art inventory treasures; exactly 24 complete, individually centered objects in a 6×4 arrangement; genuine transparent alpha; richly shaded vintage brass, leather, wood, glass and gems; crisp dark-plum pixel outlines, amber highlights and teal accents; distinct silhouettes; no labels, UI, grid lines or watermarks. The requested clear cell margins were not consistently produced, so the renderer uses measured individual silhouette bounds rather than clipping blindly at nominal cell edges.

`sprites.js` preserves `PawnArt.item(canvas, data, grade, unknown)` and the original procedural fallback. It uses the item index to select one sheet lazily, redraws pending direct callers and current DOM canvases when loading finishes, and skips all image requests for unknown items. Objects fit within a centered 96-pixel area of a 128×128 canvas with smoothing disabled. Higher rarity adds small colored corner accents and pixel stars. Failed downloads retain the local fallback.

All six WebP files are lossless: decoded RGBA pixels were verified identical to the original PNGs. Together they occupy 12,658,792 bytes and are requested only as needed. All 144 main silhouettes were checked for both clipping and neighboring-object contamination. Three objects (indices 82, 88 and 94) use a canvas clipping path; all others use a source rectangle. After these rendering adjustments, both counts are zero. The silhouette check uses alpha ≥32 and connected components of at least 24 pixels, separating substantial object details from faint glows and isolated specks. Original PNGs, complete prompts and per-item alpha-analysis reports are preserved in the workspace folder `pawn-item-originals`. No third-party game sprites or trademarks are used.

The original artwork was converted to lossless WebP for mobile delivery. Decoded RGBA pixels were verified identical to the originals. Character sheets load on demand. Home-screen icons are drawn locally as a small pixel-art shop sign.

Complete final prompts for the six item sheets are included in ITEM-ART-PROMPTS.json.
