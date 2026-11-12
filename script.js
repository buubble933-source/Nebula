/* ===== Nebula Break · FULL SCRIPT (animation, storage, music, voices, audio clips, games) ===== */

/* ---------- storage (saves levels and best scores) ---------- */
const store = {
  get(k, d){ try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
};
const $ = s => document.querySelector(s);
const has = c => document.body.classList.contains(c);

/* ---------- galaxy background ---------- */
(function galaxy(){
  const c = $('#galaxy'); if (!c) return;
  const x = c.getContext('2d');
  let W, H, stars = [];
  const COLORS = ['255,255,255','196,160,255','167,110,255','232,121,249'];
  function resize(){
    W = c.width = innerWidth; H = c.height = innerHeight; stars = [];
    const n = Math.min(900, Math.floor(W*H/1800));
    for(let i=0;i<n;i++){
      const arm = i % 3;
      const r = Math.pow(Math.random(), 0.7) * Math.max(W,H) * 0.7;
      const a = r * 0.004 + arm * (Math.PI*2/3) + (Math.random()-.5)*0.6;
      stars.push({ r, a, s: Math.random()*1.6+.3, c: COLORS[(Math.random()*COLORS.length)|0], t: Math.random()*6 });
    }
  }
  resize(); addEventListener('resize', resize);
  let mx = 0, my = 0, rot = 0;
  addEventListener('pointermove', e => { mx = (e.clientX/W-.5)*30; my = (e.clientY/H-.5)*30; });
  (function draw(){
    x.fillStyle = 'rgba(5,2,15,.35)'; x.fillRect(0,0,W,H);
    rot += 0.0006;
    for(const p of stars){
      const ang = p.a + rot * (1 + 80/(p.r+80));
      const px = W/2 + Math.cos(ang)*p.r + mx*p.s;
      const py = H/2 + Math.sin(ang)*p.r*0.55 + my*p.s;
      p.t += 0.03;
      x.fillStyle = `rgba(${p.c},${0.5 + Math.sin(p.t)*0.4})`;
      x.beginPath(); x.arc(px, py, p.s, 0, 7); x.fill();
    }
    requestAnimationFrame(draw);
  })();
})();

/* ---------- buttons + tiles: glow and pull toward the mouse ---------- */
addEventListener('pointermove', e => {
  document.querySelectorAll('.btn, .tile').forEach(b => {
    if (b.disabled) return;
    const r = b.getBoundingClientRect();
    const cx = r.left + r.width/2, cy = r.top + r.height/2;
    const g = Math.max(0, 1 - Math.hypot(e.clientX-cx, e.clientY-cy)/220);   // 220 = glow distance
    const big = b.classList.contains('tile');
    b.style.setProperty('--g', g.toFixed(3));
    const pull = g * (big ? .06 : .18);
    b.style.transform = g > 0 ? `translate(${(e.clientX-cx)*pull}px,${(e.clientY-cy)*pull}px) scale(${1+g*(big?.03:.08)})` : '';
  });
});

/* ---------- page change with warp effect ---------- */
document.querySelectorAll('.go').forEach(b => b.addEventListener('click', e => {
  e.preventDefault();
  const w = document.createElement('div'); w.className = 'warp'; document.body.appendChild(w);
  requestAnimationFrame(() => w.classList.add('on'));
  setTimeout(() => location.href = b.dataset.href, 600);
}));

/* ---------- soothing background music (made live, no audio file) ---------- */
const music = (() => {
  let ctx, bus, on = store.get('music', true), started = false, t1, t2;
  const btn = document.createElement('button');
  btn.className = 'btn small music'; document.body.appendChild(btn);
  const label = () => btn.textContent = !on ? '🔇 Music: Off' : '🎵 Music: On';
  label();
  const CH = [[220,261.63,329.63,493.88],[174.61,220,261.63,329.63],[261.63,329.63,392,493.88],[196,246.94,293.66,392]];
  const PENT = [440,523.25,587.33,659.25,783.99,880];
  const fade = (v, s) => { if (!ctx) return; const t = ctx.currentTime; bus.gain.cancelScheduledValues(t); bus.gain.setValueAtTime(bus.gain.value, t); bus.gain.linearRampToValueAtTime(v, t+s); };
  function tone(f, dur, vol, type, atk){
    const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t+atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    o.connect(g); g.connect(bus); o.start(t); o.stop(t+dur+.1);
  }
  let ci = 0;
  const chord = () => CH[ci++ % CH.length].forEach(f => tone(f, 9, .08, 'sine', 3));
  const bell = () => { if (Math.random() < .7) tone(PENT[(Math.random()*PENT.length)|0], 4, .09, 'triangle', .02); };
  function start(){
    try {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        bus = ctx.createGain(); bus.gain.value = 0;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
        const dl = ctx.createDelay(1); dl.delayTime.value = .5;
        const fb = ctx.createGain(); fb.gain.value = .45;
        bus.connect(lp); lp.connect(ctx.destination);
        lp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(ctx.destination);
      }
      ctx.resume(); fade(.9, 3);
      if (!started) { started = true; chord(); t1 = setInterval(chord, 8000); t2 = setInterval(bell, 2600); }
    } catch(e) {}
  }
  function stop(){
    if (!ctx) return;
    fade(0, 1); clearInterval(t1); clearInterval(t2); started = false;
    setTimeout(() => { if (!on) ctx.suspend(); }, 1200);
  }
  btn.onclick = () => {
    if (on && ctx && ctx.state !== 'running') { start(); return; }
    on = !on; store.set('music', on); on ? start() : stop(); label();
  };
  const first = e => {
    if (e.target.closest && e.target.closest('.music')) return;
    if (on) start();
    removeEventListener('click', first); removeEventListener('keydown', first);
  };
  addEventListener('click', first); addEventListener('keydown', first);
  if (on) start();
  return { duck(v){ if (ctx && on && started) fade(v ? .3 : .9, .6); } };
})();

