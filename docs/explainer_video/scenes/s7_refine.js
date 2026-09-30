// Scene 7 (75–85s): chat edits -> timeline swaps / subtitle turns yellow -> packed into a Skill -> reuse on new media.
(() => {
  const BLK = [C.peach, C.mint, C.sky, C.lavender];
  const TX = 1040, BW = 190, BG = 14;          // video track geometry
  const bx = k => TX + k * (BW + BG);

  function scene(ctx, x, y, w, h, kind, t) {
    // tiny illustrated frame: sky + sun + hills
    ctx.save(); roundRect(ctx, x, y, w, h, 16); ctx.clip();
    const pal = kind === 0 ? [C.sky, C.butter, C.mint, '#8FD1AE'] : [C.pink, C.peach, C.lavender, '#E7A6B9'];
    ctx.fillStyle = pal[0]; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = pal[1]; ctx.beginPath(); ctx.arc(x + w * 0.75, y + h * 0.3 + Math.sin(t * 2) * 3, h * 0.16, 0, 7); ctx.fill();
    ctx.fillStyle = pal[2]; ctx.beginPath(); ctx.ellipse(x + w * 0.3, y + h * 1.0, w * 0.5, h * 0.45, 0, 0, 7); ctx.fill();
    ctx.fillStyle = pal[3]; ctx.beginPath(); ctx.ellipse(x + w * 0.85, y + h * 1.05, w * 0.5, h * 0.4, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  function mix(a, b, p) {
    const pa = [1, 3, 5].map(i => parseInt(a.substr(i, 2), 16)), pb = [1, 3, 5].map(i => parseInt(b.substr(i, 2), 16));
    return '#' + pa.map((v, i) => Math.round(lerp(v, pb[i], p)).toString(16).padStart(2, '0')).join('');
  }

  registerScene('s7_refine', {
    bg: C.cream,
    draw(ctx, t, dur) {
      const r = rng(71);
      for (let i = 0; i < 12; i++) {
        const x = r() * W, y = 40 + r() * 800, ph = r() * 6;
        sparkle(ctx, x, y, (8 + r() * 10) * (0.6 + 0.4 * Math.sin(t * 3 + ph)), t + ph, [C.butter, C.pink, C.mint, C.lavender][i % 4]);
      }

      // ---------- timeline card
      const tc = popIn(t, 0.3, 0.5);
      const shake = t > 6.6 && t < 7.0 ? Math.sin(t * 60) * 4 : 0;
      ctx.save(); ctx.translate(1240 + shake, 250); ctx.scale(tc, tc); ctx.translate(-1240, -250);
      card(ctx, 600, 90, 1280, 320, { fill: C.paper, r: 30 });
      // preview frame
      const swapP = prog(t, 2.0, 2.3);
      scene(ctx, 630, 120, 330, 186, swapP > 0.5 ? 1 : 0, t);
      ctx.save(); roundRect(ctx, 630, 120, 330, 186, 16); ctx.lineWidth = 5; ctx.strokeStyle = C.ink; ctx.stroke(); ctx.restore();
      // white flash on swap
      if (t > 1.9 && t < 2.6) { ctx.save(); ctx.globalAlpha = Math.sin(prog(t, 1.9, 2.6) * Math.PI) * 0.7; roundRect(ctx, 630, 120, 330, 186, 16); ctx.fillStyle = C.white; ctx.fill(); ctx.restore(); }
      const yel = Ease.outCubic(prog(t, 4.6, 5.2));
      const capCol = mix('#FFFFFF', '#FFD23F', yel);
      text(ctx, '旅途的风，很温柔', 795, 280, { size: 30, weight: 'bold', color: capCol, outline: 7, outlineColor: C.ink });
      // track icons
      icon(ctx, 'film', 1000, 160, 40, C.inkSoft);
      icon(ctx, 'pen', 1000, 250, 40, C.inkSoft);
      icon(ctx, 'music', 1000, 340, 40, C.inkSoft);
      // video blocks
      for (let k = 0; k < 4; k++) {
        let x = bx(k), y = 130, a = 1, rot = 0, col = BLK[k], label = String(k + 1);
        const hl = k === 1 && t > 1.2 && t < 2.0 ? 0.5 + 0.5 * Math.sin(t * 18) : 0;
        if (k === 1) {
          if (t < 2.0) {
            // wobble then leave
            const lp = prog(t, 1.5, 2.0);
            y -= Ease.inCubic(lp) * 140; rot = lp * 0.5; a = 1 - lp;
          } else {
            // new block drops in
            const dp = Ease.outBounce ? 0 : 0;
            const np = prog(t, 2.2, 2.8), ny = Ease.outBack(np);
            y = lerp(-20, 130, ny); a = prog(t, 2.2, 2.4); col = C.butter;
          }
        }
        if (a <= 0.01) continue;
        ctx.save(); ctx.globalAlpha = a; ctx.translate(x + BW / 2, y + 35); ctx.rotate(rot);
        card(ctx, -BW / 2, -35, BW, 70, { fill: col, r: 16, lw: 4, stroke: hl > 0 ? C.fire : C.ink, shadow: false });
        icon(ctx, 'film', -40, 0, 38);
        text(ctx, label, 35, 2, { size: 36, weight: 'bold' });
        ctx.restore();
      }
      // new block sparkle
      if (t > 2.4 && t < 3.2) {
        const sp = prog(t, 2.4, 3.2);
        for (let i = 0; i < 4; i++) { const a = i * 1.57 + 0.5; sparkle(ctx, bx(1) + BW / 2 + Math.cos(a) * 80 * sp, 165 + Math.sin(a) * 50 * sp, 18 * (1 - sp), t * 3, C.butter); }
      }
      // subtitle track
      const sx = [TX, TX + 290, TX + 560];
      const sw = [270, 250, 240];
      for (let k = 0; k < 3; k++) {
        const fill = mix('#FFFDF8', '#FFD23F', Ease.outCubic(prog(t, 4.6 + k * 0.12, 5.2 + k * 0.12)));
        card(ctx, sx[k], 222, sw[k], 56, { fill, r: 14, lw: 4, shadow: false });
        for (let j = 0; j < 4; j++) { ctx.fillStyle = C.inkSoft; roundRect(ctx, sx[k] + 22 + j * 52, 244, 34, 12, 6); ctx.fill(); }
      }
      // bgm track (wave)
      card(ctx, TX, 315, 800, 50, { fill: C.lavender, r: 14, lw: 4, shadow: false });
      ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath();
      for (let i = 0; i <= 60; i++) { const xx = TX + 16 + i * 12.9, yy = 340 + Math.sin(i * 1.1 + t * 3) * 10 * Math.sin(i * 0.3 + 1); i ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
      ctx.stroke();
      ctx.restore();
      // yellow burst at subtitle change
      if (t > 4.6 && t < 5.6) { const sp = prog(t, 4.6, 5.6); for (let i = 0; i < 5; i++) sparkle(ctx, TX + 100 + i * 150, 250 - sp * 40 - (i % 2) * 20, 16 * (1 - sp), t * 4, '#FFD23F'); }

      // ---------- chat bubbles (left column)
      const c1 = popIn(t, 0.6, 0.4) * (1 - 0);
      if (c1 > 0) bubble(ctx, typed('把第二段换掉', t, 0.8, 12), 70, 185, { dir: 'left', size: 44, maxW: 430, full: '把第二段换掉', scale: c1, anchor: 0.5, fill: C.sky });
      const c2 = popIn(t, 4.0, 0.4);
      if (c2 > 0) bubble(ctx, typed('字幕改成黄色', t, 4.2, 12), 70, 345, { dir: 'left', size: 44, maxW: 430, full: '字幕改成黄色', scale: c2, anchor: 0.5, fill: C.sky });
      // small "OK" from Claude
      const okA = popIn(t, 2.0, 0.3) * (1 - prog(t, 3.4, 3.6));
      const ok2 = popIn(t, 5.2, 0.3) * (1 - prog(t, 6.3, 6.5));

      // "colour / font / position" chips
      const chipsT = 5.3;
      ['颜色', '字体', '位置'].forEach((s, i) => {
        const p = popIn(t, chipsT + i * 0.25, 0.35) * (1 - prog(t, 6.4, 6.7));
        if (p > 0.01) chip(ctx, s, 960 + i * 210, 470, { size: 36, fill: [C.butter, C.mint, C.pink][i], scale: p });
      });

      // ---------- Claude cameo (moves aside when skill arrives)
      const mv = Ease.inOut(prog(t, 6.4, 7.0));
      const cx = lerp(1240, 250, mv), cy = lerp(690, 690, mv);
      const cin = popIn(t, 0.5, 0.6);
      const talk = (t > 2.0 && t < 3.0) || (t > 5.2 && t < 6.1);
      drawClaude(ctx, cx, cy, 250 * Math.max(cin, 0.001), { t, talk, mood: t > 8.6 ? 'happy' : (t > 4.4 && t < 5.3 ? 'wow' : 'happy'), wave: t > 8.9 ? 1 : 0, look: { x: mv > 0.5 ? 0.8 : 0, y: -0.3 }, squash: Math.sin(prog(t, 8.7, 9.1) * Math.PI) * 0.5 });
      if (okA > 0.01) bubble(ctx, '好嘞～', cx + 60, cy - 150, { dir: 'down', size: 36, scale: okA, anchor: 0.2, maxW: 300, fill: C.butter });
      if (ok2 > 0.01) bubble(ctx, '变黄啦！', cx + 60, cy - 150, { dir: 'down', size: 36, scale: ok2, anchor: 0.2, maxW: 300, fill: C.butter });

      // ---------- skill packing
      const pieces = [...BLK.map((c, k) => [bx(k) + BW / 2, 165, k === 1 ? C.butter : c]), [TX + 130, 250, '#FFD23F'], [TX + 410, 250, '#FFD23F'], [TX + 400, 340, C.lavender], [795, 210, C.sky]];
      const SK = { x: 1240, y: 650 };
      pieces.forEach(([px, py, col], i) => {
        const st = 6.6 + i * 0.08, p = prog(t, st, st + 0.6);
        if (p <= 0 || p >= 1) return;
        const e = Ease.inOut(p);
        const x = lerp(px, SK.x, e), y = lerp(py, SK.y, e) - Math.sin(e * Math.PI) * 120;
        ctx.save(); ctx.translate(x, y); ctx.rotate(p * 6); ctx.globalAlpha = 1 - p * 0.3; ctx.scale(1 - p * 0.5, 1 - p * 0.5);
        card(ctx, -26, -20, 52, 40, { fill: col, r: 10, lw: 4, shadow: false }); ctx.restore();
      });
      const sp = popIn(t, 7.3, 0.55);
      if (sp > 0) {
        ctx.save(); ctx.translate(SK.x, SK.y); ctx.scale(sp, sp); ctx.rotate(Math.sin(t * 3) * 0.015);
        // folder tab
        card(ctx, -230, -110, 150, 40, { fill: C.claudeDark, r: 14, lw: 5, shadow: false });
        card(ctx, -230, -90, 460, 200, { fill: C.butter, r: 28 });
        icon(ctx, 'star', -165, -25, 70, C.claudeDark);
        text(ctx, 'Skill', -75, -40, { size: 34, weight: 'bold', align: 'left', color: C.claudeDark });
        text(ctx, 'cutskill_温柔vlog', 0, 30, { size: 34, mono: true, weight: 'bold' });
        text(ctx, '.storyline/skills/', 0, 78, { size: 30, mono: true, color: C.inkSoft });
        ctx.restore();
        if (t < 8.0) for (let i = 0; i < 3; i++) sparkle(ctx, SK.x - 200 + i * 200, SK.y - 130 - Math.sin(t * 6 + i) * 8, 16, t * 3, C.butter);
      }

      // ---------- new media batch + stamp result
      const mp = popIn(t, 7.8, 0.5);
      if (mp > 0) {
        for (let i = 0; i < 3; i++) {
          ctx.save(); ctx.translate(760 + i * 26, 640 - i * 18); ctx.rotate(-0.12 + i * 0.1); ctx.scale(mp, mp);
          card(ctx, -70, -55, 140, 110, { fill: [C.mint, C.sky, C.peach][i], r: 18, lw: 4 });
          icon(ctx, i === 1 ? 'film' : 'image', 0, 0, 56);
          ctx.restore();
        }
        text(ctx, '新一批素材', 790, 745, { size: 34, weight: 'bold', alpha: mp });
        text(ctx, '+', 925, 650, { size: 70, weight: 'bold', color: C.claudeDark, alpha: mp });
      }
      arrow(ctx, 1490, 650, 1600, 650, prog(t, 8.4, 8.8), { color: C.claudeDark, lw: 8 });
      const vp = prog(t, 8.8, 9.3), vs = vp > 0 ? 1 + (1 - Ease.outBack(vp)) * 0.0 + Math.sin(vp * Math.PI) * 0.0 : 0;
      if (vp > 0) {
        const drop = Ease.outBack(vp);
        ctx.save(); ctx.translate(1740, lerp(520, 650, drop)); ctx.scale(1 + (1 - drop) * 0.6, 1 - (1 - drop) * 0.3 + Math.sin(vp * Math.PI) * -0.0);
        ctx.globalAlpha = prog(vp, 0, 0.3);
        card(ctx, -120, -95, 240, 190, { fill: C.paper, r: 26 });
        scene(ctx, -100, -75, 200, 112, 1, t);
        ctx.save(); roundRect(ctx, -100, -75, 200, 112, 12); ctx.lineWidth = 4; ctx.strokeStyle = C.ink; ctx.stroke(); ctx.restore();
        text(ctx, '新视频 ✓', 0, 66, { size: 34, weight: 'bold', color: C.ink });
        ctx.restore();
        // stamp ring
        if (vp > 0.6) { const rp = prog(t, 9.0, 9.7); ctx.save(); ctx.globalAlpha = 1 - rp; ctx.strokeStyle = C.claude; ctx.lineWidth = 8; ctx.beginPath(); ctx.ellipse(1740, 650, 135 + rp * 40, 110 + rp * 40, 0, 0, 7); ctx.stroke(); ctx.restore(); }
        confetti(ctx, t, 9.0, 17, 40, 1740, 640, 500);
      }
    },
  });
})();
