// ─── GOOGLE SHEETS LIVE SYNC ───
// Reads two clean CSV tabs: PC_app (character data) and Best_app (teamwork data)
// Structure: col A = field key, col B = cap, col C = howard, col D = thowra

const PC_APP_URL   = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSM4t7tbXZbDcph1wFRn8Et5sjFsOqBjTEqreYSDq2vMMB8LB2XzW4Sq-ju_E7iKdFeoiteqGxZI4Ap/pub?gid=1437179692&single=true&output=csv';
const BEST_APP_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSM4t7tbXZbDcph1wFRn8Et5sjFsOqBjTEqreYSDq2vMMB8LB2XzW4Sq-ju_E7iKdFeoiteqGxZI4Ap/pub?gid=1991436452&single=true&output=csv';

const SHEET_CACHE_KEY = 'misfits-sheet-cache';
const SHEET_CACHE_TTL = 1000 * 60 * 30; // 30 min

// ─── CSV PARSER ───
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

// Convert CSV rows to a key→{cap,howard,thowra} map
function csvToMap(rows) {
  const map = {};
  // Row 0 is header: field, cap, howard, thowra
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    map[row[0]] = {
      cap:    row[1] || '',
      howard: row[2] || '',
      thowra: row[3] || ''
    };
  }
  return map;
}

// ─── APPLY PC_APP DATA ───
function applyPCData(map) {
  ['cap', 'howard', 'thowra'].forEach(k => {
    const c = CHARS[k];
    if (!c) return;

    // Refresh
    const ref = parseInt(map.refresh?.[k]);
    if (!isNaN(ref)) c.refresh = ref;

    // Skills
    const skillKeys = ['physique','athletics','will','rapport','deceive','provoke','empathy',
      'shoot','fight','survival','burglary','stealth','investigate','drive','pilot',
      'navigate','engineering','medicine','science','culture','contacts'];
    skillKeys.forEach(sk => {
      if (map[sk]) {
        const v = parseInt(map[sk][k]);
        if (!isNaN(v)) c.skills[sk.charAt(0).toUpperCase() + sk.slice(1)] = v;
      }
    });
    // Rapport edge case — sheet key is lowercase
    if (map.rapport) {
      const v = parseInt(map.rapport[k]);
      if (!isNaN(v)) c.skills.Rapport = v;
    }

    // Stress box counts from sheet (not inferred from skills anymore)
    const physBoxes = parseInt(map.physical_stress_boxes?.[k]);
    const mentBoxes = parseInt(map.mental_stress_boxes?.[k]);
    if (!isNaN(physBoxes)) c.stress.phys.boxes = physBoxes;
    if (!isNaN(mentBoxes)) c.stress.ment.boxes = mentBoxes;

    // Pre-marked stress boxes from sheet
    c.stress.phys.preMarked = [];
    c.stress.ment.preMarked = [];
    [1,2,3,4].forEach(n => {
      if (map[`physical_stress_box${n}_filled`]?.[k] === '1') c.stress.phys.preMarked.push(n-1);
      if (map[`mental_stress_box${n}_filled`]?.[k] === '1') c.stress.ment.preMarked.push(n-1);
    });

    // Corruption
    const corrBoxes = parseInt(map.corruption_boxes?.[k]);
    if (!isNaN(corrBoxes) && corrBoxes > 0) {
      c.corruption = Array(corrBoxes).fill(false);
      [1,2,3,4].forEach(n => {
        if (n <= corrBoxes && map[`corruption_box${n}_filled`]?.[k] === '1') {
          c.corruption[n-1] = true;
        }
      });
    } else {
      c.corruption = null;
    }

    // Consequences
    c.cons = [];
    const conDefs = [
      { key: 'consequence_mild',       lbl: 'Mild (2)',     abs: 2, rec: 'Fair (+2) · 1 scene' },
      { key: 'consequence_mild_extra', lbl: 'Mild (2)',     abs: 2, rec: 'Fair (+2) · 1 scene' },
      { key: 'consequence_moderate',   lbl: 'Moderate (4)', abs: 4, rec: 'Great (+4) · 1 session' },
      { key: 'consequence_severe',     lbl: 'Severe (6)',   abs: 6, rec: 'Fantastic (+6) · 1 scenario' },
    ];
    conDefs.forEach((def, i) => {
      if (map[def.key] !== undefined) {
        c.cons.push({
          id:  `${k}_${def.key}`,
          lbl: def.lbl,
          abs: def.abs,
          rec: def.rec,
          src: 'base',
          val: map[def.key][k] || null
        });
      }
    });

    // Aspects — update names, preserve inv/cmp from data.js
    const aspKeys = ['high_concept','trouble','aspect_1','aspect_2','aspect_3'];
    const aspTypes = { high_concept:'High Concept', trouble:'Trouble',
                       aspect_1:'Aspect', aspect_2:'Aspect', aspect_3:'Aspect' };
    const sheetAspects = aspKeys
      .filter(ak => map[ak]?.[k])
      .map(ak => ({ ty: aspTypes[ak], nm: map[ak][k] }));

    sheetAspects.forEach((sa, i) => {
      if (c.aspects[i]) { c.aspects[i].nm = sa.nm; c.aspects[i].ty = sa.ty; }
      else c.aspects.push({ ty: sa.ty, nm: sa.nm, inv: null, cmp: null });
    });
    if (sheetAspects.length < c.aspects.length) c.aspects = c.aspects.slice(0, sheetAspects.length);

    // Extras
    [1,2,3].forEach((n, i) => {
      const raw = map[`extra_${n}`]?.[k];
      if (raw && c.extras[i]) {
        const p = parseStuntStr(raw);
        c.extras[i].nm = p.nm;
        if (p.sk) c.extras[i].sk = p.sk;
        if (p.fr) c.extras[i].fr = p.fr;
        if (p.desc) c.extras[i].desc = p.desc;
      }
    });

    // Stunts
    [1,2,3,4,5].forEach((n, i) => {
      const raw = map[`stunt_${n}`]?.[k];
      if (raw && c.stunts[i]) {
        const p = parseStuntStr(raw);
        c.stunts[i].nm = p.nm;
        if (p.sk) c.stunts[i].sk = p.sk;
        if (p.fr) c.stunts[i].fr = p.fr;
        if (p.desc) c.stunts[i].desc = p.desc;
      }
    });
  });
}

