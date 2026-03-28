// ═══════════════════════════════════════════════════════════════
// MISFITS LOADOUT — APP LOGIC
// ═══════════════════════════════════════════════════════════════

// ─── STATE + PERSISTENCE ───
let CK = null, S = {};
const LS_KEY = 'misfits-v9';

function loadLS() { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; } }
function saveLS() { const d = loadLS(); d[CK] = S; localStorage.setItem(LS_KEY, JSON.stringify(d)); }

function initS(k) {
  CK = k;
  const c = CHARS[k], saved = loadLS()[k];
  if (saved) { S = saved; return; }
  S = {
    fp: c.refresh,
    stress: { phys: Array(c.stress.phys.boxes).fill(false), ment: Array(c.stress.ment.boxes).fill(false) },
    moves: {}, cons: {}, fi: {},
    corruption: c.corruption ? c.corruption.marked.slice() : null,
    selAction: null, expSkill: null, expMove: null, skView: 'groups', log: []
  };
  [...c.stunts, ...c.extras].forEach(m => S.moves[m.id] = false);
  c.cons.forEach(cn => S.cons[cn.id] = cn.val);
  c.aspects.forEach((_, i) => S.fi[i] = 0);
  saveLS();
}

function addLog(msg) { S.log.unshift(msg); if (S.log.length > 20) S.log.length = 20; saveLS(); rLog(); }

// ─── HELPERS ───
const $ = id => document.getElementById(id);

function bestFor(skills, action) {
  if (AM[action]) return AM[action].map(s => ({nm:s, v:skills[s]||0})).sort((a,b) => b.v-a.v).slice(0,3).filter(x => x.v >= 0);
  return Object.entries(skills).sort((a,b) => b[1]-a[1]).slice(0,4).map(([nm,v]) => ({nm, v}));
}

function stuntMatch(st, action) {
  if (!action) return true;
  if (action === 'attack')   return st.tp === 'attack' || st.corr;
  if (action === 'defend')   return st.tp === 'defend' || st.tp === 'support';
  if (action === 'overcome') return st.tp === 'overcome' || st.tp === 'support' || st.tp === 'wild';
  return st.tp === 'advantage' || st.tp === 'support' || st.tp === 'wild';
}

function dispName(key) { return SKILL_DISPLAY[key] || key; }

// ─── ANIMATIONS ───
function animPulse(el, cls) {
  el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
  el.addEventListener('animationend', () => el.classList.remove(cls), {once: true});
}

// ─── LOGIN + SUMMARY ───
const CHAR_COLORS  = { cap: '#c45838', howard: '#c4a038', thowra: '#38a8c4' };
const CHAR_DELAYS  = { cap: '-1.3s',   howard: '-2.7s',   thowra: '-0.6s'   };

function rLogin() {
  const g = $('loginGrid'); g.innerHTML = '';
  Object.entries(CHARS).forEach(([k, c]) => {
    const d = document.createElement('div'); d.className = 'l-card';
    d.innerHTML = `<div class="l-icon l-portrait" style="color:${CHAR_COLORS[k]};animation-delay:${CHAR_DELAYS[k]}">${PORTRAITS[k]}</div><div class="l-info"><div class="l-name">${c.displayName}</div><div class="l-flavor">${c.flavor}</div></div><button class="l-ibtn" data-k="${k}">ⓘ</button>`;
    d.onclick = (e) => { if (e.target.closest('.l-ibtn')) return; selectChar(k); };
    d.querySelector('.l-ibtn').onclick = (e) => { e.stopPropagation(); showSummary(k); };
    g.appendChild(d);
  });
}

function showSummary(k) {
  const c = CHARS[k], s = c.summary, p = $('sumPanel');
  p.innerHTML = `<div class="sum-header"><div class="sum-class">:: crew dossier // personnel file</div><button class="sum-close" onclick="closeSummary()">✕</button><div class="sum-name">${c.displayName}</div><div class="sum-hc">${s.hc}</div></div>
<div class="sum-content">
<div class="sum-section"><div class="sum-label">:: trouble</div><div class="sum-body">${s.trouble}</div></div>
<div class="sum-section"><div class="sum-label">:: playstyle</div><div class="sum-body">${s.playstyle}</div></div>
<div class="sum-section"><div class="sum-label">:: top skills</div><div class="sum-list">${s.topSkills.join('<br>')}</div></div>
<div class="sum-section"><div class="sum-label">:: signature moves</div><div class="sum-list">${s.moves.join('<br>')}</div></div>
<div class="sum-section warn"><div class="sum-label">:: watch out</div><div class="sum-warn">${s.watchOut}</div></div>
<div class="sum-section"><div class="sum-label">:: connections</div><div class="sum-body">${s.connections}</div></div>
</div>`;
  $('summary').classList.add('on');
}

function closeSummary() { $('summary').classList.remove('on'); }

function applyCharacterTheme(k) {
  const themes = {
    cap:    { accent: '#c45838', dim: 'rgba(196,88,56,0.10)',   mid: 'rgba(196,88,56,0.20)'   },
    howard: { accent: '#c4a038', dim: 'rgba(196,160,56,0.10)',  mid: 'rgba(196,160,56,0.20)'  },
    thowra: { accent: '#38a8c4', dim: 'rgba(56,168,196,0.10)',  mid: 'rgba(56,168,196,0.20)'  }
  };
  const t = themes[k], r = document.documentElement.style;
  r.setProperty('--accent', t.accent);
  r.setProperty('--accent-dim', t.dim);
  r.setProperty('--accent-mid', t.mid);
}

