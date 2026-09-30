// Scene 6 (64–75s): dependency graph, interceptor finds missing prerequisites and auto-runs them in `mode: default`.
(() => {
  const NODES = {
    load:   { label: 'load_media',        x: 250,  y: 240 },
    split:  { label: 'split_shots',       x: 690,  y: 240 },
    group:  { label: 'group_clips',       x: 1120, y: 240 },
    script: { label: 'generate_script',   x: 1570, y: 240 },
    tts:    { label: 'generate_voiceover', x: 1570, y: 490 },
    plan:   { label: 'plan_timeline',     x: 1120, y: 490 },
    render: { label: 'render_video',      x: 660,  y: 490 },
    bgm:    { label: 'select_bgm',        x: 1120, y: 730 },
  };
  // edges: prerequisite -> dependent
  const EDGES = [['load', 'split'], ['split', 'group'], ['group', 'script'], ['script', 'tts'],
    ['tts', 'plan'], ['bgm', 'plan'], ['group', 'plan'], ['plan', 'render']];
  // backward detection wave (from render_video) and forward auto-run times (local seconds)
  const DET = { plan: 4.5, tts: 4.9, bgm: 4.9, group: 5.0, script: 5.3, split: 5.7, load: 6.1 };
  const RUN = { load: 6.8, split: 7.2, group: 7.6, script: 8.0, bgm: 7.8, tts: 8.4, plan: 8.8, render: 9.5 };
  const POP = { load: 0.4, split: 0.6, group: 0.8, script: 1.0, tts: 1.2, plan: 1.4, render: 1.6, bgm: 1.8 };
  const SZ = 28;
  const dims = {};
  function measure(ctx) {
    ctx.save(); ctx.font = `bold ${SZ}px ${MONO}`;
    for (const k in NODES) dims[k] = { w: ctx.measureText(NODES[k].label).width + SZ * 1.4, h: SZ * 1.8 };
    ctx.restore();
  }
  // point on box boundary of node k in direction of (tx,ty)
  function edgePt(k, tx, ty, pad = 10) {
    const n = NODES[k], d = dims[k], dx = tx - n.x, dy = ty - n.y;
    const sx = (d.w / 2 + pad) / Math.abs(dx || 1e-6), sy = (d.h / 2 + pad) / Math.abs(dy || 1e-6);
    const s = Math.min(sx, sy);
    return [n.x + dx * s, n.y + dy * s];
  }

  function guard(ctx, x, y, s, t, mood) {
    ctx.save(); ctx.translate(x, y + Math.sin(t * 5) * 4); ctx.scale(s / 100, s / 100);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = C.ink;
    ctx.fillStyle = 'rgba(61,57,41,0.15)'; ctx.beginPath(); ctx.ellipse(0, 92, 55, 10, 0, 0, 7); ctx.fill();
    // feet
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(-24, 84, 16, 9, 0, 0, 7); ctx.ellipse(24, 84, 16, 9, 0, 0, 7); ctx.fill();
    // shield body
    ctx.fillStyle = C.sky; ctx.beginPath();
    ctx.moveTo(-62, -55); ctx.quadraticCurveTo(0, -75, 62, -55); ctx.quadraticCurveTo(68, 30, 0, 88); ctx.quadraticCurveTo(-68, 30, -62, -55);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    // cap
    ctx.fillStyle = C.blue; ctx.beginPath(); ctx.moveTo(-58, -55); ctx.quadraticCurveTo(0, -115, 58, -55); ctx.quadraticCurveTo(0, -68, -58, -55); ctx.fill(); ctx.stroke();
    ctx.fillStyle = C.butter; ctx.beginPath(); ctx.arc(0, -78, 11, 0, 7); ctx.fill(); ctx.stroke();
    // face
    const wide = mood === 'alert';
    ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.ellipse(-22, -12, wide ? 9 : 7, wide ? 12 : 9, 0, 0, 7); ctx.ellipse(22, -12, wide ? 9 : 7, wide ? 12 : 9, 0, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(247,182,194,0.9)'; ctx.beginPath(); ctx.ellipse(-38, 12, 11, 7, 0, 0, 7); ctx.ellipse(38, 12, 11, 7, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath();
    if (mood === 'happy') { ctx.arc(0, 6, 14, 0.15 * Math.PI, 0.85 * Math.PI); } else { ctx.ellipse(0, 20, 9, 11, 0, 0, 7); }
    ctx.stroke();
    // badge
    sparkle(ctx, 0, 52, 17, t * 2, C.butter);
    ctx.restore();
  }
  function magnifier(ctx, x, y, s, rot) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s / 100, s / 100);
    ctx.lineCap = 'round'; ctx.strokeStyle = C.ink; ctx.lineWidth = 9;
    ctx.beginPath(); ctx.moveTo(30, 30); ctx.lineTo(75, 75); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.65)'; ctx.beginPath(); ctx.arc(0, 0, 38, 0, 7); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  registerScene('s6_deps', {
    bg: C.cream,
    draw(ctx, t, dur) {
      measure(ctx);
      // soft sparkles
      const r = rng(61);
      for (let i = 0; i < 14; i++) {
        const x = r() * W, y = 60 + r() * 780, ph = r() * 6;
        sparkle(ctx, x, y, (8 + r() * 10) * (0.6 + 0.4 * Math.sin(t * 3 + ph)), t + ph, [C.butter, C.pink, C.mint, C.lavender][i % 4]);
      }
      text(ctx, '依赖图 · require_prior_kind', 960, 90, { size: 44, weight: 'bold', color: C.inkSoft, alpha: prog(t, 0.3, 0.8) });

      const stateOf = k => {
        if (t >= RUN[k]) return 'done';
        if (k === 'render') return t >= 4.3 ? (t >= 4.5 ? 'blocked' : 'running') : 'idle';
        if (DET[k] !== undefined && t >= DET[k]) return 'missing';
        return 'idle';
      };

      // ---- edges
      EDGES.forEach(([a, b], i) => {
        const p = prog(t, 0.9 + i * 0.12, 1.4 + i * 0.12);
        if (p <= 0) return;
        const A = NODES[a], B = NODES[b];
        const [x1, y1] = edgePt(a, B.x, B.y), [x2, y2] = edgePt(b, A.x, A.y, 12);
        let col = C.inkSoft, lw = 5, dash = [14, 10];
        if (t >= RUN[a] + 0.3) { col = C.green; lw = 7; dash = null; }
        else if (DET[a] !== undefined && t >= DET[a] - 0.2 && t < RUN[a]) { col = C.fire; lw = 7; dash = [16, 10]; }
        else if (b === 'render' && t >= 4.3 && t < RUN.plan) { col = C.fire; lw = 7; dash = [16, 10]; }
        ctx.save();
        if (dash) ctx.lineDashOffset = -t * 30;
        arrow(ctx, x1, y1, x2, y2, p, { color: col, lw, dash, headSize: 20 });
        ctx.restore();
      });

      // ---- nodes
      for (const k in NODES) {
        const n = NODES[k], d = dims[k], pp = popIn(t, POP[k], 0.45);
        if (pp <= 0) continue;
        const st = stateOf(k);
        let fill = C.paper, color = C.inkSoft, stroke = C.inkSoft, sc = pp, dx = 0, dy = 0;
        if (st === 'missing') { fill = C.pink; color = C.ink; stroke = C.fire; sc *= 1 + 0.05 * Math.sin(t * 14); }
        if (st === 'blocked') { fill = C.pink; color = C.ink; stroke = C.fire; dx = Math.sin(t * 40) * 4 * (1 - prog(t, 4.5, 5.2)); }
        if (st === 'running') { fill = C.butter; color = C.ink; stroke = C.ink; }
        if (st === 'done') {
          fill = C.mint; color = C.ink; stroke = C.ink;
          sc *= 1 + 0.18 * Math.sin(prog(t, RUN[k], RUN[k] + 0.4) * Math.PI);
        }
        if (k === 'render' && t >= 3.9 && t < 4.3) fill = C.butter, color = C.ink, stroke = C.ink;
        ctx.save(); ctx.translate(n.x + dx, n.y + dy); ctx.scale(sc, sc);
        card(ctx, -d.w / 2, -d.h / 2, d.w, d.h, { fill, r: d.h / 2, lw: 4, stroke, shadow: st === 'done' || k === 'render' });
        text(ctx, n.label, 0, 2, { size: SZ, mono: true, weight: 'bold', color });
        // badge
        if (st === 'done') {
          const bp = popIn(t, RUN[k] + 0.15, 0.3);
          ctx.save(); ctx.translate(d.w / 2 - 6, -d.h / 2 + 2); ctx.scale(bp, bp);
          ctx.fillStyle = C.green; ctx.strokeStyle = C.ink; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(0, 0, 20, 0, 7); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = C.white; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
          ctx.beginPath(); ctx.moveTo(-9, 1); ctx.lineTo(-2, 8); ctx.lineTo(10, -8); ctx.stroke();
          ctx.restore();
        } else if (st === 'missing' || st === 'blocked') {
          const bp = popIn(t, (DET[k] ?? 4.5), 0.3);
          ctx.save(); ctx.translate(d.w / 2 - 6, -d.h / 2 + 2); ctx.scale(bp, bp);
          ctx.fillStyle = C.fire; ctx.strokeStyle = C.ink; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(0, 0, 20, 0, 7); ctx.fill(); ctx.stroke();
          text(ctx, '?', 0, 2, { size: 30, weight: 'bold', color: C.white });
          ctx.restore();
        }
        ctx.restore();
        // "mode: default" stamp while running
        const rt = t - RUN[k];
        if (rt > -0.05 && rt < 1.0) {
          const below = n.y > 400;
          const tp = popIn(t, RUN[k], 0.3) * (1 - prog(t, RUN[k] + 0.75, RUN[k] + 1.0));
          const ty = n.y + (below ? 62 : -62) - prog(rt, 0, 1) * 10;
          const tx = k === 'plan' ? n.x + 170 : n.x;
          chip(ctx, 'mode: default', tx, ty, { size: 24, fill: C.butter, scale: tp });
        }
      }

      // split_shots note
      const np = popIn(t, 7.2, 0.4) * (1 - prog(t, 9.3, 9.6));
      if (np > 0.01) {
        ctx.save(); ctx.translate(690, 345); ctx.scale(np, np);
        card(ctx, -230, -34, 460, 68, { fill: C.butter, r: 30, lw: 4 });
        text(ctx, 'default = 直接透传，不切分', 0, 2, { size: 32 });
        ctx.restore();
      }

      // ---- user request
      const up = popIn(t, 3.6, 0.45) * (1 - prog(t, 6.5, 6.9));
      const ux = 140, uy = 400;
      if (up > 0.01) {
        ctx.save(); ctx.translate(ux, uy); ctx.scale(up, up);
        ctx.fillStyle = C.lavender; ctx.strokeStyle = C.ink; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(0, 0, 52, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(-17, -6, 6, 0, 7); ctx.arc(17, -6, 6, 0, 7); ctx.fill();
        ctx.strokeStyle = C.ink; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 8, 14, 0.2 * Math.PI, 0.8 * Math.PI); ctx.stroke();
        ctx.restore();
        bubble(ctx, '直接帮我渲染！', ux + 60, uy, { dir: 'left', size: 38, maxW: 420, scale: up, anchor: 0.5, fill: C.sky });
        // request dart to render_video
        arrow(ctx, 340, 450, 530, 470, prog(t, 4.0, 4.3), { color: C.claudeDark, lw: 6, bend: -20 });
      }

      // ---- interceptor guard
      const gin = Ease.outBack(prog(t, 4.0, 4.6)), gout = Ease.inOut(prog(t, 9.5, 10.2));
      const gx = lerp(-200, 330, gin) - gout * 600, gy = 700;
      const alert = t < 7.0;
      if (gx > -150) {
        guard(ctx, gx, gy, 150, t, alert ? 'alert' : 'happy');
        // magnifier sweeping during detection
        const mp = prog(t, 4.5, 6.3);
        if (mp > 0 && mp < 1) {
          const mx = gx + 100 + mp * 0, my = gy - 20;
          magnifier(ctx, gx - 100, my - 40 - Math.sin(mp * Math.PI) * 10, 90, Math.sin(t * 7) * 0.25);
        } else {
          magnifier(ctx, gx - 95, gy - 10, 75, 0.3 + Math.sin(t * 3) * 0.05);
        }
        // "interceptor" label
        const lp = popIn(t, 4.4, 0.4) * (1 - gout);
        if (lp > 0.01) { chip(ctx, 'interceptor', gx, gy + 92, { size: 24, fill: C.sky, scale: lp }); }
        const gb = t < 6.4 ? '缺前置！拦下～' : '我来补上！';
        const gs = t < 6.4 ? [4.5, 6.4] : [6.4, 9.4];
        const bs = popIn(t, gs[0], 0.3) * (1 - prog(t, gs[1] - 0.15, gs[1]));
        if (bs > 0.01 && t >= 4.5) bubble(ctx, gb, gx + 62, gy - 50, { dir: 'left', size: 34, maxW: 400, scale: bs, anchor: 0.5, fill: C.butter });
      }

      // ---- result card after render
      const rp = popIn(t, 9.7, 0.5);
      if (rp > 0) {
        ctx.save(); ctx.translate(660, 640); ctx.scale(rp, rp);
        card(ctx, -130, -70, 260, 140, { fill: C.paper, r: 26 });
        icon(ctx, 'clapper', -60, 0, 70);
        text(ctx, '成片', 40, -14, { size: 36, weight: 'bold' });
        text(ctx, '.mp4', 40, 26, { size: 30, mono: true, color: C.inkSoft });
        ctx.restore();
        confetti(ctx, t, 9.6, 6, 50, 660, 500, 600);
      }

      // ---- Claude cameo
      const cin = popIn(t, 2.0, 0.6);
      const mood = t < 4.4 ? 'happy' : (t < 6.8 ? 'wow' : 'happy');
      drawClaude(ctx, 1740, 730, 230 * Math.max(cin, 0.001), { t, mood, wave: t > 9.6 ? 1 : 0, squash: Math.sin(prog(t, 9.5, 9.9) * Math.PI) * 0.6, look: { x: -0.5, y: -0.2 } });
    },
  });
})();
