// ─── GOOGLE SHEETS LIVE SYNC ───
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSM4t7tbXZbDcph1wFRn8Et5sjFsOqBjTEqreYSDq2vMMB8LB2XzW4Sq-ju_E7iKdFeoiteqGxZI4Ap/pub?gid=1927055028&single=true&output=csv';

// Each character's starting column (0-based)
const CHAR_COL = { cap: 2, howard: 11, thowra: 20 };

// Stress box columns are at offsets +0, +2, +4, +6 from char col
const STRESS_OFFSETS = [0, 2, 4, 6];

// Skill label → data.js key mapping
const SKILL_MAP = {
  'physique': 'Physique', 'athletics': 'Athletics', 'will': 'Will',
  'rapport (charm)': 'Rapport', 'rapport': 'Rapport',
  'deceive': 'Deceive', 'provoke': 'Provoke', 'empathy': 'Empathy',
  'contacts (resource)': 'Contacts', 'contacts': 'Contacts',
  'shoot': 'Shoot', 'fight': 'Fight', 'survival': 'Survival',
  'burglary': 'Burglary', 'stealth': 'Stealth', 'investigate': 'Investigate',
  'drive': 'Drive', 'pilot': 'Pilot',
  'navigate (vehicle)': 'Navigate', 'navigate': 'Navigate',
  'engineering': 'Engineering', 'medicine': 'Medicine',
  'science': 'Science', 'culture': 'Culture'
};

const CON_MAP = {
  '(2) mild':       { lbl: 'Mild (2)',     abs: 2, rec: 'Fair (+2) · 1 scene' },
  '(2) mild extra': { lbl: 'Mild (2)',     abs: 2, rec: 'Fair (+2) · 1 scene' },
  '(4) moderate':   { lbl: 'Moderate (4)', abs: 4, rec: 'Great (+4) · 1 session' },
  '(6) severe':     { lbl: 'Severe (6)',   abs: 6, rec: 'Fantastic (+6) · 1 scenario' }
};

const ASP_TYPE_MAP = {
  'high concept': 'High Concept', 'trouble': 'Trouble',
  'aspect': 'Aspect', 'extra': 'Extra'
};

// ─── CSV PARSER ───
function parseCSV(text) {
  const rows = [];
  let cur = '', inQ = false, row = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { inQ = !inQ; }
    else if (c === ',' && !inQ) { row.push(cur); cur = ''; }
    else if ((c === '\n' || c === '\r') && !inQ) {
      row.push(cur); rows.push(row); cur = ''; row = [];
      if (c === '\r' && text[i+1] === '\n') i++;
    } else { cur += c; }
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

function cv(row, col) {
  return (row && col < row.length) ? (row[col] || '').trim() : '';
}

// ─── PARSE ONE CHARACTER FROM ROWS ───
function parseChar(rows, key) {
  const col = CHAR_COL[key];
  const out = { skills: {}, cons: [], aspects: [], stuntsRaw: [], extrasRaw: [] };

  rows.forEach((row, ri) => {
    const label = cv(row, 0).toLowerCase();

    // Refresh
    if (label === 'fortitude' || cv(row, col).toLowerCase().includes('refresh')) {
      const m = cv(row, col).match(/(\d+)/);
      if (m) out.refresh = parseInt(m[1]);
    }

    // Skills
    const sk = SKILL_MAP[label];
    if (sk) {
      const v = cv(row, col);
      out.skills[sk] = (v !== '' && !isNaN(parseFloat(v))) ? parseInt(parseFloat(v)) : 0;
    }

    // Stress tracks row (row 39) just shows box labels 1,2,3,4 — not meaningful
    // Box counts are derived from Physique/Will skill ratings per Fate Core rules

    // Physical stress — X markers mean pre-marked boxes
    if (label === 'physical') {
      out.physMarked = [];
      STRESS_OFFSETS.forEach((off, idx) => {
        if (cv(row, col + off).toUpperCase() === 'X') out.physMarked.push(idx);
      });
    }

    // Mental stress — X markers mean pre-marked boxes
    if (label === 'mental') {
      out.mentMarked = [];
      STRESS_OFFSETS.forEach((off, idx) => {
        if (cv(row, col + off).toUpperCase() === 'X') out.mentMarked.push(idx);
      });
    }

    // Corruption — X markers = pre-marked boxes; only Howard has a corruption track
    if (label === 'corruption') {
      const marked = [];
      STRESS_OFFSETS.forEach((off, idx) => {
        if (cv(row, col + off).toUpperCase() === 'X') marked.push(idx);
      });
      out.hasCorrTrk = (key === 'howard');  // hardcoded — only Howard has corruption
      out.corrMarked = marked;
    }

    // Consequences
    if (CON_MAP[label]) {
      const def = CON_MAP[label];
      out.cons.push({ id: `${key}_con_${ri}`, lbl: def.lbl, abs: def.abs, rec: def.rec, src: 'base', val: cv(row, col) || null });
    }

    // Aspects
    if (ASP_TYPE_MAP[label]) {
      const nm = cv(row, col);
      if (nm) out.aspects.push({ ty: ASP_TYPE_MAP[label], nm });
    }

    // Stunts section — track by label markers
    if (label === 'stunts') { out._inStunts = true; out._inExtras = false; }
    if (label === 'description' || label === 'notes') { out._inStunts = false; out._inExtras = false; }
    if (label === 'extra' && out._inStunts) { out._inExtras = true; }

    if (out._inStunts && label === '') {
      const v = cv(row, col);
      if (v) {
        if (out._inExtras) out.extrasRaw.push(v);
        else out.stuntsRaw.push(v);
      }
    }
  });

  return out;
}

// Parse a stunt string: "Name [Skill, freq]: description"
function parseStuntStr(str) {
  const m = str.match(/^(.+?)\s*\[([^,\]]+),?\s*([^\]]*)\]\s*[:\-]?\s*(.*)$/);
  if (!m) return { nm: str, sk: '', fr: '', desc: str };
  return {
    nm: m[1].trim(),
    sk: m[2].trim(),
    fr: m[3].trim(),
    desc: m[4].trim()
  };
}

