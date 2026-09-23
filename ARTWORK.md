# Artwork

Created for Midnight Pawn with the built-in image generation tool. All final raster assets are included locally; the game has no external image dependencies.

- `shop.webp`: 1536 × 1024 pixel-art midnight pawnshop interior. Dark walnut shelves of antique clocks, books, potions and celestial relics. Teal rainy window left, amber lamp right, empty central visitor space and wooden counter. Crisp 16-bit pixel clusters, dark plum and navy shadows. No text, UI or people.
- `characters-0.webp`: 1536 × 1024 transparent sprite sheet, 4 columns × 2 rows. Calico merchant, crow broker, ghost girl, witch; courier, brass robot, sea captain, professor.
- `characters-1.webp`: same format. Goblin, rabbit tailor, aristocrat, streamer; undertaker, plant person, red-mask swordswoman, plague doctor.
- `characters-2.webp`: same format. Fox-eared woman, space explorer, repairwoman, rogue; antlered librarian, aquarium-headed gentleman, miner, masked collector.

Character prompt: production 16-bit pixel-art sprite sheet for a cozy mysterious pawnshop. Genuine transparent background; strict equal 4×2 grid; exactly eight centered frontal full-body sprites; consistent scale, clear margins, distinct faces and silhouettes; dark plum/amber/teal palette; no text, UI, lines, scenery or overlapping cells. Each sheet used the cast and costumes above in row order.

Item graphics are rendered locally by `sprites.js`, with category-specific silhouettes, palette variants and rarity details. No third-party game sprites or trademarks are used.

The original artwork was converted to lossless WebP for mobile delivery. Decoded RGBA pixels were verified identical to the originals. Character sheets load on demand. Home-screen icons are drawn locally as a small pixel-art shop sign.