function selectChar(k)  { initS(k); applyCharacterTheme(k); $('login').classList.add('off'); $('app').classList.add('on'); renderAll(); }
function switchChar() { const [t, sub] = randomLogoutLine(); showCfm(t, sub, () => { $('app').classList.remove('on'); $('login').classList.remove('off'); switchTab('moves'); }); }

// ─── RENDER ALL ───
function renderAll() {
  const c = CHARS[CK];
  $('hName').textContent = c.displayName;
  $('hSub').textContent = c.sub;
  // Stress icons
  const lb = $('lblBones'); if (lb) lb.innerHTML = BONES_ICON;
  const lbr = $('lblBrain'); if (lbr) lbr.innerHTML = BRAIN_ICON;
  const lom = $('lblOmega'); if (lom) lom.innerHTML = OMEGA_ICON;
  // Portrait in header — tapping it goes back to login
  const p = $('hPortrait');
  if (p) { p.innerHTML = PORTRAITS[CK]; p.style.color = 'var(--accent)'; p.onclick = switchChar; }
  rFP(); rStress(); rCorr(); rTabs(); rAct(); rMoves(); rCons(); rLog(); rSkills(); rAspects(); rGuide();
}

// ─── FP ───
function rFP() {
  const r = $('fpRow'); r.innerHTML = '';
  const ref = CHARS[CK].refresh, count = Math.max(S.fp, ref);
  for (let i = 0; i < count; i++) {
    const d = document.createElement('div'); d.className = 'fp-dot' + (i >= S.fp ? ' empty' : '');
    d.innerHTML = FP_ICON;
    d.onclick = () => {
      const was = S.fp; S.fp = i < S.fp ? i : i + 1; saveLS(); rFP(); addLog(`Fate Points: ${S.fp}`);
      if (S.fp < was) { const dots = $('fpRow').querySelectorAll('.fp-dot'); if (dots[i]) animPulse(dots[i], 'anim-pulse-gold'); }
    };
    r.appendChild(d);
  }
  const p = document.createElement('div'); p.className = 'fp-add'; p.textContent = '+';
  p.onclick = () => { S.fp++; saveLS(); rFP(); addLog(`FP gained: ${S.fp}`); const dots = $('fpRow').querySelectorAll('.fp-dot'); if (dots[S.fp-1]) animPulse(dots[S.fp-1], 'anim-pulse-gold'); };
  r.appendChild(p);
}

function rStress() { rTrack('physB', S.stress.phys, CHARS[CK].stress.phys, 'lblBones', true); rTrack('mentB', S.stress.ment, CHARS[CK].stress.ment, 'lblBrain', false); }
function rTrack(id, arr, cfg, iconId, isPhys) {
  const w = $(id); w.innerHTML = '';
  const base = cfg.boxes - cfg.bonus;
  const allFull = arr.every(v => v);
  const icon = $(iconId);
  if (icon) {
    if (allFull) {
      icon.classList.remove('maxed');
      void icon.offsetWidth;
      icon.classList.add('maxed');
    } else {
      icon.classList.remove('maxed');
    }
  }
  arr.forEach((v, i) => {
    const b = document.createElement('div');
    b.className = 'str-box' + (isPhys ? ' phys' : '') + (v ? ' on' : '') + (i >= base ? ' bonus' : '');
    b.textContent = i + 1;
    b.onclick = () => {
      arr[i] = !arr[i]; saveLS(); rStress(); addLog(`${id.includes('phys') ? 'Physical' : 'Mental'} stress ${i+1} ${arr[i] ? 'marked' : 'cleared'}`);
      if (arr[i]) { const boxes = $(id).querySelectorAll('.str-box'); if (boxes[i]) animPulse(boxes[i], 'anim-pulse-red'); }
    };
    w.appendChild(b);
  });
}

// ─── CORRUPTION ───
function rCorr() {
  if (!S.corruption) { $('corrBar').style.display = 'none'; return; }
  $('corrBar').style.display = '';
  const w = $('corrB'); w.innerHTML = '';
  const allFull = S.corruption.every(v => v);
  const icon = $('lblOmega');
  if (icon) {
    icon.classList.remove('maxed');
    void icon.offsetWidth;
    if (allFull) icon.classList.add('maxed');
  }
  S.corruption.forEach((v, i) => {
    const b = document.createElement('div');
    b.className = 'corr-box' + (v ? ' on' : '');
    b.textContent = i + 1;
    b.onclick = () => {
      S.corruption[i] = !S.corruption[i]; saveLS(); rCorr(); addLog(`Corruption ${i+1} ${S.corruption[i] ? 'marked' : 'cleared'}`);
      if (S.corruption[i]) { const boxes = $('corrB').querySelectorAll('.corr-box'); if (boxes[i]) animPulse(boxes[i], 'anim-pulse-corr'); }
    };
    w.appendChild(b);
  });
}

