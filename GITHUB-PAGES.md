# GitHub에 게임 업데이트하기

1. 받은 ZIP을 **압축 해제**합니다.
2. [JDP 저장소](https://github.com/gyeongseop97/JDP)에서 **Add file → Upload files**를 누릅니다.
3. 압축을 푼 폴더 **안의 파일 전체**를 선택해서 올립니다. ZIP이나 바깥 폴더 자체를 올리지 않습니다.
4. **Commit changes**를 누릅니다. 기존 이름의 파일도 새 버전으로 교체합니다.
5. GitHub 게시가 끝나면 [수상한 전당포](https://gyeongseop97.github.io/JDP/)를 새로고침합니다.

이미 Pages를 사용 중이면 설정은 그대로 두세요. 새로 시작 버튼을 누르거나 브라우저 데이터를 지울 필요도 없습니다. 기존 진행은 **불러오기**로 불러옵니다.

## 빠뜨리기 쉬운 파일

이 배포본에는 하위 폴더가 없습니다. 다음 파일도 게임 코드와 나란히 함께 올립니다.

- `shop.webp`, `characters-0.webp` ~ `characters-2.webp`: 상점·손님 원화
- `title.webp`: 시작 화면 원화
- `title-logo.webp`, `dialogue-frame.webp`, `dialogue.css`: 이미지 제목·도트 대화창·새 대화 배치
- `item-art-0.webp` ~ `item-art-5.webp`: 144종 물건 원화
- `icon-192.png`, `icon-512.png`: 홈 화면 아이콘
- `Galmuri11.woff2`, `FONT-LICENSE.txt`: 도트 글꼴과 라이선스
- `profiles.js`, `onboarding.js`, `onboarding.css`: 손님 대사·시작 화면·체험 튜토리얼
- `index.html`, `app.js`, `engine.js`, `style.css` 등 나머지 파일도 **모두** 교체합니다.

전체 선택으로 업로드하는 것이 가장 간단합니다. 이미지 파일만 올리거나 예전 게임 코드만 남기면 새 그림·기능이 연결되지 않습니다.

## 처음 게시한다면

업로드 후 **Settings → Pages → Deploy from a branch → main / (root) → Save**로 설정합니다. 게시가 끝나면 https://gyeongseop97.github.io/JDP/ 로 접속합니다.

[GitHub 공식 Pages 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)