/* ---------- voice-over (your recorded clips + text-to-speech) ---------- */
const voice = (() => {
  const ok = 'speechSynthesis' in window;
  let voices = [], seq = 0, clip = null;
  if (ok) { voices = speechSynthesis.getVoices(); speechSynthesis.onvoiceschanged = () => voices = speechSynthesis.getVoices(); }
  const MALE = /(Thomas|Daniel|Alex|Fred|Henri|Luca|Diego|Jorge|Nicolas|Male|Google)/i;
  const FEMALE = /(Samantha|Female|Aria|Jenny|Zira|Susan|Hazel|Amelie|Serena)/i;
  const pick = (lang, female) => {
    const rank = list => list.find(v => (female ? FEMALE : MALE).test(v.name)) || list[0];
    let m = voices.filter(v => v.lang.replace('_','-').toLowerCase().startsWith(lang.toLowerCase()));
    if (!m.length) m = voices.filter(v => v.lang.toLowerCase().startsWith(lang.slice(0,2).toLowerCase()));
    if (!m.length) m = voices.filter(v => /^en/i.test(v.lang));
    return rank(m);
  };
  const stopClip = () => { if (clip) { clip.onended = clip.onerror = null; clip.pause(); clip = null; } };

  // plays one of your recorded audio files; if it can't load, runs the fallback (text-to-speech)
  function play(src, done, fallback){
    if (ok) speechSynthesis.cancel();
    stopClip();
    const id = ++seq;
    clip = new Audio(src);
    clip.onplay = () => music.duck(true);
    clip.onended = () => { if (id !== seq) return; music.duck(false); done && done(); };
    clip.onerror = () => { if (id !== seq) return; music.duck(false); fallback && fallback(); };
    clip.play().catch(() => { if (id === seq) { music.duck(false); fallback && fallback(); } });
  }

  function say(text, done, o = {}){
    stopClip();
    if (!ok) { done && done(); return; }
    speechSynthesis.cancel();
    const id = ++seq, u = new SpeechSynthesisUtterance(text), v = pick(o.lang || 'en-US', o.female);
    if (v) { u.voice = v; u.lang = v.lang; }
    u.rate = o.rate ?? .85; u.pitch = o.pitch ?? 1;
    u.onstart = () => music.duck(true);
    u.onend = u.onerror = () => { if (id !== seq) return; music.duck(false); done && done(); };
    speechSynthesis.speak(u);
  }
  function stop(){ seq++; stopClip(); if (ok) speechSynthesis.cancel(); music.duck(false); }
  return { say, play, stop };
})();

