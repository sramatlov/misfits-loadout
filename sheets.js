// ─── GOOGLE SHEETS SYNC ───
// PC_app data via Apps Script (live, no CDN cache)
// Best_app via published CSV (less time-critical, slower is OK)

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwF5fFENMjXTrA92VDZoYXqvAduw5lEZ07fTkeLGRyP2uTPbQKt8iw5cNLGmtkj9gi11A/exec';
const BEST_APP_URL    = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSM4t7tbXZbDcph1wFRn8Et5sjFsOqBjTEqreYSDq2vMMB8LB2XzW4Sq-ju_E7iKdFeoiteqGxZI4Ap/pub?gid=1991436452&single=true&output=csv';

// ─── FETCH WITH TIMEOUT ───
async function fetchWithTimeout(url, ms = 10000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return res;
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

// ─── APPLY PC DATA ───
// characters = { cap: { field: value, ... }, howard: {...}, thowra: {...} }
function applyPCData(characters) {
  ['cap', 'howard', 'thowra'].forEach(k => {
    const c = CHARS[k];
    const d = characters[k];
    if (!c || !d) return;

    // Refresh
    const ref = parseInt(d.refresh);
    if (!isNaN(ref)) c.refresh = ref;

    // Skills
    const skillKeys = ['physique','athletics','will','rapport','deceive','provoke','empathy',
      'shoot','fight','survival','burglary','stealth','investigate','drive','pilot',
      'navigate','engineering','medicine','science','culture','contacts'];
    skillKeys.forEach(sk => {
      const v = parseInt(d[sk]);
      if (!isNaN(v)) c.skills[sk.charAt(0).toUpperCase() + sk.slice(1)] = v;
    });

    // Stress box counts
    const physBoxes = parseInt(d.physical_stress_boxes);
    const mentBoxes = parseInt(d.mental_stress_boxes);
    if (!isNaN(physBoxes)) c.stress.phys.boxes = physBoxes;
    if (!isNaN(mentBoxes)) c.stress.ment.boxes = mentBoxes;
    // Bonus slots for rendering (dashed boxes)
    c.stress.phys.bonus = (c.skills.Physique >= 3) ? 2 : (c.skills.Physique >= 1) ? 1 : 0;
    c.stress.ment.bonus = (c.skills.Will >= 3) ? 2 : (c.skills.Will >= 1) ? 1 : 0;

    // Pre-marked stress boxes
    c.stress.phys.preMarked = [];
    c.stress.ment.preMarked = [];
    [1,2,3,4].forEach(n => {
      if (String(d[`physical_stress_box${n}_filled`]) === '1') c.stress.phys.preMarked.push(n-1);
      if (String(d[`mental_stress_box${n}_filled`]) === '1') c.stress.ment.preMarked.push(n-1);
    });

    // Corruption
    const corrBoxes = parseInt(d.corruption_boxes);
    if (!isNaN(corrBoxes) && corrBoxes > 0) {
      c.corruption = Array(corrBoxes).fill(false);
      [1,2,3,4].forEach(n => {
        if (n <= corrBoxes && String(d[`corruption_box${n}_filled`]) === '1') c.corruption[n-1] = true;
      });
    } else {
      c.corruption = null;
    }

    // Consequences
    c.cons = [];
    [
      { key: 'consequence_mild',       lbl: 'Mild (2)',     abs: 2, rec: 'Fair (+2) · 1 scene' },
      { key: 'consequence_mild_extra', lbl: 'Mild (2)',     abs: 2, rec: 'Fair (+2) · 1 scene' },
      { key: 'consequence_moderate',   lbl: 'Moderate (4)', abs: 4, rec: 'Great (+4) · 1 session' },
      { key: 'consequence_severe',     lbl: 'Severe (6)',   abs: 6, rec: 'Fantastic (+6) · 1 scenario' },
    ].forEach(def => {
      c.cons.push({
        id:  `${k}_${def.key}`,
        lbl: def.lbl, abs: def.abs, rec: def.rec, src: 'base',
        val: d[def.key] || null
      });
    });

    // Aspects — update names, preserve inv/cmp from data.js
    const aspKeys = [
      { key: 'high_concept', ty: 'High Concept' },
      { key: 'trouble',      ty: 'Trouble' },
      { key: 'aspect_1',     ty: 'Aspect' },
      { key: 'aspect_2',     ty: 'Aspect' },
      { key: 'aspect_3',     ty: 'Aspect' },
    ];
    const sheetAspects = aspKeys.filter(a => d[a.key]).map(a => ({ ty: a.ty, nm: d[a.key] }));
    sheetAspects.forEach((sa, i) => {
      if (c.aspects[i]) { c.aspects[i].nm = sa.nm; c.aspects[i].ty = sa.ty; }
      else c.aspects.push({ ty: sa.ty, nm: sa.nm, inv: null, cmp: null });
    });
    if (sheetAspects.length < c.aspects.length) c.aspects = c.aspects.slice(0, sheetAspects.length);

    // Stunts
    [1,2,3,4,5].forEach((n, i) => {
      const raw = d[`stunt_${n}`];
      if (raw && c.stunts[i]) {
        const p = parseStuntStr(raw);
        c.stunts[i].nm = p.nm;
        if (p.sk) c.stunts[i].sk = p.sk;
        if (p.fr) c.stunts[i].fr = p.fr;
        if (p.desc) c.stunts[i].desc = p.desc;
      }
    });

    // Extras
    [1,2,3].forEach((n, i) => {
      const raw = d[`extra_${n}`];
      if (raw && c.extras[i]) {
        const p = parseStuntStr(raw);
        c.extras[i].nm = p.nm;
        if (p.sk) c.extras[i].sk = p.sk;
        if (p.fr) c.extras[i].fr = p.fr;
        if (p.desc) c.extras[i].desc = p.desc;
      }
    });
  });
}

// ─── BEST_APP (CSV — less time-critical) ───
function parseCSV(text) {
  const rows = [];
  let cur = '', inQ = false, row = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { inQ = !inQ; }
    else if (c === ',' && !inQ) { row.push(cur.trim()); cur = ''; }
    else if ((c === '\n' || c === '\r') && !inQ) {
      if (cur.trim() || row.length) { row.push(cur.trim()); rows.push(row); }
      cur = ''; row = [];
      if (c === '\r' && text[i+1] === '\n') i++;
    } else { cur += c; }
  }
  if (cur.trim() || row.length) { row.push(cur.trim()); rows.push(row); }
  return rows;
}

