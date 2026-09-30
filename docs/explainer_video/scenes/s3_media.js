// Scene 3 (22–38s): load/search media -> split_shots (TransNetV2 scissors) -> understand_clips (VLM eye) -> filter/group.
(() => {
  const WS = [220, 300, 240, 280, 260, 260];
  const TAGS = ['海边', '日落', '虚焦', '街头', '抖动', '美食'];
  const BAD = [false, false, true, false, true, false];
  const CUT0 = 4.5, CUT_DT = 0.45;
  const tc = k => CUT0 + (k - 1) * CUT_DT;               // k = 1..5
  const gapK = (k, t) => 28 * Ease.outBack(prog(t, tc(k), tc(k) + 0.35));
  const STRIP_Y = 560, CARD_Y = 540, CARD_W = 230, SH_H = 170;
  const cardX = i => 250 + 284 * i;
  const SLOT = { 0: 420, 1: 680, 3: 1240, 5: 1500 };

  function xl(i, t) { // left edge of strip segment i
    let x = 115;
    for (let j = 0; j < i; j++) x += WS[j];
    for (let k = 1; k <= i; k++) x += gapK(k, t);
    return x;
  }
  const bx = (k, t) => xl(k, t) - gapK(k, t) / 2;           // boundary k x

  // a little landscape thumbnail, clipped to a rounded rect
  function thumb(ctx, x, y, w, h, k, t) {
    ctx.save();
    roundRect(ctx, x, y, w, h, 12); ctx.clip();
    const bg = [C.sky, C.peach, '#D9D3E6', C.pink, C.mint, C.butter][k];
    ctx.fillStyle = bg; ctx.fillRect(x, y, w, h);
    const cx = x + w / 2, cy = y + h / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    switch (k) {
      case 0: // sea
        ctx.beginPath(); ctx.arc(x + w * 0.75, y + h * 0.28, h * 0.14, 0, 7); ctx.fillStyle = C.butter; ctx.fill();
        ctx.fillStyle = C.blue; ctx.fillRect(x, y + h * 0.58, w, h * 0.42);
        ctx.strokeStyle = C.white; ctx.lineWidth = 4;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(x + 10, y + h * (0.68 + i * 0.1)); ctx.quadraticCurveTo(x + w * 0.25, y + h * (0.62 + i * 0.1), x + w * 0.5, y + h * (0.68 + i * 0.1)); ctx.quadraticCurveTo(x + w * 0.75, y + h * (0.74 + i * 0.1), x + w - 10, y + h * (0.68 + i * 0.1)); ctx.stroke(); }
        break;
      case 1: // sunset
        ctx.fillStyle = C.fire; ctx.beginPath(); ctx.arc(cx, y + h * 0.7, h * 0.26, Math.PI, 0); ctx.fill();
        ctx.fillStyle = C.claudeDark; ctx.fillRect(x, y + h * 0.7, w, h * 0.3);
        break;
      case 2: // blurry
        for (let i = 0; i < 4; i++) { ctx.fillStyle = `rgba(255,255,255,${0.3 + i * 0.05})`; ctx.beginPath(); ctx.arc(x + w * (0.2 + i * 0.2), cy + Math.sin(i * 2) * 20, 28 + i * 6, 0, 7); ctx.fill(); }
        break;
      case 3: // street
        ctx.fillStyle = C.lavender; ctx.fillRect(x + w * 0.1, y + h * 0.35, w * 0.25, h * 0.65); ctx.fillRect(x + w * 0.4, y + h * 0.2, w * 0.25, h * 0.8); ctx.fillStyle = C.sky; ctx.fillRect(x + w * 0.7, y + h * 0.45, w * 0.22, h * 0.55);
        ctx.fillStyle = C.butter; for (let i = 0; i < 3; i++) ctx.fillRect(x + w * 0.46, y + h * (0.3 + i * 0.2), 14, 14);
        break;
      case 4: // shaky
        ctx.strokeStyle = C.green; ctx.lineWidth = 8; ctx.beginPath();
        for (let i = 0; i <= 10; i++) { const px = x + w * i / 10, py = cy + (i % 2 ? -26 : 26); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke();
        break;
      case 5: // food
        ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(cx, cy, h * 0.33, 0, 7); ctx.fill();
        ctx.fillStyle = C.claude; ctx.beginPath(); ctx.arc(cx, cy, h * 0.2, 0, 7); ctx.fill();
        ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(cx + 10, cy - 8, h * 0.07, 0, 7); ctx.fill();
        break;
    }
    ctx.restore();
    ctx.save(); roundRect(ctx, x, y, w, h, 12); ctx.lineWidth = 4; ctx.strokeStyle = C.ink; ctx.stroke(); ctx.restore();
  }

  // film piece with sprocket bars (bar 1 = film, 0 = plain card)
  function seg(ctx, cx, cy, w, h, k, bar, t) {
    const pad = 24 * bar;
    if (bar < 0.6) { ctx.save(); roundRect(ctx, cx - w / 2 + 7, cy - h / 2 + 9, w, h, 12); ctx.fillStyle = `rgba(61,57,41,${0.14 * (1 - bar)})`; ctx.fill(); ctx.restore(); }
    if (bar > 0.02) {
      ctx.save(); roundRect(ctx, cx - w / 2, cy - h / 2 - pad, w, h + pad * 2, 10); ctx.fillStyle = C.ink; ctx.fill();
      ctx.fillStyle = C.cream;
      for (let x = cx - w / 2 + 12; x < cx + w / 2 - 12; x += 28) { ctx.fillRect(x, cy - h / 2 - pad + 6, 14, 10 * bar); ctx.fillRect(x, cy + h / 2 + pad - 16, 14, 10 * bar); }
      ctx.restore();
    }
    thumb(ctx, cx - w / 2, cy - h / 2, w, h, k, t);
  }

  // header chips, centred, scale in/out
  function header(ctx, t, a, b, items) {
    const sc = Math.min(popIn(t, a, 0.4), 1) * (1 - Ease.inCubic(prog(t, b - 0.25, b)));
    if (sc <= 0.01) return;
    ctx.font = `bold 36px ${MONO}`;
    const ws = items.map(it => ctx.measureText(it[0]).width + 50.4);
    const tot = ws.reduce((p, c) => p + c, 0) + 30 * (items.length - 1);
    let x = 960 - tot / 2;
    items.forEach((it, i) => { chip(ctx, it[0], x + ws[i] / 2, 105, { fill: it[1], size: 36, scale: sc * (popIn(t, a + i * 0.15, 0.4) > 0 ? 1 : 0) }); x += ws[i] + 30; });
  }

  function scissors(ctx, x, y, open, t) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI);
    const a = 0.1 + 0.4 * open;
    ctx.lineCap = 'round'; ctx.lineWidth = 12; ctx.strokeStyle = C.ink;
    for (const s of [-1, 1]) {
      ctx.save(); ctx.rotate(s * a);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -95); ctx.stroke();
      ctx.lineWidth = 6; ctx.strokeStyle = '#B8B8C8'; ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(0, -92); ctx.stroke();
      ctx.lineWidth = 10; ctx.strokeStyle = C.fire; ctx.beginPath(); ctx.arc(-s * 14, 40, 20, 0, 7); ctx.stroke();
      ctx.lineWidth = 12; ctx.strokeStyle = C.ink;
      ctx.restore();
    }
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill();
    ctx.restore();
  }

  function crossStamp(ctx, x, y, s) {
    if (s <= 0) return;
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-0.15);
    ctx.fillStyle = C.fire; ctx.strokeStyle = C.ink; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, 46, 0, 7); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = C.white; ctx.lineWidth = 11; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-18, -18); ctx.lineTo(18, 18); ctx.moveTo(18, -18); ctx.lineTo(-18, 18); ctx.stroke();
    ctx.restore();
  }

  registerScene('s3_media', {
    bg: C.cream,
    draw(ctx, t, dur) {
      // background sparkles
      const r = rng(33);
      for (let i = 0; i < 12; i++) {
        const x = 200 + r() * 1600, y = 40 + r() * 800, ph = r() * 6;
        sparkle(ctx, x, y, 7 + 9 * (0.5 + 0.5 * Math.sin(t * 2.5 + ph)), t * 0.8 + ph, [C.butter, C.pink, C.mint, C.sky][i % 4]);
      }
      // Claude cameo, top-left
      const mood = t < 1 ? 'wow' : t < 7.6 ? 'happy' : t < 11.6 ? 'think' : 'proud';
      drawClaude(ctx, 95, 115, 110, { t, mood, look: { x: 0.7, y: 0.2 }, blinkOffset: 0.5, wave: t > 14.3 ? 0.8 : 0 });

      // ---------- Phase A: sources ----------
      const aOut = 1 - Ease.inCubic(prog(t, 3.3, 3.8));
      if (aOut > 0.01) {
        const srcs = [
          { cx: 510, name: 'load_media', fill: C.sky, icon: 'folder', label: '本地导入', at: 0.45 },
          { cx: 1410, name: 'search_media', fill: C.mint, icon: 'search', label: 'Pexels 搜索', at: 0.8 },
        ];
        srcs.forEach(s => {
          const p = popIn(t, s.at, 0.5) * aOut;
          if (p <= 0) return;
          ctx.save(); ctx.translate(s.cx, 300); ctx.scale(p, p);
          card(ctx, -190, -105, 380, 210, { fill: s.fill, r: 34 });
          const bob = Math.sin(t * 4 + s.cx) * 4;
          icon(ctx, s.icon, -95, bob - 5, 90, C.ink);
          text(ctx, s.label, 50, 5, { size: 38, weight: 'bold' });
          ctx.restore();
          chip(ctx, s.name, s.cx, 135, { fill: s.fill, size: 36, scale: p });
        });
      }
      // segments fly in and snap together into one long film (or sit in the strip/cards later)
      for (let i = 0; i < 6; i++) {
        const fa = 1.3 + i * 0.35, fp = prog(t, fa, fa + 0.6);
        if (fp <= 0) continue;
        // target rect depending on phase
        const eC = Ease.inOut(prog(t, 7.2, 8.0));
        const w0 = WS[i], x0 = xl(i, t) + w0 / 2;
        let cx = lerp(x0, cardX(i), eC), cy = lerp(STRIP_Y, CARD_Y, eC), w = lerp(w0, CARD_W, eC);
        let bar = 1 - eC, alpha = 1, rot = 0, sc = 1;
        if (fp < 1) { // flying in
          const e = Ease.outCubic(fp), sx = i % 2 ? 1410 : 510;
          cx = lerp(sx, cx, e); cy = lerp(300, cy, e) - Math.sin(fp * Math.PI) * 110;
          sc = lerp(0.35, 1, e); rot = (1 - e) * (i % 2 ? 0.4 : -0.4);
        }
        // phase D
        const dkept = SLOT[i] !== undefined;
        if (t > 11.6) {
          if (dkept) { const e2 = Ease.inOut(prog(t, 13.7, 14.5)); cx = lerp(cardX(i), SLOT[i], e2); }
          else { const f = prog(t, 12.8, 13.5); cy += 170 * Ease.inCubic(f); rot = 0.35 * f * (i === 2 ? -1 : 1); alpha = 1 - prog(t, 13.0, 13.5); }
        }
        if (alpha <= 0.01) continue;
        ctx.save(); ctx.globalAlpha = alpha; ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(sc, sc);
        // tiny jiggle on landing
        const land = fp >= 1 ? Math.sin(clamp((t - fa - 0.6) / 0.3) * Math.PI) * 0.06 : 0;
        ctx.scale(1 + land, 1 - land);
        seg(ctx, 0, 0, w, SH_H, i, bar, t);
        ctx.restore();
      }

      // ---------- Phase B: split_shots ----------
      header(ctx, t, 3.8, 7.6, [['split_shots', C.mint], ['TransNetV2', C.lavender]]);
      if (t > 4.0 && t < 7.6) {
        const cp = Math.min(popIn(t, 4.0, 0.4), 1) * (1 - prog(t, 7.2, 7.5));
        text(ctx, '镜头边界检测：哪里切', 960, 215, { size: 38, color: C.inkSoft, alpha: cp });
        // scissors
        const k0 = 1;
        let sx;
        const enter = Ease.outCubic(prog(t, 3.9, 4.3));
        sx = lerp(-150, bx(1, t), enter);
        for (let k = 2; k <= 5; k++) {
          const dep = tc(k - 1) + 0.05, arr = tc(k) - 0.15;
          if (t >= dep) sx = t >= arr ? bx(k, t) : lerp(bx(k - 1, t), bx(k, t), Ease.inOut(prog(t, dep, arr)));
        }
        let open = 0;
        for (let k = 1; k <= 5; k++) { const d = t - tc(k); open = Math.max(open, d < 0 ? prog(d, -0.3, -0.08) : 1 - prog(d, 0, 0.12)); }
        const leave = Ease.inCubic(prog(t, 6.8, 7.3));
        scissors(ctx, sx, 385 - leave * 300, open, t);
        // dashed cut line to the boundary + flash
        for (let k = 1; k <= 5; k++) {
          const d = t - tc(k);
          if (d > -0.35 && d < 0) { ctx.save(); ctx.strokeStyle = C.fire; ctx.lineWidth = 4; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(bx(k, t), 440); ctx.lineTo(bx(k, t), 680); ctx.stroke(); ctx.restore(); }
          if (d > 0 && d < 0.45) sparkle(ctx, bx(k, t), STRIP_Y, 40 * (1 - d / 0.45), d * 8, C.butter);
        }
        // counter
        let n = 1; for (let k = 1; k <= 5; k++) if (t >= tc(k)) n++;
        text(ctx, `${n} 个镜头`, 960, 745, { size: 44, weight: 'bold', color: C.claudeDark, alpha: prog(t, 4.4, 4.7) * (1 - prog(t, 7.2, 7.5)) });
      }

      // ---------- Phase C: understand_clips ----------
      header(ctx, t, 7.6, 11.6, [['understand_clips', C.lavender], ['VLM', C.sky]]);
      if (t > 7.8 && t < 11.9) {
        const ep = Math.min(popIn(t, 7.9, 0.5), 1) * (1 - Ease.inCubic(prog(t, 11.4, 11.9)));
        const f = prog(t, 8.2, 11.0) * 5, ii = Math.min(Math.floor(f), 4), fr = f - ii;
        const ex = cardX(0) + 284 * (ii + Ease.inOut(clamp(fr * 1.6)));
        const ey = 262 + Math.sin(t * 5) * 6;
        // beam
        const cur = Math.round(ex / 284 - 250 / 284);
        if (t > 8.2 && t < 11.3) {
          ctx.save(); ctx.globalAlpha = 0.28 * ep; ctx.fillStyle = C.butter;
          ctx.beginPath(); ctx.moveTo(ex - 30, ey + 60); ctx.lineTo(ex + 30, ey + 60); ctx.lineTo(ex + 120, CARD_Y - 88); ctx.lineTo(ex - 120, CARD_Y - 88); ctx.closePath(); ctx.fill(); ctx.restore();
          // scan sweep band on the current card
          const sw = (t * 2.2) % 1;
          ctx.save(); ctx.beginPath(); ctx.rect(ex - 115, CARD_Y - 85, 230, 170); ctx.clip();
          ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(ex - 115, CARD_Y - 85 + sw * 170 - 12, 230, 24); ctx.restore();
        }
        ctx.save(); ctx.translate(ex, ey); ctx.scale(ep, ep);
        card(ctx, -95, -62, 190, 124, { fill: C.lavender, r: 30 });
        icon(ctx, 'eye', 0, -6, 92, C.ink);
        // pupil look-down hint
        text(ctx, 'VLM', 0, 44, { size: 26, weight: 'bold', mono: true, color: C.ink });
        ctx.restore();
      }
      // tags appear as the eye reaches each shot, persist through D
      for (let i = 0; i < 6; i++) {
        const at = 8.4 + i * 0.5;
        let p = popIn(t, at, 0.4);
        if (p <= 0) continue;
        let cx = cardX(i), cy = 690, alpha = 1;
        if (t > 11.6) {
          if (SLOT[i] !== undefined) cx = lerp(cardX(i), SLOT[i], Ease.inOut(prog(t, 13.7, 14.5)));
          else { alpha = 1 - prog(t, 13.0, 13.5); cy += 170 * Ease.inCubic(prog(t, 12.8, 13.5)); }
        }
        if (alpha <= 0.01) continue;
        ctx.save(); ctx.globalAlpha = alpha;
        chip(ctx, TAGS[i], cx, cy, { fill: BAD[i] && t > 12.1 ? C.pink : C.butter, size: 32, scale: p });
        ctx.restore();
        // tiny sparkle on tag reveal
        if (t - at < 0.4 && t > at) sparkle(ctx, cx + 70, cy - 26, 22 * (1 - (t - at) / 0.4), t * 6, C.white);
      }

      // ---------- Phase D: filter_clips + group_clips ----------
      header(ctx, t, 11.6, 99, [['filter_clips', C.peach], ['group_clips', C.mint]]);
      if (t > 11.8) {
        // reject stamps
        for (const i of [2, 4]) {
          const s = popIn(t, 12.2 + (i === 4 ? 0.3 : 0), 0.4) * (1 - prog(t, 13.0, 13.4));
          crossStamp(ctx, cardX(i), CARD_Y, s);
        }
        // group frames
        const groups = [{ x0: 280, x1: 820, label: '组 A · 海边日落', fill: C.mint, at: 13.3 }, { x0: 1100, x1: 1640, label: '组 B · 街头美食', fill: C.lavender, at: 13.45 }];
        groups.forEach(g => {
          const p = popIn(t, g.at, 0.5); if (p <= 0) return;
          const cx = (g.x0 + g.x1) / 2, cy = 575;
          ctx.save(); ctx.translate(cx, cy); ctx.scale(p, p); ctx.translate(-cx, -cy);
          ctx.globalCompositeOperation = 'source-over';
          card(ctx, g.x0, 420, g.x1 - g.x0, 310, { fill: g.fill, r: 36, lw: 5, shadow: false });
          ctx.restore();
        });
        // group frames are drawn above shots by order; re-draw shots on top of frames for t>12.9
        if (t > 13.3) {
          for (const i of [0, 1, 3, 5]) {
            const cx = lerp(cardX(i), SLOT[i], Ease.inOut(prog(t, 13.7, 14.5)));
            ctx.save(); ctx.translate(cx, CARD_Y); seg(ctx, 0, 0, CARD_W, SH_H, i, 0, t); ctx.restore();
            chip(ctx, TAGS[i], cx, 690, { fill: C.butter, size: 32 });
          }
        }
        groups.forEach(g => {
          const p = Math.min(popIn(t, g.at + 0.3, 0.4), 1);
          if (p > 0) text(ctx, g.label, (g.x0 + g.x1) / 2, 385, { size: 40, weight: 'bold', alpha: p });
        });
      }
      if (t > 14.5) {
        [0, 1, 3, 5].forEach((i, n) => {
          const p = popIn(t, 14.5 + n * 0.12, 0.4), bob = Math.sin(t * 4 + n) * 4;
          if (p <= 0) return;
          ctx.save(); ctx.translate(SLOT[i] + 95, CARD_Y - 68 + bob); ctx.scale(p, p);
          ctx.fillStyle = C.green; ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, 0, 26, 0, 7); ctx.fill(); ctx.stroke();
          icon(ctx, 'check', 0, 0, 34, C.white); ctx.restore();
        });
      }
      if (t > 14.6) confetti(ctx, t, 14.6, 9, 30, 960, 560, 650);
    },
  });
})();
