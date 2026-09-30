// Scene 5 (52–64s): multi-track timeline w/ beat snapping -> transitions + 花字 -> render_video -> MP4 card.
(() => {
  const nz = (i, seed = 1) => rng(i * 7919 + seed * 104729)();
  const TX = 320, BE = 125;                       // timeline x origin, px per beat (12 beats)
  const TY = [180, 280, 380, 480];                // track centres
  const TRK = [['视频', C.sky], ['配音', C.pink], ['BGM', C.lavender], ['字幕', C.butter]];
  const VID = [[0, 3, C.sky, 'image'], [3, 5, C.mint, 'film'], [5, 8, C.peach, 'clapper'], [8, 12, C.pink, 'image']];
  const OFF = [0, 38, -30, 44];                   // un-snapped start offsets (px) for video edges
  const GOAL_EDGES = [0, 3, 5, 8, 12];

  function block(ctx, x, y, w, h, fill, s = 1) {
    if (s <= 0.01) return;
    ctx.save(); ctx.translate(x + w / 2, y); ctx.scale(s, s);
    card(ctx, -w / 2, -h / 2, w, h, { fill, r: 16, lw: 4, shadow: false });
    ctx.restore();
  }

  registerScene('s5_render', {
    bg: C.cream,
    draw(ctx, t, dur) {
      const rb = rng(33);
      for (let i = 0; i < 14; i++) {
        const x = rb() * W, y = rb() * 820, ph = rb() * 6;
        sparkle(ctx, x, y, (8 + rb() * 10) * (0.6 + 0.4 * Math.sin(t * 3 + ph)), t + ph, [C.butter, C.pink, C.mint, C.sky][i % 4]);
      }
      const eOut = Ease.inOut(prog(t, 7.4, 8.2));          // timeline leaves for the render phase
      const tlA = 1 - eOut;

      // ============ timeline ============
      if (tlA > 0.01) {
        ctx.save(); ctx.globalAlpha = tlA; ctx.translate(0, -eOut * 120);
        const s0 = popIn(t, 0.3, 0.5);
        chip(ctx, 'plan_timeline_pro', 80 + 225, 62, { scale: s0, fill: C.mint });
        ctx.save(); ctx.translate(960, 320); ctx.scale(s0, s0); ctx.translate(-960, -320);
        card(ctx, 80, 105, 1760, 430, { fill: C.paper, r: 30 });
        ctx.restore();
        if (s0 > 0.9) {
          TRK.forEach((tr, i) => {
            const p = popIn(t, 0.5 + i * 0.12, 0.35);
            if (p > 0) {
              ctx.fillStyle = 'rgba(61,57,41,0.06)'; roundRect(ctx, 300, TY[i] - 42, 1520, 84, 14); ctx.fill();
              ctx.save(); ctx.translate(180, TY[i]); ctx.scale(p, p);
              text(ctx, tr[0], 0, 0, { size: 36, weight: 'bold', color: C.ink });
              ctx.restore();
            }
          });
          // beat lines
          const bl = prog(t, 1.4, 2.2);
          for (let b = 0; b <= 12; b++) {
            const x = TX + b * BE - (b === 0 ? 0 : 0);
            const p = prog(bl, b / 13, b / 13 + 0.15);
            const pulse = t > 2.4 ? Math.max(0, 1 - ((t - 2.4) * 2 - b * 0.0) % 1 * 3) * 0 : 0;
            ctx.strokeStyle = C.claude; ctx.lineWidth = 3; ctx.setLineDash([10, 9]); ctx.globalAlpha = tlA * 0.8 * p;
            ctx.beginPath(); ctx.moveTo(x, 122); ctx.lineTo(x, 132 + p * 398); ctx.stroke(); ctx.setLineDash([]);
            ctx.globalAlpha = tlA;
            if (p > 0) { ctx.fillStyle = C.claude; ctx.beginPath(); ctx.arc(x, 122, 7 * p, 0, 7); ctx.fill(); }
          }
          text(ctx, '鼓点', 1760 + 0, 140 - 0, { size: 0.01 });
          // video clips: snap edges to beat lines
          const snap = Ease.outElastic(prog(t, 2.6, 3.6));
          VID.forEach(([a, b, col, ic], i) => {
            const p = popIn(t, 0.8 + i * 0.15, 0.4);
            const ea = GOAL_EDGES[i] * BE + OFF[i] * (1 - snap), eb = GOAL_EDGES[i + 1] * BE + (OFF[i + 1] ?? 0) * (1 - snap) * (i === 3 ? 0 : 1);
            const x = TX + ea + 4, w = eb - ea - 8;
            block(ctx, x, TY[0], w, 70, col, p);
            if (p > 0.9) icon(ctx, ic, x + w / 2, TY[0], 46);
          });
          // snap sparkles at each edge
          GOAL_EDGES.slice(1, 4).forEach((g, i) => {
            const ts = 2.7 + i * 0.12, dt = t - ts;
            if (dt > 0 && dt < 0.6) sparkle(ctx, TX + g * BE, TY[0], 34 * Math.sin(dt / 0.6 * Math.PI), t * 4, C.butter);
          });
          // voice track: waveform blocks
          [[0, 4.5], [5, 8], [8.5, 12]].forEach(([a, b], i) => {
            const p = popIn(t, 1.0 + i * 0.15, 0.4), x = TX + a * BE + 4, w = (b - a) * BE - 8;
            block(ctx, x, TY[1], w, 70, C.pink, p);
            if (p > 0.9) for (let k = 0; k < w / 14 - 1; k++) {
              const h = (0.2 + 0.8 * nz(k + i * 50, 4)) * 44 * (1 + 0.15 * Math.sin(t * 6 + k));
              ctx.fillStyle = 'rgba(184,92,62,0.75)'; roundRect(ctx, x + 12 + k * 14, TY[1] - h / 2, 8, h, 4); ctx.fill();
            }
          });
          // bgm track
          { const p = popIn(t, 1.2, 0.4); block(ctx, TX + 4, TY[2], 12 * BE - 8, 70, C.lavender, p);
            if (p > 0.9) for (let k = 0; k < 12 * 8; k++) {
              const beat = k % 8 < 2; const h = (beat ? 46 : 14 + 10 * nz(k, 6)) * (1 + (beat ? 0.1 * Math.sin(t * 8) : 0));
              ctx.fillStyle = 'rgba(91,70,160,0.6)'; roundRect(ctx, TX + 14 + k * 15.5, TY[2] - h / 2, 8, h, 4); ctx.fill();
            } }
          // subtitle track
          [[0, 3, '慢慢逛'], [3.3, 7.8, '慢慢拍'], [8.2, 12, '刚刚好']].forEach(([a, b, s], i) => {
            const p = popIn(t, 1.4 + i * 0.15, 0.4), x = TX + a * BE + 4, w = (b - a) * BE - 8;
            block(ctx, x, TY[3], w, 60, C.butter, p);
            if (p > 0.9) text(ctx, s, x + w / 2, TY[3] + 2, { size: 32 });
          });
          // playhead
          if (t > 3.6) {
            const ph = TX + ((t - 3.6) * 130) % (12 * BE);
            ctx.strokeStyle = C.fire; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(ph, 120); ctx.lineTo(ph, 528); ctx.stroke();
            ctx.fillStyle = C.fire; ctx.beginPath(); ctx.moveTo(ph - 10, 112); ctx.lineTo(ph + 10, 112); ctx.lineTo(ph, 130); ctx.fill();
          }
          // transitions badges on video edges (phase B)
          GOAL_EDGES.slice(1, 4).forEach((g, i) => {
            const p = popIn(t, 4.6 + i * 0.3, 0.45); if (p <= 0) return;
            ctx.save(); ctx.translate(TX + g * BE, TY[0]); ctx.scale(p, p); ctx.rotate(Math.PI / 4 + Math.sin(t * 3 + i) * 0.1);
            card(ctx, -24, -24, 48, 48, { fill: C.fire, r: 10, lw: 4 });
            ctx.restore();
          });
          // 花字 on subtitle track
          const hp = popIn(t, 5.6, 0.5);
          if (hp > 0) { ctx.save(); ctx.translate(TX + 5.5 * BE, TY[3] + 2); ctx.scale(hp, hp);
            ctx.strokeStyle = C.fire; ctx.lineWidth = 5; roundRect(ctx, -70, -32, 140, 64, 14); ctx.stroke();
            text(ctx, '慢慢拍', 0, 2, { size: 34, weight: 'bold', color: C.fire, outline: 8 });
            ctx.restore(); }
        }
        ctx.restore();
      }

      // ============ phase A caption + Claude cameo (below timeline) ============
      { const a = fadeInOut(t, 0.9, 4.0, 0.4);
        if (a > 0.01) {
          ctx.save(); ctx.globalAlpha = a;
          const mg = Math.sin(t * 4) * 6;
          text(ctx, '镜头边界 → 吸附到鼓点', 820, 690 + mg * 0.3, { size: 54, weight: 'bold', color: C.claudeDark });
          text(ctx, '配音 · 音乐 · 字幕 对齐', 820, 770, { size: 36, color: C.inkSoft });
          ctx.restore();
          drawClaude(ctx, 1560, 700, 230 * a, { t, mood: t < 2.6 ? 'think' : 'wow', look: { x: -0.6, y: -0.5 }, rot: Math.sin(t * 3) * 0.05 });
        } }

      // ============ phase B: transition + 花字 preview cards ============
      { const a = Ease.inOut(prog(t, 4.0, 4.5)) * (1 - prog(t, 7.4, 8.0));
        if (a > 0.01) {
          const s1 = popIn(t, 4.1, 0.5), s2 = popIn(t, 5.0, 0.5);
          ctx.save(); ctx.globalAlpha = a;
          chip(ctx, 'recommend_transition', 80 + 265, 608, { scale: s1, fill: C.sky });
          chip(ctx, 'recommend_text', 1000 + 185, 608, { scale: s2, fill: C.pink });
          // transition preview: A wipes into B, looping
          ctx.save(); ctx.translate(480, 730); ctx.scale(s1, s1); ctx.translate(-480, -730);
          card(ctx, 80, 640, 800, 200, { fill: C.paper, r: 26 });
          const L = 340, Ht = 150, fx = 130, fy = 665;
          const ph = (t * 0.7) % 1, w = Ease.inOut(clamp(ph * 1.6, 0, 1)) * L;
          ctx.save(); roundRect(ctx, fx, fy, L, Ht, 16); ctx.clip();
          ctx.fillStyle = C.sky; ctx.fillRect(fx, fy, L, Ht); icon(ctx, 'image', fx + L / 2, fy + Ht / 2, 80);
          ctx.fillStyle = C.mint; ctx.fillRect(fx, fy, w, Ht); icon(ctx, 'film', fx + L / 2, fy + Ht / 2, 80);
          ctx.restore();
          roundRect(ctx, fx, fy, L, Ht, 16); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.stroke();
          ctx.fillStyle = C.fire; ctx.fillRect(fx + w - 3, fy, 6, Ht);
          text(ctx, '转场', 680, 720, { size: 44, weight: 'bold' });
          text(ctx, '淡入 · 推拉 · 擦除', 680, 790, { size: 30, color: C.inkSoft });
          ctx.restore();
          // 花字 preview
          ctx.save(); ctx.translate(1420, 730); ctx.scale(s2, s2); ctx.translate(-1420, -730);
          card(ctx, 1000, 640, 840, 200, { fill: C.paper, r: 26 });
          const cols = [C.fire, C.claude, C.blue, C.green, '#E07BB0'];
          const s = '慢慢逛，慢慢拍';
          Array.from(s).forEach((ch, i) => {
            const y = 735 + Math.sin(t * 6 + i * 0.7) * 10, x = 1140 + i * 82;
            text(ctx, ch, x + 3, y + 5, { size: 76, weight: 'bold', color: C.ink, alpha: 0.25 });
            text(ctx, ch, x, y, { size: 76, weight: 'bold', color: cols[i % 5], outline: 12, outlineColor: C.white });
            text(ctx, ch, x, y, { size: 76, weight: 'bold', color: cols[i % 5] });
          });
          text(ctx, '花字', 1700, 805, { size: 34, weight: 'bold', color: C.inkSoft });
          sparkle(ctx, 1730 + Math.sin(t * 5) * 6, 690, 24, t * 2, C.butter);
          sparkle(ctx, 1110, 780, 18, -t * 2, C.pink);
          ctx.restore();
          ctx.restore();
        } }

      // ============ phase C: render_video ============
      if (t > 7.6) {
        const cp = popIn(t, 7.7, 0.45);
        chip(ctx, 'render_video', 960, 75, { scale: cp, fill: C.fire, color: C.white, size: 34 });
        const pr = prog(t, 8.3, 9.9);
        // film strips flying into the render gear
        if (t < 10.0) {
          for (let i = 0; i < 6; i++) {
            const tt = 7.9 + i * 0.25, p = prog(t, tt, tt + 0.7); if (p <= 0 || p >= 1) continue;
            const e = Ease.inOut(p), x = lerp(340 + i * 240, 960, e), y = lerp(180, 410, e);
            ctx.save(); ctx.translate(x, y); ctx.scale(1 - e * 0.6, 1 - e * 0.6); ctx.rotate(e * 2);
            card(ctx, -45, -30, 90, 60, { fill: [C.sky, C.mint, C.peach, C.pink, C.butter, C.lavender][i], r: 12, lw: 4, shadow: false });
            ctx.restore();
          }
          const gs = popIn(t, 8.0, 0.4) * (1 - prog(t, 9.8, 10.1));
          if (gs > 0) {
            ctx.save(); ctx.translate(960, 410); ctx.scale(gs, gs); ctx.rotate(t * 3);
            icon(ctx, 'gear', 0, 0, 240, C.claudeDark); ctx.restore();
            ctx.save(); ctx.translate(960, 640); ctx.scale(gs, gs);
            card(ctx, -300, -24, 600, 48, { fill: C.paper, r: 24 });
            ctx.save(); roundRect(ctx, -296, -20, 592, 40, 20); ctx.clip();
            ctx.fillStyle = C.claude; ctx.fillRect(-296, -20, 592 * pr, 40);
            ctx.fillStyle = 'rgba(255,255,255,0.35)'; for (let k = 0; k < 12; k++) ctx.fillRect(-296 + ((k * 60 + t * 120) % 650) - 40, -20, 20, 40);
            ctx.restore();
            text(ctx, Math.floor(pr * 100) + '%', 0, 70, { size: 40, weight: 'bold', color: C.claudeDark });
            ctx.restore();
          }
        }
        // the MP4 card
        if (t > 9.9) {
          const mp = popIn(t, 9.9, 0.7);
          ctx.save(); ctx.translate(960, 420); ctx.scale(mp, mp); ctx.rotate(Math.sin(t * 2.5) * 0.015);
          card(ctx, -400, -240, 800, 480, { fill: C.paper, r: 34 });
          ctx.save(); roundRect(ctx, -370, -210, 740, 360, 20); ctx.clip();
          const g = ctx.createLinearGradient(0, -210, 0, 150); g.addColorStop(0, '#FFE2B8'); g.addColorStop(1, '#F7B6C2');
          ctx.fillStyle = g; ctx.fillRect(-370, -210, 740, 360);
          ctx.fillStyle = C.mint; ctx.beginPath(); ctx.ellipse(-170, 150, 300, 110, 0, 0, 7); ctx.fill();
          ctx.fillStyle = C.green; ctx.beginPath(); ctx.ellipse(200, 160, 300, 100, 0, 0, 7); ctx.fill();
          ctx.fillStyle = C.butter; ctx.beginPath(); ctx.arc(230, -120, 50 + Math.sin(t * 4) * 3, 0, 7); ctx.fill();
          ctx.restore();
          roundRect(ctx, -370, -210, 740, 360, 20); ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.stroke();
          // play button
          const pp = 1 + Math.sin(t * 6) * 0.06;
          ctx.save(); ctx.scale(pp, pp); ctx.fillStyle = 'rgba(255,255,255,0.92)'; ctx.strokeStyle = C.ink; ctx.lineWidth = 6;
          ctx.beginPath(); ctx.arc(0, -30, 70, 0, 7); ctx.fill(); ctx.stroke();
          ctx.fillStyle = C.fire; ctx.beginPath(); ctx.moveTo(-22, -68); ctx.lineTo(-22, 8); ctx.lineTo(44, -30); ctx.closePath(); ctx.fill(); ctx.restore();
          // seek bar + file name
          ctx.fillStyle = 'rgba(61,57,41,0.25)'; roundRect(ctx, -330, 120, 660, 14, 7); ctx.fill();
          ctx.fillStyle = C.fire; roundRect(ctx, -330, 120, 660 * clamp(((t - 10.4) * 0.25) % 1, 0, 1), 14, 7); ctx.fill();
          text(ctx, 'output.mp4', 0, 195, { size: 42, weight: 'bold', mono: true });
          ctx.restore();
          // fireworks/confetti
          confetti(ctx, t, 9.95, 41, 70, 960, 420, 900);
          confetti(ctx, t, 10.9, 77, 50, 960, 330, 800);
          for (let k = 0; k < 8; k++) {
            const a = k / 8 * Math.PI * 2 + t, rr = 330 + Math.sin(t * 3 + k) * 25;
            sparkle(ctx, 960 + Math.cos(a) * rr * 1.25, 420 + Math.sin(a) * rr * 0.75, 20 + 8 * Math.sin(t * 5 + k), t * 2 + k, [C.butter, C.pink, C.mint, C.sky][k % 4]);
          }
          const cj = Math.abs(Math.sin(t * 6));
          drawClaude(ctx, 1630, 520 - cj * 40, 250 * popIn(t, 10.1, 0.5), { t, mood: 'wow', wave: 1, squash: cj < 0.15 ? 0.4 : 0 });
          drawClaude(ctx, 290, 530 - (1 - cj) * 30, 170 * popIn(t, 10.3, 0.5), { t: t + 1, mood: 'proud', squash: 0, rot: -0.1 });
        }
      }
    },
  });
})();