function applyBestData(rows) {
  window.BEST = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    const sk = row[0].toLowerCase();
    const indep = parseInt(row[1]);
    const team  = (row[2] === 'x' || row[2] === 'X') ? null : parseInt(row[2]);
    window.BEST[sk] = {
      best: isNaN(indep) ? null : indep,
      teamwork: isNaN(team) ? null : team
    };
  }
}

// Parse stunt string: "Name [Skill, freq]: description"
function parseStuntStr(str) {
  const m = str.match(/^(.+?)\s*\[([^,\]]+),?\s*([^\]]*)\]\s*[:\-]?\s*(.*)$/s);
  if (!m) return { nm: str.split('\n')[0].trim(), sk: '', fr: '', desc: str };
  return { nm: m[1].trim(), sk: m[2].trim(), fr: m[3].trim(), desc: m[4].trim() };
}

// ─── MAIN FETCH ───
async function fetchBoth() {
  // PC data from Apps Script (live), Best data from CSV (background, less critical)
  const pcRes = await fetchWithTimeout(APPS_SCRIPT_URL);
  if (!pcRes) return null;
  try {
    const json = await pcRes.json();
    if (!json.ok) return null;
    // Fetch Best_app in parallel but don't block on it
    fetchWithTimeout(BEST_APP_URL + '&t=' + Date.now(), 8000).then(res => {
      if (res) res.text().then(text => applyBestData(parseCSV(text)));
    });
    return json.characters;
  } catch { return null; }
}

function updateSyncStatus(state) {
  const el = document.getElementById('syncStatus');
  const s = {
    syncing: ['↻', 'Syncing...', 'var(--muted)'],
    ok:      ['✓', 'Data synced', 'var(--adv)'],
    err:     ['✕', 'Offline — local data', 'var(--danger)']
  }[state];
  if (el) el.innerHTML = `<span style="color:${s[2]}">${s[0]} ${s[1]}</span>`;
}
