# Midnight Pawn · Original Chiptune

수상한 전당포용 오리지널 음악입니다. 기존 게임 음악이나 녹음 샘플을 포함하지 않습니다.

- moonlit-sign.mp3 — 달빛 아래 간판 · D minor · 112 BPM · 24마디
- odd-little-bargain.mp3 — 수상한 흥정 · D minor · 104 BPM · 32마디
- after-the-last-guest.mp3 — 마지막 손님이 떠난 뒤 · D minor · 84 BPM · 16마디

악기: 배음 수를 제한한 펄스파 리드, 짧은 펄스파 아르페지오, 삼각파 베이스, 사인파 오르골, 합성 노이즈 드럼. 원본은 32kHz 16bit 스테레오 WAV, 게임 배포본은 128kbps MP3입니다. 반복 끝의 잔향을 첫 부분에 합성하고 인코더의 gapless 정보를 포함했습니다.

게임은 Web Audio로 곡을 한 번 해독해 반복합니다. 상황별 효과음은 soundtrack.js에서 직접 합성합니다. 요청된 게임의 배포·수정에 이 파일을 사용할 수 있습니다.

## 원본 다시 만들기

Python과 NumPy가 설치된 환경에서 `python compose.py`를 실행하면 `rendered-masters` 폴더에 WAV와 점검용 score.json을 만듭니다. 배포용 MP3는 FFmpeg의 libmp3lame, 128kbps, 32000Hz, Xing gapless 태그로 변환했습니다. 파일 생성 도구는 게임 구동에 필요 없습니다.
