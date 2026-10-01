'use strict';
(() => {
  const A=window.PawnApp, ID='G-D2VLR1ZB3C', VERSION='6.9', KEY='midnight-pawn-analytics';
  if(!A)return;
  const titles={title:'시작 화면',trade:'거래하기',stock:'보관함',collection:'수집록',shop:'가게 관리',tutorial:'체험 튜토리얼'};
  const host=location.hostname.toLowerCase();
  // Development previews never load Google or send events to the owner's reports.
  const preview=!['http:','https:'].includes(location.protocol)||host==='localhost'||host.endsWith('.localhost')||host==='::1'||host==='[::1]'||/^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)||host==='0.0.0.0';
  let enabled=true;
  try{enabled=localStorage.getItem(KEY)!=='off'}catch{}
  let initialized=false, tagState=preview?'preview':'not-loaded', lastRoute='', lastLocation='', routeQueued=false;
  let mode=A.mode, totals={bought:A.state.bought,sold:A.state.sold}, runningSince=null, pendingMs=0;
  const events=[];
  window['ga-disable-'+ID]=!enabled;
  function route(){return A.inTutorial?'tutorial':A.mode==='menu'?'title':A.view==='codex'?'collection':A.view}
  function pageURL(screen){return location.origin+location.pathname+'#/'+screen}
  function safeReferrer(value){try{const u=new URL(value);return /^https?:$/.test(u.protocol)?u.origin+u.pathname:''}catch{return ''}}
  function init(){
    if(initialized||!enabled)return;
    initialized=true;
    if(preview)return;
    window.dataLayer=window.dataLayer||[];
    window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
    window.gtag('js',new Date());
    window.gtag('config',ID,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,page_location:pageURL(route()),page_referrer:safeReferrer(document.referrer)});
    const script=document.createElement('script');script.async=true;
    script.src='https://www.googletagmanager.com/gtag/js?id='+ID;
    script.id='pawn-google-tag';tagState='loading';
    script.onload=()=>{tagState='loaded'};
    script.onerror=()=>{tagState='blocked'};
    document.head.append(script);
  }
  function send(name,params={}){
    if(!enabled)return;
    init();
    const current=route();
    const values={game_version:VERSION,game_screen:current,page_location:pageURL(current),page_title:titles[current]+' · 수상한 전당포',...params};
    // Only application-owned event names and small numeric/enumerated parameters
    // reach this function. Never forward a game save, free text or URL query.
    events.push({name,params:values});if(events.length>160)events.shift();
    if(!preview){try{window.gtag('event',name,{...values,send_to:ID})}catch{}}
  }
  function screenView(force=false){
    if(!enabled)return;
    const next=route();if(!titles[next]||(!force&&next===lastRoute))return;
    const url=pageURL(next);
    send('page_view',{page_title:titles[next]+' · 수상한 전당포',page_location:url,page_referrer:lastLocation||safeReferrer(document.referrer),game_screen:next});
    // Keep automatic engagement events on the same sanitized virtual URL.
    if(!preview)window.gtag('set',{page_location:url,page_title:titles[next]+' · 수상한 전당포'});
    lastRoute=next;lastLocation=url;
  }
  function scheduleScreen(){if(routeQueued)return;routeQueued=true;queueMicrotask(()=>{routeQueued=false;screenView()})}
  function clock(){
    const now=performance.now();
    if(runningSince!==null)pendingMs+=Math.max(0,now-runningSince);
    runningSince=enabled&&mode==='play'&&!document.hidden&&document.hasFocus()?now:null;
  }
  function flush(reason){
    clock();
    const seconds=Math.floor(pendingMs/1000);
    if(seconds>0){send('game_play_time',{play_seconds:seconds,time_reason:reason});pendingMs-=seconds*1000}
  }
  function baseline(){totals={bought:A.state.bought,sold:A.state.sold}}
  window.addEventListener('pawn:mode',event=>{
    const next=event.detail.mode;
    flush('mode_change');mode=next;baseline();clock();scheduleScreen();
    if(next==='tutorial')send('tutorial_begin');
  });
  window.addEventListener('pawn:view',scheduleScreen);
  window.addEventListener('pawn:game-start',event=>{
    baseline();send('game_start',{entry_point:['new_game','continue','screen_link'].includes(event.detail.entry)?event.detail.entry:'continue',game_day:A.state.day});
  });
  window.addEventListener('pawn:change',event=>{
    const {action,args=[],result}=event.detail;
    if(mode==='play'&&result?.ok!==false){
      const buys=Math.max(0,A.state.bought-totals.bought),sales=Math.max(0,A.state.sold-totals.sold);
      for(let i=0;i<buys;i++)send('game_trade',{trade_kind:'buy',sale_channel:'customer',game_day:A.state.day});
      const channel=action==='accept'?'customer':action==='sell'&&['quick','request','complete'].includes(args[1])?args[1]:'consignment';
      for(let i=0;i<sales;i++)send('game_trade',{trade_kind:'sell',sale_channel:channel,game_day:A.state.day});
      if(action==='nextDay')send('game_day_reached',{game_day:A.state.day});
    }
    baseline();
  });
  window.addEventListener('pawn:tutorial',event=>{
    const d=event.detail, params={tutorial_step:d.step,tutorial_total:d.total,steps_completed:d.completed};
    if(d.kind==='step')send('tutorial_step_view',params);
    else if(d.kind==='step_complete')send('tutorial_step_complete',params);
    else if(d.kind==='skip')send('tutorial_step_skip',params);
    else if(d.kind==='exit')send('tutorial_exit',params);
    else if(d.kind==='finish')send(d.completed===d.total?'tutorial_complete':'tutorial_end',{...params,outcome:d.completed===d.total?'completed':'skipped'});
  });
  setInterval(()=>flush('heartbeat'),30000);
  document.addEventListener('visibilitychange',()=>{flush(document.hidden?'hidden':'visible');clock()});
  window.addEventListener('blur',()=>{flush('blur');runningSince=null});
  window.addEventListener('focus',clock);
  window.addEventListener('pagehide',()=>{flush('pagehide');runningSince=null});
  window.addEventListener('pageshow',event=>{clock();if(event.persisted)screenView(true)});
  function settings(){
    A.openDialog('<div class="eyebrow">PLAY STATISTICS</div><h2>이용 통계 안내</h2><p>게임 개선을 위해 Google Analytics로 방문·화면 이동·플레이 시간·튜토리얼 진행·거래 횟수를 수집합니다. Google 태그는 방문을 구분하는 쿠키와 기기·브라우저 정보를 사용할 수 있습니다.</p><p>게임 저장 파일과 대화 내용, 직접 입력한 금액은 통계로 보내지 않습니다.</p><div class="settings-row"><span>이용 통계 수집</span><button data-analytics-toggle aria-pressed="'+enabled+'">'+(enabled?'켜짐 · 끄기':'꺼짐 · 켜기')+'</button></div><p class="save-note">선택은 이 브라우저에 저장됩니다. 꺼도 게임과 저장 기능은 그대로 사용할 수 있습니다.</p><p><a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google 개인정보처리방침</a></p>'+(preview?'<p class="save-note">현재는 로컬 미리보기입니다. Google로 통계가 전송되지 않습니다.</p>':''));
  }
  document.addEventListener('click',event=>{
    if(event.target.closest('[data-analytics-settings]'))settings();
    if(event.target.closest('[data-analytics-toggle]')){
      enabled=!enabled;window['ga-disable-'+ID]=!enabled;
      try{localStorage.setItem(KEY,enabled?'on':'off')}catch{}
      // Do not replay activity accumulated while collection was off.
      pendingMs=0;runningSince=null;lastRoute='';lastLocation='';baseline();
      if(enabled){init();screenView();clock()}
      settings();
    }
  });
  const button=document.createElement('button');button.type='button';button.className='title-audio-button';button.dataset.analyticsSettings='';button.textContent='이용 통계 안내';
  document.querySelector('.title-content')?.append(button);
  window.PawnAnalytics={get status(){return {measurementId:ID,enabled,preview,tagState,screen:lastRoute,eventCount:events.length}},get previewEvents(){return preview?events.map(e=>({name:e.name,params:{...e.params}})):[]}};
  init();clock();scheduleScreen();
})();
