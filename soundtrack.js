'use strict';
(() => {
  const A = window.PawnApp;
  if (!A) return;
  const KEY = 'midnight-pawn-audio-v1';
  const tracks = {
    title: {name: '달빛 아래 간판', file: 'music/moonlit-sign.mp3', duration: 51.4285625},
    shop: {name: '수상한 흥정', file: 'music/odd-little-bargain.mp3', duration: 73.84615625},
    night: {name: '마지막 손님이 떠난 뒤', file: 'music/after-the-last-guest.mp3', duration: 45.71428125}
  };
  const clamp = (v, fallback) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : fallback;
  let stored = {};
  try { stored = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch {}
  const prefs = {muted: stored.muted === true, music: clamp(stored.music, 44), effects: clamp(stored.effects, 55)};
  if (typeof stored.effectsEnabled === 'boolean') A.state.sound = stored.effectsEnabled;
  let preferredEffects = A.state.sound;
  let ctx, musicBus, effectsBus, active, serial = 0, unlocked = false, loading = '', error = '', lastEffect = 0;
  const cache = new Map(), voices = new Set(), musicNodes = new Set();
  const wanted = () => document.body.classList.contains('title-screen') ? 'title' : A.state.closing ? 'night' : 'shop';
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify({...prefs, effectsEnabled: preferredEffects})); } catch {} };
  function ramp(param, value, seconds = .08) {
    const now = ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + seconds);
  }
  function createContext() {
    if (ctx) return true;
    const Constructor = window.AudioContext || window.webkitAudioContext;
    if (!Constructor) { error = '이 브라우저에서는 소리를 재생할 수 없어요.'; paint(); return false; }
    try {
      ctx = new Constructor();
      musicBus = ctx.createGain(); effectsBus = ctx.createGain();
      musicBus.gain.value = prefs.muted ? 0 : prefs.music / 100;
      effectsBus.gain.value = prefs.muted || !A.state.sound ? 0 : prefs.effects / 100;
      musicBus.connect(ctx.destination); effectsBus.connect(ctx.destination);
      ctx.addEventListener('statechange', paint);
      return true;
    } catch { error = '소리를 시작하지 못했어요. 다시 눌러 주세요.'; paint(); return false; }
  }
  async function unlock() {
    if (!createContext()) return;
    try {
      if (ctx.state !== 'running') await ctx.resume();
      unlocked = ctx.state === 'running';
      if (unlocked) { error = ''; sync(); }
      paint();
    } catch { error = '음악 듣기를 눌러 소리를 다시 시작하세요.'; paint(); }
  }
  async function buffer(key) {
    if (!cache.has(key)) {
      const promise = fetch(tracks[key].file).then(r => {
        if (!r.ok) throw Error('music file unavailable');
        return r.arrayBuffer();
      }).then(bytes => ctx.decodeAudioData(bytes));
      cache.set(key, promise);
      promise.catch(() => cache.delete(key));
    }
    return cache.get(key);
  }
  function retire(node, seconds = .3) {
    if (!node || node.retiring) return;
    node.retiring = true;
    ramp(node.gain.gain, 0, seconds);
    try { node.source.stop(ctx.currentTime + seconds + .02); } catch {}
  }
  function stopMusic() {
    serial++; loading = '';
    for (const node of musicNodes) retire(node);
    active = null;
  }
  async function sync() {
    if (!ctx || !unlocked) { paint(); return; }
    ramp(musicBus.gain, prefs.muted ? 0 : prefs.music / 100);
    ramp(effectsBus.gain, prefs.muted || !A.state.sound ? 0 : prefs.effects / 100);
    if (prefs.muted || prefs.music === 0 || document.hidden) { stopMusic(); paint(); return; }
    const key = wanted();
    if (active?.key === key) {
      // Returning to the playing scene cancels a different track still decoding.
      if (loading) { serial++; loading=''; }
      paint(); return;
    }
    if (loading === key) { paint(); return; }
    const ticket = ++serial;
    loading = key; error = ''; paint();
    try {
      const decoded = await buffer(key);
      if (ticket !== serial || key !== wanted() || document.hidden || prefs.muted || prefs.music === 0) return;
      const source = ctx.createBufferSource(), gain = ctx.createGain();
      source.buffer = decoded; source.loop = true;
      source.loopStart = 0; source.loopEnd = Math.min(decoded.duration, tracks[key].duration);
      gain.gain.value = 0; source.connect(gain); gain.connect(musicBus);
      const node = {source, gain, key, retiring: false};
      musicNodes.add(node);
      source.onended = () => { source.disconnect(); gain.disconnect(); musicNodes.delete(node); };
      source.start(); ramp(gain.gain, 1, .45);
      if (active) retire(active, .45);
      active = node; loading = ''; paint();
    } catch {
      if (ticket !== serial) return;
      loading = '';
      if (active) retire(active);
      active = null;
      error = '음악 파일을 불러오지 못했어요. music 폴더가 함께 올라갔는지 확인해 주세요.';
      paint();
    }
  }
  const sounds = {
    tap: [[660,0,.035,'triangle']],
    inspect: [[740,0,.07,'triangle'],[988,.065,.1,'triangle']],
    negotiate: [[293.66,0,.065,'square'],[349.23,.09,.065,'square'],[329.63,.18,.1,'triangle']],
    agree: [[523.25,0,.07,'square'],[659.25,.09,.07,'square'],[783.99,.18,.14,'triangle']],
    coin: [[1046.5,0,.08,'square'],[1567.98,.08,.18,'triangle']],
    rare: [[587.33,0,.09,'square'],[739.99,.1,.09,'square'],[880,.2,.09,'square'],[1174.66,.3,.24,'triangle']],
    bad: [[392,0,.12,'triangle'],[277.18,.13,.12,'triangle'],[196,.26,.2,'triangle']],
    reject: [[220,0,.055,'triangle'],[196,.075,.08,'triangle']],
    door: [[587.33,0,.14,'triangle'],[440,.13,.26,'triangle']]
  };
  function effect(kind = 'tap') {
    if (!ctx || ctx.state !== 'running' || document.hidden || prefs.muted || !A.state.sound || prefs.effects === 0) return;
    const now = ctx.currentTime;
    if (kind === 'tap' && now-lastEffect < .045) return;
    lastEffect = now;
    // Bound polyphony even under repeated input.
    if (voices.size > 16) return;
    for (const [hz, offset, length, shape] of sounds[kind] || sounds.tap) {
      const osc = ctx.createOscillator(), gain = ctx.createGain(), t = now + offset;
      osc.type = shape; osc.frequency.value = hz;
      gain.gain.setValueAtTime(0,t);
      gain.gain.linearRampToValueAtTime(shape === 'square' ? .035 : .075,t+.006);
      gain.gain.exponentialRampToValueAtTime(.0001,t+length);
      osc.connect(gain); gain.connect(effectsBus); voices.add(osc);
      osc.onended = () => { voices.delete(osc); osc.disconnect(); gain.disconnect(); };
      osc.start(t); osc.stop(t+length+.02);
    }
    if (kind !== 'tap' && active && !prefs.muted) {
      const level = prefs.music/100;
      ramp(musicBus.gain, level*.62, .03);
      musicBus.gain.linearRampToValueAtTime(level, now+.7);
    }
  }
  function feedback(action, result, state) {
    if (result?.ok === false) { effect('reject'); return; }
    let sound = 'tap';
    if (action === 'accept') sound = state.current.status === 'sold' ? 'coin' : !state.current.genuine ? 'bad' : state.current.grade >= 3 ? 'rare' : 'coin';
    else if (action === 'sell') sound = 'coin';
    else if (action === 'offer') sound = result?.accepted ? 'agree' : 'negotiate';
    else if (['investigate','deepInvestigate'].includes(action)) sound = 'inspect';
    else if (['next','nextDay'].includes(action)) sound = 'door';
    effect(sound);
  }

  const dialog = document.createElement('dialog');
  dialog.id = 'audio-dialog'; dialog.className = 'audio-dialog';
  dialog.setAttribute('aria-labelledby','audio-title');
  dialog.innerHTML = '<div class="audio-heading"><div><span class="eyebrow">MIDNIGHT RADIO</span><h2 id="audio-title">가게의 작은 라디오</h2></div><button type="button" data-audio="close" aria-label="소리 설정 닫기">닫기</button></div><p class="audio-track" id="audio-track"></p><p class="audio-status" id="audio-status" role="status"></p><button type="button" class="audio-play" data-audio="play">음악 듣기</button><div class="audio-setting"><label for="music-volume">배경 음악 <output id="music-level" for="music-volume"></output></label><input id="music-volume" type="range" min="0" max="100" step="1"></div><div class="audio-setting"><label for="effects-volume">효과음 <output id="effects-level" for="effects-volume"></output></label><input id="effects-volume" type="range" min="0" max="100" step="1"></div><div class="audio-toggles"><button type="button" data-audio="mute" aria-pressed="false">전체 음소거</button><button type="button" data-audio="effects" aria-pressed="true">효과음 켜짐</button></div><p class="audio-footnote">세 곡이 장면에 맞춰 흐릅니다.<br>다른 화면으로 이동하면 소리도 잠시 쉽니다.</p>';
  document.body.append(dialog);
  const titleButton = document.createElement('button');
  titleButton.type = 'button'; titleButton.className = 'title-audio-button'; titleButton.dataset.audio = 'open';
  document.querySelector('.title-content')?.append(titleButton);
  const headerButton = document.createElement('button');
  headerButton.type = 'button'; headerButton.className = 'icon-btn audio-header-button';
  headerButton.dataset.audio = 'open'; headerButton.setAttribute('aria-label','음악과 효과음 설정');
  headerButton.textContent = '♪';
  document.getElementById('settings-button')?.before(headerButton);
  const $ = id => document.getElementById(id);
  function paint() {
    if (!$('audio-status')) return;
    $('audio-track').textContent = '지금의 곡 · '+tracks[wanted()].name;
    let message = error || (prefs.muted ? '전체 소리가 꺼져 있어요.' : prefs.music===0 ? '배경 음악 볼륨이 0이에요.' : !unlocked || ctx?.state !== 'running' ? '버튼을 누르면 음악이 시작됩니다.' : loading ? '라디오를 켜는 중…' : '자연스럽게 이어지는 칩튠 연주');
    $('audio-status').textContent = message;
    for (const [key, value] of [['music',prefs.music],['effects',prefs.effects]]) {
      $(key+'-volume').value = value; $(key+'-level').textContent = value+'%';
    }
    const mute=dialog.querySelector('[data-audio="mute"]'), fx=dialog.querySelector('[data-audio="effects"]');
    mute.setAttribute('aria-pressed',String(prefs.muted)); mute.textContent = prefs.muted ? '음소거 해제' : '전체 음소거';
    fx.setAttribute('aria-pressed',String(A.state.sound)); fx.textContent = '효과음 '+(A.state.sound?'켜짐':'꺼짐');
    dialog.querySelector('[data-audio="play"]').hidden = !!(active && !prefs.muted && prefs.music>0 && ctx?.state === 'running' && !error);
    titleButton.textContent = prefs.muted ? '♫ 소리 꺼짐 · 설정' : active ? '♫ 음악 재생 중 · 설정' : '♫ 음악 듣기 · 설정';
  }
  function open() { paint(); if (!dialog.open) dialog.showModal(); }
  // Capture genuine button/keyboard interaction before the game's action handlers.
  document.addEventListener('click', event => { if (event.target.closest('button') && event.isTrusted) void unlock(); }, true);
  document.addEventListener('keydown', event => { if (event.isTrusted && ['Enter',' '].includes(event.key)) void unlock(); }, true);
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-audio]'); if (!button) return;
    const action = button.dataset.audio;
    if (action === 'open') open();
    else if (action === 'close') dialog.close();
    else if (action === 'play') { prefs.muted=false; if (!prefs.music) prefs.music=44; persist(); void unlock(); }
    else if (action === 'mute') { prefs.muted=!prefs.muted; persist(); sync(); }
    else if (action === 'effects') { A.state.sound=!A.state.sound; A.save(); if (!A.inTutorial) { preferredEffects=A.state.sound; persist(); } sync(); effect('coin'); }
    paint();
  });
  for (const kind of ['music','effects']) {
    $(kind+'-volume').addEventListener('input', e => { prefs[kind]=clamp(Number(e.target.value),44); persist(); sync(); });
    $(kind+'-volume').addEventListener('change', () => { if (kind==='effects') effect('coin'); });
  }
  dialog.addEventListener('click', e => { if (e.target!==dialog) return; const r=dialog.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close(); });
  window.addEventListener('pawn:mode', () => { A.state.sound=preferredEffects; dialog.close(); sync(); });
  window.addEventListener('pawn:change', () => sync());
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) { stopMusic(); ctx.suspend().catch(()=>{}); }
    else if (unlocked) { void unlock(); }
  });
  window.addEventListener('pagehide', () => { if(ctx){stopMusic();ctx.suspend().catch(()=>{});} });
  window.addEventListener('pageshow', () => { if (unlocked && !document.hidden) void unlock(); });
  window.PawnAudio = {
    effect, feedback, open,
    refresh() { if (!A.inTutorial) { preferredEffects=A.state.sound; persist(); } sync(); },
    // Read-only diagnostics for audio tests, without exposing hidden item information.
    get status() { return {scene:wanted(),playing:active?.key||null,loading,error,context:ctx?.state||'locked',muted:prefs.muted,music:prefs.music,effects:prefs.effects,effectsEnabled:A.state.sound,sources:musicNodes.size,voices:voices.size,cached:cache.size}; }
  };
  paint();
})();
