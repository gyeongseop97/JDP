# 수상한 전당포 통계 연결 안내

측정 ID **G-D2VLR1ZB3C**가 적용되어 있습니다. 표준 GA4를 사용하며 유료 서버나 Analytics 360은 필요 없습니다. Google 태그는 analytics.js에서 한 번만 불러옵니다. 받은 HTML 태그를 index.html에 또 붙이지 마세요.

## 1. 게임 업로드

ZIP 안의 파일과 music 폴더 전체를 기존 GitHub Pages의 index.html 위치에 덮어쓰세요. analytics.js도 반드시 포함합니다. 실제 배포 사이트를 열어 시작 화면 버전이 v6.8인지 확인하세요.

로컬 미리보기, localhost, 사설망 주소, 파일 직접 열기에서는 Google 태그를 불러오지 않습니다. 실제 배포된 공개 주소에서 수집을 시작합니다. 광고 차단 도구나 사용자의 수집 끄기 선택이 있으면 집계되지 않을 수 있습니다.

## 2. 조회수 중복을 막는 설정 — 한 번 필요

이 게임은 화면 이동뿐 아니라 작은 창을 닫는 데도 브라우저 방문 기록을 사용합니다. 큰 화면에 대한 page_view는 게임이 직접 한 번씩 보냅니다.

Google Analytics에서 해당 속성으로 들어가 다음 설정을 확인하세요.

1. **관리 → 데이터 스트림 → 해당 웹 스트림**
2. **향상된 측정 → 톱니바퀴(설정)**
3. **페이지 조회 → 고급 설정 표시**
4. **브라우저 기록 이벤트를 기반으로 한 페이지 변경** 옵션을 **끔**으로 변경하고 저장

화면 이름은 언어와 UI 버전에 따라 조금 다를 수 있습니다. 영문 옵션은 **Page changes based on browser history events**입니다. 다른 향상된 측정 항목까지 모두 끌 필요는 없습니다.

코드의 send_page_view:false는 태그가 로드될 때의 자동 페이지 조회를 막습니다. 위 향상된 측정 설정은 별개이므로 꼭 확인해야 합니다. 이 설정을 하지 않으면 팝업 열기·닫기와 실제 화면 이동에서 page_view가 중복될 수 있습니다.

공식 문서: https://developers.google.com/analytics/devguides/collection/ga4/views

## 3. 수집 확인

배포된 게임을 연 뒤 새로 시작 또는 불러오기를 누르고 보관함으로 이동하세요. GA4의 **보고서 → 실시간**에서 사용자와 page_view, game_start 이벤트를 확인합니다. 일반 보고서는 실시간보다 늦게 반영될 수 있습니다.

이번 파일의 자동 검사는 실제 Google 보고서를 오염시키지 않도록 로컬 모의 전송으로 진행했습니다. 계정 화면에서 실제 수신된 것은 아직 확인하지 않았습니다. 배포 후 위 실시간 화면에서 최종 확인하세요.

## 무엇을 보는가

| 이벤트 | 의미 |
| --- | --- |
| page_view | 큰 화면 방문. 팝업·같은 화면 재선택은 게임에서 추가 전송하지 않음 |
| game_start | 실전 진입. entry_point로 new_game / continue / screen_link 구분 |
| game_trade | 실제 매입 또는 판매 완료 1건. 위탁 진열 시점이 아닌 판매 완료 시점에 집계 |
| game_day_reached | 다음 영업일 도달 |
| game_play_time | 실전 화면이 활성화된 동안의 초. 메뉴·연습·숨긴 탭 제외 |
| tutorial_begin | 체험 시작 |
| tutorial_step_view | 연습 단계 진입 |
| tutorial_step_complete | 해당 단계의 목표를 실제 충족. 한 연습 안에서 단계별 1회 |
| tutorial_step_skip | 건너뛰기 선택 |
| tutorial_complete | 38개 단계의 목표를 모두 충족하고 완료 화면 도달 |
| tutorial_end | 일부 단계를 건너뛰고 완료 화면 도달. outcome=skipped |
| tutorial_exit | 중간에 연습 종료 버튼이나 화면 이동으로 나감 |

브라우저를 강제 종료하면 마지막 종료 이벤트가 도착하지 않을 수 있습니다. 마지막 tutorial_step_view와 완료 여부도 함께 보세요. 게임을 켜 둔 채 아무 조작 없이 읽는 시간도 활성 화면의 플레이 시간에 포함됩니다.

일별 사용자·신규 사용자·재방문은 GA4 사용자/유지율 보고서로 봅니다. **game_start 횟수는 사람 수가 아닙니다.** 같은 사람이 여러 번 게임에 진입할 수 있습니다. 로그인 없는 브라우저 기반 집계이므로 기기 변경이나 쿠키 삭제, 차단 등에 영향을 받습니다.

화면 통계는 page_title 또는 아래 game_screen으로 구분하는 것이 편합니다. 주소 뒤 # 부분을 기본 페이지 경로 보고서가 따로 표시하지 않을 수 있습니다.

## 세부 분석을 원할 때

이벤트 개수는 기본 이벤트 보고서에서 확인할 수 있습니다. 세부 분류를 탐색 보고서에서 사용하려면 **관리 → 맞춤 정의**에 아래 이벤트 범위 측정기준을 등록하세요.

- game_screen: title / trade / stock / collection / shop / tutorial
- entry_point: 새 게임·불러오기·화면 주소 진입 구분
- trade_kind: buy / sell
- sale_channel: customer / quick / request / complete / consignment
- tutorial_step: 연습 단계 번호
- outcome: completed / skipped
- game_version: 게임 버전

맞춤 측정항목으로 play_seconds(초), game_day(숫자)를 추가할 수 있습니다. play_seconds를 합산하면 활성 실전 시간이 됩니다. 게임 속 골드는 실제 매출로 전송하지 않습니다.

## 이용자 안내

메인 화면의 **이용 통계 안내**, 게임 설정의 **이용 통계 → 안내·설정**에서 수집 항목을 읽고 수집을 끌 수 있습니다. 선택은 해당 브라우저에 저장됩니다. 게임 저장 파일·대화 원문·입력한 가격·별도의 사용자 ID를 자체 이벤트에 넣지 않습니다. 광고 개인화 신호와 Google Signals는 비활성화했습니다.

GA4의 기본 쿠키·기기 및 브라우저 기반 처리는 Google 개인정보처리방침을 참고하세요: https://policies.google.com/privacy
