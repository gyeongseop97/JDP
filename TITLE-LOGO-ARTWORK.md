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

