(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  /* ---------- Theme ---------- */
  const root = document.documentElement;
  function isDark() {
    if (root.dataset.theme) return root.dataset.theme === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  $('.theme-toggle').addEventListener('click', () => {
    root.dataset.theme = isDark() ? 'light' : 'dark';
    try { localStorage.setItem('theme', root.dataset.theme); } catch (e) {}
    window.dispatchEvent(new Event('themechange'));
  });

  /* ---------- Scroll progress, nav state, active link ---------- */
  const bar = $('.progress span');
  const nav = $('.nav');
  const links = $$('.nav-links a');
  const sections = links.map((a) => $(a.getAttribute('href')));
  const flow = $('.flow');
  function onScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    bar.style.setProperty('--p', max > 0 ? scrollY / max : 0);
    nav.classList.toggle('scrolled', scrollY > 20);
    let current = -1;
    sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top < innerHeight * 0.4) current = i; });
    links.forEach((a, i) => a.classList.toggle('active', i === current));
    if (flow) {
      const r = flow.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * 0.85 - r.top) / (r.height + innerHeight * 0.35)));
      flow.style.setProperty('--flow', p.toFixed(3));
    }
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Cursor glow ---------- */
  const glow = $('.cursor-glow');
  if (!reduced && matchMedia('(hover: hover)').matches) {
    addEventListener('pointermove', (e) => {
      glow.style.setProperty('--x', e.clientX + 'px');
      glow.style.setProperty('--y', e.clientY + 'px');
    }, { passive: true });
  }

  /* ---------- Split headline ---------- */
  $$('.split').forEach((el) => {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute('aria-label', el.textContent.trim());
    el.innerHTML = words.map((w, i) => `<span class="word" aria-hidden="true"><span style="--i:${i}">${w}</span></span>`).join(' ');
  });

  /* ---------- Count-up ---------- */
  function countUp(el) {
    const to = parseFloat(el.dataset.to);
    const dec = parseInt(el.dataset.dec || '0', 10);
    if (reduced) { el.textContent = to.toFixed(dec); return; }
    const start = performance.now();
    const dur = 1600;
    (function tick(now) {
      const t = Math.min(1, (now - start) / dur);
      el.textContent = (to * easeOut(t)).toFixed(dec);
      if (t < 1) requestAnimationFrame(tick);
    })(start);
  }

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      el.classList.add('in');
      $$('.count', el).forEach(countUp);
      if (el.classList.contains('tilt')) setTimeout(() => el.classList.add('ready'), 1100);
      io.unobserve(el);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal, .heat').forEach((el) => io.observe(el));

  /* ---------- Tilt + spotlight ---------- */
  if (!reduced && matchMedia('(hover: hover)').matches) {
    $$('.tilt').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width;
        const y = (e.clientY - r.top) / r.height;
        el.style.setProperty('--sx', x * 100 + '%');
        el.style.setProperty('--sy', y * 100 + '%');
        el.style.setProperty('--rx', ((0.5 - y) * 8).toFixed(2) + 'deg');
        el.style.setProperty('--ry', ((x - 0.5) * 10).toFixed(2) + 'deg');
        el.classList.add('tilting');
      });
      el.addEventListener('pointerleave', () => {
        el.classList.remove('tilting');
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });

    /* Magnetic buttons */
    $$('.magnetic').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', (e.clientX - r.left - r.width / 2) * 0.25 + 'px');
        el.style.setProperty('--my', (e.clientY - r.top - r.height / 2) * 0.35 + 'px');
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--mx', '0px'); el.style.setProperty('--my', '0px'); });
    });
  }

  /* Ripple on every button */
  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.btn, .segmented button');
    if (!btn || reduced) return;
    const r = btn.getBoundingClientRect();
    const size = Math.max(r.width, r.height);
    const s = document.createElement('span');
    s.className = 'ripple';
    s.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    btn.appendChild(s);
    s.addEventListener('animationend', () => s.remove());
  });

  /* ---------- Formatting ---------- */
  const sek = (v) => {
    const a = Math.abs(v);
    const s = a >= 1e6 ? (a / 1e6).toFixed(2) + 'M' : a >= 1e3 ? Math.round(a / 1e3) + 'k' : Math.round(a).toString();
    return (v < 0 ? '–' : '') + 'SEK ' + s;
  };
  const pct = (v, d = 1) => (v * 100).toFixed(d) + '%';

  /* ---------- Playground ---------- */
  const { SCENARIOS, run } = window.CobotModel;
  const sliders = $$('.controls input[type="range"]');
  const seg = $('.segmented');
  const segBtns = $$('button', seg);
  const fmt = {
    shifts: (v) => (+v).toFixed(1).replace('.0', ''),
    laborCost: (v) => 'SEK ' + v + '/h',
    realization: (v) => pct(+v, 0),
    uptime: (v) => pct(+v, 0),
    discount: (v) => pct(+v, 1),
  };
  let scenarioKey = 'base';
  let state = { ...SCENARIOS.base };
  let lastDecision = null;

  function paintSlider(input) {
    const p = (input.value - input.min) / (input.max - input.min);
    input.style.setProperty('--fill', p * 100 + '%');
    const out = $(`output[data-for="${input.name}"]`);
    out.textContent = fmt[input.name](input.value);
  }

  function loadScenario(key) {
    scenarioKey = key;
    state = { ...SCENARIOS[key] };
    segBtns.forEach((b, i) => {
      const on = b.dataset.scenario === key;
      b.setAttribute('aria-selected', on);
      if (on) seg.style.setProperty('--i', i);
    });
    sliders.forEach((s) => { s.value = state[s.name]; paintSlider(s); });
    update();
  }

  // Animated number tween for result tiles
  const tweens = new Map();
  function tweenText(el, to, format) {
    const from = tweens.has(el) ? tweens.get(el).value : to;
    const start = performance.now();
    const dur = reduced ? 0 : 600;
    const rec = { value: from };
    tweens.set(el, rec);
    (function tick(now) {
      if (tweens.get(el) !== rec) return;
      const t = dur ? Math.min(1, (now - start) / dur) : 1;
      rec.value = from + (to - from) * easeOut(t);
      el.textContent = format(rec.value);
      if (t < 1) requestAnimationFrame(tick);
    })(start);
  }

  const els = {
    npv: $('#r-npv'), irr: $('#r-irr'), payback: $('#r-payback'), roi: $('#r-roi'),
    capex: $('#r-capex'), savings: $('#r-savings'), hours: $('#r-hours'), decision: $('#decision'),
  };

  function update() {
    const r = run(state);
    tweenText(els.npv, r.npv, sek);
    els.npv.className = r.npv < 0 ? 'neg' : 'pos';
    if (r.irr === null) { tweens.delete(els.irr); els.irr.textContent = 'n.m.'; }
    else tweenText(els.irr, r.irr, (v) => pct(v));
    if (r.payback === null) { tweens.delete(els.payback); els.payback.textContent = 'Not reached'; }
    else tweenText(els.payback, r.payback, (v) => v.toFixed(2) + ' yrs');
    tweenText(els.roi, r.roi, (v) => pct(v));
    els.roi.className = r.roi < 0 ? 'neg' : '';
    tweenText(els.capex, r.capex, sek);
    tweenText(els.savings, r.year1Savings, sek);
    tweenText(els.hours, r.hours, (v) => Math.round(v).toLocaleString('en-US'));

    if (r.decision !== lastDecision) {
      const d = els.decision;
      d.classList.remove('flip'); void d.offsetWidth; d.classList.add('flip');
      setTimeout(() => {
        d.textContent = r.decision;
        d.className = 'decision chip flip ' + (r.decision === 'INVEST NOW' ? 'chip-invest' : r.decision === 'RUN PILOT' ? 'chip-pilot' : 'chip-retain');
      }, lastDecision === null ? 0 : 300);
      lastDecision = r.decision;
    }
    drawChart(r);
  }

  segBtns.forEach((b) => b.addEventListener('click', () => loadScenario(b.dataset.scenario)));
  sliders.forEach((s) => s.addEventListener('input', () => {
    state[s.name] = parseFloat(s.value);
    paintSlider(s);
    const out = $(`output[data-for="${s.name}"]`);
    out.classList.add('bump');
    clearTimeout(out._t);
    out._t = setTimeout(() => out.classList.remove('bump'), 160);
    update();
  }));
  $('.reset').addEventListener('click', () => loadScenario(scenarioKey));

  /* ---------- Cash-flow chart (SVG, tweened) ---------- */
  const svg = $('#cf-chart');
  const NS = 'http://www.w3.org/2000/svg';
  let chartFrom = null;
  let chartTo = null;
  let chartAnim = 0;
  const H = 240;

  function niceScale(values) {
    const max = Math.max(0, ...values);
    const min = Math.min(0, ...values);
    const pad = (max - min) * 0.12 || 1;
    return { max: max + pad, min: min - pad };
  }

  function renderChart(data) {
    const W = svg.clientWidth || 600;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    const { max, min } = niceScale([...data.fcf, ...data.cum]);
    const y = (v) => ((max - v) / (max - min)) * H;
    const col = W / 6;
    const bw = Math.min(56, col * 0.5);
    const pos = cssVar('--accent');
    const neg = cssVar('--neg');
    let out = `<defs><linearGradient id="gpos" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${pos}"/><stop offset="1" stop-color="${cssVar('--accent-2')}"/></linearGradient></defs>`;
    out += `<line class="zero" x1="0" x2="${W}" y1="${y(0)}" y2="${y(0)}"/>`;
    data.fcf.forEach((v, i) => {
      const x = col * i + (col - bw) / 2;
      const top = Math.min(y(v), y(0));
      const h = Math.abs(y(v) - y(0));
      out += `<rect class="bar" x="${x}" y="${top}" width="${bw}" height="${Math.max(1, h)}" rx="6" fill="${v < 0 ? neg : 'url(#gpos)'}" opacity="${v < 0 ? 0.85 : 1}"><title>Year ${i}: ${sek(v)}</title></rect>`;
    });
    const pts = data.cum.map((v, i) => [col * i + col / 2, y(v)]);
    out += `<path class="cum" d="M${pts.map((p) => p.join(',')).join(' L')}"/>`;
    pts.forEach((p, i) => { out += `<circle class="dot" cx="${p[0]}" cy="${p[1]}" r="4"><title>Cumulative Y${i}: ${sek(data.cum[i])}</title></circle>`; });
    const last = pts[pts.length - 1];
    const labelY = Math.max(12, Math.min(last[1], y(Math.max(0, data.fcf[data.fcf.length - 1]))) - 10);
    out += `<text class="lbl" x="${last[0] + bw / 2}" y="${labelY}" text-anchor="end">Cumulative ${sek(data.cum[data.cum.length - 1])}</text>`;
    svg.innerHTML = out;
  }

  function drawChart(r) {
    const target = { fcf: r.fcf.slice(), cum: r.cumulative.slice() };
    const from = chartFrom || { fcf: target.fcf.map(() => 0), cum: target.cum.map(() => 0) };
    chartTo = target;
    const start = performance.now();
    const dur = reduced ? 0 : 700;
    const id = ++chartAnim;
    (function tick(now) {
      if (id !== chartAnim) return;
      const t = dur ? Math.min(1, (now - start) / dur) : 1;
      const k = easeOut(t);
      const lerp = (a, b) => a.map((v, i) => v + (b[i] - v) * k);
      chartFrom = { fcf: lerp(from.fcf, target.fcf), cum: lerp(from.cum, target.cum) };
      renderChart(chartFrom);
      if (t < 1) requestAnimationFrame(tick);
    })(start);
  }
  addEventListener('resize', () => chartFrom && renderChart(chartFrom));
  addEventListener('themechange', () => chartFrom && renderChart(chartFrom));

  // Draw the chart from zero once it scrolls into view
  let started = false;
  new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting && !started) { started = true; loadScenario('base'); obs.disconnect(); }
  }, { threshold: 0.2 }).observe($('#playground'));
  sliders.forEach((s) => { s.value = state[s.name]; paintSlider(s); });

  /* ---------- Sensitivity heatmap ---------- */
  const heat = $('#heat');
  const tip = $('#heat-tip');
  const costs = [350, 400, 450, 500, 550];
  const shifts = [1, 1.5, 2, 2.5, 3];
  function heatColor(v, maxAbs) {
    const t = Math.min(1, Math.abs(v) / maxAbs);
    return v < 0
      ? `hsl(0 ${55 + 25 * t}% ${58 - 18 * t}%)`
      : `hsl(${165 - 15 * t} ${45 + 25 * t}% ${50 - 20 * t}%)`;
  }
  (function buildHeat() {
    const vals = shifts.map((s) => costs.map((c) => run({ ...SCENARIOS.base, shifts: s, laborCost: c }).npv));
    const maxAbs = Math.max(...vals.flat().map(Math.abs));
    let html = '<div class="h" role="columnheader">Shifts \\ SEK/h</div>';
    costs.forEach((c) => { html += `<div class="h" role="columnheader">${c}</div>`; });
    shifts.forEach((s, i) => {
      html += `<div class="h" role="rowheader">${s}</div>`;
      costs.forEach((c, j) => {
        const v = vals[i][j];
        const base = s === 2 && c === 450 ? ' base' : '';
        html += `<div class="cell${base}" role="cell" tabindex="0" data-s="${s}" data-c="${c}" data-v="${v}" style="--c:${heatColor(v, maxAbs)};--d:${(i + j) * 0.05}s">${sek(v).replace('SEK ', '')}</div>`;
      });
    });
    heat.innerHTML = html;
    const show = (cell) => {
      const v = +cell.dataset.v;
      tip.innerHTML = `<b>${cell.dataset.s} shift${cell.dataset.s === '1' ? '' : 's'}</b> at <b>SEK ${cell.dataset.c}/h</b> → NPV <b style="color:${v < 0 ? 'var(--neg)' : 'var(--pos)'}">${sek(v)}</b>${cell.classList.contains('base') ? ' · base operating point' : ''}`;
    };
    heat.addEventListener('pointerover', (e) => { const c = e.target.closest('.cell'); if (c) show(c); });
    heat.addEventListener('focusin', (e) => { const c = e.target.closest('.cell'); if (c) show(c); });
  })();

  /* ---------- Hero canvas: robot arm palletizing ---------- */
  const canvas = $('#cell');
  const ctx = canvas.getContext('2d');
  const CW = 520, CH = 440;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = CW * dpr; canvas.height = CH * dpr;
  ctx.scale(dpr, dpr);

  let colors = {};
  function readColors() {
    colors = {
      text: cssVar('--text'), muted: cssVar('--muted'), accent: cssVar('--accent'),
      accent2: cssVar('--accent-2'), accent3: cssVar('--accent-3'), border: cssVar('--border'),
      surface: cssVar('--surface-solid'), bg2: cssVar('--bg-2'),
    };
  }
  readColors();
  addEventListener('themechange', () => { readColors(); if (reduced) requestAnimationFrame(frame); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { readColors(); chartFrom && renderChart(chartFrom); });

  const BASE = { x: 270, y: 330 };
  const L1 = 150, L2 = 135;
  const BOX = { w: 54, h: 32 };
  const PICK = { x: 112, y: 262 };
  const PALLET = { x: 340, y: 372, w: 140 };
  const slot = (n) => ({
    x: PALLET.x + 14 + (n % 2) * (BOX.w + 4) + BOX.w / 2,
    y: PALLET.y - 2 - Math.floor(n / 2) * BOX.h - BOX.h / 2 + BOX.h / 2,
  });
  const HOME = { x: 270, y: 150 };
  const CYCLE = 3.2; // seconds per carton

  function ik(px, py) {
    const dx = px - BASE.x, dy = py - (BASE.y - 40);
    let d = Math.hypot(dx, dy);
    d = Math.min(d, L1 + L2 - 1);
    const a = Math.atan2(dy, dx);
    const b = Math.acos((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d));
    const t1 = a - b; // elbow-up
    const ex = BASE.x + L1 * Math.cos(t1), ey = BASE.y - 40 + L1 * Math.sin(t1);
    return { ex, ey };
  }

  function path(t, target) {
    // Waypoints in tool-tip coordinates (bottom of gripper / top of carton)
    const above = (p) => ({ x: p.x, y: p.y - 70 });
    const pickTop = { x: PICK.x, y: PICK.y - BOX.h / 2 };
    const placeTop = { x: target.x, y: target.y - BOX.h };
    const wp = [
      [0.00, above(pickTop)], [0.14, pickTop], [0.22, pickTop], [0.36, above(pickTop)],
      [0.60, above(placeTop)], [0.74, placeTop], [0.82, placeTop], [1.00, above(pickTop)],
    ];
    for (let i = 0; i < wp.length - 1; i++) {
      const [t0, p0] = wp[i], [t1, p1] = wp[i + 1];
      if (t >= t0 && t <= t1) {
        const k = easeInOut((t - t0) / (t1 - t0 || 1));
        return { x: p0.x + (p1.x - p0.x) * k, y: p0.y + (p1.y - p0.y) * k };
      }
    }
    return above(pickTop);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h);
  }
  function drawBox(cx, topY, alpha = 1) {
    ctx.globalAlpha = alpha;
    roundRect(cx - BOX.w / 2, topY, BOX.w, BOX.h, 4);
    ctx.fillStyle = colors.accent3; ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    ctx.fillRect(cx - 4, topY, 8, BOX.h);
    ctx.globalAlpha = 1;
  }

  let t0 = performance.now();
  let running = true;
  function frame(now) {
    const time = reduced ? 1.1 : (now - t0) / 1000;
    const n = Math.floor(time / CYCLE) % 7; // 6 cartons then a reset beat
    const t = (time % CYCLE) / CYCLE;
    ctx.clearRect(0, 0, CW, CH);

    // Floor shadow
    const grd = ctx.createRadialGradient(BASE.x, 400, 10, BASE.x, 400, 260);
    grd.addColorStop(0, colors.border); grd.addColorStop(1, 'transparent');
    ctx.fillStyle = grd; ctx.fillRect(0, 360, CW, 80);

    // Conveyor
    roundRect(10, PICK.y + BOX.h / 2, 150, 14, 7);
    ctx.fillStyle = colors.bg2; ctx.fill();
    ctx.strokeStyle = colors.border; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = colors.muted;
    const off = reduced ? 0 : (time * 40) % 20;
    for (let x = 16 + off; x < 156; x += 20) { ctx.beginPath(); ctx.arc(x, PICK.y + BOX.h / 2 + 7, 2, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillRect(30, PICK.y + BOX.h / 2 + 14, 4, 70); ctx.fillRect(136, PICK.y + BOX.h / 2 + 14, 4, 70);

    // Pallet
    ctx.fillStyle = colors.muted;
    roundRect(PALLET.x, PALLET.y, PALLET.w, 10, 3); ctx.fill();
    [0, 0.5, 1].forEach((f) => ctx.fillRect(PALLET.x + 4 + f * (PALLET.w - 20), PALLET.y + 10, 12, 10));

    const resetBeat = n === 6;
    const carried = !resetBeat && t > 0.22 && t < 0.82;
    const placed = resetBeat ? 6 : n + (t >= 0.82 ? 1 : 0);
    const fade = resetBeat ? 1 - t : 1;

    // Stacked cartons
    for (let i = 0; i < placed; i++) { const s = slot(i); drawBox(s.x, s.y - BOX.h, fade); }

    // Incoming carton on conveyor
    if (!resetBeat) {
      let cx = PICK.x;
      if (t > 0.82) cx = PICK.x - 110 + 110 * easeOut((t - 0.82) / 0.18);
      if (t <= 0.22 || t > 0.82) drawBox(cx, PICK.y - BOX.h / 2, t > 0.82 ? (t - 0.82) / 0.18 : 1);
    }

    // Arm kinematics
    const target = slot(Math.min(n, 5));
    const tip = resetBeat ? (() => { const p = path(1, target); return { x: p.x + (HOME.x - p.x) * Math.sin(t * Math.PI) , y: p.y + (HOME.y - p.y) * Math.sin(t * Math.PI) }; })() : path(t, target);
    const wrist = { x: tip.x, y: tip.y - 26 };
    const { ex, ey } = ik(wrist.x, wrist.y);
    const sh = { x: BASE.x, y: BASE.y - 40 };

    // Base
    ctx.fillStyle = colors.surface; ctx.strokeStyle = colors.border; ctx.lineWidth = 1.5;
    roundRect(BASE.x - 34, BASE.y - 8, 68, 40, 8); ctx.fill(); ctx.stroke();
    roundRect(BASE.x - 20, BASE.y - 46, 40, 44, 10); ctx.fill(); ctx.stroke();

    // Links
    const link = (a, b, w) => {
      const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      g.addColorStop(0, colors.accent); g.addColorStop(1, colors.accent2);
      ctx.strokeStyle = g; ctx.lineWidth = w; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    };
    link(sh, { x: ex, y: ey }, 22);
    link({ x: ex, y: ey }, wrist, 16);
    [[sh, 15], [{ x: ex, y: ey }, 12], [wrist, 9]].forEach(([p, r]) => {
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = colors.surface; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = colors.text; ctx.stroke();
    });

    // Gripper
    ctx.fillStyle = colors.text;
    ctx.fillRect(wrist.x - 3, wrist.y, 6, 16);
    roundRect(wrist.x - 24, tip.y - 10, 48, 8, 3); ctx.fill();
    if (carried) {
      drawBox(tip.x, tip.y - 2);
      ctx.fillStyle = colors.accent;
      ctx.beginPath(); ctx.arc(wrist.x, wrist.y + 6, 3, 0, Math.PI * 2); ctx.fill();
    }

    // Counter
    ctx.fillStyle = colors.muted;
    ctx.font = '500 12px "JetBrains Mono", monospace';
    ctx.fillText(`cartons/h  ${resetBeat ? 'pallet change' : '250 design · 220 req'}`, 16, 426);

    if (running && !reduced) requestAnimationFrame(frame);
  }
  new IntersectionObserver((entries) => {
    const vis = entries[0].isIntersecting;
    if (vis && !running) { running = true; requestAnimationFrame(frame); }
    else if (!vis) running = false;
  }).observe(canvas);
  requestAnimationFrame(frame);
})();