// ─── TABS ───
function rTabs() {
  const w = $('tabBar'); w.innerHTML = '';
  ['moves','skills','aspects','guide'].forEach(t => {
    const b = document.createElement('button'); b.className = 'tab' + (t === 'moves' ? ' on' : '');
    b.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    b.onclick = () => switchTab(t);
    w.appendChild(b);
  });
}
function switchTab(t) {
  document.querySelectorAll('.tab').forEach((b,i) => b.classList.toggle('on', ['moves','skills','aspects','guide'][i] === t));
  document.querySelectorAll('.pnl').forEach(p => p.classList.remove('on'));
  $('pnl-' + t).classList.add('on');
}

// ─── ACTION SELECTOR ───
function rAct() {
  const g = $('actGrid'); g.innerHTML = '';
  ['overcome','advantage','attack','defend'].forEach(a => {
    const b = document.createElement('button'); b.className = 'act-btn' + (S.selAction === a ? ' sel' : ''); b.dataset.a = a; b.textContent = FA[a].nm;
    b.onclick = () => { S.selAction = S.selAction === a ? null : a; saveLS(); rAct(); rMoves(); };
    g.appendChild(b);
  });
  const det = $('actDetail');
  if (!S.selAction) { det.classList.remove('on'); return; }
  det.classList.add('on');
  const c = CHARS[CK], act = FA[S.selAction], top = bestFor(c.skills, S.selAction);
  det.innerHTML = `<div class="act-best"><span>Top:</span> ${top.map(s => `${s.nm} +${s.v}`).join(' · ')}</div>` + act.out.map(o => `<div class="out-row"><div class="out-lbl">${o.l}</div><div class="out-txt">${o.t}</div></div>`).join('');
}

// ─── MOVES ───
function rMoves() {
  const c = CHARS[CK], w = $('movesC'); w.innerHTML = '';
  [...c.stunts, ...c.extras].forEach(m => {
    const matches = !S.selAction || stuntMatch(m, S.selAction);
    const d = document.createElement('div');
    const sc = m.sty === 'danger' ? ' t-danger' : m.sty === 'wild' ? ' t-wild' : '';
    const isExp = S.expMove === m.id;
    d.className = 'mv' + sc + (S.moves[m.id] ? ' spent' : '') + (isExp ? ' expanded' : '') + (!matches ? ' dimmed' : '');
    let expHTML = '';
    if (m.when || m.pairs) {
      expHTML = `<div class="mv-exp">${m.when ? '<strong>When to use:</strong> ' + m.when + '<br>' : ''}${m.pairs ? '<strong>Pairs with:</strong> ' + m.pairs : ''}</div>`;
    }
    d.innerHTML = `<div class="mv-top"><div class="mv-nm">${m.nm}</div><div class="mv-tag">${m.fr}</div></div><div class="mv-sk">${m.sk}</div><div class="mv-desc">${m.desc}</div>${expHTML}<div class="mv-foot"><button class="use-btn" data-id="${m.id}">${S.moves[m.id] ? 'REFRESH' : 'USE'}</button>${m.corr ? '<span class="mv-cost">marks corruption</span>' : ''}</div>`;
    d.id = 'mv-' + m.id;
    d.querySelector('.use-btn').onclick = (e) => {
      e.stopPropagation(); const was = S.moves[m.id]; S.moves[m.id] = !was;
      if (!was && m.corr && S.corruption) {
        const idx = S.corruption.indexOf(false);
        if (idx >= 0) { S.corruption[idx] = true; rCorr(); setTimeout(() => { const boxes = $('corrB').querySelectorAll('.corr-box'); const marked = S.corruption.filter(x=>x).length; if (boxes[marked-1]) animPulse(boxes[marked-1], 'anim-pulse-corr'); }, 50); }
      }
      saveLS(); rMoves(); addLog(`${m.nm} ${was ? 'refreshed' : 'used'}`);
    };
    d.onclick = (e) => { if (e.target.closest('.use-btn')) return; S.expMove = isExp ? null : m.id; saveLS(); rMoves(); };
    w.appendChild(d);
  });
}

// ─── CONSEQUENCES ───
function rCons() {
  const c = CHARS[CK], w = $('consC'); w.innerHTML = '';
  c.cons.forEach(cn => {
    const v = S.cons[cn.id], d = document.createElement('div'); d.className = 'con' + (v ? ' filled' : '');
    const srcH = cn.src !== 'base' ? `<div class="con-src">(${cn.src})</div>` : '';
    if (v) {
      d.innerHTML = `<div class="con-top"><div class="con-lbl">${cn.lbl}</div><div class="con-rec">${cn.rec}</div></div><div class="con-val">${v}</div>${srcH}<div class="con-acts"><button class="con-abtn" data-act="inv">Invoke</button><button class="con-abtn" data-act="clr">Clear</button></div>`;
      d.querySelector('[data-act="inv"]').onclick = () => addLog(`Consequence invoked: ${v}`);
      d.querySelector('[data-act="clr"]').onclick = () => { S.cons[cn.id] = null; saveLS(); rCons(); addLog(`Consequence cleared: ${cn.lbl}`); };
    } else {
      d.innerHTML = `<div class="con-top"><div class="con-lbl">${cn.lbl}</div><div class="con-rec">${cn.rec}</div></div><div class="con-val">Nothing here yet. Tap to regret something.</div>${srcH}`;
      d.onclick = () => {
        d.onclick = null; d.classList.add('filled');
        const vl = d.querySelector('.con-val'); vl.innerHTML = '<input class="con-inp" type="text" placeholder="What happened?">';
        const inp = vl.querySelector('input'); inp.focus();
        const save = () => { if (inp.value.trim()) { S.cons[cn.id] = inp.value.trim(); saveLS(); addLog(`Consequence: ${cn.lbl} — ${inp.value.trim()}`); } rCons(); };
        inp.onkeydown = e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') rCons(); };
        inp.onblur = save;
      };
    }
    w.appendChild(d);
  });
}