/* ---------- FRONT PAGE: typing heading ---------- */
if ($('#typed')) {
  const text = 'Best Suitable Break for Your Brain';   // <- change your heading here
  let i = 0;
  (function type(){
    $('#typed').textContent = text.slice(0, i++);
    if (i <= text.length) setTimeout(type, 90);
  })();
}

/* ================= CALENDAR (hub page) + DAY REMINDERS (every page) ================= */
const calendar = (() => {
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  let marks = store.get('calMarks', []);          // days circled in red
  let selected = null;                            // day clicked once

  function toast(msg){
    const t = document.createElement('div');
    t.className = 'cal-toast'; t.textContent = msg; document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('on'));
    setTimeout(() => { t.classList.remove('on'); setTimeout(() => t.remove(), 500); }, 9000);
  }

  // fires once per day when today is a red-circled day
  function check(){
    const today = keyOf(new Date());
    if (!marks.includes(today) || store.get('calNotified', '') === today) return;
    store.set('calNotified', today);
    const msg = '🔴 Today is a day you circled in your calendar!';
    toast(msg);
    if ('Notification' in window && Notification.permission === 'granted') {
      try { new Notification('Nebula Break', { body: msg }); } catch(e) {}
    }
  }
  check(); setInterval(check, 30000);

  if (has('hub')) {
    const now = new Date();
    let year = now.getFullYear(), month = now.getMonth();
    const box = document.createElement('section');
    box.className = 'calendar';
    box.innerHTML = `
      <div class="cal-head">
        <button class="cal-nav" data-d="-1" aria-label="Previous month">‹</button>
        <h3 id="calTitle"></h3>
        <button class="cal-nav" data-d="1" aria-label="Next month">›</button>
      </div>
      <div class="cal-week"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div>
      <div class="cal-grid" id="calGrid"></div>
      <p class="cal-hint">Click a day once to select it, click it again to circle it in red. You'll get a notification when that day comes.</p>`;
    const anchor = document.querySelector('main.tiles');
    anchor ? anchor.after(box) : document.body.appendChild(box);

    function render(){
      $('#calTitle').textContent = new Date(year, month, 1).toLocaleString('en', { month: 'long', year: 'numeric' });
      const first = new Date(year, month, 1).getDay(), days = new Date(year, month+1, 0).getDate();
      const today = keyOf(new Date());
      let html = '<i></i>'.repeat(first);
      for (let d = 1; d <= days; d++) {
        const k = `${year}-${pad(month+1)}-${pad(d)}`;
        const cls = ['cal-day', k === today ? 'today' : '', k === selected ? 'sel' : '', marks.includes(k) ? 'mark' : ''].join(' ');
        html += `<button class="${cls}" data-k="${k}">${d}</button>`;
      }
      $('#calGrid').innerHTML = html;
    }

    box.addEventListener('click', e => {
      const nav = e.target.closest('.cal-nav');
      if (nav) {
        month += +nav.dataset.d;
        if (month < 0) { month = 11; year--; } else if (month > 11) { month = 0; year++; }
        render(); return;
      }
      const b = e.target.closest('.cal-day'); if (!b) return;
      const k = b.dataset.k;
      if (selected !== k) { selected = k; render(); return; }          // 1st click: select
      marks = marks.includes(k) ? marks.filter(m => m !== k) : [...marks, k];   // 2nd click: circle / un-circle
      store.set('calMarks', marks);
      if (marks.includes(k) && 'Notification' in window && Notification.permission === 'default') {
        try { Notification.requestPermission(); } catch(e) {}
      }
      render(); check();
    });
    render();
  }
  return { toast };
})();