// ─── APPLY BEST_APP DATA ───
function applyBestData(rows) {
  // rows[0] = ['field', 'Best independant', 'Best Teamwork']
  // rows[1..] = [skill, best_indep_value, best_teamwork_value]
  window.BEST = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row[0]) continue;
    const sk = row[0].toLowerCase();
    const indep = parseInt(row[1]);
    const team  = row[2] === 'x' || row[2] === 'X' ? null : parseInt(row[2]);
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

// ─── FETCH WITH TIMEOUT ───
async function fetchCSV(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(url + '&t=' + Date.now(), { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    clearTimeout(timeout);
    return null;
  }
}

// ─── MAIN SYNC ───
async function syncFromSheet(showStatus, forceRefresh = false) {
  if (showStatus) updateSyncStatus('syncing');

  // Try cache first unless forced
  if (!forceRefresh) {
    const cached = loadSheetCache();
    if (cached) {
      applyCache(cached);
      if (showStatus) updateSyncStatus('ok');
      // Refresh in background
      fetchBoth().then(data => { if (data) { saveSheetCache(data); applyCache(data); if (typeof reinitAllChars === 'function') reinitAllChars(); } });
      return true;
    }
  }

  // Fetch fresh
  const data = await fetchBoth();
  if (data) {
    saveSheetCache(data);
    applyCache(data);
    if (showStatus) updateSyncStatus('ok');
    return true;
  }

  // Fallback to stale cache
  const stale = loadSheetCache(true);
  if (stale) { applyCache(stale); if (showStatus) updateSyncStatus('err'); return true; }
  if (showStatus) updateSyncStatus('err');
  return false;
}

async function fetchBoth() {
  const [pcText, bestText] = await Promise.all([fetchCSV(PC_APP_URL), fetchCSV(BEST_APP_URL)]);
  if (!pcText) return null;
  return { pc: parseCSV(pcText), best: bestText ? parseCSV(bestText) : null };
}

function applyCache(data) {
  if (data.pc)   applyPCData(csvToMap(data.pc));
  if (data.best) applyBestData(data.best);
}

function saveSheetCache(data) {
  try { localStorage.setItem(SHEET_CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

function loadSheetCache(allowStale = false) {
  try {
    const raw = localStorage.getItem(SHEET_CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (!allowStale && Date.now() - ts > SHEET_CACHE_TTL) return null;
    return data;
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