// ─── LOG ───
function rLog() { $('logBody').innerHTML = S.log.map(l => `<div>${l}</div>`).join(''); }

// ─── SKILLS ───
function rSkills() {
  const c = CHARS[CK], g = $('skGrid'); g.innerHTML = '';
  const entries = Object.entries(c.skills).map(([nm,rt]) => ({nm, rt, gr: SM[nm]?.g || 'Other'}));
  if (S.skView === 'groups') {
    GROUPS.forEach(gr => {
      const gs = entries.filter(s => s.gr === gr); if (!gs.length) return;
      const h = document.createElement('div'); h.className = 'sk-gh'; h.textContent = gr; g.appendChild(h);
      gs.forEach(s => g.appendChild(mkSk(s)));
    });
  } else {
    const sorted = [...entries].sort((a,b) => b.rt - a.rt); let last = null;
    sorted.forEach(s => {
      if (s.rt !== last) { last = s.rt; const h = document.createElement('div'); h.className = 'sk-gh'; h.textContent = `${L[s.rt]||'?'} (+${s.rt})`; g.appendChild(h); }
      g.appendChild(mkSk(s));
    });
  }
}

function mkSk(s) {
  const d = document.createElement('div'), exp = S.expSkill === s.nm, tier = s.rt >= 3 ? 'hi' : s.rt >= 2 ? 'md' : 'lo';
  d.className = 'sk' + (exp ? ' exp' : '');
  d.onclick = () => { S.expSkill = exp ? null : s.nm; saveLS(); rSkills(); };
  let det = '';
  if (exp) {
    const m = SM[s.nm] || {}, dn = SKILL_DISPLAY[s.nm];
    let ch = '', ds = '';
    if (m.o) ch += '<span class="ach o">O</span>'; if (m.c) ch += '<span class="ach c">C</span>';
    if (m.a) ch += '<span class="ach a">A</span>'; if (m.d) ch += '<span class="ach d">D</span>';
    if (m.o) ds += `<div class="sk-ad"><b class="co">OVR:</b> ${m.o}</div>`;
    if (m.c) ds += `<div class="sk-ad"><b class="ca">ADV:</b> ${m.c}</div>`;
    if (m.a) ds += `<div class="sk-ad"><b class="ct">ATK:</b> ${m.a}</div>`;
    if (m.d) ds += `<div class="sk-ad"><b class="cd">DEF:</b> ${m.d}</div>`;
    const annH = dn ? `<div class="sk-ann">${dn}</div>` : '';
    const nt = m.n ? `<div class="sk-note">ⓘ ${m.n}</div>` : '';
    const party = PS[s.nm]; let tw = '';
    if (party) {
      const rest = TR[s.nm], mems = Object.entries(party), best = Math.max(...mems.map(x => x[1])), harry = HS[s.nm];
      let mH = mems.map(([n,r]) => { const isL = r === best && r > 0, canA = !isL && r >= 1; return `<span class="tw-m ${isL?'lead':canA?'help':'no'}">${n} +${r}${isL?' ★':canA?' +1':''}</span>`; }).join('');
      if (harry) mH += `<span class="tw-m help">Harry +${harry.rt} (${harry.nm})</span>`;
      let tot = '';
      if (!rest || rest.includes('only with Harry')) { const helpers = mems.filter(([,r]) => r>=1 && r<best).length + (harry && harry.rt>=1 ? 1 : 0); const tw_ = best + helpers; tot = tw_ > best ? `<div class="tw-res">Best: +${best} · Teamwork: +${tw_}</div>` : `<div class="tw-res">Best: +${best}</div>`; }
      else { tot = `<div class="tw-res">Best: +${best}</div>`; }
      const warn = rest ? `<div class="tw-warn">⚠ ${rest}</div>` : '';
      tw = `<div class="tw-pnl"><div class="tw-ttl">Teamwork</div><div class="tw-row">${mH}</div>${tot}${warn}</div>`;
    }
    det = `<div class="sk-det">${annH}<div class="achips">${ch}</div>${ds}${nt}${tw}</div>`;
  }
  d.innerHTML = `<div class="sk-top"><div><div class="sk-nm">${s.nm}</div><div class="sk-ll">${L[s.rt]||'Mediocre'}</div></div><div class="sk-rt ${tier}">+${s.rt}</div></div>${det}`;
  return d;
}

function setView(v) { S.skView = v; S.expSkill = null; saveLS(); document.querySelectorAll('.vtog-b').forEach(b => b.classList.toggle('on', b.textContent.toLowerCase() === v)); rSkills(); }

