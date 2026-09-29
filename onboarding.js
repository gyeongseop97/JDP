'use strict';
(() => {
  const A = window.PawnApp;
  if (!A) return;
  const E = A.E, $ = selector => document.querySelector(selector), copy = value => JSON.parse(JSON.stringify(value));
  let active = false, stepIndex = 0, progress = [], initialState = null, initialView = 'trade', snapshot = {};
  let highlightTimer, coachObserver;
  const seenEvents = new WeakSet();
  const title = document.createElement('section');
  title.id = 'title-screen';
  title.className = 'pawn-title';
  title.setAttribute('aria-label', '수상한 전당포 시작 화면');
  title.innerHTML = '<div class="title-shade"></div><div class="title-lantern" aria-hidden="true">✧</div><div class="title-content"><div class="title-kicker">자정에만 문을 여는 가게</div><h1 class="title-logo-heading"><img class="title-logo" src="title-logo.webp" alt="수상한 전당포" width="1536" height="1024" fetchpriority="high"></h1><p class="title-english">MIDNIGHT PAWN <span>v6.1</span></p><p class="title-story">누군가에게는 고물.<br>누군가에게는 평생의 보물.<br><em>오늘 밤, 당신은 무엇을 믿을 건가요?</em></p><div class="title-buttons"><button class="pixel-menu-button new-game" data-onboard="new"><span aria-hidden="true">✦</span>새로 시작</button><button class="pixel-menu-button" data-onboard="continue"><span aria-hidden="true">▣</span>불러오기</button><button class="pixel-menu-button tutorial-menu-button" data-onboard="tutorial"><span aria-hidden="true">⌕</span>체험 튜토리얼<small>직접 대화하고 거래하며 배우기</small></button></div><p class="title-save-status"></p><div class="title-details"><span>144가지 물건</span><i>·</i><span>24명의 손님</span><i>·</i><span>9개 등급</span></div><p class="title-footer">시간 제한 없이, 천천히 읽고 흥정하세요.</p></div>';
  document.body.append(title);

  const coach = document.createElement('aside');
  coach.id = 'tutorial-coach';
  coach.className = 'tutorial-coach';
  coach.hidden = true;
  coach.setAttribute('aria-label', '전당포 체험 튜토리얼');
  coach.innerHTML = '<div class="tutorial-topline"><span class="practice-tag">연습 가게 · 저장 안 됨</span><div><button data-tutorial="chapters" aria-label="연습 장 선택">목차</button><button data-tutorial="collapse" aria-expanded="true" aria-label="설명 접기">접기</button><button data-tutorial="exit">나가기</button></div></div><div class="tutorial-body"><div class="tutorial-heading"><span id="tutorial-counter"></span><h2 id="tutorial-heading"></h2></div><p id="tutorial-copy"></p><ul id="tutorial-goals"></ul><div id="tutorial-reading-links" hidden><button data-tutorial-jump="#achievements">업적 보러 가기</button><button data-tutorial-jump="#ledger">장부 보러 가기</button></div><p id="tutorial-success" class="tutorial-success" role="status" hidden></p></div><div class="tutorial-controls"><button data-tutorial="retry">다시 연습</button><button data-tutorial="skip">건너뛰기</button><button class="tutorial-next" data-tutorial="next" disabled>직접 해 보세요</button></div>';
  document.body.insertBefore(coach, $('.app'));
  const menu = document.createElement('dialog');
  menu.id = 'onboarding-dialog';
  menu.className = 'onboarding-dialog';
  document.body.append(menu);

  const say = (speaker, text) => ({ speaker, text });
  function recordStock(s) {
    for (const lot of s.stock) {
      const old = s.discovered[lot.itemId];
      s.discovered[lot.itemId] = { grade: Math.max(old?.grade || 0, lot.grade), count: Math.max(1, old?.count || 0), genuine: !!(old?.genuine || lot.genuine) };
    }
  }
  function sellerScene(genuine = false, seed = 8101) {
    const s = E.create(seed), o = s.current;
    s.coins = 6000; s.stock = []; s.discovered = {}; s.claimed = []; s.relationships = { 1: 0 };
    s.met = { 1: 1 }; s.upgrades = { appraisal: 0, shelves: 0, word: 0 };
    s.activeEvent = { id: 'practice-quiet', day: s.day, title: '연습 가게의 밤', description: '체험에서는 배울 내용을 확실히 만나도록 장면을 준비했습니다. 실제 영업의 손님과 사건은 무작위입니다.', kind: 'rumor', category: 'all', mult: 1.1, gift: 0, character: 1, requestText: '대화와 물건의 흔적을 비교해 보세요.', resolveText: '연습 중에는 실제 저장이 바뀌지 않습니다.' };
    Object.assign(o, { character: 1, kind: 'seller', itemId: 'clock-01', grade: 3, claimedGrade: 3, condition: 2, genuine, sleeper: false, apparent: 520, value: genuine ? 520 : 32, estimate: 520, asking: 280, price: 280, baseFloor: 220, floor: 220, paid: 0, sale: 0, attempts: 0, status: 'offered', negotiated: false, acceptedOffer: false, lastOffer: null, patience: 6, mood: 0, relationDelta: 0, talked: [], physicalUsed: false, inspected: [], inspectionResults: {}, suspicion: 0, leverage: 0, checks: [], clues: {}, lastCheck: null, verdict: '', feedback: '', notes: [], intent: genuine ? 'honest' : 'fraud', appraisalClarity: 0, line: '이 시계에 얽힌 이야기는 값어치가 있지요. 280G면 어떻습니까?' });
    o.evidence = { physical: genuine ? .8 : .1, origin: '골목 경매', pressure: .8 };
    o.history = [say('customer', o.line)]; s.lastCharacter = 1; s.lastItemId = o.itemId;
    delete o.investigations; delete o.investigationVersion;
    return E.prepare(s);
  }
  function qualityScene() {
    const s = sellerScene(true, 8102), o = s.current, it = E.item(o.itemId);
    Object.assign(o, { grade: 6, claimedGrade: 3, condition: 0, genuine: true, sleeper: true, intent: 'honest', appraisalClarity: 0 });
    o.value = Math.round(it.base * E.GRADES[o.grade][2] * E.CONDITIONS[o.condition][1]);
    o.apparent = Math.round(it.base * E.GRADES[o.claimedGrade][2] * E.CONDITIONS[o.condition][1]);
    delete o.investigations; delete o.investigationVersion;
    return E.prepare(s);
  }
  function lot(uid, itemId, value, paid, genuine = true) {
    return { uid, itemId, grade: 3, claimedGrade: 3, condition: 2, genuine, value, apparent: genuine ? value : value * 12, paid, displayAt: null, sourceCharacter: 1 };
  }
  function buyerScene(fake = false) {
    const s = sellerScene(true, fake ? 8212 : 8211), o = s.current, p = E.profile(0);
    const favorite = PAWN_ITEMS.find(it => p.likes.includes(it.category)) || PAWN_ITEMS[0];
    const other = PAWN_ITEMS.find(it => !p.likes.includes(it.category)) || PAWN_ITEMS[13];
    s.stock = [lot('practice-plain', other.id, 200, 130), lot('practice-favorite', favorite.id, fake ? 32 : 360, fake ? 100 : 230, !fake)];
    s.met[0] = 1; s.relationships[0] = 0;
    Object.assign(o, { character: 0, kind: 'buyer', uid: 'practice-buyer', buyerQuotes: {}, intent: 'honest', patience: 6, notes: [], history: [], talked: [], mood: 0, relationDelta: 0 });
    for (const item of s.stock) {
      const taste = p.likes.includes(E.item(item.itemId).category) ? 1.28 : 1;
      const perceivedValue = Math.round((item.genuine ? item.value : item.apparent) * taste);
      const price = Math.round(perceivedValue * .78);
      o.buyerQuotes[item.uid] = { uid: item.uid, price, initialPrice: price, maxBase: Math.round(perceivedValue * 1.15), perceivedValue, detected: false, disclosed: false, acceptedOffer: false, lastOffer: null, taste };
    }
    const selected = s.stock[fake ? 1 : 0], q = o.buyerQuotes[selected.uid];
    Object.assign(o, { stockUid: selected.uid, itemId: selected.itemId, grade: selected.grade, claimedGrade: selected.claimedGrade, condition: selected.condition, genuine: selected.genuine, value: selected.value, apparent: selected.apparent, estimate: q.perceivedValue, paid: selected.paid, price: q.price, asking: q.initialPrice, acceptedOffer: false, lastOffer: null, baseFloor: 0, floor: 0, line: '야옹. 오늘은 물건을 사러 왔어요. 제 마음에 드는 게 있을까요?' });
    o.history = [say('customer', o.line)]; s.lastCharacter = 0; s.lastItemId = o.itemId; recordStock(s);
    delete o.investigations; delete o.investigationVersion;
    return E.prepare(s);
  }
  function inventoryScene() {
    const s = sellerScene(true, 8301);
    s.stock = [lot('practice-wholesale', 'clock-01', 250, 110), lot('practice-consign', 'jewelry-01', 340, 220), lot('practice-request', 'book-01', 480, 260)];
    s.bought = 3; s.claimed = ['first']; s.met[0] = 2; s.relationships[0] = 12;
    s.log.unshift({ day: 1, text: '연습용 보관함에 물건 3개를 준비했습니다.', type: 'normal' });
    recordStock(s); return s;
  }
  function setState(s) { A.setTutorialState(s); }
  function modify(fn) { const s = copy(A.state); fn(s); setState(s); }
  function ensureSellerTalk(...ids) {
    modify(s => { if (s.current.kind !== 'seller' || s.current.status !== 'offered') s.current = copy(sellerScene(false).current); for (const id of ids) if (!s.current.talked.includes(id)) E.talk(s, id); });
  }
  function ensureInspection(id) {
    modify(s => { if (!s.current.inspected.includes(id)) E.investigate(s, id); });
  }
  function eventMatches(event, action, arg) { return event?.type === 'change' && event.action === action && event.result?.ok !== false && (arg === undefined || event.args?.[0] === arg); }
  const actionGoal = (label, action, arg, target) => ({ label, target, test: (_s, event) => eventMatches(event, action, arg) });
  const clickGoal = (label, selector) => ({ label, target: selector, test: (_s, event) => event?.type === 'click' && event.element?.matches(selector) });
  const offerGoal = label => ({ label, target: '#offer-form', test: (_s, event) => eventMatches(event, 'offer') && !!event.result.accepted });
  const steps = [
    { chapter: '손해 날 거래를 거절하기', title: '목표는 싸게 사서 이익을 남기는 것', copy: '이 회중시계의 요구가는 280G입니다. 손님 말만 믿어도 될까요? 질문은 2회, 조사는 2회입니다. 먼저 진위에 관한 특징을 묻고 전체 대화에서 말을 다시 확인하세요.', setup: () => setState(sellerScene(false)), view: 'trade', goals: [actionGoal('진위 특징 묻기', 'talk', 'authenticity', '[data-talk="authenticity"]'), clickGoal('전체 대화로 답변 다시 읽기', '#conversation-history'), { label: '대화 기록 닫기', target: '#close-conversation', test: (_s,event) => event?.type === 'archive-close' }], success: '손님은 초침의 녹을 설명했습니다. 이제 조사 1회를 어디에 쓸지 고릅니다.' },
    { chapter: '손해 날 거래를 거절하기', title: '말에서 부위를 찾고 직접 확인하기', copy: '수첩을 열어 이 회중시계의 진품 특징을 읽으세요. 돋보기로 초침과 다른 바늘을 비교합니다. 관측만으로 게임이 정답을 찍어 주지는 않습니다.', goals: [clickGoal('감정 수첩 열기', '#appraisal-book'), { label: '수첩 닫기', target: '#close-dialog', test: (_s,event) => event?.type === 'detail-close' && progress[0] }, clickGoal('돋보기 고르기', '[data-tool="lens"]'), actionGoal('초침 끝과 다른 바늘 관찰', 'investigate', 'lens-mark', '[data-investigate="lens-mark"]')], success: '진품은 초침 끝에만 푸른 녹이 있습니다. 이 물건은 세 바늘에 같은 물감을 칠했습니다. 가격을 판단할 근거가 생겼습니다.' },
    { chapter: '손해 날 거래를 거절하기', title: '흠을 제시하면 가격이 실제로 바뀝니다', copy: '확인한 바늘 흔적의 “이 흠으로 값 깎기”를 누르세요. 손님의 새 요구가와 호감도 변화를 확인합니다. 근거 제시는 질문 횟수와 별개지만, 잘못 주장하면 협상이 나빠집니다.', goals: [actionGoal('진위 흔적을 가격 인하 근거로 제시', 'presentEvidence', 'authenticity', '[data-present="authenticity"][data-kind="defect"]')], success: '요구가가 280G에서 84G로 내려갔습니다. 싸졌다고 꼭 좋은 거래는 아닙니다. 가품이라면 진품보다 훨씬 싸게 팔릴 수 있어요.' },
    { chapter: '손해 날 거래를 거절하기', title: '안 사는 것도 좋은 거래입니다', copy: '이번에는 거래를 거절하세요. 질문과 조사 기회를 끝까지 쓸 의무는 없습니다. 이익이 날 근거가 약하면 금고를 지키는 선택을 하면 됩니다.', goals: [actionGoal('위험한 거래 거절', 'next', undefined, '#pass-button')], success: '돈을 쓰지 않고 넘어왔습니다. 이번에는 손님이 가치를 낮게 아는 물건을 찾아봅시다.' },

    { chapter:'말에서 찾는 단서',title:'아직 나오지도 않은 물건을 샀다고요?',copy:'출처 이야기를 물어보세요. 그런 다음 감정 수첩에서 처음 만든 해를 찾아 비교해 보세요. 잘못된 날짜에 자동 표시가 붙지는 않습니다.',setup:()=>{const s=sellerScene(false);const r=PAWN_ORIGINS[s.current.itemId];s.current.origin={itemId:s.current.itemId,year:r.year-15,story:r.story,claim:E.originClaim(r.year-15,'골목의 수집상',r.story),used:false,trust:'unknown'};setState(s)},view:'trade',goals:[actionGoal('구한 시기와 사연 묻기','talk','provenance','[data-talk="provenance"]'),clickGoal('수첩에서 제작 연도 읽기','#appraisal-book'),{label:'수첩 닫기',target:'#close-dialog',test:(_s,event)=>event?.type==='detail-close'&&progress[1]},actionGoal('출처 기록을 펼치고 날짜 모순 짚기','presentOrigin','date','[data-origin="date"]')],success:'물건이 처음 만들어지기 15년 전에 샀다는 설명이었습니다. 출처가 불확실해져 요구가가 내려갔습니다. 단, 물건 자체가 가품이라고 확정된 것은 아닙니다.'},
    { chapter:'말에서 찾는 단서',title:'만든 이유도 다를 수 있습니다',copy:'이번 손님은 돌아오는 잉크가 글씨를 오래 남기려고 만든 물건이라고 합니다. 도록에는 잘못 쓴 계약서를 회수하려고 만들었다고 적혀 있어요. 출처 이야기를 듣고 다른 사연을 짚어 보세요.',setup:()=>{const s=sellerScene(false);s.current.itemId='potion-09';delete s.current.investigationVersion;delete s.current.investigations;E.prepare(s);const r=PAWN_ORIGINS['potion-09'];s.current.origin={itemId:'potion-09',year:r.year+10,story:r.alternative,claim:E.originClaim(r.year+10,'항구',r.alternative),used:false,trust:'unknown'};setState(s)},view:'trade',goals:[actionGoal('잉크의 출처 이야기 듣기','talk','provenance','[data-talk="provenance"]'),actionGoal('출처 기록을 펼치고 다른 제작 사연 짚기','presentOrigin','story','[data-origin="story"]')],success:'겉모습을 조사하지 않고도 말의 모순을 찾아냈습니다. 날짜와 사연 중 무엇이 다른지 직접 읽어야 합니다. 틀린 부분을 지적하면 오히려 호감도가 내려가요.'},
    { chapter: '숨은 가치를 찾아 이익 남기기', title: '진품일 가능성부터 확인하기', copy: '다른 회중시계를 준비했습니다. 진위에 관해 묻고 초침 끝을 돋보기로 보세요. 이번에는 초침 끝에만 푸른 녹이 있습니다.', setup: () => setState(qualityScene()), view: 'trade', goals: [actionGoal('진위에 관해 묻기', 'talk', 'authenticity', '[data-talk="authenticity"]'), clickGoal('돋보기 고르기', '[data-tool="lens"]'), actionGoal('바늘의 진위 특징 확인', 'investigate', 'lens-mark', '[data-investigate="lens-mark"]')], success: '진품의 특징과 같습니다. 남은 질문 1회와 조사 1회로 무엇을 더 확인할지 정해야 합니다.' },
    { chapter: '숨은 가치를 찾아 이익 남기기', title: '손님이 놓친 제작 수준 찾기', copy: '제작 수준을 묻고 불빛으로 시곗바늘 옆면을 보세요. 손님은 끝부분이 조금 거칠다고 했지만, 실제로는 가는 끝까지 매끈합니다.', goals: [actionGoal('제작 수준 묻기', 'talk', 'quality', '[data-talk="quality"]'), clickGoal('불빛 고르기', '[data-tool="light"]'), actionGoal('시곗바늘 옆면에 빛 비추기', 'investigate', 'light-material', '[data-investigate="light-material"]')], success: '손님이 낮게 평가한 물건에서 정교한 제작 흔적을 찾았습니다. 보존 상태까지 조사할 기회는 남지 않았습니다.' },
    { chapter: '숨은 가치를 찾아 이익 남기기', title: '흥정하고 실제 이익으로 바꾸기', copy: '250G를 직접 제안하고 매입을 확정하세요. 결과에서 실제 가치와 매입가를 비교한 뒤 도매 판매까지 해 보세요. 판매해야 장부에 순이익이 기록됩니다.', goals: [offerGoal('250G 정도를 제안하여 합의'), actionGoal('매입 확정', 'accept', undefined, '#buy-button'), {label:'도매 판매로 이익 확정',target:'[data-action="quick-sale"]',test:(_s,event)=>eventMatches(event,'sell')&&event.args[1]==='quick'}], success: '정교한 진품을 싸게 사서 이익을 남겼습니다. 같은 조사 2회라도 어디에 썼는지가 결과를 바꿉니다.' },
    { chapter: '발견을 공개할지 선택하기', title: '장점을 알려 주면 신뢰와 가격이 함께 바뀝니다', copy: '같은 물건의 다른 연습 장면입니다. 이미 확인한 제작 장점을 손님에게 공개해 보세요. 조용히 매입하는 대신 솔직하게 가치를 알려 주는 선택입니다.', setup: () => { const s=qualityScene(); E.talk(s,'quality'); E.investigate(s,'light-material'); setState(s); }, view:'trade', goals:[actionGoal('제작 장점을 공개하기','presentEvidence','quality','[data-present="quality"][data-kind="praise"]')], success: '호감도는 +5, 요구가는 280G에서 350G로 올랐습니다. 숨은 이익을 챙길지, 단골과의 관계를 키울지 선택하는 겁니다.' },
    { chapter: '구매 손님과 흥정', title: '이번에는 내가 판매하는 차례', copy: '보관함에 물건이 있으면 구매 손님도 찾아옵니다. 손님에게 보여 줄 물건 중 “좋아하는 품목” 표시가 있는 물건을 골라 보세요.', setup: () => setState(buyerScene(false)), view: 'trade', goals: [actionGoal('취향에 맞는 재고를 골라 보여 주기', 'chooseStock', 'practice-favorite', '[data-stock-choice="practice-favorite"]')], success: '같은 손님도 물건을 바꾸면 제안가가 달라집니다. 물건을 바꿔도 이미 지친 협상 인내심은 회복되지 않아요.' },
    { chapter: '구매 손님과 흥정', title: '구매 손님의 취향 듣기', copy: '무엇을 찾는지 직접 물어보세요. 손님마다 선호 품목과 관심사, 가격을 받아들이는 태도가 다릅니다.', setup: () => { if (A.state.current.stockUid !== 'practice-favorite') modify(s => E.chooseStock(s, 'practice-favorite')); }, goals: [actionGoal('“어떤 물건을 찾으세요?” 선택', 'talk', 'taste', '[data-talk="taste"]')], success: '관심 분야를 알게 되었어요. 그 취향과 물건의 이야기를 연결할 수 있습니다.' },
    { chapter: '구매 손님과 흥정', title: '가치가 느껴지도록 소개하기', copy: '물건의 사연을 손님의 취향과 연결해 소개해 보세요. 마음에 드는 소개는 손님의 기분과 관계를 좋게 만듭니다.', setup: () => { if (!A.state.current.talked.includes('taste')) modify(s => E.talk(s, 'taste')); }, goals: [actionGoal('물건의 이야기를 들려주기', 'talk', 'story', '[data-talk="story"]')], success: '물건의 가치만으로 가격이 정해지지 않아요. 상대가 그 물건을 얼마나 원하는지도 중요합니다.' },
    { chapter: '구매 손님과 흥정', title: '판매 가격도 직접 정하세요', copy: () => '금액 칸에 ' + Math.round(A.state.current.price * 1.07).toLocaleString('ko-KR') + 'G 정도를 적고 제안하세요. 상대 제안보다 조금 높게 불러 보는 연습입니다.', goals: [offerGoal('내 판매 가격을 제안하여 합의하기')], success: '내 판매 가격을 받아들였어요. 마지막 판매 버튼으로 거래를 확정합니다.' },
    { chapter: '구매 손님과 흥정', title: '판매하고 만족도를 확인하세요', copy: '판매 버튼을 누른 뒤 이익과 호감도 변화를 읽어 보세요. 손님이 느끼는 만족이 관계를 바꿉니다.', goals: [actionGoal('구매 손님에게 판매 확정', 'accept', undefined, '#buy-button')], success: '판매 수익과 관계 변화가 기록됐습니다. 실제 진위뿐 아니라 손님이 무엇을 믿고 만족했는지도 영향을 줍니다.' },
    { chapter: '가품을 소개하는 선택', title: '가품이라는 사실을 먼저 알리기', copy: '이번 재고는 모조품입니다. 숨길 수도 있지만, 먼저 알리면 손님은 진위에 맞춰 값을 다시 계산하고 솔직한 설명에 신뢰를 보냅니다.', setup: () => setState(buyerScene(true)), view: 'trade', goals: [actionGoal('모조품이라는 사실을 먼저 알리기', 'talk', 'disclose', '[data-talk="disclose"]')], success: '제안가는 낮아졌지만 호감도는 올랐습니다. 이 손님은 가품임을 알고 사게 됩니다.' },
    { chapter: '가품을 소개하는 선택', title: '알고 사는 손님과 거래하기', setup: () => { if (!A.state.current.buyerQuotes?.[A.state.current.stockUid]?.disclosed) modify(s => E.talk(s, 'disclose')); }, copy: () => '변경된 제안가 ' + A.state.current.price.toLocaleString('ko-KR') + 'G를 직접 제안한 다음 판매를 확정하세요. 결과에 어떤 설명을 하고 팔았는지도 남습니다.', goals: [offerGoal('가품임을 반영한 가격 제안'), actionGoal('판매 확정', 'accept', undefined, '#buy-button')], success: '가품도 거래할 수 있어요. 소개 방식과 구매자의 판단이 가격과 관계를 함께 바꿉니다.' },
    { chapter: '재고와 골목의 사건', title: '급할 때는 도매 판매', copy: '보관함을 준비했어요. 시계의 “도매 판매”를 눌러 보세요. 구매 손님을 기다리지 않고 즉시 현금으로 바꿀 수 있습니다.', setup: () => setState(inventoryScene()), view: 'stock', goals: [{ label: '시계를 도매 판매하기', target: '[data-action="quick-sale"][data-uid="practice-wholesale"]', test: (_s, event) => eventMatches(event, 'sell', 'practice-wholesale') && event.args[1] === 'quick' }], success: '빠르게 현금을 마련했습니다. 직접 손님을 설득하거나 기다리는 판매보다 가격이 낮을 수 있어요.' },
    { chapter: '재고와 골목의 사건', title: '조금 기다리는 위탁 판매', copy: '장신구를 위탁 판매해 보세요. 손님 두 명이 더 다녀가면 표시된 가격으로 자동 판매됩니다. 위탁 중에는 구매 손님에게 권할 수 없어요.', view: 'stock', goals: [{ label: '장신구를 위탁 판매에 맡기기', target: '[data-action="display-sale"][data-uid="practice-consign"]', test: (_s, event) => eventMatches(event, 'sell', 'practice-consign') && event.args[1] === 'display' }], success: '위탁이 시작됐습니다. 시간을 재는 대신 손님 방문 횟수로 진행됩니다.' },
    { chapter: '재고와 골목의 사건', title: '손님 두 명 뒤, 위탁 정산', setup: () => { if (A.state.stock.some(x => x.uid === 'practice-consign' && x.displayAt === null)) modify(s => E.sell(s, 'practice-consign', 'display')); }, copy: '거래 화면으로 돌아왔어요. “거래 거절” 또는 “다음 손님”을 두 번 눌러 보세요. 손님은 무작위로 오며 위탁 판매는 그동안 진행됩니다.', view: 'trade', goals: [{ label: '다음 손님으로 두 번 진행하기', target: '#pass-button, [data-action="next"]', test: s => s.turn >= snapshot.turn + 2 }], success: '위탁한 물건이 판매되고 금고와 장부에 반영됐습니다.' },
    { chapter: '재고와 골목의 사건', title: '오늘 골목에는 무슨 일이?', copy: '상단 사건 배너를 열어 의뢰를 읽어 보세요. 실제 게임은 매일 사건을 무작위로 골라 시세·선물·의뢰·희귀품 소문을 바꿉니다.', setup: () => { const old = A.state; const s = sellerScene(true, 8401); s.coins = old.coins; s.log = copy(old.log); s.discovered = copy(old.discovered); const ev = PAWN_EVENTS.find(x => x.kind === 'request'); s.activeEvent = { ...copy(ev), day: s.day }; const category = ev.category === 'all' ? 'book' : ev.category; const it = PAWN_ITEMS.find(x => x.category === category); s.stock = [lot('practice-request', it.id, 480, 260)]; s.eventDone = false; s.met[0] = 2; recordStock(s); setState(s); }, view: 'trade', goals: [clickGoal('오늘의 사건 배너 열기', '#event-banner')], success: '의뢰는 조건에 맞는 진품을 요구합니다. 창을 닫고 보관함에서 전달해 보세요.' },
    { chapter: '재고와 골목의 사건', title: '의뢰 물건을 전달하기', copy: '조건을 만족하는 진품에는 “의뢰 전달” 버튼이 생깁니다. 눌러서 보상과 의뢰 완료 표시를 확인하세요.', view: 'stock', goals: [{ label: '의뢰 물건 전달', target: '[data-action="deliver"]', test: (_s, event) => eventMatches(event, 'sell') && event.args[1] === 'request' }], success: '의뢰는 한 번만 완료할 수 있어요. 오늘의 사건에 따라 보관할 물건을 결정해도 좋습니다.' },
    { chapter: '내 가게를 키우기', title: '수집록에서 기록을 찾아보세요', setup: () => setState(inventoryScene()), copy: '물건의 이야기, 등급, 손님 취향을 직접 열어 보세요. 진품 발견 이력이 있어도 다음에 오는 같은 물건은 가품일 수 있습니다. 설명 창은 닫고 다음 항목을 확인하세요.', view: 'codex', goals: [clickGoal('발견한 물건의 이야기 열기', '.codex-card[data-action="item-detail"]:not(:disabled)'), clickGoal('9가지 등급 탭 열기', '[data-codex-mode="grades"]'), clickGoal('손님 24명 탭 열기', '[data-codex-mode="people"]'), clickGoal('손님 카드를 눌러 취향과 관계 확인', '.person-card[data-action="person"]')], success: '물건을 팔아도 기록은 남습니다. 취향을 기억하면 다음 거래의 선택에 도움이 됩니다.' },
    { chapter: '내 가게를 키우기', title: '세 가지 가게 강화 직접 해 보기', copy: '연습 자금으로 감정사의 안목, 진열장 확장, 골목의 명성을 각각 한 번 강화하세요. 감정사의 안목을 높이면 흐릿한 각인과 반사를 더 읽을 수 있습니다. 3단계부터 새 손님의 조사 기회가 3회가 됩니다. 같은 기록을 다시 읽는 것은 무료입니다.', setup: () => modify(s => { s.coins = Math.max(s.coins, 3000); s.upgrades = { appraisal: 0, shelves: 0, word: 0 }; }), view: 'shop', goals: [actionGoal('감정사의 안목 강화', 'upgrade', 'appraisal', '[data-action="upgrade"][data-key="appraisal"]'), actionGoal('진열장 확장', 'upgrade', 'shelves', '[data-action="upgrade"][data-key="shelves"]'), actionGoal('골목의 명성 강화', 'upgrade', 'word', '[data-action="upgrade"][data-key="word"]')], success: '흐릿한 흔적을 읽는 능력, 재고 공간, 판매와 흥정의 여지가 커졌습니다. 각 강화는 5단계까지 가능하며 판독한 흔적의 의미는 직접 판단합니다.' },
    { chapter: '내 가게를 키우기', title: '목표와 거래 장부 읽기', copy: '아래 바로 가기로 실제 업적과 장부를 둘러보세요. 업적 보상은 조건 달성 시 자동 지급되고, 장부에는 최근 거래와 손익이 남습니다.', setup: () => modify(s => { s.bought = Math.max(1, s.bought); E.achievements(s); }), view: 'shop', reading: true, goals: [{ label: '업적과 달성 보상 보기', target: '#achievements', test: (_s, event) => event?.type === 'reading' && event.selector === '#achievements' }, { label: '거래 장부와 손익 보기', target: '#ledger', test: (_s, event) => event?.type === 'reading' && event.selector === '#ledger' }], success: '작은 목표를 하나씩 채우고 손익을 돌아보며 가게를 키울 수 있어요.' },
    { chapter: '영업을 이어가는 법', title: '효과음과 저장 설정 직접 누르기', settings: true, copy: '우측 상단 설정을 열고 거래 효과음을 바꾼 뒤 “지금 저장”을 눌러 보세요. 실전은 이 브라우저에 자동 저장됩니다. 지금은 연습이므로 원래 저장을 바꾸지 않아요.', view: 'trade', goals: [clickGoal('설정 화면 열기', '#settings-button'), clickGoal('거래 효과음 전환', '[data-action="sound"]'), clickGoal('지금 저장 버튼 누르기', '[data-action="save"]')], success: '설정 창을 닫고 계속하세요. 다른 기기나 브라우저에는 저장이 자동으로 옮겨지지 않습니다.' },
    { chapter:'가게의 세 가지 즐거움',title:'돈만 모으는 가게가 아니어도 됩니다',copy:'가게 관리에서 관심 목표를 수집으로 바꿔 보세요. 돈·진품 도록·단골 관계는 동시에 기록됩니다. 관심 목표를 바꾸어도 쌓은 기록은 사라지지 않습니다.',setup:()=>setState(inventoryScene()),view:'shop',goals:[actionGoal('수집 목표 선택','setAmbition','collection','[data-ambition="collection"]')],success:'거래 화면에 아직 도록에 없는 품목인지 표시됩니다. 진품을 보관했다가 밤에 기록해 보세요.' },
    { chapter:'마감 뒤의 자유 시간',title:'영업이 끝나면 나만의 시간 두 칸',copy:'여덟 번째 손님을 보냈습니다. 마감 화면을 열고 보관한 진품 한 개를 도록에 등록하세요. 물건은 사라지지 않으며, 나중에 팔아도 도록 기록은 남습니다.',setup:()=>{const s=inventoryScene();s.visitor=8;s.current.status='left';s.relationships[0]=20;setState(s)},view:'trade',goals:[actionGoal('마감 화면 열기','next',undefined,'[data-action="next"]'),actionGoal('진품 하나 도록에 등록','nightAction','catalog','[data-night="catalog"]')],success:'시간 한 칸을 써서 영구적인 수집 기록을 남겼습니다. 테마별 네 물건을 모으면 이야기와 보상이 열립니다.' },
    { chapter:'마감 뒤의 자유 시간',title:'단골과 차 한 잔',copy:'“단골과 차 한 잔”을 펼치고 모카를 초대하세요. 25G와 남은 시간 한 칸을 쓰면 호감도가 20에서 26으로 올라 마음속 이야기를 듣게 됩니다.',goals:[actionGoal('모카와 차 마시기','nightAction','tea','[data-night="tea"][data-night-id="0"]')],success:'수집록의 손님 카드에서 마음속 이야기를 읽을 수 있어요. 관계는 다음 흥정에도 영향을 줍니다. 오늘 쓸 시간은 이제 없습니다.' },
    { chapter:'마감 뒤의 자유 시간',title:'재고를 손질해 다음 거래 준비하기',copy:'새 연습 장면입니다. “보관한 물건 손질”을 펼치고 물건 하나를 손질하세요. 비용과 예상 도매가 상승을 비교하는 것이 중요합니다. 가품은 손질해도 가품입니다.',setup:()=>{const s=inventoryScene();s.visitor=8;s.current.status='left';E.next(s);setState(s)},view:'trade',goals:[actionGoal('보관한 물건 손질','nightAction','repair','[data-night="repair"]'),actionGoal('남은 시간 쉬고 다음 영업으로','nextDay',undefined,'[data-action="next-day"]')],success:'손질비는 물건의 원가에 포함됩니다. 이익·수집·관계 중 오늘의 기분에 맞는 즐거움을 골라 보세요.' },
    { chapter: '영업을 이어가는 법', title: '쪽박을 맞아도 다시 시작할 수 있어요', copy: '돈과 재고를 거의 잃은 연습 장면입니다. 가게 관리 맨 아래의 옆집 심부름을 눌러 보세요. 재고가 없고 120G 미만일 때 하루 한 번 재기 자금을 받을 수 있습니다.', setup: () => { const s = sellerScene(true, 8601); s.coins = 30; s.stock = []; s.aidDay = 0; setState(s); }, view: 'shop', goals: [actionGoal('옆집 심부름으로 재기 자금 받기', 'aid', undefined, '#aid-button')], success: '모든 기본 기능을 직접 해 봤어요. 이제 무엇을 믿고 얼마에 거래할지 직접 결정할 차례입니다.' }
  ];

  function closeGameDialog() { for (const id of ['#detail-dialog', '#conversation-dialog']) { const dialog = $(id); if (dialog?.open) dialog.close(); } }
  function clearHighlight() { document.querySelectorAll('.tutorial-target').forEach(el => el.classList.remove('tutorial-target')); }
  function measureCoach() { document.documentElement.style.setProperty('--tutorial-offset', active && !coach.hidden ? Math.ceil(coach.getBoundingClientRect().height) + 16 + 'px' : '0px'); }
  function targetForStep() {
    const goal = steps[stepIndex]?.goals.find((_goal, i) => !progress[i]);
    let selector = goal?.target;
    if (steps[stepIndex]?.settings && !$('#detail-dialog')?.open) selector = '#settings-button';
    if (selector === '#pass-button, [data-action="next"]') return [...document.querySelectorAll(selector)].find(el => el.getClientRects().length && !el.disabled);
    return selector ? $(selector) : null;
  }
  function scrollTarget(target) {
    if (!target) return;
    if (target.closest('dialog')) { target.scrollIntoView({ block: 'nearest', behavior: 'instant' }); return; }
    for (let parent = target.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
      if (parent.scrollWidth <= parent.clientWidth || !['auto', 'scroll'].includes(getComputedStyle(parent).overflowX)) continue;
      const itemRect = target.getBoundingClientRect(), parentRect = parent.getBoundingClientRect();
      if (itemRect.right > parentRect.right) parent.scrollLeft += itemRect.right - parentRect.right + 8;
      else if (itemRect.left < parentRect.left) parent.scrollLeft -= parentRect.left - itemRect.left + 8;
    }
    const rect = target.getBoundingClientRect();
    const top = coach.getBoundingClientRect().bottom + 14;
    const fixedControls = ['.bottom-nav', '.deal-actions'].map(selector => $(selector)).filter(el => el && el.getClientRects().length && getComputedStyle(el).position === 'fixed');
    const bottom = Math.min(innerHeight - 14, ...fixedControls.map(el => el.getBoundingClientRect().top - 14));
    const destination = top + Math.max(0, (bottom - top - rect.height) / 2);
    window.scrollTo({ top: Math.max(0, scrollY + rect.top - destination), behavior: 'instant' });
  }
  function highlight(scroll = false) {
    clearHighlight();
    if (!active) return;
    const target = targetForStep();
    if (!target || !target.getClientRects().length) return;
    target.classList.add('tutorial-target');
    if (scroll && !(document.querySelector('dialog[open]') && !target.closest('dialog'))) scrollTarget(target);
  }
  function renderCoach(scroll = false) {
    if (!active) return;
    const step = steps[stepIndex], done = progress.every(Boolean);
    $('#tutorial-counter').textContent = String(stepIndex + 1).padStart(2, '0') + ' / ' + steps.length + ' · ' + step.chapter;
    $('#tutorial-heading').textContent = step.title;
    $('#tutorial-copy').textContent = typeof step.copy === 'function' ? step.copy() : step.copy;
    $('#tutorial-goals').innerHTML = step.goals.map((goal, i) => '<li class="' + (progress[i] ? 'done' : '') + '"><span aria-hidden="true">' + (progress[i] ? '✓' : '◇') + '</span>' + A.esc(goal.label) + '</li>').join('');
    $('#tutorial-reading-links').hidden = !step.reading;
    const success = $('#tutorial-success'); success.hidden = !done; success.textContent = done ? step.success : '';
    const next = $('[data-tutorial="next"]'); next.disabled = !done; next.textContent = done ? stepIndex === steps.length - 1 ? '연습 마치기 →' : '다음 연습 →' : '직접 해 보세요';
    coach.classList.toggle('step-complete', done);
    measureCoach(); clearTimeout(highlightTimer); highlight(scroll);
  }
  function enterStep(index, retry = false) {
    if (!active) return;
    closeGameDialog(); if (menu.open) menu.close(); clearHighlight(); progress = [];
    stepIndex = Math.max(0, Math.min(steps.length - 1, index));
    const step = steps[stepIndex];
    if (retry && initialState) { setState(copy(initialState)); A.switchView(initialView); }
    else { if (step.setup) step.setup(); if (step.view) A.switchView(step.view); initialState = copy(A.state); initialView = $('.view.active')?.id.replace('view-', '') || 'trade'; }
    snapshot = { turn: A.state.turn, coins: A.state.coins, current: copy(A.state.current) };
    progress = step.goals.map(() => false); coach.hidden = false; coach.classList.remove('collapsed'); $('[data-tutorial="collapse"]').textContent = '접기'; $('[data-tutorial="collapse"]').setAttribute('aria-expanded', 'true'); renderCoach(true);
  }
  function evaluate(event) {
    if (!active || !progress.length) return;
    const step = steps[stepIndex]; let changed = false;
    step.goals.forEach((goal, i) => { if (!progress[i] && goal.test(A.state, event)) { progress[i] = true; changed = true; } });
    if (changed) renderCoach(event?.type !== 'reading'); else highlight(false);
  }
  function showTitle() {
    title.hidden = false; document.body.classList.add('title-screen'); document.body.classList.remove('tutorial-running');
    $('[data-onboard="continue"]').disabled = !A.hasSave;
    $('.title-save-status').textContent = A.hasSave ? '이 기기에 저장된 가게가 있습니다.' : '저장된 가게가 없습니다. 새로 시작해 보세요.';
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
  function hideTitle() { title.hidden = true; document.body.classList.remove('title-screen'); }
  function askFresh() {
    if (!A.hasSave) { A.startGame({ fresh: true }); return; }
    menu.innerHTML = '<div class="onboarding-dialog-mark">♜</div><h2>새 가게를 시작할까요?</h2><p>기존 가게의 금고·물건·손님 관계와 기록을 새 게임으로 바꿉니다.</p><div class="onboarding-dialog-actions"><button class="pixel-menu-button new-game" data-onboard="confirm-new">새 가게 시작</button><button class="pixel-menu-button" data-onboard="cancel">기존 가게 남겨 두기</button></div>';
    menu.showModal();
  }
  function startTutorial() {
    if (menu.open) menu.close(); closeGameDialog(); active = true; A.beginTutorial(20260923); hideTitle(); document.body.classList.add('tutorial-running'); coach.hidden = false; enterStep(0);
  }
  function endTutorial() { active = false; progress = []; clearHighlight(); coach.hidden = true; document.body.classList.remove('tutorial-running'); if (menu.open) menu.close(); measureCoach(); A.endTutorial(); }
  function chapterMenu() {
    const chapters = steps.map((step, index) => ({ title: step.chapter, index })).filter((x, i, list) => i === 0 || x.title !== list[i - 1].title);
    menu.innerHTML = '<div class="onboarding-dialog-mark">▤</div><h2>배우고 싶은 장면부터</h2><p>각 장은 준비된 연습 상황으로 시작합니다. 실제 저장은 그대로 남습니다.</p><div class="tutorial-chapters">' + chapters.map((chapter, i) => '<button data-tutorial-chapter="' + chapter.index + '"><span>' + String(i + 1).padStart(2, '0') + '</span>' + A.esc(chapter.title) + '</button>').join('') + '</div><button class="pixel-menu-button" data-onboard="cancel">연습 계속하기</button>';
    menu.showModal();
  }
  function finish() {
    menu.innerHTML = '<div class="onboarding-dialog-mark">✦</div><p class="title-kicker">READY TO OPEN</p><h2>이제 당신의 가게입니다</h2><p>말과 물건을 대조하고, 내 가격을 정하고, 손님의 마음을 움직여 보세요.</p><p class="onboarding-safe-note">체험에서 쓴 돈과 거래는 실제 저장에 반영되지 않았습니다.</p><div class="onboarding-dialog-actions"><button class="pixel-menu-button new-game" data-tutorial="finish">시작 화면으로</button><button class="pixel-menu-button" data-tutorial="chapters">원하는 장면 다시 연습</button></div>';
    menu.showModal();
  }
  function handleEvent(event) {
    if (seenEvents.has(event)) return; seenEvents.add(event);
    if (event.type === 'pawn:mode') {
      const mode = event.detail.mode;
      if (mode === 'menu') { active = false; coach.hidden = true; clearHighlight(); showTitle(); measureCoach(); }
      else { hideTitle(); document.body.classList.toggle('tutorial-running', mode === 'tutorial'); if (mode !== 'tutorial') { active = false; coach.hidden = true; clearHighlight(); measureCoach(); } }
    } else if (event.type === 'pawn:change') evaluate({ type: 'change', ...event.detail });
    else if (event.type === 'pawn:view') { evaluate({ type: 'view', ...event.detail }); setTimeout(() => highlight(false), 20); }
  }
  for (const type of ['pawn:mode', 'pawn:change', 'pawn:view']) { window.addEventListener(type, handleEvent); document.addEventListener(type, handleEvent); }
  document.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button || button.disabled) return;
    const onboard = button.dataset.onboard;
    if (onboard === 'new') askFresh();
    else if (onboard === 'continue') A.startGame({ fresh: false });
    else if (onboard === 'tutorial') startTutorial();
    else if (onboard === 'confirm-new') { menu.close(); A.startGame({ fresh: true }); }
    else if (onboard === 'cancel') menu.close();
    const action = button.dataset.tutorial;
    if (action === 'exit' || action === 'finish') endTutorial();
    else if (action === 'chapters') { if (menu.open) menu.close(); chapterMenu(); }
    else if (action === 'collapse') { const collapsed = coach.classList.toggle('collapsed'); button.textContent = collapsed ? '설명 보기' : '접기'; button.setAttribute('aria-expanded', String(!collapsed)); measureCoach(); }
    else if (action === 'retry') enterStep(stepIndex, true);
    else if (action === 'skip' || action === 'next') { if (stepIndex === steps.length - 1) finish(); else enterStep(stepIndex + 1); }
    else if (button.dataset.tutorialChapter !== undefined) enterStep(Number(button.dataset.tutorialChapter));
    else if (button.dataset.tutorialJump) { const selector = button.dataset.tutorialJump; scrollTarget($(selector)); evaluate({ type: 'reading', selector }); }
    if (active && !onboard && !action && button.dataset.tutorialChapter === undefined && !button.dataset.tutorialJump) setTimeout(() => evaluate({ type: 'click', element: button }), 0);
  });
  document.addEventListener('input', event => { if (active) evaluate({ type: 'input', element: event.target }); });
  document.addEventListener('focusin', event => { if (active && event.target.id === 'offer-price') requestAnimationFrame(() => scrollTarget($('#offer-form'))); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && menu.open) menu.close(); });
  $('#detail-dialog')?.addEventListener('close', () => { if (active) { evaluate({ type: 'detail-close' }); if (!progress.every(Boolean)) highlight(true); } });
  $('#conversation-dialog')?.addEventListener('close', () => { if (active) evaluate({ type: 'archive-close' }); });
  window.addEventListener('resize', measureCoach);
  if (window.ResizeObserver) { coachObserver = new ResizeObserver(measureCoach); coachObserver.observe(coach); }
  window.PawnOnboarding = { showTitle, startTutorial, get tutorialActive() { return active; }, get tutorialStep() { return stepIndex; }, get tutorialSteps() { return steps.length; } };
  showTitle();
})();

