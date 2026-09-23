# 이미지가 포함된 게임 업로드하기

이 버전은 이미지와 게임 파일이 모두 같은 폴더에 있습니다. 이미지 폴더를 별도로 올릴 필요가 없습니다.

## 이미 JDP 게임을 게시했다면

1. 받은 ZIP의 압축을 풉니다.
2. [JDP 저장소](https://github.com/gyeongseop97/JDP)에서 **Add file → Upload files**를 누릅니다.
3. 압축을 푼 폴더 안의 **파일 전체**를 선택해 올립니다. ZIP이나 바깥 폴더는 올리지 않습니다.
4. **Commit changes**를 누릅니다. 같은 이름의 기존 게임 파일은 새 파일로 교체됩니다.
5. GitHub 게시가 끝나면 [게임 주소](https://gyeongseop97.github.io/JDP/)를 새로고침합니다. 이미 켜 둔 Pages 설정은 다시 바꿀 필요가 없습니다.

게임 파일뿐 아니라 아래 이미지 6개도 저장소 첫 화면에서 보여야 합니다.

- `shop.webp` — 전당포 배경
- `characters-0.webp` — 캐릭터 8명
- `characters-1.webp` — 캐릭터 8명
- `characters-2.webp` — 캐릭터 8명
- `icon-192.png`, `icon-512.png` — 홈 화면 아이콘

이 버전의 `index.html`, `style.css`, `app.js`, `manifest.webmanifest`도 함께 올려야 새 이미지 위치로 연결됩니다. 전체 파일을 선택하면 됩니다.

## 처음 게시한다면

파일 업로드 후 **Settings → Pages → Deploy from a branch → main / (root) → Save**로 설정합니다. 게시 완료 뒤 사용할 주소는 https://gyeongseop97.github.io/JDP/ 입니다.

[GitHub 공식 Pages 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)

## 모바일

게임 진행은 같은 기기와 브라우저에 자동 저장됩니다. 이번 파일 교체는 저장 키를 바꾸지 않으므로 같은 주소로 접속하면 이어서 플레이합니다. 브라우저 데이터를 삭제하거나 새 가게를 시작할 필요가 없습니다.

홈 화면에 추가하면 아이콘으로 열 수 있습니다. 오프라인 플레이는 지원하지 않습니다.