// ─── ASPECTS ───
function rAspects() {
  const c = CHARS[CK], w = $('aspC'); w.innerHTML = '';
  c.aspects.forEach((a, i) => {
    if (!a.nm) return;
    const d = document.createElement('div'); d.className = 'asp';
    let chips = '';
    if (a.inv) chips += `<button class="asp-ch inv" onclick="event.stopPropagation();addLog('Invoked: ${a.nm.replace(/'/g,"\\'")}')">Invoke</button>`;
    if (a.cmp) chips += `<button class="asp-ch cmp" onclick="event.stopPropagation();addLog('Compel: ${a.nm.replace(/'/g,"\\'")}')">Compel</button>`;
    const fi = S.fi[i] || 0;
    const fiH = `<div class="fi-wrap"><div class="fi-lbl">Free:</div><button class="fi-btn" data-dir="-" data-i="${i}">−</button><div class="fi-ct">${fi}</div><button class="fi-btn" data-dir="+" data-i="${i}">+</button></div>`;
    let hintContent = '';
    if (a.inv) hintContent += `<strong style="color:var(--adv)">Invoke:</strong> ${a.inv}<br><br>`;
    if (a.cmp) hintContent += `<strong style="color:var(--danger)">Compel:</strong> ${a.cmp}`;
    if (a.inv || a.cmp) hintContent += '<br><br><em style="color:var(--muted)">Invoke: 1 FP for +2 or reroll. Compel: earn 1 FP, things get complicated.</em>';
    d.innerHTML = `<div class="asp-ty">${a.ty}</div><div class="asp-nm">${a.nm}</div><div class="asp-chips">${chips}${fiH}</div>${hintContent ? `<div class="asp-toggle" data-i="${i}">▸ When to use</div><div class="asp-hint" id="ah-${i}">${hintContent}</div>` : ''}`;
    d.querySelectorAll('.fi-btn').forEach(b => b.onclick = (e) => {
      e.stopPropagation(); const idx = +b.dataset.i;
      S.fi[idx] = Math.max(0, (S.fi[idx]||0) + (b.dataset.dir === '+' ? 1 : -1)); saveLS(); rAspects();
      addLog(b.dataset.dir === '+' ? `Free invoke added: ${a.nm}` : `Free invoke spent: ${a.nm}`);
    });
    const tog = d.querySelector('.asp-toggle');
    if (tog) tog.onclick = () => { const h = $('ah-' + i); h.classList.toggle('on'); tog.textContent = h.classList.contains('on') ? '▾ When to use' : '▸ When to use'; };
    w.appendChild(d);
  });
}

// ─── GUIDE ───
function rGuide() {
  const w = $('guideC'); w.innerHTML = '';
  GUIDE_CARDS.forEach((card, i) => {
    const d = document.createElement('div'); d.className = 'guide-card'; d.id = 'gc-' + i;
    d.innerHTML = `<div class="guide-h" onclick="togColl('gc-${i}')"><div class="guide-t">${card.title}</div><div class="guide-ch">▾</div></div><div class="guide-b">${card.body.replace(/\n/g,'<br>')}</div>`;
    w.appendChild(d);
  });
}

// ─── COLLAPSIBLE / RESET / CONFIRM ───
function togColl(id)    { $(id).classList.toggle('open'); }
function resetScene()   { const c = CHARS[CK]; c.stunts.forEach(s => S.moves[s.id] = false); saveLS(); rMoves(); addLog('Scene reset'); }
function confirmReset() { showCfm("Start a new session?", "All stress, fate points and consequences reset. The debt collectors stay.", () => { const c = CHARS[CK]; S.fp = c.refresh; S.stress.phys.fill(false); S.stress.ment.fill(false); Object.keys(S.moves).forEach(k => S.moves[k] = false); Object.keys(S.cons).forEach(k => S.cons[k] = null); Object.keys(S.fi).forEach(k => S.fi[k] = 0); if (S.corruption) S.corruption.fill(false); S.log = []; saveLS(); renderAll(); addLog('New session started'); }); }
const LOGOUT_LINES = [
  ["Abandoning post?", "Harry's running on autopilot. Don't blame us if he lands in a sun."],
  ["Stepping out?", "The cargo won't smuggle itself. Probably."],
  ["Leaving already?", "We'll tell the authorities you were never here."],
  ["Deserting the crew?", "Bold move. Harry's already locked you out of the good bunk."],
  ["Going dark?", "Comms cut. Black box wiped. Standard procedure."],
  ["Jettisoning yourself?", "No refunds on the airlock."],
  ["Running from something?", "Smart. We'd run too."],
  ["Logging off?", "Your tab at the docking bar is still open, by the way."],
  ["Clocking out?", "Fine. But if we die out here it's on you."],
  ["Bailing?", "Your cut of the cargo stays. The debt doesn't."],
];

