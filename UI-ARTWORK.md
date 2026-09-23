# v4.1 UI 이미지 제작 기록

내장 이미지 생성 도구로 제목과 대화창을 새로 만들었습니다. 생성 원본의 픽셀·알파를 보존한 무손실 WebP를 사용합니다.

배포 파일: `title-logo.webp`, `dialogue-frame.webp`. 두 파일 모두 게임과 같은 폴더에 포함됩니다.

# 제목 로고 이미지

- 결과: `title-logo.webp`
- 생성 방식: 내장 `image_gen` 도구, 신규 이미지 생성
- 원본 보관: `../midnight-pawn/title-logo-original.png`
- 원본 크기: 1536 × 1024 px, RGBA
- 실제 글자 표기 검수: 첫 줄 **수상한**, 둘째 줄 **전당포**, 영문 부제 없음
- 배경: 알파 투명도 포함. 이미지 생성 결과의 알파와 색상을 그대로 보존하는 lossless WebP로 변환함.
- 알파 32 이상 영역: (96, 164) – (1444, 889). 약한 그림자/광채 때문에 최소 알파 경계는 더 넓음.
- 코드로 문자를 그리거나 합성하지 않음.

## 최종 생성 프롬프트

```text
Use case: logo-brand.
Asset type: production transparent raster logo for a Korean mobile 16-bit pixel-art antique pawnshop game. The logo itself is a generated image, not a mockup.
Primary request: Draw an exceptionally readable, beautiful chunky pixel Hangul title, two centered lines, saying EXACTLY:
수상한
전당포
Spelling is crucial: top row consists of exactly three Hangul syllable blocks 수 / 상 / 한. Bottom row consists of exactly three Hangul syllable blocks 전 / 당 / 포. No other text. Each line should have equally large lettering.
Scene/backdrop: genuinely transparent alpha background, no scene, no rectangle, no opaque background or checkerboard illustration.
Style/medium: premium hand-pixeled 16-bit roleplaying game title lettering, square stepped pixels, confident simple readable Hangul silhouettes, gold and amber front faces with small cream pixel highlights, deep plum dark outline and short stepped dark plum shadow, subtle desaturated teal edge accents. The feeling is a mysterious cozy midnight antique pawnshop.
Composition/framing: logo centered on wide landscape canvas, tight composition with modest transparent safe margin, all text fully visible, about 85% canvas width. Bottom line directly below first with clear separation. High legibility when shown only 260 CSS pixels wide on a phone. Restrained small pixel four-point star accents near the outer upper corners may be used, but letters are dominant.
Constraints: render precisely the two Korean lines above, no English subtitle, no Latin letters, no slogan, no watermark, no frame, no photographic materials, no smooth 3D rendering, no excessive flourishes, no objects crossing the letters. Actual transparency must be preserved.
```



---

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