/* ================= MOTIVATION PAGE (leaders) ================= */
if (has('motivation')) {
  const L = [
    {n:'Julius Caesar',         role:'Roman general & dictator',      h:40,  q:'I came, I saw, I conquered.'},
    {n:'Napoleon Bonaparte',    role:'Emperor of the French',         h:220, q:'Impossible is a word to be found only in the dictionary of fools.'},
    {n:'Abraham Lincoln',       role:'16th US President',             h:205, q:'I am a slow walker, but I never walk back.'},
    {n:'Martin Luther King Jr.',role:'Civil rights leader',           h:270, q:"If you can't fly then run, if you can't run then walk, if you can't walk then crawl, but whatever you do, keep moving forward."},
    {n:'Alexander the Great',   role:'King of Macedon',               h:50,  q:'There is nothing impossible to him who will try.'},
    {n:'Theodore Roosevelt',    role:'26th US President',             h:160, q:'Do what you can, with what you have, where you are.'},
    {n:'Genghis Khan',          role:'Emporor of Mughal Dyanasty',             h:190, q:'If you are afraid Dont do it,If you are doing it Dont be afraid'},
    {n:'John F. Kennedy',       role:'35th US President',             h:340, q:'We choose to go to the Moon, not because it is easy, but because it is hard.'},
    {n:'Margaret Thatcher',     role:'UK Prime Minister',             h:300, q:'You may have to fight a battle more than once to win it.'}
  
  
  ];

  // text-to-speech voices (English only), used for leaders without a recording
  const VOICES = {
    'Winston Churchill':     {lang:'en-GB', pitch:.3,  rate:.75},
    'Nelson Mandela':        {lang:'en-US', pitch:.4,  rate:.75},
    'Mahatma Gandhi':        {lang:'en-US', pitch:.7,  rate:.8},
    'Theodore Roosevelt':    {lang:'en-US', pitch:.6,  rate:.95},
    'Franklin D. Roosevelt': {lang:'en-US', pitch:.45, rate:.8},
    'John F. Kennedy':       {lang:'en-US', pitch:.5,  rate:.85},
    'Margaret Thatcher':     {lang:'en-GB', pitch:.9,  rate:.8, female:true}
  };

  // leaders who have your real recording (files go in the audio folder)
  const AUDIO = {
    'Julius Caesar':         'caesar.mp3',
    'Napoleon Bonaparte':    'napolean.mp3',
    'Abraham Lincoln':       'lincoln.mp3',
    'Martin Luther King Jr.':'mlk.mp3',
    'Alexander the Great':   'alexander.mp3',
    'Theodore Roosevelt':    'TR.mp3',
    'Genghis Khan':          'Genghis.mp3',
    'John F. Kennedy':       'kennady.mp3',
    'Margaret Thatcher':     'MT.mp3'
  };

  const slug = n => n.toLowerCase().replace(/\./g,'').replace(/[^a-z]+/g,'-').replace(/^-|-$/g,'');
  const ini  = n => n.replace(/\./g,'').split(' ').filter(w => /^[A-Z]/.test(w)).map(w => w[0]).slice(0,2).join('');
  const bust = (h, n) => `<svg viewBox="0 0 100 140"><circle cx="50" cy="34" r="20" fill="hsl(${h} 70% 62%)"/><path d="M6 120c0-36 19-54 44-54s44 18 44 54z" fill="hsl(${h} 70% 46%)"/><text x="50" y="104" text-anchor="middle" font-size="17" font-weight="700" fill="#fff" font-family="system-ui,sans-serif">${ini(n)}</text></svg>`;

  const box = $('#cards'); let playing = false;
  box.innerHTML = L.map((p,i) => `
    <article class="lcard" id="l${i}" style="--h:${p.h}">
      <div class="stage"><div class="halo"></div>${bust(p.h, p.n)}<img class="cut" src="leaders/${slug(p.n)}.png" alt="${p.n}" onload="this.parentNode.classList.add('has')" onerror="this.remove()"></div>
      <h3>${p.n}</h3><span class="role">${p.role}</span>
      <p class="line">“${p.q}”</p>
      <button class="btn small" data-i="${i}">🔊 Hear it</button>
    </article>`).join('');

  const mark = i => document.querySelectorAll('.lcard').forEach((c,j) => c.classList.toggle('reading', j === i));
  const speak = (i, done) => {
    const p = L[i];
    const tts = () => voice.say(`${p.q} ... ${p.n}.`, done, VOICES[p.n]);
    AUDIO[p.n] ? voice.play(AUDIO[p.n], done, tts) : tts();
  };
  box.onclick = e => {
    const b = e.target.closest('button[data-i]'); if (!b) return;
    playing = false; const i = +b.dataset.i; mark(i); speak(i, () => mark(-1));
  };
  $('#playAll').onclick = () => {
    playing = true;
    (function next(i){
      if (!playing || i >= L.length) { mark(-1); playing = false; return; }
      mark(i); document.getElementById('l'+i).scrollIntoView({behavior:'smooth', block:'center'});
      speak(i, () => setTimeout(() => next(i+1), 800));
    })(0);
  };
  $('#stopAll').onclick = () => { playing = false; voice.stop(); mark(-1); };
}

