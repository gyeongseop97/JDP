# 대화상자 도트 프레임

- 생성 방식: 내장 image_gen 도구. 외부 게임의 그래픽을 복제하지 않은 신규 생성 이미지.
- 최종 파일: `dialogue-frame.webp`
- 원본: `../midnight-pawn/dialogue-frame-original.png`
- 크기: 1536 × 1024 px.
- 변환: 원본 PNG를 Pillow로 lossless WebP로만 변환. 리사이즈, 크롭, 재채색, 합성 없음.
- 사용: CSS nine-slice border-image. 권장 `border-image-slice: 100`, `border-width: 20px`, `border-image-repeat: stretch`. 원본의 중앙은 채우지 않고 별도 단색 `background: #211d29`를 사용해 한국어 텍스트 대비를 확보한다. 프레임 모서리 장식은 100px 슬라이스 안에 들어가며 중앙 가장자리는 직선이다.
- 원본은 RGBA 이미지이며 생성된 알파 채널을 손실 없이 보존했다. 캔버스 밖 여백이 없고 프레임이 전체 이미지에 맞춰져 있어 외부 배경 제거가 필요하지 않다.

## 최종 프롬프트

```text
Use case: stylized-concept
Asset type: production 16-bit pixel-art dialogue-box frame for a Korean mysterious pawnshop game, used as a responsive CSS nine-slice border image.
Primary request: draw exactly ONE empty rectangular dialogue frame seen perfectly front-on. Restrained, luxurious antique brass on dark plum. No text at all.
Composition/framing: landscape 1536 by 1024. A complete rectangular frame fills the entire canvas tightly, touching all four image edges with no surrounding scene or external margin. Symmetrical frame, square stepped pixel corners, thin aged-brass double-line edges. Very small tasteful geometrical engraved corner motifs confined to the outermost 80 pixels at each corner. Each of the four central edge spans must be plain straight continuous bands so they can be stretched independently. Absolutely no center medallions or ornaments along edge middles. The top edge is the same thickness as the bottom edge.
Style/medium: authentic crisp 16-bit RPG game UI pixel art. Clearly visible consistent pixel blocks, hard edges, no antialiasing or painterly blur. Polished craft but deliberately understated so Korean dialogue remains the focus.
Color palette: aged brass #d9ad6f with dark brown shadows and muted amber highlights, very subtle desaturated teal corner accents, solid deep plum interior #211d29.
Constraints: The interior must be completely blank, uniform flat solid deep plum with no texture, gradients, motifs, glow, vignettes, text, labels or icons. All decoration stays in the narrow border. Preserve a huge empty central area. Full opacity in the interior and border; only genuinely transparent background outside the stepped external corners if present. Pixel corners, not rounded modern UI.
Avoid: letters, words, numerals, symbols that look like writing, characters, portraits, items, dialogue tails, buttons, labels, cursor, scene, perspective, shadows outside the frame, white background, checkerboard background, any crop or missing edges.
```