function randomLogoutLine() { return LOGOUT_LINES[Math.floor(Math.random() * LOGOUT_LINES.length)]; }
let cfmAnim = null;
function startCircuit() {
  const canvas = $('cfmCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();

  const GRID = 28;
  const cols = Math.ceil(canvas.width / GRID) + 1;
  const rows = Math.ceil(canvas.height / GRID) + 1;

  // Build a random circuit grid — nodes and traces
  const nodes = [];
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      if (Math.random() < 0.18) nodes.push({ x, y });
    }
  }

  // Traces: horizontal and vertical segments between nearby nodes
  const traces = [];
  for (let i = 0; i < 180; i++) {
    const x = Math.floor(Math.random() * cols);
    const y = Math.floor(Math.random() * rows);
    const horiz = Math.random() > 0.5;
    const len = Math.floor(Math.random() * 5) + 2;
    traces.push({ x, y, horiz, len, px: x * GRID, py: y * GRID });
  }

  // Pulses travelling along traces
  const pulses = [];
  function spawnPulse() {
    const t = traces[Math.floor(Math.random() * traces.length)];
    pulses.push({ trace: t, progress: 0, speed: 0.008 + Math.random() * 0.012, alpha: 0.9 });
  }
  for (let i = 0; i < 12; i++) spawnPulse();

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw traces
    traces.forEach(t => {
      const ex = t.horiz ? (t.x + t.len) * GRID : t.x * GRID;
      const ey = t.horiz ? t.y * GRID : (t.y + t.len) * GRID;
      ctx.beginPath();
      ctx.moveTo(t.px, t.py);

      // L-shaped trace with a corner turn
      if (Math.random() < 0.001) { /* occasional reroute */ }
      const midX = t.horiz ? ex : t.px;
      const midY = t.horiz ? t.py : ey;
      ctx.lineTo(midX, midY);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = accent;
      ctx.globalAlpha = 0.08;
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Draw nodes (pads)
    ctx.globalAlpha = 0.15;
    nodes.forEach(n => {
      ctx.beginPath();
      ctx.arc(n.x * GRID, n.y * GRID, 3, 0, Math.PI * 2);
      ctx.fillStyle = accent;
      ctx.fill();
      // Outer ring
      ctx.beginPath();
      ctx.arc(n.x * GRID, n.y * GRID, 6, 0, Math.PI * 2);
      ctx.strokeStyle = accent;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    });

    // Draw pulses
    pulses.forEach((p, idx) => {
      p.progress += p.speed;
      if (p.progress >= 1) { pulses.splice(idx, 1); spawnPulse(); return; }

      const t = p.trace;
      const ex = t.horiz ? (t.x + t.len) * GRID : t.x * GRID;
      const ey = t.horiz ? t.y * GRID : (t.y + t.len) * GRID;
      const px = t.px + (ex - t.px) * p.progress;
      const py = t.py + (ey - t.py) * p.progress;

      const grd = ctx.createRadialGradient(px, py, 0, px, py, 10);
      grd.addColorStop(0, accent);
      grd.addColorStop(1, 'transparent');
      ctx.globalAlpha = p.alpha * (1 - p.progress * 0.5);
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      // Tail glow
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = 0.6 * (1 - p.progress);
      ctx.fill();
    });

    ctx.globalAlpha = 1;
    cfmAnim = requestAnimationFrame(draw);
  }
  draw();
}

function stopCircuit() {
  if (cfmAnim) { cancelAnimationFrame(cfmAnim); cfmAnim = null; }
  const canvas = $('cfmCanvas');
  if (canvas) { const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); }
}

function showCfm(t, sub, fn) { $('cfmT').textContent = t; $('cfmSub').textContent = sub || ''; $('cfmY').onclick = () => { $('cfm').classList.remove('on'); stopCircuit(); fn(); }; $('cfm').classList.add('on'); startCircuit(); }
function cancelCfm()    { $('cfm').classList.remove('on'); stopCircuit(); }

// ─── GM VIEW ───
function openGM()  { $('login').classList.add('off'); $('gm').classList.add('on'); rGMTabs(); rGMAspects(); rGMSkills(); rGMMoves(); rGMRules(); }
function closeGM() { $('gm').classList.remove('on'); $('login').classList.remove('off'); }

function rGMTabs() {
  const w = $('gmTabs'); w.innerHTML = '';
  ['aspects','skills','moves','rules'].forEach((t, i) => {
    const b = document.createElement('button'); b.className = 'tab' + (i === 0 ? ' on' : '');
    b.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    b.onclick = () => {
      w.querySelectorAll('.tab').forEach((tb,j) => tb.classList.toggle('on', j === i));
      ['gm-aspects','gm-skills','gm-moves','gm-rules'].forEach(id => $(id).classList.remove('on'));
      $('gm-' + t).classList.add('on');
    };
    w.appendChild(b);
  });
}

function rGMAspects() {
  const w = $('gmAspC'); w.innerHTML = '';
  Object.entries(CHARS).forEach(([k,c]) => {
    const h = document.createElement('div'); h.className = 'gm-char'; h.textContent = c.displayName; w.appendChild(h);
    c.aspects.forEach(a => {
      if (!a.nm) return;
      const d = document.createElement('div'); d.className = 'gm-asp';
      const hasCmp = !!a.cmp;
      d.innerHTML = `<div class="gm-asp-ty">${a.ty}</div><div class="gm-asp-nm">${a.nm}</div>${hasCmp ? `<div class="gm-asp-cmp" onclick="this.nextElementSibling.classList.toggle('on');this.textContent=this.nextElementSibling.classList.contains('on')?'▾ Compel details':'▸ Compel options'">▸ Compel options</div><div class="gm-asp-detail">${a.cmp}</div>` : ''}`;
      w.appendChild(d);
    });
  });
}