/* ================= FUN FACTS PAGE ================= */
if (has('facts')) {
  const F = [
    ['🪐','Venus',"A day on Venus is longer than a year on Venus."],
    ['🐙','Octopus',"Octopuses have three hearts and blue blood."],
    ['🍯','Honey',"Honey never spoils. Edible honey has been found in ancient tombs."],
    ['🍌','Bananas',"Bananas are slightly radioactive because of the potassium inside them."],
    ['🌌','Stars',"There are more stars in the universe than grains of sand on Earth."],
    ['🧠','Your brain',"Your brain uses about 20% of your body's energy."],
    ['🔇','Space',"Sound cannot travel through space because there is no air."],
    ['🐘','Elephants',"Elephants can recognize themselves in a mirror."],
    ['⚡','Lightning',"Lightning is about five times hotter than the surface of the sun."],
    ['🦒','Giraffes',"Giraffes have the same number of neck bones as you: seven."],
    ['🌊','Oceans',"Most of the ocean floor is still unmapped in detail."],
    ['🐜','Ants',"Ants have been farming fungus for about 60 million years."]
  ];
  const render = () => {
    $('#cards').innerHTML = [...F].sort(() => Math.random()-.5).map(f =>
      `<div class="fcard"><div class="in"><div class="f bk"><span class="big">${f[0]}</span><b>${f[1]}</b><small>Tap to reveal</small></div><div class="f fr"><p>${f[2]}</p></div></div></div>`).join('');
  };
  $('#cards').onclick = e => { const c = e.target.closest('.fcard'); if (c) c.classList.toggle('open'); };
  $('#shuffle').onclick = render; render();
}

