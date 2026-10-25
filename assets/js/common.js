/* Shared helpers for Nordlys. No build step – plain browser JavaScript. */

const NL = (() => {
  const COUNTRIES = {
    SE: { name: 'Sweden', flag: '🇸🇪' },
    DK: { name: 'Denmark', flag: '🇩🇰' },
    NO: { name: 'Norway', flag: '🇳🇴' },
    FI: { name: 'Finland', flag: '🇫🇮' },
    IS: { name: 'Iceland', flag: '🇮🇸' },
  };

  // The 8 analyses. "file" is the name of the file you paste the AI answer into.
  const ANALYSES = [
    { key: 'phase',     n: 1, file: '01-business-phase.md',     prompt: 'prompts/01-business-phase.md',     title: 'Phase',        long: 'Business Phase',       schema: 'phase-v1',     intro: 'Where the company is in its life cycle – this decides which metrics and valuation methods make sense.' },
    { key: 'business',  n: 2, file: '02-business.md',           prompt: 'prompts/02-business.md',           title: 'Business',     long: 'Business Analysis',    schema: 'business-v1',  intro: 'What the company does, how it makes money, who its customers are and how it behaves in a recession.' },
    { key: 'moat',      n: 3, file: '03-moat.md',               prompt: 'prompts/03-moat.md',               title: 'Moat',         long: 'Moat Analysis',        schema: 'moat-v1',      intro: 'How well the company is protected from competitors – and whether that protection is growing.' },
    { key: 'growth',    n: 4, file: '04-long-term-potential.md', prompt: 'prompts/04-long-term-potential.md', title: 'Long-Term',  long: 'Long-Term Potential',  schema: 'growth-v1',    intro: 'The seven growth drivers: winning new customers vs. getting existing customers to spend more.' },
    { key: 'metrics',   n: 5, file: '05-key-metrics.md',        prompt: 'prompts/05-key-metrics.md',        title: 'Key Metrics',  long: 'Key Metrics',          schema: 'metrics-v1',   intro: 'Five metrics chosen for the company\'s phase, each scored red / yellow / green against fixed thresholds.', needsPhase: true },
    { key: 'risk',      n: 6, file: '06-risk.md',               prompt: 'prompts/06-risk.md',               title: 'Risk',         long: 'Risk Analysis',        schema: 'risk-v1',      intro: 'Four execution risks: customer concentration, disruption, outside forces and competition.' },
    { key: 'valuation', n: 7, file: '07-valuation.md',          prompt: 'prompts/07-valuation.md',          title: 'Valuation',    long: 'Valuation',            schema: 'valuation-v1', intro: 'Which valuation multiple fits this phase – and where the company stands on it today.', needsPhase: true },
    { key: 'sentiment', n: 8, file: '08-price-sentiment.md',    prompt: 'prompts/08-price-sentiment.md',    title: 'Price & Sentiment', long: 'Price & Sentiment', schema: 'sentiment-v1', intro: 'Why the share moved over the last year, and what analysts, investors and media think now.' },
  ];

  const PHASES = {
    1: { emoji: '🌱', name: 'Startup' },
    2: { emoji: '🚀', name: 'Hypergrowth' },
    3: { emoji: '⚖️', name: 'Self Funding' },
    4: { emoji: '⚙️', name: 'Operating Leverage' },
    5: { emoji: '🎁', name: 'Capital Return' },
    6: { emoji: '📉', name: 'Decline' },
  };

  /* ---------- Fetching ---------- */
  async function getJSON(path) {
    const r = await fetch(path + (path.includes('?') ? '&' : '?') + 'v=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) throw new Error(`${path}: ${r.status}`);
    return r.json();
  }
  async function getText(path) {
    const r = await fetch(path + '?v=' + Date.now(), { cache: 'no-store' });
    if (!r.ok) return null;
    return r.text();
  }
  async function companies() { return getJSON('data/companies.json'); }
  async function prices(id) { try { return await getJSON(`data/prices/${encodeURIComponent(id)}.json`); } catch { return null; } }
  async function indexPrices(symbol) {
    if (!symbol) return null;
    try { return await getJSON(`data/prices/index_${safeName(symbol)}.json`); } catch { return null; }
  }
  function safeName(s) { return String(s).replace(/[^A-Za-z0-9._-]/g, '_'); }

  /* ---------- Reading a pasted AI answer ---------- */
  // Splits the answer into (1) the readable Markdown and (2) the JSON data block.
  function parseAnalysis(text, expectedSchema) {
    if (text == null) return null;
    const out = { markdown: text, data: null, error: null };
    const re = /```(?:json|JSON)?\s*\n([\s\S]*?)```/g;
    let m, found = null;
    while ((m = re.exec(text)) !== null) {
      if (/"schema"\s*:/.test(m[1])) found = { full: m[0], body: m[1] };
    }
    if (!found) {
      // fallback: a bare {...} object containing "schema" at the very end
      const idx = text.lastIndexOf('{\n  "schema"');
      if (idx >= 0) found = { full: text.slice(idx), body: text.slice(idx) };
    }
    if (!found) { out.error = 'No data block found at the end of the answer (the ```json part). The text is shown, but the charts need the data block.'; return out; }
    out.markdown = text.replace(found.full, '').trim();
    try {
      out.data = JSON.parse(cleanJSON(found.body));
      if (expectedSchema && out.data.schema && out.data.schema !== expectedSchema) {
        out.error = `This data block says "${out.data.schema}", but this tab expects "${expectedSchema}". Did you paste the answer into the wrong file?`;
      }
    } catch (e) {
      out.error = 'The data block could not be read (' + e.message + '). Check that it was copied completely.';
    }
    return out;
  }
  function cleanJSON(s) {
    return s
      .replace(/[“”]/g, '"')          // curly quotes
      .replace(/,\s*([}\]])/g, '$1')              // trailing commas
      .replace(/^\s*\/\/.*$/gm, '')               // line comments
      .trim();
  }

  function renderMarkdown(md) {
    const html = window.marked ? marked.parse(md || '', { gfm: true, breaks: false }) : escapeHTML(md);
    const clean = window.DOMPurify ? DOMPurify.sanitize(html, { ADD_ATTR: ['target'] }) : html;
    const div = document.createElement('div');
    div.innerHTML = clean;
    div.querySelectorAll('a[href^="http"]').forEach(a => { a.target = '_blank'; a.rel = 'noopener'; });
    return div.innerHTML;
  }

  /* ---------- Formatting ---------- */
  function escapeHTML(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  const isNum = v => typeof v === 'number' && isFinite(v);
  function fmt(v, d = 2) { return isNum(v) ? v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—'; }
  function fmtInt(v) { return isNum(v) ? Math.round(v).toLocaleString('en-US') : '—'; }
  function pct(v, d = 1, sign = true) { return isNum(v) ? (sign && v > 0 ? '+' : '') + v.toFixed(d) + '%' : '—'; }
  function money(v, ccy) { return isNum(v) ? `${fmt(v, 2)} ${ccy || ''}`.trim() : '—'; }
  function bigMoney(v, ccy) {
    if (!isNum(v)) return '—';
    const a = Math.abs(v);
    const s = a >= 1e12 ? (v / 1e12).toFixed(2) + ' T' : a >= 1e9 ? (v / 1e9).toFixed(1) + ' B' : a >= 1e6 ? (v / 1e6).toFixed(0) + ' M' : fmtInt(v);
    return `${ccy || ''} ${s}`.trim();
  }
  // values given in millions
  function millions(v, ccy) {
    if (!isNum(v)) return '—';
    if (Math.abs(v) >= 1000) return `${ccy || ''} ${(v / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })} B`.trim();
    return `${ccy || ''} ${v.toLocaleString('en-US', { maximumFractionDigits: 0 })} M`.trim();
  }
  function dateStr(d) { if (!d) return '—'; const x = new Date(d); return isNaN(x) ? d : x.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  function daysSince(d) { const x = new Date(d); return isNaN(x) ? null : Math.floor((Date.now() - x.getTime()) / 864e5); }
  function signClass(v) { return !isNum(v) ? '' : v > 0 ? 'up' : v < 0 ? 'down' : ''; }

  /* ---------- Status helpers (red / yellow / green) ---------- */
  function statusPill(v, labelOverride) {
    const s = String(v || '').toLowerCase();
    const map = {
      green: ['good', 'Green'], yellow: ['warning', 'Yellow'], red: ['critical', 'Red'],
      strong: ['good', 'Strong'], moderate: ['warning', 'Moderate'], weak: ['critical', 'Weak'],
      high: ['good', 'High'], medium: ['warning', 'Medium'], low: ['critical', 'Low'],
      bullish: ['good', 'Bullish'], neutral: ['warning', 'Neutral'], bearish: ['critical', 'Bearish'],
      positive: ['good', 'Positive'], mixed: ['warning', 'Mixed'], negative: ['critical', 'Negative'],
      na: ['', 'N/A'],
    };
    const [cls, label] = map[s] || ['', v ?? '—'];
    return `<span class="pill ${cls}"><span class="dot"></span>${escapeHTML(labelOverride || label)}</span>`;
  }
  // risk: High is bad, so colors are flipped
  function riskPill(v) {
    const s = String(v || '').toLowerCase();
    const cls = s === 'high' ? 'critical' : s === 'medium' ? 'warning' : s === 'low' ? 'good' : '';
    return `<span class="pill ${cls}"><span class="dot"></span>${escapeHTML(v ?? '—')} risk</span>`;
  }
  function trendArrow(t, invert = false) {
    const s = String(t || '').toLowerCase();
    if (s === 'up') return `<span title="Rising">↗ Rising</span>`;
    if (s === 'down') return `<span title="Falling">↘ Falling</span>`;
    if (s === 'flat') return `<span title="Stable">→ Stable</span>`;
    return '<span class="muted">—</span>';
  }

  /* ---------- GitHub links (so you can add/edit analyses from the site) ---------- */
  function repoInfo() {
    const cfg = window.NORDLYS_CONFIG || {};
    let user = cfg.githubUser, repo = cfg.githubRepo, branch = cfg.branch || 'main';
    const h = location.hostname;
    if ((!user || !repo) && h.endsWith('.github.io')) {
      user = user || h.split('.')[0];
      const first = location.pathname.split('/').filter(Boolean)[0];
      repo = repo || (first && !first.endsWith('.html') ? first : `${user}.github.io`);
    }
    return user && repo ? { user, repo, branch } : null;
  }
  function githubNewFileURL(dir, filename) {
    const r = repoInfo(); if (!r) return null;
    return `https://github.com/${r.user}/${r.repo}/new/${r.branch}/${dir}?filename=${encodeURIComponent(filename)}`;
  }
  function githubEditURL(path) {
    const r = repoInfo(); if (!r) return null;
    return `https://github.com/${r.user}/${r.repo}/edit/${r.branch}/${path}`;
  }

  /* ---------- Price math ---------- */
  function sliceRange(series, range) {
    if (!series || !series.dates?.length) return null;
    const dates = series.dates, close = series.close;
    const last = new Date(dates[dates.length - 1]);
    let start;
    const y = last.getFullYear();
    switch (range) {
      case '1M': start = new Date(last); start.setMonth(start.getMonth() - 1); break;
      case '3M': start = new Date(last); start.setMonth(start.getMonth() - 3); break;
      case '6M': start = new Date(last); start.setMonth(start.getMonth() - 6); break;
      case 'YTD': start = new Date(y - 1, 11, 31); break;
      case '1Y': start = new Date(last); start.setFullYear(y - 1); break;
      case '3Y': start = new Date(last); start.setFullYear(y - 3); break;
      case '5Y': start = new Date(last); start.setFullYear(y - 5); break;
      case '10Y': start = new Date(last); start.setFullYear(y - 10); break;
      default: start = new Date(0);
    }
    const s = start.toISOString().slice(0, 10);
    let i = dates.findIndex(d => d >= s); if (i < 0) i = 0;
    return { dates: dates.slice(i), close: close.slice(i) };
  }
  function movingAverage(arr, n) {
    const out = new Array(arr.length).fill(null); let sum = 0;
    for (let i = 0; i < arr.length; i++) {
      sum += arr[i]; if (i >= n) sum -= arr[i - n];
      if (i >= n - 1) out[i] = sum / n;
    }
    return out;
  }
  function closeOnOrBefore(series, date) {
    const ds = series.dates; let lo = 0, hi = ds.length - 1, ans = -1;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (ds[mid] <= date) { ans = mid; lo = mid + 1; } else hi = mid - 1; }
    return ans >= 0 ? series.close[ans] : null;
  }
  function cagr(first, last, years) { return first > 0 && years > 0 ? (Math.pow(last / first, 1 / years) - 1) * 100 : null; }

  /* ---------- Chart.js defaults ---------- */
  function chartDefaults() {
    if (!window.Chart) return;
    const css = getComputedStyle(document.documentElement);
    Chart.defaults.color = css.getPropertyValue('--muted').trim();
    Chart.defaults.font.family = css.getPropertyValue('--font').trim();
    Chart.defaults.font.size = 12;
    Chart.defaults.borderColor = css.getPropertyValue('--grid').trim();
    Chart.defaults.plugins.legend.display = false;
    Chart.defaults.plugins.tooltip.backgroundColor = '#2c2c2a';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,.18)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.titleColor = '#f0efec';
    Chart.defaults.plugins.tooltip.bodyColor = '#c3c2b7';
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.animation.duration = 300;
  }
  const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

  /* ---------- UI bits ---------- */
  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2200);
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy'); ta.remove(); return ok;
    }
  }

  // Search box in the top bar (works on every page)
  async function initSearch() {
    const input = document.getElementById('search'); const box = document.getElementById('search-results');
    if (!input) return;
    let list = [];
    try { list = await companies(); } catch { }
    let active = 0;
    const render = () => {
      const q = input.value.trim().toLowerCase();
      if (!q) { box.classList.remove('open'); return; }
      const hits = list.filter(c => (c.name + ' ' + c.id + ' ' + (c.yahoo || '')).toLowerCase().includes(q)).slice(0, 8);
      box.innerHTML = hits.length
        ? hits.map((c, i) => `<a href="company.html?id=${encodeURIComponent(c.id)}" class="${i === active ? 'active' : ''}"><span>${escapeHTML(c.name)}</span><span class="muted">${escapeHTML(c.id)} ${COUNTRIES[c.country]?.flag || ''}</span></a>`).join('')
        : `<a><span class="muted">No company found. Add it in data/companies.json</span></a>`;
      box.classList.add('open');
    };
    input.addEventListener('input', () => { active = 0; render(); });
    input.addEventListener('keydown', e => {
      const links = box.querySelectorAll('a[href]');
      if (e.key === 'ArrowDown') { active = Math.min(active + 1, links.length - 1); render(); e.preventDefault(); }
      if (e.key === 'ArrowUp') { active = Math.max(active - 1, 0); render(); e.preventDefault(); }
      if (e.key === 'Enter' && links[active]) location.href = links[active].href;
      if (e.key === 'Escape') { input.value = ''; render(); }
    });
    document.addEventListener('click', e => { if (!e.target.closest('.search')) box.classList.remove('open'); });
  }

  return {
    COUNTRIES, ANALYSES, PHASES, getJSON, getText, companies, prices, indexPrices, parseAnalysis, renderMarkdown,
    escapeHTML, isNum, fmt, fmtInt, pct, money, bigMoney, millions, dateStr, daysSince, signClass,
    statusPill, riskPill, trendArrow, githubNewFileURL, githubEditURL, repoInfo,
    sliceRange, movingAverage, closeOnOrBefore, cagr, chartDefaults, cssVar, toast, copyText, initSearch,
  };
})();