function rGMSkills() {
  const w = $('gmSkC'); w.innerHTML = '';
  GROUPS.forEach(gr => {
    const skills = Object.entries(SM).filter(([k,v]) => v.g === gr).map(([k]) => k);
    if (!skills.length) return;
    const h = document.createElement('div'); h.className = 'gm-char'; h.textContent = gr; w.appendChild(h);
    const tbl = document.createElement('table'); tbl.className = 'gm-sktbl';
    tbl.innerHTML = '<thead><tr><th>Skill</th><th>Cap</th><th>How</th><th>Tho</th><th>Harry</th></tr></thead>';
    const tbody = document.createElement('tbody');
    skills.forEach(sk => {
      const ps = PS[sk] || {}, vals = [ps.Cap||0, ps.Howard||0, ps.Thowra||0], harry = HS[sk], best = Math.max(...vals);
      const tr = document.createElement('tr'), restrict = TR[sk];
      if (restrict) tr.className = 'restrict';
      let harryTd = harry ? `<td class="num md">+${harry.rt}</td>` : '<td class="num lo">—</td>';
      tr.innerHTML = `<td>${sk}</td>${vals.map(v => { const tier = v>=3?'hi':v>=2?'md':'lo', isBest = v===best&&v>0?'best':''; return `<td class="num ${tier} ${isBest}">+${v}</td>`; }).join('')}${harryTd}`;
      tbody.appendChild(tr);
      if (restrict) { const rr = document.createElement('tr'); rr.className = 'restrict'; rr.innerHTML = `<td colspan="5" style="font-size:12px;padding:2px 6px 6px">⚠ ${restrict}</td>`; tbody.appendChild(rr); }
    });
    tbl.appendChild(tbody); w.appendChild(tbl);
  });
  const hh = document.createElement('div'); hh.className = 'gm-char'; hh.textContent = 'Harry the Hauler'; w.appendChild(hh);
  const htbl = document.createElement('table'); htbl.className = 'gm-sktbl';
  htbl.innerHTML = '<thead><tr><th>Ship Skill</th><th>Mapped To</th><th>Rating</th></tr></thead>';
  const hbody = document.createElement('tbody');
  Object.entries(HS).forEach(([sk,v]) => { const tr = document.createElement('tr'); tr.innerHTML = `<td>${v.nm}</td><td>${sk}</td><td class="num md">+${v.rt}</td>`; hbody.appendChild(tr); });
  htbl.appendChild(hbody); w.appendChild(htbl);
  const tw = document.createElement('div'); tw.className = 'gm-tw-note';
  tw.innerHTML = '<strong>Teamwork rules:</strong> Highest skill leads. Each helper with +1 or more adds +1. Must be narratively justified. Alternative: helpers Create Advantage and pass free invokes.';
  w.appendChild(tw);
}

function rGMMoves() {
  const w = $('gmMvC'); w.innerHTML = '';
  Object.entries(CHARS).forEach(([k,c]) => {
    const h = document.createElement('div'); h.className = 'gm-char'; h.textContent = c.displayName; w.appendChild(h);
    [...c.stunts, ...c.extras].forEach(m => {
      const d = document.createElement('div');
      d.className = 'gm-mv' + (m.sty === 'danger' ? ' danger' : m.sty === 'wild' ? ' wild' : '');
      d.innerHTML = `<div class="gm-mv-nm">${m.nm}</div><div class="gm-mv-meta">${m.sk} · ${m.fr}${m.corr ? ' · marks corruption' : ''}</div><div class="gm-mv-desc">${m.desc}</div>`;
      w.appendChild(d);
    });
    if (!c.stunts.length && !c.extras.length) {
      const n = document.createElement('div'); n.className = 'gm-mv'; n.innerHTML = '<div class="gm-mv-desc">No confirmed stunts yet.</div>'; w.appendChild(n);
    }
  });
}

function rGMRules() {
  const w = $('gmRuC'); w.innerHTML = '';
  const rules = [
    '<strong>Survival replaces Notice.</strong> Covers environmental awareness, food/water, field medicine, noticing danger. Investigate is the fallback for notice checks.',
    '<strong>Will = willpower only.</strong> Intelligence checks use the highest Academics skill (Engineering, Medicine, Science, Culture).',
    '<strong>Gunnery removed.</strong> Engineering for weapon knowledge, Shoot for operation.',
    '<strong>Assets is a group skill</strong> — not on individual character sheets.',
    '<strong>Teamwork must be narratively justified.</strong> "I help" is not enough.',
    '<strong>Survival counts as +1 Medicine</strong> for first aid purposes.',
    '<strong>Empathy teamwork</strong> for healing purposes only.',
    '<strong>Stealth cannot physically teamwork</strong> — providing instructions is OK.',
    '<strong>Will and Drive cannot teamwork.</strong>',
    '<strong>Pilot cannot teamwork between PCs</strong> — only with Harry the Hauler.'
  ];
  rules.forEach(r => { const d = document.createElement('div'); d.className = 'gm-rule'; d.innerHTML = r; w.appendChild(d); });
  const cr = document.createElement('div'); cr.className = 'gm-char'; cr.textContent = 'Consequence Recovery'; w.appendChild(cr);
  const recRules = [
    '<strong>Mild (2 shifts)</strong> — Clear with Fair (+2) overcome after 1 scene.',
    '<strong>Moderate (4 shifts)</strong> — Clear with Great (+4) overcome after 1 session.',
    '<strong>Severe (6 shifts)</strong> — Clear with Fantastic (+6) overcome after 1 scenario.',
    '<strong>Physical consequences</strong> healed with Medicine. <strong>Mental consequences</strong> healed with Empathy (counsel).',
    '<strong>Remember:</strong> Consequences are aspects. You can invoke them against the character who has them.'
  ];
  recRules.forEach(r => { const d = document.createElement('div'); d.className = 'gm-rule'; d.innerHTML = r; w.appendChild(d); });
}