/* ================= MEMORY PAGE (5 levels) ================= */
if (has('memory')) {
  const IC = ['🌙','⭐','🪐','☄️','🌌','🚀','👽','🛰️','🌍','🔭','☀️','🌠'];
  const LV = [{p:4,c:4},{p:6,c:4},{p:8,c:4},{p:10,c:5},{p:12,c:6}];   // pairs + columns per level
  let lvl = 0, first = null, lock = false, moves = 0, matched = 0, t0 = 0, timer = null, gid = 0;
  let unlocked = 0, best = store.get('memBest', {});

  const drawLevels = () => $('#levels').innerHTML = LV.map((_,i) =>
    `<button class="btn small lv ${i===lvl?'active':''}" data-l="${i}" ${i>unlocked?'disabled':''}>${i>unlocked?'🔒 ':''}Level ${i+1}</button>`).join('');
  const show = () => { $('#moves').textContent = moves; $('#best').textContent = best[lvl] != null ? best[lvl] : '–'; };

  function begin(l){
    lvl = l; clearInterval(timer); t0 = 0; first = null; moves = 0; matched = 0;
    $('#time').textContent = '0s'; show(); drawLevels();
    const L = LV[lvl], pick = IC.slice(0, L.p);
    const deck = [...pick, ...pick].sort(() => Math.random()-.5);
    const board = $('#board');
    board.style.gridTemplateColumns = `repeat(${L.c},1fr)`;
    board.innerHTML = deck.map(e => `<div class="mcard" data-e="${e}"><div class="in"><div class="f bk">✦</div><div class="f fr">${e}</div></div></div>`).join('');
    const cards = [...board.children];
    cards.forEach(c => c.onclick = () => flip(c));
    const id = ++gid; lock = true; cards.forEach(c => c.classList.add('open'));   // short preview
    setTimeout(() => { if (id !== gid) return; cards.forEach(c => c.classList.remove('open')); lock = false; }, 900 + L.p*180);
  }
  function flip(c){
    if (lock || c.classList.contains('open') || c.classList.contains('done')) return;
    if (!t0) { t0 = Date.now(); timer = setInterval(() => $('#time').textContent = Math.floor((Date.now()-t0)/1000) + 's', 500); }
    c.classList.add('open');
    if (!first) { first = c; return; }
    moves++; show();
    if (first.dataset.e === c.dataset.e) {
      first.classList.replace('open','done'); c.classList.replace('open','done'); first = null; matched++;
      if (matched === LV[lvl].p) win();
    } else {
      lock = true; const a = first; first = null;
      setTimeout(() => { a.classList.remove('open'); c.classList.remove('open'); lock = false; }, 800);
    }
  }
  function win(){
    clearInterval(timer);
    const secs = Math.floor((Date.now()-t0)/1000), L = LV[lvl], last = lvl === LV.length-1;
    const st = moves <= L.p*1.5 ? 3 : moves <= L.p*2.3 ? 2 : 1;
    if (best[lvl] == null || moves < best[lvl]) { best[lvl] = moves; store.set('memBest', best); }
    if (!last && lvl+1 > unlocked) { unlocked = lvl+1; }
    show(); drawLevels();
    $('#mTitle').textContent = last ? '🏆 All levels cleared!' : `Level ${lvl+1} cleared!`;
    $('#mStars').textContent = '⭐'.repeat(st) + '☆'.repeat(3-st);
    $('#mText').textContent = `${moves} moves · ${secs}s`;
    $('#mNext').style.display = last ? 'none' : '';
    setTimeout(() => $('#modal').classList.add('show'), 500);
  }
  $('#levels').onclick = e => { const b = e.target.closest('button[data-l]'); if (b && !b.disabled) begin(+b.dataset.l); };
  $('#restart').onclick = () => begin(lvl);
  $('#mNext').onclick = () => { $('#modal').classList.remove('show'); begin(lvl+1); };
  $('#mAgain').onclick = () => { $('#modal').classList.remove('show'); begin(lvl); };
  begin(Math.min(unlocked, LV.length-1));
}

