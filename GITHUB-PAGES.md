# GitHub에 올려 휴대폰에서 플레이하기

아래 작업은 본인의 GitHub 계정으로 직접 진행합니다. 빌드나 별도 프로그램 설치는 필요하지 않습니다.

업로드할 저장소는 [gyeongseop97/JDP](https://github.com/gyeongseop97/JDP)입니다. 게시를 마친 뒤 사용할 **예상 게임 주소**는 [https://gyeongseop97.github.io/JDP/](https://gyeongseop97.github.io/JDP/)입니다. 아직 게시 완료가 확인된 주소는 아닙니다.

## 1. 압축 풀기

받은 ZIP을 풀고, `index.html`이 들어 있는 폴더를 여세요. **그 폴더 안의 파일 전체와 `assets` 폴더**를 올립니다. ZIP 파일이나 바깥쪽 `JDP-upload` 폴더 자체를 올리지 마세요.

업로드가 끝나면 저장소 첫 화면에서 다음처럼 보여야 합니다.

```text
JDP
├─ index.html
├─ style.css
├─ app.js
├─ engine.js
├─ panels.js
├─ assets/
└─ 나머지 동봉 파일
```

## 2. 파일 업로드하기

1. [JDP 저장소](https://github.com/gyeongseop97/JDP)를 열고 본인 계정으로 로그인합니다.
2. 저장소의 **Code** 화면에서 **Add file → Upload files**를 누릅니다. 빈 저장소라면 **uploading an existing file** 링크로 시작할 수 있습니다.
3. 압축을 푼 폴더 **안의 파일 전체와 `assets` 폴더**를 업로드 영역으로 끌어다 놓습니다.
4. 목록에 `index.html`과 `assets/…` 파일들이 나타나는지 확인합니다. `JDP-upload/index.html`처럼 한 단계 안쪽으로 들어가면 안 됩니다.
5. 화면의 **Commit changes** 영역에서 설명을 간단히 적습니다. 예: `수상한 전당포 게임 업로드`
6. 선택 항목이 보이면 **Commit directly to the main branch**를 고른 뒤 **Commit changes**를 눌러 저장합니다.

## 3. GitHub Pages 켜기

파일 업로드가 끝난 뒤 설정합니다.

1. 저장소 상단의 **Settings**를 누릅니다.
2. 왼쪽 메뉴에서 **Pages**를 엽니다.
3. **Build and deployment → Source**를 **Deploy from a branch**로 선택합니다.
4. **Branch**를 **main**, 옆의 폴더를 **/(root)**로 선택합니다.
5. **Save**를 누릅니다.

`main`이 보이지 않으면 2단계의 **Commit changes**까지 완료됐는지 확인하세요. 이 게임에는 별도 빌드 명령이 필요하지 않습니다. 설정 방법은 [GitHub 공식 Pages 안내](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)에서도 확인할 수 있습니다.

## 4. 게임 열기

게시가 끝날 때까지 잠시 기다린 뒤 Pages 설정 화면의 완료 안내를 확인하세요. 완료되면 휴대폰에서 [예상 게임 주소](https://gyeongseop97.github.io/JDP/)를 엽니다.

페이지가 아직 안 나오면 저장소 첫 화면에 `index.html`이 있는지, Pages 설정이 **main / (root)**인지 확인하세요. 파일이나 이미지를 올린 직후에는 게시 반영을 기다렸다가 새로고침합니다.

## 5. 홈 화면에 추가하기

- **아이폰:** Safari에서 게임을 열고 **공유 → 홈 화면에 추가**를 선택합니다.
- **안드로이드:** Chrome에서 게임을 열고 **⋮ 메뉴 → 홈 화면에 추가**를 선택합니다. 기기에 따라 앱 설치 관련 항목으로 표시될 수 있습니다.

홈 화면 아이콘으로 실행할 수 있지만 **오프라인 플레이는 지원하지 않습니다.** 인터넷에 연결해 사용하세요.

진행 상황은 **현재 기기와 브라우저에 자동 저장**됩니다. PC·휴대폰 또는 서로 다른 브라우저 사이에는 동기화되지 않습니다. 브라우저 데이터를 삭제하면 진행도 사라지므로, 이어서 할 때는 같은 기기와 브라우저로 접속하세요.