function applySheetData(key, parsed) {
  const c = CHARS[key];
  if (!c) return;

  if (parsed.refresh) c.refresh = parsed.refresh;

  if (Object.keys(parsed.skills).length) Object.assign(c.skills, parsed.skills);

  // Stress box counts from Fate Core rules
  const phys = c.skills.Physique || 0;
  const will = c.skills.Will || 0;
  c.stress.phys.boxes = phys >= 3 ? 4 : phys >= 1 ? 3 : 2;
  c.stress.ment.boxes = will >= 3 ? 4 : will >= 1 ? 3 : 2;
  c.stress.phys.bonus = phys >= 3 ? 2 : phys >= 1 ? 1 : 0;
  c.stress.ment.bonus = will >= 3 ? 2 : will >= 1 ? 1 : 0;

  if (parsed.physMarked) c.stress.phys.preMarked = parsed.physMarked;
  if (parsed.mentMarked) c.stress.ment.preMarked = parsed.mentMarked;

  // Corruption track — reset to sheet state, then apply X markers
  if (parsed.corrMarked !== undefined) {
    if (parsed.hasCorrTrk) {
      // Reset to empty, then mark only what the sheet shows
      const corrCount = 4;
      c.corruption = Array(corrCount).fill(false);
      parsed.corrMarked.forEach(idx => { if (idx < corrCount) c.corruption[idx] = true; });
    } else {
      // No corruption track for this character
      c.corruption = null;
    }
  }

  if (parsed.aspects.length) {
    parsed.aspects.forEach((sa, i) => {
      if (c.aspects[i]) { c.aspects[i].nm = sa.nm; c.aspects[i].ty = sa.ty; }
      else c.aspects.push({ ty: sa.ty, nm: sa.nm, inv: null, cmp: null });
    });
    if (parsed.aspects.length < c.aspects.length) c.aspects = c.aspects.slice(0, parsed.aspects.length);
  }

  if (parsed.cons.length) {
    c.cons = parsed.cons;
    // Session state (S.cons) is rebuilt in initS — sheets.js doesn't touch it
  }

  parsed.stuntsRaw.forEach((raw, i) => {
    const p = parseStuntStr(raw);
    if (c.stunts[i]) {
      c.stunts[i].nm = p.nm;
      if (p.sk) c.stunts[i].sk = p.sk;
      if (p.fr) c.stunts[i].fr = p.fr;
      if (p.desc) c.stunts[i].desc = p.desc;
    }
  });

  parsed.extrasRaw.forEach((raw, i) => {
    const p = parseStuntStr(raw);
    if (c.extras[i]) {
      c.extras[i].nm = p.nm;
      if (p.sk) c.extras[i].sk = p.sk;
      if (p.fr) c.extras[i].fr = p.fr;
      if (p.desc) c.extras[i].desc = p.desc;
    }
  });
}

// ─── SYNC ───
const SHEET_CACHE_KEY = 'misfits-sheet-cache';
const SHEET_CACHE_TTL = 1000 * 60 * 30; // 30 min

async function syncFromSheet(showStatus, forceRefresh = false) {
  if (showStatus) updateSyncStatus('syncing');

  // Use cache unless forced (manual sync always forces)
  const cached = !forceRefresh && loadSheetCache();
  if (cached) {
    applyRows(cached);
    if (showStatus) updateSyncStatus('ok');
    // Refresh in background silently then reinitialise
    fetchAndCache().then(rows => {
      if (rows) {
        applyRows(rows);
        if (typeof reinitAllChars === 'function') reinitAllChars();
      }
    });
    return true;
  }

  // No cache or force refresh — fetch fresh
  try {
    const rows = await fetchAndCache();
    if (!rows) throw new Error('Fetch returned nothing');
    applyRows(rows);
    if (showStatus) updateSyncStatus('ok');
    return true;
  } catch (e) {
    console.warn('Sheet sync failed:', e);
    // Fall back to cache even if stale
    const stale = loadSheetCache(true);
    if (stale) { applyRows(stale); if (showStatus) updateSyncStatus('err'); return true; }
    if (showStatus) updateSyncStatus('err');
    return false;
  }
}

async function fetchAndCache() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const url = SHEET_URL + '&t=' + Date.now(); // cache-bust
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const text = await res.text();
    const rows = parseCSV(text);
    // Cache the parsed rows
    try { localStorage.setItem(SHEET_CACHE_KEY, JSON.stringify({ rows, ts: Date.now() })); } catch {}
    return rows;
  } catch (e) {
    clearTimeout(timeout);
    return null;
  }
}

function loadSheetCache(allowStale = false) {
  try {
    const raw = localStorage.getItem(SHEET_CACHE_KEY);
    if (!raw) return null;
    const { rows, ts } = JSON.parse(raw);
    if (!allowStale && Date.now() - ts > SHEET_CACHE_TTL) return null;
    return rows;
  } catch { return null; }
}

function applyRows(rows) {
  Object.keys(CHAR_COL).forEach(k => {
    const parsed = parseChar(rows, k);
    applySheetData(k, parsed);
  });
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
