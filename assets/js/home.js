/* Home page: the watchlist of companies */
(async function () {
  NL.chartDefaults();
  NL.initSearch();
  const grid = document.getElementById('grid');
  let list;
  try { list = await NL.companies(); }
  catch (e) {
    grid.innerHTML = `<div class="error-box">Could not read <code>data/companies.json</code>. If you just edited it, check for a missing comma or quote. (${NL.escapeHTML(e.message)})</div>`;
    return;
  }
  if (!list.length) { grid.innerHTML = `<div class="card">No companies yet. Add one in <code>data/companies.json</code>.</div>`; return; }

  // Load prices and the phase/moat/risk summaries for each company
  const rows = await Promise.all(list.map(async c => {
    const [p, phaseTxt, moatTxt, riskTxt, done] = await Promise.all([
      NL.prices(c.id),
      NL.getText(`data/analyses/${c.id}/01-business-phase.md`),
      NL.getText(`data/analyses/${c.id}/03-moat.md`),
      NL.getText(`data/analyses/${c.id}/06-risk.md`),
      countDone(c.id),
    ]);
    return {
      c, p, done,
      phase: NL.parseAnalysis(phaseTxt)?.data,
      moat: NL.parseAnalysis(moatTxt)?.data,
      risk: NL.parseAnalysis(riskTxt)?.data,
    };
  }));

  async function countDone(id) {
    const checks = await Promise.all(NL.ANALYSES.map(a => fetch(`data/analyses/${id}/${a.file}`, { method: 'HEAD', cache: 'no-store' }).then(r => r.ok).catch(() => false)));
    return checks;
  }

  // Country filter chips
  const countries = [...new Set(list.map(c => c.country))];
  const filters = document.getElementById('filters');
  let current = 'ALL';
  const chips = [['ALL', 'All']].concat(countries.map(k => [k, `${NL.COUNTRIES[k]?.flag || ''} ${NL.COUNTRIES[k]?.name || k}`]));
  filters.innerHTML = chips.map(([k, l]) => `<button class="chip ${k === 'ALL' ? 'active' : ''}" data-k="${k}">${l}</button>`).join('');
  filters.addEventListener('click', e => {
    const b = e.target.closest('.chip'); if (!b) return;
    current = b.dataset.k;
    filters.querySelectorAll('.chip').forEach(x => x.classList.toggle('active', x === b));
    draw();
  });

  function draw() {
    grid.innerHTML = '';
    rows.filter(r => current === 'ALL' || r.c.country === current)
      .sort((a, b) => a.c.name.localeCompare(b.c.name, 'sv'))
      .forEach(r => grid.appendChild(card(r)));
  }

  function card({ c, p, phase, moat, risk, done }) {
    const a = document.createElement('a');
    a.className = 'company-card';
    a.href = `company.html?id=${encodeURIComponent(c.id)}`;
    const last = p?.last_close, prev = p?.prev_close;
    const chg = NL.isNum(last) && NL.isNum(prev) && prev ? (last / prev - 1) * 100 : null;
    const ph = phase?.phase && NL.PHASES[phase.phase];
    const nDone = done.filter(Boolean).length;
    a.innerHTML = `
      <div class="cc-top">
        <div>
          <div class="cc-name">${NL.escapeHTML(c.name)}</div>
          <div class="cc-meta">${NL.escapeHTML(c.id)} · ${NL.COUNTRIES[c.country]?.flag || ''} ${NL.escapeHTML(c.exchange || '')}</div>
        </div>
        <div class="cc-price">
          <div class="p num">${NL.isNum(last) ? `${NL.fmt(last)} <span class="muted" style="font-size:12px;font-weight:500">${NL.escapeHTML(p?.currency || c.currency || '')}</span>` : ''}</div>
          <div class="c num ${NL.signClass(chg)}">${NL.pct(chg, 2)}</div>
        </div>
      </div>
      <div class="cc-spark"><canvas></canvas></div>
      <div class="cc-badges">
        ${c.demo ? '<span class="pill warning"><span class="dot"></span>Sample data</span>' : ''}
        ${ph ? `<span class="pill info"><span class="dot"></span>${ph.emoji} Phase ${phase.phase}: ${ph.name}</span>` : ''}
        ${moat?.moat_size ? `<span class="pill"><span class="dot"></span>${NL.escapeHTML(moat.moat_size)} moat</span>` : ''}
        ${risk?.overall ? NL.riskPill(risk.overall) : ''}
      </div>
      <div class="cc-progress">${done.map(d => `<span class="${d ? 'done' : ''}"></span>`).join('')}</div>
      <div class="cc-progress-label">${nDone} of 8 analyses done</div>`;
    // 1-year sparkline
    const s = NL.sliceRange(p, '1Y');
    if (s && s.close.length > 2 && window.Chart) {
      const up = s.close[s.close.length - 1] >= s.close[0];
      new Chart(a.querySelector('canvas'), {
        type: 'line',
        data: { labels: s.dates, datasets: [{ data: s.close, borderColor: up ? NL.cssVar('--up') : NL.cssVar('--down'), borderWidth: 2, pointRadius: 0, tension: 0.2 }] },
        options: { responsive: true, plugins: { tooltip: { enabled: false } }, scales: { x: { display: false }, y: { display: false } }, events: [] },
      });
    } else {
      a.querySelector('.cc-spark').innerHTML = '<div class="muted" style="font-size:12px;padding-top:14px">No price data yet – updates after the first price run.</div>';
    }
    return a;
  }

  draw();
})();