/* ================= MINI GAME: STAR OBBY (5 levels) ================= */
if (has('Games')) {
  const cv = $('#obby'), x = cv.getContext('2d');
  const W = 800, H = 300, GROUND = 240, PX = 120, S = 26, G = .62, JUMP = -12.2;
  cv.width = W; cv.height = H;
  const LV = [
    {n:'Warm-up',     speed:4.2, len:3200, gap:[420,560], t:['spike']},
    {n:'Hopper',      speed:5.0, len:4200, gap:[380,520], t:['spike','block']},
    {n:'Pit Stop',    speed:5.6, len:5200, gap:[350,480], t:['spike','block','pit']},
    {n:'Spike Storm', speed:6.2, len:6200, gap:[330,450], t:['spike','double','block','pit']},
    {n:'THE OBBY',    speed:6.8, len:7600, gap:[300,420], t:['spike','double','block','pit','fast']}
  ];
  let lvl = 0, state = 'idle', objs = [], dist = 0, finishX = 0, py = GROUND, vy = 0, rot = 0, tries = 0, lastEnd = 0, seed = 1;
  let unlocked = 0;   // levels start locked every time the page is opened

  const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };   // same layout every attempt

  function build(){
    seed = 1000 + lvl*77; objs = []; let pos = 700; const L = LV[lvl];
    while (pos < L.len) {
      let t = L.t[(rnd()*L.t.length)|0]; const o = {t, x:pos, v:0, w:30, h:30};
      if (t === 'double') { o.t = 'spike'; o.w = 64; }
      else if (t === 'block') { o.w = 38; o.h = 56; }
      else if (t === 'pit') { o.w = 120; o.h = 0; }
      else if (t === 'fast') { o.t = 'spike'; o.v = 2.2; o.x += 220; }
      objs.push(o);
      pos = o.x + o.w + L.gap[0] + rnd()*(L.gap[1]-L.gap[0]);
    }
    finishX = L.len + 300;
  }
  const inPit = () => objs.some(o => o.t === 'pit' && o.x < PX && PX < o.x + o.w);
  const reset = () => { dist = 0; py = GROUND; vy = 0; rot = 0; build(); };

  function drawLevels(){
    $('#levels').innerHTML = LV.map((l,i) =>
      `<button class="btn small lv ${i===lvl?'active':''}" data-l="${i}" ${i>unlocked?'disabled':''}>${i>unlocked?'🔒 ':''}${i+1}. ${l.n}</button>`).join('');
    $('#lname').textContent = `Level ${lvl+1} · ${LV[lvl].n}`; $('#tries').textContent = tries;
  }
  function setLevel(l){ lvl = l; tries = 0; state = 'idle'; reset(); drawLevels(); }
  function startRun(){ reset(); state = 'run'; }
  function die(){ state = 'dead'; tries++; lastEnd = Date.now(); $('#tries').textContent = tries; }
  function win(){
    state = 'won'; lastEnd = Date.now();
    if (lvl < LV.length-1 && lvl+1 > unlocked) { unlocked = lvl+1; }
    drawLevels();
  }

  function step(k){
    const L = LV[lvl];
    dist += L.speed*k; finishX -= L.speed*k;
    for (const o of objs) o.x -= (L.speed + o.v)*k;
    vy += G*k; py += vy*k;
    const pit = inPit();
    if (!pit && py >= GROUND) { py = GROUND; vy = 0; }
    if (py < GROUND || pit) rot += .13*k; else rot = Math.round(rot/(Math.PI/2))*(Math.PI/2);
    if (py > GROUND + 70) return die();
    for (const o of objs) {
      if (o.t === 'pit') continue;
      const sp = o.t === 'spike', ox = o.x + (sp?5:0), ow = o.w - (sp?10:0), oh = o.h - (sp?6:0);
      if (PX+S/2-2 > ox && PX-S/2+2 < ox+ow && py-2 > GROUND-oh) return die();
    }
    if (finishX < PX) win();
  }

  function overlay(a, b){
    x.fillStyle = 'rgba(5,2,15,.6)'; x.fillRect(0,0,W,H); x.textAlign = 'center';
    x.fillStyle = '#fff'; x.font = '700 30px system-ui,sans-serif'; x.fillText(a, W/2, 125);
    x.fillStyle = '#d8ccf5'; x.font = '400 18px system-ui,sans-serif'; x.fillText(b, W/2, 165);
  }
  function draw(){
    const g = x.createLinearGradient(0,0,0,H); g.addColorStop(0,'#0a0520'); g.addColorStop(1,'#2a0f52');
    x.fillStyle = g; x.fillRect(0,0,W,H);
    x.fillStyle = 'rgba(255,255,255,.7)';
    for (let i=0;i<50;i++) { const sx = (((i*173 - dist*(.1+(i%3)*.1)) % W) + W) % W; x.fillRect(sx, (i*61)%200, i%3+1, i%3+1); }
    const pits = objs.filter(o => o.t === 'pit').sort((a,b) => a.x-b.x); let gx = 0; const segs = [];
    for (const p of pits) { if (p.x > gx) segs.push([gx, Math.min(p.x,W)-gx]); gx = Math.max(gx, p.x+p.w); }
    if (gx < W) segs.push([gx, W-gx]);
    for (const [sx, sw] of segs) { x.fillStyle = '#3b1d7a'; x.fillRect(sx, GROUND, sw, H-GROUND); x.fillStyle = '#a76eff'; x.fillRect(sx, GROUND, sw, 3); }
    for (const o of objs) {
      if (o.x > W+80 || o.x+o.w < -80) continue;
      x.shadowBlur = 14;
      if (o.t === 'spike') {
        x.shadowColor = '#ff6bd6'; x.fillStyle = o.v ? '#ffffff' : '#ff6bd6';
        for (let i=0;i<Math.round(o.w/32);i++) { const sx = o.x + i*32; x.beginPath(); x.moveTo(sx,GROUND); x.lineTo(sx+15,GROUND-30); x.lineTo(sx+30,GROUND); x.fill(); }
      } else if (o.t === 'block') {
        x.shadowColor = '#7c3aed'; x.fillStyle = '#7c3aed'; x.fillRect(o.x, GROUND-o.h, o.w, o.h);
        x.fillStyle = '#c4a0ff'; x.fillRect(o.x, GROUND-o.h, o.w, 4);
      }
      x.shadowBlur = 0;
    }
    if (finishX < W+60) { x.fillStyle = '#fff'; x.fillRect(finishX, 40, 3, GROUND-40); x.font = '30px system-ui'; x.textAlign = 'left'; x.fillText('🏁', finishX+4, 66); }
    x.save(); x.translate(PX, py - S/2); x.rotate(rot);
    x.shadowBlur = 20; x.shadowColor = '#a76eff';
    const pg = x.createLinearGradient(-S/2,-S/2,S/2,S/2); pg.addColorStop(0,'#fff'); pg.addColorStop(1,'#a76eff');
    x.fillStyle = pg; x.fillRect(-S/2, -S/2, S, S); x.restore();
    if (state === 'idle') overlay(`Level ${lvl+1}: ${LV[lvl].n}`, 'Tap, click or press Space to start');
    if (state === 'dead') overlay('💥 Crashed!', 'Tap to try again');
    if (state === 'won') lvl < LV.length-1 ? overlay('✅ Level cleared!', 'Tap for the next level') : overlay('🏆 You beat the hardest obby!', 'Tap to play it again');
    $('#prog').style.width = Math.min(100, dist/LV[lvl].len*100) + '%';
  }

  function act(){
    if (state === 'run') { if (py >= GROUND && !inPit()) vy = JUMP; return; }
    if (Date.now() - lastEnd < 450) return;
    if (state === 'won') setLevel(lvl < LV.length-1 ? lvl+1 : lvl);
    else startRun();
  }
  cv.addEventListener('pointerdown', e => { e.preventDefault(); act(); });
  addEventListener('keydown', e => {
    if (['Space','ArrowUp','KeyW'].includes(e.code)) { e.preventDefault(); if (e.repeat && state !== 'run') return; act(); }
  });
  $('#levels').onclick = e => { const b = e.target.closest('button[data-l]'); if (b && !b.disabled) setLevel(+b.dataset.l); };

  let last = performance.now();
  (function loop(t){
    const k = Math.min(2.5, (t-last)/16.667); last = t;
    if (state === 'run') step(k);
    draw(); requestAnimationFrame(loop);
  })(last);
  setLevel(0);
} 