// ─── STAR FIELD + SHIP FLYBY ───
function initStars() {
  const c = $('stars'), ctx = c.getContext('2d');
  let w, h, stars = [];

  // Ship state
  const ship = { active: false, x: 0, y: 0, size: 1, speed: 0, opacity: 0 };
  let nextShip = 15 + Math.random() * 8; // seconds until first flyby

  function resize() {
    w = c.width = c.offsetWidth;
    h = c.height = c.offsetHeight;
    stars = [];
    for (let i = 0; i < 100; i++) stars.push({
      x: Math.random()*w, y: Math.random()*h,
      r: Math.random()*1.4+.3,
      s: Math.random()*.2+.03,
      a: Math.random(),
      twinkle: Math.random() * Math.PI * 2
    });
  }

  // Draw a freighter silhouette at (x, y) with given size + opacity
  function drawShip(x, y, size, opacity) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(x, y);
    ctx.scale(size, size);

    const col = 'rgba(160,185,200,1)';
    const dark = 'rgba(80,100,115,1)';

    ctx.fillStyle = col;

    // Main hull — wide flat body
    ctx.beginPath();
    ctx.rect(-40, -6, 72, 14);
    ctx.fill();

    // Nose — tapered front
    ctx.beginPath();
    ctx.moveTo(32, -6);
    ctx.lineTo(48, -2);
    ctx.lineTo(48, 2);
    ctx.lineTo(32, 6);
    ctx.closePath();
    ctx.fill();

    // Cockpit — raised section on top front
    ctx.beginPath();
    ctx.rect(8, -13, 22, 8);
    ctx.fill();

    // Cockpit window — dark
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.rect(14, -11, 10, 5);
    ctx.fill();
    ctx.fillStyle = col;

    // Top turret bump
    ctx.beginPath();
    ctx.rect(-5, -10, 10, 5);
    ctx.fill();

    // Underbelly — lower cargo section
    ctx.beginPath();
    ctx.rect(-30, 6, 45, 8);
    ctx.fill();

    // Landing gear bumps
    ctx.fillStyle = dark;
    ctx.beginPath();
    ctx.rect(-22, 14, 6, 4);
    ctx.fill();
    ctx.beginPath();
    ctx.rect(2, 14, 6, 4);
    ctx.fill();
    ctx.fillStyle = col;

    // Rear engine block
    ctx.beginPath();
    ctx.rect(-52, -8, 14, 18);
    ctx.fill();

    // Engine glow — blue/white
    const grd = ctx.createRadialGradient(-54, 0, 0, -54, 0, 14);
    grd.addColorStop(0, 'rgba(140,200,255,0.95)');
    grd.addColorStop(0.3, 'rgba(80,140,255,0.5)');
    grd.addColorStop(1, 'rgba(40,80,200,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.ellipse(-54, 0, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Engine trail
    const trail = ctx.createLinearGradient(-54, 0, -90, 0);
    trail.addColorStop(0, 'rgba(100,180,255,0.25)');
    trail.addColorStop(1, 'rgba(60,120,255,0)');
    ctx.fillStyle = trail;
    ctx.beginPath();
    ctx.moveTo(-54, -5);
    ctx.lineTo(-90, -1);
    ctx.lineTo(-90, 1);
    ctx.lineTo(-54, 5);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  let last = 0;
  function draw(ts) {
    const dt = last ? (ts - last) / 1000 : 0;
    last = ts;

    ctx.clearRect(0, 0, w, h);

    // Stars — slightly brighter
    stars.forEach(s => {
      s.y -= s.s;
      s.twinkle += .004;
      if (s.y < -2) { s.y = h + 2; s.x = Math.random() * w; }
      const alpha = .25 + Math.sin(s.twinkle) * .18;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(210,220,235,${alpha})`;
      ctx.fill();
    });

    // Ship flyby
    nextShip -= dt;
    if (nextShip <= 0 && !ship.active) {
      ship.active = true;
      ship.x = -120;
      ship.y = h * (0.15 + Math.random() * 0.65);
      ship.size = 0.12 + Math.random() * 0.06;
      ship.speed = w / (4 + Math.random() * 3); // px/sec — crosses in ~4-7s
      ship.opacity = 0;
      nextShip = 15 + Math.random() * 8;
    }
    if (ship.active) {
      ship.x += ship.speed * dt;
      // Fade in at start, fade out near end
      const progress = ship.x / (w + 60);
      ship.opacity = progress < 0.1 ? progress * 10 * 0.55
                   : progress > 0.85 ? (1 - progress) / 0.15 * 0.55
                   : 0.55;
      drawShip(ship.x, ship.y, ship.size, ship.opacity);
      if (ship.x > w + 120) ship.active = false;
    }

    requestAnimationFrame(draw);
  }

  resize();
  requestAnimationFrame(draw);
  window.addEventListener('resize', resize);
}

// ─── BOOT ───
rLogin();
initStars();
