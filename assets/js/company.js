/* Company page: header + Overview + the 8 analysis tabs */
(async function () {
  NL.chartDefaults();
  NL.initSearch();
  const E = NL.escapeHTML;
  const $head = document.getElementById('head');
  const $tabs = document.getElementById('tabs');
  const $panel = document.getElementById('panel');
  const id = new URLSearchParams(location.search).get('id');
  let charts = [];
  const keepChart = c => (charts.push(c), c);
  const clearCharts = () => { charts.forEach(c => c.destroy()); charts = []; };

  // Vertical crosshair line for line charts
  const crosshair = {
    id: 'crosshair',
    afterDraw(chart) {
      const a = chart.tooltip?.getActiveElements?.();
      if (!a || !a.length || chart.config.type !== 'line') return;
      const x = a[0].element.x, { top, bottom } = chart.chartArea, ctx = chart.ctx;
      ctx.save(); ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, bottom);
      ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.stroke(); ctx.restore();
    },
  };
  if (window.Chart) Chart.register(crosshair);

  /* ---------- Load everything ---------- */
  let list;
  try { list = await NL.companies(); } catch (e) { $head.innerHTML = `<div class="error-box">Could not read data/companies.json (${E(e.message)})</div>`; return; }
  const c = list.find(x => x.id === id) || (id ? null : list[0]);
  if (!c) { $head.innerHTML = `<div class="error-box">No company with id <b>${E(id)}</b> in data/companies.json. <a href="index.html">Back to the list</a></div>`; return; }
  document.title = `${c.name} – Nordlys`;

  const [p, ip] = await Promise.all([NL.prices(c.id), NL.indexPrices(c.benchmark)]);
  const texts = await Promise.all(NL.ANALYSES.map(a => NL.getText(`data/analyses/${c.id}/${a.file}`)));
  const A = {};
  NL.ANALYSES.forEach((a, i) => { A[a.key] = texts[i] == null ? null : NL.parseAnalysis(texts[i], a.schema); });
  const D = k => A[k]?.data || null;
  const ccy = p?.currency || c.currency || '';

  /* ---------- Header ---------- */
  const last = p?.last_close, prev = p?.prev_close;
  const chg = NL.isNum(last) && NL.isNum(prev) ? last - prev : null;
  const chgPct = NL.isNum(chg) && prev ? chg / prev * 100 : null;
  const initials = c.name.replace(/\(.*?\)/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
  $head.innerHTML = `
    ${c.demo ? `<div class="demo-banner">⚠️ <b>Sample company.</b> All numbers and texts here are made up to show you what a finished page looks like. Delete it when your first real company is ready (see the guide).</div>` : ''}
    <div class="co-head">
      <div class="co-logo">${E(initials)}</div>
      <div class="co-title">
        <h1>${E(c.name)}</h1>
        <div class="meta">${E(c.id)} · ${E(c.exchange || '')} · ${NL.COUNTRIES[c.country]?.flag || ''} ${E(NL.COUNTRIES[c.country]?.name || c.country)}</div>
      </div>
      <div class="co-price">
        ${NL.isNum(last) ? `<span class="p num">${NL.fmt(last)} <span class="muted" style="font-size:16px">${E(ccy)}</span></span>` : ''}
        <span class="c num ${NL.signClass(chg)}">${NL.isNum(chg) ? (chg > 0 ? '+' : '') + NL.fmt(chg) : ''} ${NL.isNum(chgPct) ? '(' + NL.pct(chgPct, 2) + ')' : ''}</span>
        <span class="d">${p?.last_date ? NL.dateStr(p.last_date) + ' · Close' : 'No price data yet'}</span>
      </div>
      <div class="actions">${c.ir_url ? `<a class="btn" href="${E(c.ir_url)}" target="_blank" rel="noopener">Investor relations ↗</a>` : ''}</div>
    </div>`;

  /* ---------- Tabs ---------- */
  const TABS = [{ key: 'overview', title: 'Overview' }].concat(NL.ANALYSES);
  $tabs.innerHTML = TABS.map(t => `<button class="tab" role="tab" data-k="${t.key}">${t.n ? `<span class="state ${A[t.key] ? 'done' : ''}"></span>` : ''}${E(t.title)}</button>`).join('');
  $tabs.addEventListener('click', e => { const b = e.target.closest('.tab'); if (b) show(b.dataset.k, true); });
  window.addEventListener('hashchange', () => show(location.hash.slice(1) || 'overview', false));

  function show(key, push) {
    if (!TABS.find(t => t.key === key)) key = 'overview';
    $tabs.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.k === key));
    if (push) history.replaceState(null, '', `${location.pathname}${location.search}#${key}`);
    clearCharts();
    if (key === 'overview') renderOverview(); else renderAnalysis(NL.ANALYSES.find(a => a.key === key));
    $tabs.querySelector('.tab.active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  /* ================= OVERVIEW ================= */
  function renderOverview() {
    const b = D('business'), ph = D('phase'), mo = D('moat'), ri = D('risk'), me = D('metrics'), va = D('valuation'), se = D('sentiment');
    const fact = (label, value, src) => `<div><div class="eyebrow">${label}</div><div class="v">${value ?? '<span class="muted">—</span>'}</div>${src ? `<div class="src">${src}</div>` : ''}</div>`;
    const phaseInfo = ph?.phase ? NL.PHASES[ph.phase] : null;
    $panel.innerHTML = `
      <div class="overview">
        <div class="card">
          <div class="facts">
            ${fact('Sector', E(c.sector || '') || null)}
            ${fact('Industry', E(c.industry || '') || null)}
            ${fact('Market cap', NL.isNum(p?.market_cap) ? NL.bigMoney(p.market_cap, ccy) : null, p?.market_cap ? 'Yahoo Finance' : '')}
            ${fact('Dividend yield', NL.isNum(p?.dividend_yield_pct) ? p.dividend_yield_pct.toFixed(2) + '%' : null, NL.isNum(p?.dividend_yield_pct) ? 'Last 12 months' : '')}
            ${fact('Phase', phaseInfo ? `${phaseInfo.emoji} ${ph.phase}: ${phaseInfo.name}` : null)}
            ${fact('Moat', mo?.moat_size ? `${E(mo.moat_size)} · ${E(mo.moat_direction || '')}` : null)}
            ${fact('Founded', E(c.founded ?? '') || null)}
            ${fact('Employees', NL.isNum(c.employees) ? NL.fmtInt(c.employees) : null, c.employees_source ? E(c.employees_source) : '')}
            ${fact('Headquarters', E(c.headquarters || '') || null)}
            ${fact('Benchmark', E(c.benchmark_name || '') || null)}
            ${c.tags?.length ? `<div class="full"><div class="eyebrow">Tags</div><div class="tags">${c.tags.map(t => `<span class="tag">${E(t)}</span>`).join('')}</div></div>` : ''}
          </div>
        </div>
        <div class="card">
          <div class="chart-controls">
            <div class="seg" id="mode"><button data-m="pct" class="active">% change</button><button data-m="price">Price</button></div>
            <div class="seg" id="range">${['1M', '3M', '6M', 'YTD', '1Y', '3Y', '5Y', '10Y'].map(r => `<button data-r="${r}" class="${r === '5Y' ? 'active' : ''}">${r}</button>`).join('')}</div>
          </div>
          <div id="perf"></div>
          <div class="chart-box"><canvas id="pc"></canvas></div>
          <div class="chart-note">Price return in ${E(ccy)}, excluding dividends. Source: Yahoo Finance daily close${p?.updated ? ', updated ' + NL.dateStr(p.updated) : ''}.</div>
        </div>
      </div>

      ${c.mission ? `<div class="card section-gap"><div class="eyebrow">Mission</div><p style="font-style:italic;font-size:17px;margin:8px 0 0">${E(c.mission)}</p>${c.mission_source ? `<div class="chart-note">${E(c.mission_source)}</div>` : ''}</div>` : ''}

      <div class="card section-gap">
        <div class="card-title-row"><h3>Analysis at a glance</h3><span class="muted" style="font-size:13px">${NL.ANALYSES.filter(a => A[a.key]).length} of 8 done – click a box to open it</span></div>
        <div class="glance">
          ${glance('phase', 'Business phase', phaseInfo ? `${phaseInfo.emoji} ${phaseInfo.name}` : null, ph?.confidence ? `Confidence: ${E(ph.confidence)}` : '')}
          ${glance('business', 'Biggest segment', b?.segments?.length ? E([...b.segments].sort((x, y) => (y.pct ?? 0) - (x.pct ?? 0))[0].name) : null, b?.segments?.length ? `${[...b.segments].sort((x, y) => (y.pct ?? 0) - (x.pct ?? 0))[0].pct ?? '—'}% of net sales` : '')}
          ${glance('moat', 'Moat', mo?.moat_size ? E(mo.moat_size) : null, mo?.moat_direction ? E(mo.moat_direction) : '')}
          ${glance('growth', 'Growth strategy', D('growth')?.primary_strategy ? E(D('growth').primary_strategy) : null, D('growth')?.top_drivers?.length ? E(D('growth').top_drivers.join(', ')) : '')}
          ${glance('metrics', 'Phase health', me?.health ? E(me.health) : null, me?.metrics ? `${me.metrics.filter(m => m.score === 'green').length} of ${me.metrics.length} green` : '')}
          ${glance('risk', 'Execution risk', ri?.overall ? E(ri.overall) : null, NL.isNum(ri?.score) ? `Score ${ri.score.toFixed(1)} of 3` : '')}
          ${glance('valuation', va?.primary?.abbr ? `${E(va.primary.abbr)} (${E(va.primary.basis || '')})` : 'Valuation', NL.isNum(va?.primary?.value) ? va.primary.value.toFixed(1) + 'x' : null, va?.analysis_date ? 'at ' + NL.dateStr(va.analysis_date) : '')}
          ${glance('sentiment', '12-month outlook', se?.outlook ? E(cap(se.outlook)) : null, se?.next_catalyst ? 'Next: ' + E(se.next_catalyst) : '')}
        </div>
      </div>`;

    function glance(key, label, value, sub) {
      return `<a class="stat" href="#${key}"><div class="label">${label}</div><div class="value" style="font-size:19px">${value ?? '<span class="muted" style="font-weight:500;font-size:15px">Not analysed yet</span>'}</div><div class="sub">${sub || '&nbsp;'}</div></a>`;
    }

    // Price chart
    let mode = 'pct', range = '5Y', chart;
    const draw = () => {
      if (chart) { chart.destroy(); charts = charts.filter(x => x !== chart); }
      const $perf = document.getElementById('perf');
      const s = NL.sliceRange(p, range);
      if (!s || s.close.length < 2) { $perf.innerHTML = ''; document.querySelector('.chart-box').innerHTML = `<div class="muted" style="padding:40px;text-align:center">No price data yet. Prices appear after the GitHub Action "Update prices" has run (see the guide).</div>`; return; }
      const base = s.close[0];
      const coSeries = mode === 'pct' ? s.close.map(v => (v / base - 1) * 100) : s.close;
      let ixSeries = null, ixPct = null;
      if (mode === 'pct' && ip?.dates?.length) {
        const ib = NL.closeOnOrBefore(ip, s.dates[0]);
        if (ib) { ixSeries = s.dates.map(d => { const v = NL.closeOnOrBefore(ip, d); return v ? (v / ib - 1) * 100 : null; }); ixPct = ixSeries[ixSeries.length - 1]; }
      }
      const coPct = (s.close[s.close.length - 1] / base - 1) * 100;
      const years = (new Date(s.dates[s.dates.length - 1]) - new Date(s.dates[0])) / (365.25 * 864e5);
      const showCagr = years >= 0.99;
      $perf.innerHTML = `<div class="perf-box">
        <div><span class="legend"><span><span class="sw" style="background:var(--series-1)"></span>${E(c.id)}</span></span> <b class="num ${NL.signClass(coPct)}">${NL.pct(coPct)}</b>${showCagr ? ` <span class="muted">CAGR ${NL.pct(NL.cagr(base, s.close[s.close.length - 1], years))}</span>` : ''}</div>
        ${ixPct != null ? `<div><span class="legend"><span><span class="sw dash"></span>${E(c.benchmark_name || c.benchmark)}</span></span> <b class="num ${NL.signClass(ixPct)}">${NL.pct(ixPct)}</b>${showCagr ? ` <span class="muted">CAGR ${NL.pct(NL.cagr(100, 100 + ixPct, years))}</span>` : ''}</div>` : (mode === 'pct' && c.benchmark ? `<div class="muted">Index data not available yet</div>` : '')}
      </div>`;
      const ds = [{ label: c.id, data: coSeries, borderColor: NL.cssVar('--series-1'), backgroundColor: 'rgba(57,135,229,.08)', fill: mode === 'pct' ? 'origin' : false, borderWidth: 2, pointRadius: 0, tension: 0.1 }];
      if (ixSeries) ds.push({ label: c.benchmark_name || c.benchmark, data: ixSeries, borderColor: NL.cssVar('--benchmark'), borderDash: [4, 3], borderWidth: 2, pointRadius: 0, tension: 0.1 });
      chart = keepChart(new Chart(document.getElementById('pc'), {
        type: 'line',
        data: { labels: s.dates, datasets: ds },
        options: {
          interaction: { mode: 'index', intersect: false },
          scales: {
            x: { grid: { display: false }, ticks: { maxTicksLimit: innerWidth < 640 ? 3 : 6, maxRotation: 0, autoSkipPadding: 16, callback(v) { const d = this.getLabelForValue(v); return ['1M', '3M', '6M', 'YTD'].includes(range) ? NL.dateStr(d).replace(/ \d{4}$/, '') : d.slice(0, 7); } } },
            y: { position: 'right', grid: { color: NL.cssVar('--grid') }, ticks: { callback: v => mode === 'pct' ? (v > 0 ? '+' : '') + v + '%' : NL.fmt(v, 0) } },
          },
          plugins: { tooltip: { callbacks: { title: i => NL.dateStr(i[0].label), label: i => ` ${i.dataset.label}: ${mode === 'pct' ? NL.pct(i.raw) : NL.fmt(i.raw) + ' ' + ccy}` } } },
        },
      }));
    };
    document.getElementById('mode').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; mode = b.dataset.m; e.currentTarget.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b)); draw(); });
    document.getElementById('range').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; range = b.dataset.r; e.currentTarget.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b)); draw(); });
    draw();
  }

  /* ================= ANALYSIS TABS ================= */
  function renderAnalysis(a) {
    const res = A[a.key];
    const d = res?.data;
    const path = `data/analyses/${c.id}/${a.file}`;
    const editURL = res ? NL.githubEditURL(path) : NL.githubNewFileURL(`data/analyses/${c.id}`, a.file);
    const age = d?.analysis_date ? NL.daysSince(d.analysis_date) : null;
    $panel.innerHTML = `
      <div class="tab-head">
        <div>
          <div class="eyebrow">Analysis ${a.n} of 8</div>
          <h2>${E(a.long)}</h2>
          <p>${E(a.intro)}</p>
          ${d?.analysis_date ? `<p class="muted" style="font-size:13px">Analysed ${NL.dateStr(d.analysis_date)} (${age} days ago)${age > 120 ? ' · <span class="stale">May be outdated – has a new report come out?</span>' : ''}</p>` : ''}
        </div>
        <div class="actions">
          <button class="btn" id="copy">📋 Copy prompt</button>
          ${editURL ? `<a class="btn ${res ? '' : 'btn-primary'}" href="${editURL}" target="_blank" rel="noopener">${res ? '✏️ Update on GitHub' : '➕ Add on GitHub'}</a>` : ''}
        </div>
      </div>
      <div id="body"></div>`;
    document.getElementById('copy').addEventListener('click', async () => {
      const t = await NL.getText(a.prompt);
      if (!t) { NL.toast('Could not load the prompt file'); return; }
      const ok = await NL.copyText(promptFor(a, t));
      NL.toast(ok ? 'Prompt copied – paste it into Claude' : 'Copy failed – open the prompts folder instead');
    });
    const $b = document.getElementById('body');
    if (!res) { $b.innerHTML = emptyState(a, path); return; }
    let html = res.error ? `<div class="error-box">⚠️ ${E(res.error)}</div>` : '';
    html += `<div id="viz"></div>`;
    html += `<details class="full card section-gap" open><summary><span>Full analysis</span><span class="chev">▾</span></summary><div class="md">${NL.renderMarkdown(res.markdown)}</div></details>`;
    $b.innerHTML = html;
    if (d) { try { VIZ[a.key]?.(document.getElementById('viz'), d); } catch (e) { console.error(e); document.getElementById('viz').innerHTML = `<div class="error-box">Could not draw the charts for this tab (${E(e.message)}). Check the data block.</div>`; } }
  }

  function promptFor(a, promptText) {
    const today = new Date().toISOString().slice(0, 10);
    let extra = `\n\n---\nCompany: ${c.name} (ticker ${c.id}, listed on ${c.exchange || 'a Nordic exchange'}, ${NL.COUNTRIES[c.country]?.name || c.country}). Reporting currency: ${c.currency || 'local currency'}.`;
    if (c.ir_url) extra += `\nInvestor relations page: ${c.ir_url}`;
    if (a.needsPhase) {
      const ph = D('phase');
      extra += ph?.phase ? `\nPhase: ${ph.phase} (${NL.PHASES[ph.phase].name}), from the Business Phase Analysis dated ${ph.analysis_date || 'unknown'}.` : a.key === 'valuation' ? `\nPhase: not provided – determine it with the decision tree.` : `\nPhase: not yet known – run the Business Phase Analysis first.`;
    }
    extra += `\nToday's date: ${today}. Begin the analysis now.`;
    return promptText.trim() + extra;
  }

  function emptyState(a, path) {
    const needs = a.key === 'metrics' && !D('phase');
    return `<div class="card empty">
      <h3>This analysis hasn't been done yet</h3>
      ${needs ? `<div class="error-box" style="margin:10px 0">Do <a href="#phase">Analysis 1 (Business Phase)</a> first – this prompt needs the phase number.</div>` : ''}
      <ol>
        <li>Click <b>📋 Copy prompt</b>. The company name${a.needsPhase ? ' and phase are' : ' is'} already added at the bottom.</li>
        <li>Open <a href="https://claude.ai/new" target="_blank" rel="noopener">claude.ai</a> (turn on <b>web search</b>), paste, and send.</li>
        <li>When the answer is ready, click the copy icon under the answer to copy all of it.</li>
        <li>Click <b>➕ Add on GitHub</b>. Paste the answer into the big box and click <b>Commit changes</b>.</li>
        <li>Wait about one minute and reload this page.</li>
      </ol>
      <p class="muted" style="font-size:13px;margin:0">The answer is saved as <code>${E(path)}</code>.</p>
    </div>`;
  }

  /* ---------- Small builders ---------- */
  const tile = (label, value, sub) => `<div class="stat"><div class="label">${label}</div><div class="value">${value ?? '<span class="muted">—</span>'}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
  const cap = s => s ? String(s).charAt(0).toUpperCase() + String(s).slice(1) : s;
  function barChart(canvas, labels, values, { suffix = '%', colors, horizontal = true, decimals = 0 } = {}) {
    return keepChart(new Chart(canvas, {
      type: 'bar',
      data: { labels, datasets: [{ data: values, backgroundColor: colors || NL.cssVar('--series-1'), borderRadius: 4, borderSkipped: 'start', maxBarThickness: 28 }] },
      options: {
        indexAxis: horizontal ? 'y' : 'x',
        scales: {
          [horizontal ? 'x' : 'y']: { beginAtZero: true, grid: { color: NL.cssVar('--grid') }, ticks: { callback: v => v + suffix } },
          [horizontal ? 'y' : 'x']: { grid: { display: false }, ticks: { color: NL.cssVar('--text-2') } },
        },
        plugins: { tooltip: { callbacks: { label: i => ` ${NL.isNum(i.raw) ? i.raw.toLocaleString('en-US', { maximumFractionDigits: decimals }) : '—'}${suffix}` } } },
      },
    }));
  }
  function historyChart(canvas, years, values, { type = 'bar', suffix = '', decimals = 0 } = {}) {
    const color = NL.cssVar('--series-1');
    return keepChart(new Chart(canvas, {
      type,
      data: { labels: years, datasets: [{ data: values, borderColor: color, backgroundColor: type === 'bar' ? values.map(v => v < 0 ? NL.cssVar('--down') : color) : color, borderWidth: 2, borderRadius: 4, pointRadius: 4, pointBackgroundColor: color, maxBarThickness: 40, spanGaps: false }] },
      options: {
        interaction: { mode: 'index', intersect: false },
        scales: { x: { grid: { display: false } }, y: { beginAtZero: type === 'bar', grid: { color: NL.cssVar('--grid') }, ticks: { callback: v => v.toLocaleString('en-US') + suffix } } },
        plugins: { tooltip: { callbacks: { label: i => ` ${NL.isNum(i.raw) ? i.raw.toLocaleString('en-US', { maximumFractionDigits: decimals }) : 'Not available'}${NL.isNum(i.raw) ? suffix : ''}` } } },
      },
    }));
  }
  const canvasCard = (title, id, note, size = 'sm') => `<div class="card"><h3>${title}</h3><div class="chart-box ${size}"><canvas id="${id}"></canvas></div>${note ? `<div class="chart-note">${note}</div>` : ''}</div>`;

  /* ---------- One visual summary per tab ---------- */
  const VIZ = {
    phase(el, d) {
      const strip = Object.entries(NL.PHASES).map(([n, ph]) => `<div class="phase-step ${+n === +d.phase ? 'current' : ''}"><div class="e">${ph.emoji}</div><div class="n">PHASE ${n}</div><div class="t">${ph.name}</div></div>`).join('');
      const cur = d.currency || ccy;
      const opChange = NL.isNum(d.operating_profit_current) && NL.isNum(d.operating_profit_prior) && d.operating_profit_prior !== 0 ? (d.operating_profit_current / Math.abs(d.operating_profit_prior) - 1) * 100 * Math.sign(d.operating_profit_prior) : null;
      el.innerHTML = `
        <div class="card"><div class="card-title-row"><h3>Business life cycle</h3>${d.confidence ? NL.statusPill(d.confidence, 'Confidence: ' + d.confidence) : ''}</div><div class="phase-strip">${strip}</div></div>
        <div class="grid g4 section-gap">
          ${tile('Net sales', NL.millions(d.net_sales_current, cur), `<span class="${NL.signClass(d.net_sales_growth_pct)}">${NL.pct(d.net_sales_growth_pct)}</span> vs ${NL.millions(d.net_sales_prior, cur)}`)}
          ${tile('Operating profit (EBIT)', NL.millions(d.operating_profit_current, cur), `${NL.isNum(opChange) ? `<span class="${NL.signClass(opChange)}">${NL.pct(opChange)}</span> vs ` : 'vs '}${NL.millions(d.operating_profit_prior, cur)}`)}
          ${tile('Operating margin', NL.isNum(d.operating_margin_pct) ? d.operating_margin_pct.toFixed(1) + '%' : null, 'Phase 3 if between −5% and +5%')}
          ${tile('Capital returns', d.capital_returns === true ? 'Yes' : d.capital_returns === false ? 'No' : null, E(d.capital_returns_note || ''))}
        </div>
        <p class="chart-note">${E(d.period_label || '')}${d.report_used ? ' · Source: ' + (d.report_url ? `<a href="${E(d.report_url)}" target="_blank" rel="noopener">${E(d.report_used)}</a>` : E(d.report_used)) : ''}</p>`;
    },

    business(el, d) {
      const segs = (d.segments || []).filter(s => NL.isNum(s.pct)).sort((a, b) => b.pct - a.pct);
      const regs = (d.regions || []).filter(s => NL.isNum(s.pct)).sort((a, b) => b.pct - a.pct);
      const sens = String(d.recession_sensitivity || '').toLowerCase();
      el.innerHTML = `
        <div class="grid g4">
          ${tile('Net sales', NL.millions(d.net_sales_total, d.currency || ccy), d.fiscal_year ? 'Fiscal year ' + E(d.fiscal_year) : '')}
          ${tile('Recurring revenue', d.recurring_revenue ? NL.statusPill(d.recurring_revenue) : null, E(d.recurring_note || ''))}
          ${tile('Pricing power', d.pricing_power ? NL.statusPill(d.pricing_power) : null)}
          ${tile('Recession sensitivity', d.recession_sensitivity ? `<span class="pill ${sens === 'high' ? 'critical' : sens === 'medium' ? 'warning' : sens === 'low' ? 'good' : ''}"><span class="dot"></span>${E(d.recession_sensitivity)}</span>` : null, 'High = sales drop a lot in a downturn')}
        </div>
        <div class="grid g2 section-gap">
          ${segs.length ? canvasCard('Net sales by segment', 'segc', '% of net sales') : `<div class="card"><h3>Net sales by segment</h3><p class="muted">Not disclosed.</p></div>`}
          ${regs.length ? canvasCard('Net sales by region', 'regc', '% of net sales') : `<div class="card"><h3>Net sales by region</h3><p class="muted">Not disclosed.</p></div>`}
        </div>
        ${d.customer_types?.length ? `<div class="card section-gap"><h3>Customers</h3><div class="tags">${d.customer_types.map(t => `<span class="tag">${E(t)}</span>`).join('')}</div></div>` : ''}`;
      const h = n => Math.max(180, n * 44 + 40) + 'px';
      if (segs.length) { document.getElementById('segc').parentElement.style.height = h(segs.length); barChart(document.getElementById('segc'), segs.map(s => s.name), segs.map(s => s.pct), { decimals: 1 }); }
      if (regs.length) { document.getElementById('regc').parentElement.style.height = h(regs.length); barChart(document.getElementById('regc'), regs.map(s => s.name), regs.map(s => s.pct), { decimals: 1 }); }
    },

    moat(el, d) {
      const names = { switching_costs: '⚓️ Switching costs', intangible_assets: '💡 Intangible assets', network_effects: '🌐 Network effects', low_cost_production: '⚙️ Low-cost production', counter_positioning: '🤺 Counter-positioning' };
      const lvl = s => s === 'Wide' ? 2 : s === 'Narrow' ? 1 : 0;
      const meter = (size) => `<div class="meter"><span class="${lvl(size) >= 1 ? 'on' : ''}"></span><span class="${lvl(size) >= 2 ? 'on' : ''}"></span><em>${E(size || 'None')}</em></div>`;
      const dir = v => v === 'Widening' ? '↗ Widening' : v === 'Narrowing' ? '↘ Narrowing' : v === 'Stable' ? '→ Stable' : '<span class="muted">—</span>';
      const ms = d.morningstar || {};
      el.innerHTML = `
        <div class="grid g4">
          ${tile('Moat size', d.moat_size ? E(d.moat_size) : null, d.moat_size === 'Wide' ? '10+ years of protection' : d.moat_size === 'Narrow' ? '3–10 years of protection' : d.moat_size === 'None' ? 'No lasting advantage' : '')}
          ${tile('Direction', d.moat_direction ? dir(d.moat_direction) : null)}
          ${tile('Main source', d.primary_sources?.length ? E(d.primary_sources.join(', ')) : null)}
          ${tile('Morningstar', ms.covered ? `${E(ms.size || '—')}` : '<span class="muted" style="font-size:16px">Not covered</span>', ms.covered && ms.direction ? E(ms.direction) : 'Shown for comparison')}
        </div>
        <div class="card section-gap">
          <h3>The five moat sources</h3>
          <div class="rows">
            ${Object.keys(names).map(k => { const s = d.sources?.[k] || {}; return `<div class="row"><div class="name">${names[k]}</div><div>${s.present ? meter(s.size) : '<span class="muted">Not present</span>'}</div><div class="secondary">${s.present ? dir(s.direction) : ''}</div></div>`; }).join('')}
          </div>
        </div>`;
    },

    growth(el, d) {
      const N = { marketing_sales: 'Marketing & sales', new_distribution: 'New distribution channels', market_expansion: 'Geographic / market expansion', acquisitions: 'Acquisitions', pricing_power: 'Pricing power', new_products: 'New products / services', retention: 'Customer retention' };
      const label = { strong: 'Strong', moderate: 'Moderate', weak: 'Weak', na: 'N/A' };
      const drv = k => { const x = d.drivers?.[k] || {}; const s = String(x.strength || 'na').toLowerCase(); return `<div class="driver ${s}"><div><div class="name">${N[k]}</div><div class="sub">Evidence: ${E(x.evidence || '—')} · ${NL.trendArrow(x.trend)}</div></div>${s === 'na' ? '<span class="pill"><span class="dot"></span>N/A</span>' : NL.statusPill(s, label[s])}</div>`; };
      el.innerHTML = `
        <div class="grid g2">
          ${tile('Primary growth strategy', d.primary_strategy ? E(d.primary_strategy) : null)}
          ${tile('Top drivers', d.top_drivers?.length ? `<span style="font-size:18px">${E(d.top_drivers.join(' · '))}</span>` : null)}
        </div>
        <div class="matrix section-gap">
          <div class="card"><h3>👥 Win new customers</h3><div class="rows">${['marketing_sales', 'new_distribution', 'market_expansion', 'acquisitions'].map(drv).join('')}</div></div>
          <div class="card"><h3>💰 Existing customers spend more</h3><div class="rows">${['pricing_power', 'new_products', 'retention'].map(drv).join('')}</div></div>
        </div>`;
    },

    metrics(el, d) {
      const ms = d.metrics || [];
      const greens = ms.filter(m => m.score === 'green').length;
      const h = d.history || {};
      const cur = d.currency || ccy;
      const has = arr => Array.isArray(arr) && arr.some(NL.isNum);
      el.innerHTML = `
        <div class="grid g3">
          ${tile('Overall phase health', d.health ? NL.statusPill(d.health) : null, `${greens} of ${ms.length} metrics green`)}
          ${tile('Phase used', d.phase && NL.PHASES[d.phase] ? `${NL.PHASES[d.phase].emoji} ${d.phase}: ${NL.PHASES[d.phase].name}` : null)}
          ${tile('Score split', `<span class="num">🟢 ${greens} · 🟡 ${ms.filter(m => m.score === 'yellow').length} · 🔴 ${ms.filter(m => m.score === 'red').length}</span>`, ms.some(m => m.score === 'na') ? `${ms.filter(m => m.score === 'na').length} not available` : '')}
        </div>
        <div class="card section-gap"><h3>Phase ${E(d.phase ?? '')} scorecard</h3><div class="table-scroll"><table class="score">
          <thead><tr><th>Metric</th><th>Score</th><th>Current value</th><th>Green target</th><th>Trend</th></tr></thead>
          <tbody>${ms.map(m => `<tr><td><b>${E(m.name)}</b></td><td>${NL.statusPill(m.score)}</td><td class="num">${E(m.value ?? '—')}</td><td class="secondary">${E(m.target ?? '')}</td><td>${NL.trendArrow(m.trend)}</td></tr>`).join('')}</tbody>
        </table></div></div>
        ${has(h.net_sales) || has(h.operating_margin_pct) || has(h.free_cash_flow) || has(h.dividend_per_share) ? `
        <div class="grid g2 section-gap">
          ${has(h.net_sales) ? canvasCard('Net sales', 'h1', `${E(cur)} millions`) : ''}
          ${has(h.operating_margin_pct) ? canvasCard('Operating margin', 'h2', '% of net sales') : ''}
          ${has(h.free_cash_flow) ? canvasCard('Free cash flow', 'h3', `${E(cur)} millions`) : ''}
          ${has(h.dividend_per_share) ? canvasCard('Dividend per share', 'h4', `${E(cur)} per share, by fiscal year`) : ''}
        </div><p class="chart-note">From the annual reports (see sources below). Empty bars = not available.</p>` : ''}`;
      const y = h.years || [];
      if (has(h.net_sales)) historyChart(document.getElementById('h1'), y, h.net_sales);
      if (has(h.operating_margin_pct)) historyChart(document.getElementById('h2'), y, h.operating_margin_pct, { type: 'line', suffix: '%', decimals: 1 });
      if (has(h.free_cash_flow)) historyChart(document.getElementById('h3'), y, h.free_cash_flow);
      if (has(h.dividend_per_share)) historyChart(document.getElementById('h4'), y, h.dividend_per_share, { decimals: 2 });
    },

    risk(el, d) {
      const N = { concentration: ['🧩 Concentration', 'Depends on a few customers?'], disruption: ['🔄 Disruption', 'Could new technology replace it?'], outside_forces: ['🌍 Outside forces', 'Economy, rules, rates, currency'], competition: ['🏁 Competition', 'Price pressure from rivals?'] };
      const ratingPill = r => { const s = String(r || '').toLowerCase(); const lab = { red: 'High', yellow: 'Normal', green: 'Low' }[s] || '—'; return NL.statusPill(s, `${cap(s) || '—'} · ${lab}`); };
      const sc = NL.isNum(d.score) ? Math.min(3, Math.max(1, d.score)) : null;
      el.innerHTML = `
        <div class="grid g2">
          <div class="card"><div class="card-title-row"><h3>Overall execution risk</h3>${d.overall ? NL.riskPill(d.overall) : ''}</div>
            ${sc != null ? `<div class="gauge"><div class="marker" style="left:${(sc - 1) / 2 * 100}%"></div></div><div class="gauge-labels"><span>1.0 Low</span><span>Score ${sc.toFixed(1)}</span><span>3.0 High</span></div>` : '<p class="muted">No score.</p>'}
            <p class="chart-note">Average of the four ratings: Green = 1, Yellow = 2, Red = 3.</p>
          </div>
          <div class="card"><h3>How to read it</h3><p class="secondary" style="margin:0;font-size:14px">Green means the risk is low for this company, red means it is high. The arrow shows whether the risk is rising or falling. Read the evidence in the full analysis below.</p></div>
        </div>
        <div class="card section-gap"><h3>The four risks</h3><div class="rows">
          ${Object.keys(N).map(k => { const f = d.factors?.[k] || {}; return `<div class="row"><div><div class="name">${N[k][0]}</div><div class="muted" style="font-size:12px">${N[k][1]}</div></div><div>${ratingPill(f.rating)}</div><div class="secondary">${NL.trendArrow(f.trend)} <span class="muted" style="font-size:12px">· evidence ${E(f.evidence || '—')}</span></div></div>`; }).join('')}
        </div></div>`;
    },

    valuation(el, d) {
      const cur = d.currency || ccy;
      const mult = v => NL.isNum(v) ? v.toFixed(1) + 'x' : null;
      // If the price has moved since the analysis, scale the multiple (same earnings, new price)
      let scaled = null;
      if (NL.isNum(d.share_price) && d.share_price > 0 && NL.isNum(last) && NL.isNum(d.primary?.value)) scaled = d.primary.value * last / d.share_price;
      const moved = scaled != null ? (last / d.share_price - 1) * 100 : null;
      const peers = (d.peers || []).filter(x => NL.isNum(x.value));
      el.innerHTML = `
        <div class="grid g4">
          ${tile(`🥇 Primary: ${E(d.primary?.abbr || '—')}`, mult(d.primary?.value), `${E(d.primary?.name || '')} · ${E(d.primary?.basis || '')}`)}
          ${tile(`🥈 Secondary: ${E(d.secondary?.abbr || '—')}`, mult(d.secondary?.value), `${E(d.secondary?.name || '')} · ${E(d.secondary?.basis || '')}`)}
          ${tile('Share price at analysis', NL.isNum(d.share_price) ? `${NL.fmt(d.share_price)} <span class="muted" style="font-size:14px">${E(cur)}</span>` : null, d.price_date ? NL.dateStr(d.price_date) : '')}
          ${tile(`${E(d.primary?.abbr || 'Multiple')} at today's price`, scaled != null ? scaled.toFixed(1) + 'x' : null, moved != null ? `Price ${NL.pct(moved)} since analysis – estimate, same earnings` : 'Needs price data')}
        </div>
        <div class="grid g2 section-gap">
          ${peers.length ? canvasCard(`${E(d.primary?.abbr || '')} vs peers`, 'peerc', 'Each peer value comes from the source listed in the full analysis.') : `<div class="card"><h3>Peer comparison</h3><p class="muted">No sourced peer values in this analysis.</p></div>`}
          <div class="card"><h3>❌ Metrics to ignore in this phase</h3><div class="tags">${(d.ignore || []).map(t => `<span class="tag">${E(t)}</span>`).join('') || '<span class="muted">—</span>'}</div>
            ${NL.isNum(d.market_cap_m) ? `<p class="chart-note" style="margin-top:16px">Market cap used: ${NL.millions(d.market_cap_m, cur)}</p>` : ''}</div>
        </div>`;
      if (peers.length) {
        const rows = [{ name: c.name, value: d.primary.value, me: true }].concat(peers).filter(x => NL.isNum(x.value)).sort((a, b) => a.value - b.value);
        document.getElementById('peerc').parentElement.style.height = Math.max(180, rows.length * 44 + 40) + 'px';
        barChart(document.getElementById('peerc'), rows.map(r => r.name), rows.map(r => r.value), { suffix: 'x', decimals: 1, colors: rows.map(r => r.me ? NL.cssVar('--series-1') : '#5f5e5a') });
      }
    },

    sentiment(el, d) {
      const s = NL.sliceRange(p, '1Y');
      let stats = '';
      if (s && s.close.length > 20) {
        const full = p.close, n = full.length;
        const ma50 = NL.movingAverage(full, 50), ma200 = NL.movingAverage(full, 200);
        const off = n - s.close.length;
        const lastP = s.close[s.close.length - 1];
        const chg = (lastP / s.close[0] - 1) * 100;
        const lo = Math.min(...s.close), hi = Math.max(...s.close);
        const m200 = ma200[n - 1];
        let vsIx = null;
        if (ip?.dates?.length) { const a0 = NL.closeOnOrBefore(ip, s.dates[0]), a1 = NL.closeOnOrBefore(ip, s.dates[s.dates.length - 1]); if (a0 && a1) vsIx = chg - (a1 / a0 - 1) * 100; }
        stats = `<div class="grid g4">
          ${tile('1-year change', `<span class="${NL.signClass(chg)}">${NL.pct(chg)}</span>`, `${NL.dateStr(s.dates[0])} – ${NL.dateStr(s.dates[s.dates.length - 1])}`)}
          ${tile('52-week range', `<span class="num" style="font-size:20px">${NL.fmt(lo)} – ${NL.fmt(hi)}</span>`, `${E(ccy)} · now ${NL.fmt(lastP)}`)}
          ${tile('vs 200-day average', m200 ? (lastP > m200 * 1.005 ? 'Above' : lastP < m200 * 0.995 ? 'Below' : 'At') : null, m200 ? `200-day avg ${NL.fmt(m200)} ${E(ccy)}` : 'Needs 200 days of data')}
          ${tile(`vs ${E(c.benchmark_name || 'index')}`, vsIx != null ? `<span class="${NL.signClass(vsIx)}">${vsIx >= 0 ? 'Outperform' : 'Underperform'}</span>` : null, vsIx != null ? `by ${Math.abs(vsIx).toFixed(1)} percentage points` : 'Index data not available')}
        </div>
        <div class="card section-gap"><div class="card-title-row"><h3>1-year price</h3><div class="legend"><span><span class="sw" style="background:var(--series-1)"></span>Price</span><span><span class="sw" style="background:var(--series-2)"></span>50-day avg</span><span><span class="sw" style="background:var(--series-3)"></span>200-day avg</span></div></div>
          <div class="chart-box"><canvas id="sp"></canvas></div>
          <div class="chart-note">Calculated by this website from Yahoo Finance daily closes – always up to date, independent of the AI analysis.</div></div>`;
        setTimeout(() => keepChart(new Chart(document.getElementById('sp'), {
          type: 'line',
          data: { labels: s.dates, datasets: [
            { label: 'Price', data: s.close, borderColor: NL.cssVar('--series-1'), borderWidth: 2, pointRadius: 0, tension: 0.1 },
            { label: '50-day avg', data: ma50.slice(off), borderColor: NL.cssVar('--series-2'), borderWidth: 2, pointRadius: 0, tension: 0.1 },
            { label: '200-day avg', data: ma200.slice(off), borderColor: NL.cssVar('--series-3'), borderWidth: 2, pointRadius: 0, tension: 0.1 },
          ] },
          options: {
            interaction: { mode: 'index', intersect: false },
            scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: innerWidth < 640 ? 3 : 6, maxRotation: 0, autoSkipPadding: 16, callback(v) { return NL.dateStr(this.getLabelForValue(v)).replace(/^\d+ /, ''); } } }, y: { position: 'right', grid: { color: NL.cssVar('--grid') } } },
            plugins: { tooltip: { callbacks: { title: i => NL.dateStr(i[0].label), label: i => ` ${i.dataset.label}: ${NL.isNum(i.raw) ? NL.fmt(i.raw) : '—'} ${ccy}` } } },
          },
        })), 0);
      } else {
        stats = `<div class="card"><p class="muted" style="margin:0">No price data yet – the price numbers and chart appear after the first price update.</p></div>`;
      }
      el.innerHTML = `
        <div class="card"><div class="card-title-row"><h3>Sentiment snapshot</h3>${d.period_start ? `<span class="muted" style="font-size:13px">News from ${NL.dateStr(d.period_start)} – ${NL.dateStr(d.period_end)}</span>` : ''}</div>
          <div class="grid g4">
            ${tile('12-month outlook', d.outlook ? NL.statusPill(d.outlook) : null)}
            ${tile('Analysts', d.analyst?.tone ? NL.statusPill(d.analyst.tone) : null, d.analyst?.confidence ? 'Confidence: ' + E(d.analyst.confidence) : '')}
            ${tile('Investors', d.investor?.tone ? NL.statusPill(d.investor.tone) : null, d.investor?.confidence ? 'Confidence: ' + E(d.investor.confidence) : '')}
            ${tile('Media', d.media?.tone ? NL.statusPill(d.media.tone) : null)}
          </div>
          ${d.next_catalyst ? `<p class="secondary" style="margin:14px 0 0">📅 <b>Next catalyst:</b> ${E(d.next_catalyst)}${d.next_catalyst_date ? ' · ' + NL.dateStr(d.next_catalyst_date) : ''}</p>` : ''}
        </div>
        <div class="section-gap">${stats}</div>`;
    },
  };

  show(location.hash.slice(1) || 'overview', false);
})();
