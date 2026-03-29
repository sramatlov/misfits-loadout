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

    // Corruption — X markers at col+0, col+2 etc mean corruption boxes
    if (label === 'corruption') {
      const marked = [];
      STRESS_OFFSETS.forEach((off, idx) => {
        if (cv(row, col + off).toUpperCase() === 'X') marked.push(idx);
      });
      out.hasCorrTrk = marked.length > 0 || cv(row, col).toUpperCase() === 'X';
      out.corrMarked = marked;
      // Total corruption boxes = number of non-empty cells in stress row for this char
      // We'll reuse stressBoxCount for this
    }

    // Consequences
    if (CON_MAP[label]) {
      const def = CON_MAP[label];
      out.cons.push({ id: `con_${ri}`, lbl: def.lbl, abs: def.abs, rec: def.rec, src: 'base', val: cv(row, col) || null });
    }

    // Aspects
    if (ASP_TYPE_MAP[label]) {
      const nm = cv(row, col);
      if (nm) out.aspects.push({ ty: ASP_TYPE_MAP[label], nm });
    }

    // Stunts — col A is empty, col for char has stunt text
    if (label === '' && ri > 54 && ri < 61) {
      const v = cv(row, col);
      if (v) {
        // Determine if it's an extra (Extra label came before) or stunt
        const prevLabel = cv(rows[ri - 1] || [], 0).toLowerCase();
        if (prevLabel === 'extra' || out._inExtras) {
          out._inExtras = true;
          out.extrasRaw.push(v);
        } else {
          out.stuntsRaw.push(v);
        }
      }
    }

    // Extra row acts as separator
    if (label === 'extra') out._inExtras = false;
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

// ─── APPLY PARSED DATA TO CHARS ───
function applySheetData(key, parsed) {
  const c = CHARS[key];
  if (!c) return;

  // Refresh
  if (parsed.refresh) c.refresh = parsed.refresh;

  // Skills — update all matched skills
  if (Object.keys(parsed.skills).length) {
    Object.assign(c.skills, parsed.skills);
  }

  // Stress box counts — calculated from Fate Core rules:
  // Physique/Will 0 = 2 boxes, +1/+2 = 3 boxes, +3/+4 = 4 boxes, +5 = 4 boxes + extra mild con
  const phys = c.skills.Physique || 0;
  const will = c.skills.Will || 0;
  c.stress.phys.boxes = phys >= 3 ? 4 : phys >= 1 ? 3 : 2;
  c.stress.ment.boxes = will >= 3 ? 4 : will >= 1 ? 3 : 2;
  // bonus = dashed extra boxes from high skill
  c.stress.phys.bonus = phys >= 3 ? 2 : phys >= 1 ? 1 : 0;
  c.stress.ment.bonus = will >= 3 ? 2 : will >= 1 ? 1 : 0;

  // Corruption track
  if (parsed.hasCorrTrk !== undefined) {
    if (parsed.hasCorrTrk) {
      // Count boxes from stress row — corruption uses same count as total stress boxes
      const corrCount = 4; // Howard has 4 corruption boxes
      if (!c.corruption) c.corruption = Array(corrCount).fill(false);
      else if (c.corruption.length !== corrCount) c.corruption = Array(corrCount).fill(false);
    } else {
      c.corruption = null;
    }
  }

  // Aspects — update names, preserve descriptions
  if (parsed.aspects.length) {
    parsed.aspects.forEach((sa, i) => {
      if (c.aspects[i]) { c.aspects[i].nm = sa.nm; c.aspects[i].ty = sa.ty; }
      else c.aspects.push({ ty: sa.ty, nm: sa.nm, inv: null, cmp: null });
    });
    // Trim if sheet has fewer aspects
    if (parsed.aspects.length < c.aspects.length) {
      c.aspects = c.aspects.slice(0, parsed.aspects.length);
    }
  }

  // Consequences
  if (parsed.cons.length) c.cons = parsed.cons;

  // Stunts — update name, skill, freq, desc from sheet; preserve when/pairs
  parsed.stuntsRaw.forEach((raw, i) => {
    const p = parseStuntStr(raw);
    if (c.stunts[i]) {
      c.stunts[i].nm = p.nm;
      if (p.sk) c.stunts[i].sk = p.sk;
      if (p.fr) c.stunts[i].fr = p.fr;
      if (p.desc) c.stunts[i].desc = p.desc;
    }
  });

  // Extras
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
async function syncFromSheet(showStatus) {
  if (showStatus) updateSyncStatus('syncing');
  try {
    const res = await fetch(SHEET_URL);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    const rows = parseCSV(text);
    Object.keys(CHAR_COL).forEach(k => {
      const parsed = parseChar(rows, k);
      applySheetData(k, parsed);
    });
    if (showStatus) updateSyncStatus('ok');
    return true;
  } catch (e) {
    console.warn('Sheet sync failed:', e);
    if (showStatus) updateSyncStatus('err');
    return false;
  }
}

function updateSyncStatus(state) {
  const el = document.getElementById('syncStatus');
  if (!el) return;
  const s = {
    syncing: ['↻', 'Syncing...', 'var(--muted)'],
    ok:      ['✓', 'Sheet synced', 'var(--adv)'],
    err:     ['✕', 'Offline — local data', 'var(--danger)']
  }[state];
  el.innerHTML = `<span style="color:${s[2]}">${s[0]} ${s[1]}</span>`;
}
