// Scene 2 (8–22s): chat -> LLM Agent brain -> MCP -> MCP Server tool shelf -> ArtifactStore cabinet.
(() => {
  const S = 8;
  const tools = [
    ['load_media', C.sky], ['split_shots', C.mint], ['understand_clips', C.lavender],
    ['generate_script', C.pink], ['plan_timeline_pro', C.peach], ['render_video', C.butter],
  ];
  const SH = { x: 790, y: 250, w: 480, h: 600 };
  const CB = { x: 1450, y: 250, w: 380, h: 560 };
  const AG = { x: 110, y: 380, w: 440, h: 330 };
  const chipY = i => SH.y + 165 + i * 75;
  const drawerY = i => CB.y + 120 + i * 105;

  function pulse(ctx, x1, y1, x2, y2, t, color, n = 3, speed = 0.9) {
    for (let i = 0; i < n; i++) {
      const p = ((t * speed + i / n) % 1);
      const x = lerp(x1, x2, p), y = lerp(y1, y2, p) + Math.sin(p * Math.PI) * -18;
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 11 * Math.sin(p * Math.PI) + 3, 0, 7); ctx.fill();
    }
  }

  registerScene('s2_arch', {
    bg: C.cream,
    draw(ctx, t, dur) {
      // bg sparkles
      const r = rng(21);
      for (let i = 0; i < 14; i++) {
        const x = r() * W, y = r() * 820, ph = r() * 6;
        sparkle(ctx, x, y, 8 + 10 * (0.5 + 0.5 * Math.sin(t * 2.5 + ph)), t * 0.8 + ph, [C.butter, C.pink, C.mint, C.sky][i % 4]);
      }

      // ---- 1. user chat bubble (0.4–3.8) ----
      const up = popIn(t, 0.4, 0.5);
      if (up > 0) {
        ctx.save(); ctx.translate(120, 150); ctx.scale(up, up);
        ctx.fillStyle = C.sky; ctx.strokeStyle = C.ink; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(0, 0, 50, 0, 7); ctx.fill(); ctx.stroke();
        ctx.fillStyle = C.ink; ctx.beginPath(); ctx.arc(-16, -8, 6, 0, 7); ctx.arc(16, -8, 6, 0, 7); ctx.fill();
        ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.arc(0, 6, 18, 0.2, Math.PI - 0.2); ctx.stroke();
        ctx.restore();
        text(ctx, '你', 120, 222, { size: 32, color: C.inkSoft, alpha: up > 0.5 ? 1 : 0 });
        const msg = '帮我把旅行素材剪成一支温柔的 vlog';
        const bsc = popIn(t, 0.8, 0.45);
        bubble(ctx, typed(msg, t, 1.0, 11), 190, 150, { dir: 'left', size: 40, maxW: 640, full: msg, scale: bsc, fill: C.paper, anchor: 0.5 });
      }
      // message travels down to the agent
      const travel = prog(t, 3.6, 4.6);
      if (travel > 0 && travel < 1) {
        const x = lerp(260, AG.x + AG.w / 2, Ease.inOut(travel)), y = lerp(250, AG.y - 10, Ease.inOut(travel));
        ctx.save(); ctx.translate(x, y); ctx.scale(1 - travel * 0.3, 1 - travel * 0.3);
        icon(ctx, 'chat', 0, 0, 90, C.claudeDark); ctx.restore();
      }

      // ---- 2. LLM Agent (3.9–) ----
      const ap = popIn(t, 3.9, 0.55);
      if (ap > 0) {
        ctx.save(); ctx.translate(AG.x + AG.w / 2, AG.y + AG.h / 2); ctx.scale(ap, ap);
        ctx.translate(-AG.w / 2, -AG.h / 2);
        card(ctx, 0, 0, AG.w, AG.h, { fill: C.peach, r: 40 });
        text(ctx, 'LLM Agent', AG.w / 2, 105, { size: 52, weight: 'bold' });
        text(ctx, 'create_agent · 大脑', AG.w / 2, 165, { size: 34, color: C.inkSoft });
        // thinking dots
        for (let i = 0; i < 3; i++) {
          const s = 0.6 + 0.4 * Math.max(0, Math.sin(t * 5 - i * 0.9));
          ctx.fillStyle = C.claudeDark; ctx.beginPath(); ctx.arc(AG.w / 2 - 40 + i * 40, 230, 11 * s, 0, 7); ctx.fill();
        }
        ctx.restore();
        // brain icon bobbing on top
        const bb = Math.sin(t * 4) * 5;
        ctx.save(); ctx.translate(AG.x + AG.w / 2, AG.y - 40 + bb); ctx.scale(ap, ap);
        ctx.fillStyle = C.pink; ctx.strokeStyle = C.ink; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(0, 0, 54, 0, 7); ctx.fill(); ctx.stroke();
        icon(ctx, 'brain', 0, 2, 70, C.ink);
        ctx.restore();
        // Claude cameo thinking, peeking from card corner
        drawClaude(ctx, 1380, 130 + (1 - ap) * -200, 150, { t, mood: t > 4.5 && t < 7.4 ? 'think' : (t > 12 ? 'wink' : 'happy'), look: { x: -0.6, y: 0.3 }, blinkOffset: 1 });
        if (t > 4.4 && t < 7.6) {
          const q = Math.sin(t * 6) * 6;
          text(ctx, '？', 1290, 60 + q, { size: 44, color: C.claude, weight: 'bold' });
          if (t > 5.4) text(ctx, '！', 1480, 70 - q, { size: 40, color: C.fire, weight: 'bold', alpha: 0.9 });
        }
      }

      // ---- 3. MCP link (7.4–) ----
      const mp = prog(t, 7.4, 8.4);
      const ax1 = AG.x + AG.w + 10, ax2 = SH.x - 10, ay = 545;
      if (mp > 0) {
        arrow(ctx, ax1, ay, ax2, ay, Ease.outCubic(mp), { color: C.blue, lw: 8 });
        const mc = popIn(t, 7.9, 0.4);
        if (mc > 0) {
          ctx.save(); ctx.translate((ax1 + ax2) / 2, ay - 70); ctx.scale(mc, mc);
          card(ctx, -58, -30, 116, 60, { fill: C.sky, r: 30, lw: 4 });
          text(ctx, 'MCP', 0, 2, { size: 36, weight: 'bold', mono: true });
          ctx.restore();
        }
        if (t > 8.6) pulse(ctx, ax1 + 10, ay, ax2 - 20, ay, t, C.blue, 3, 0.8);
      }

      // ---- 4. MCP Server shelf (7.6–) ----
      const sp = popIn(t, 7.6, 0.55);
      if (sp > 0) {
        ctx.save(); ctx.translate(SH.x + SH.w / 2, SH.y + SH.h / 2); ctx.scale(sp, sp);
        ctx.translate(-SH.w / 2, -SH.h / 2);
        card(ctx, 0, 0, SH.w, SH.h, { fill: C.paper, r: 36 });
        text(ctx, 'MCP Server', SH.w / 2, 52, { size: 46, weight: 'bold' });
        text(ctx, '一排剪辑工具', SH.w / 2, 100, { size: 30, color: C.inkSoft });
        // planks
        for (let i = 0; i < tools.length; i++) {
          const py = chipY(i) - SH.y + 34;
          ctx.fillStyle = '#E8D9BC'; ctx.strokeStyle = C.ink; ctx.lineWidth = 4;
          roundRect(ctx, 28, py, SH.w - 56, 14, 7); ctx.fill(); ctx.stroke();
        }
        ctx.restore();
        // chips pop in one by one, then wiggle when "called"
        tools.forEach(([n, col], i) => {
          const cp = popIn(t, 8.3 + i * 0.35, 0.4);
          if (cp <= 0) return;
          const active = t > 9.6 && Math.floor((t - 9.6) / 0.7) % tools.length === i && t < 13.6;
          const w = active ? 1 + 0.1 * Math.abs(Math.sin((t - 9.6) * Math.PI / 0.7 * 1)) : 1;
          const wob = active ? Math.sin(t * 30) * 0.03 : 0;
          ctx.save(); ctx.translate(SH.x + SH.w / 2, chipY(i)); ctx.rotate(wob);
          chip(ctx, n, 0, 0, { fill: col, scale: cp * w, size: 32 });
          ctx.restore();
        });
        if (t > 9.4) for (let i = 0; i < 3; i++) {
          sparkle(ctx, SH.x + SH.w - 10 + Math.sin(t * 3 + i) * 10, SH.y + 30 + i * 180, 14 + 6 * Math.sin(t * 5 + i), t, C.butter);
        }
      }

      // ---- 5. ArtifactStore cabinet (10.6–) ----
      const cp = popIn(t, 10.6, 0.6);
      if (cp > 0) {
        // arrow shelf -> cabinet
        const a2 = prog(t, 10.8, 11.6);
        arrow(ctx, SH.x + SH.w + 12, 545, CB.x - 14, 545, Ease.outCubic(a2), { color: C.green, lw: 8 });
        ctx.save(); ctx.translate(CB.x + CB.w / 2, CB.y + CB.h / 2); ctx.scale(cp, cp);
        ctx.translate(-CB.w / 2, -CB.h / 2);
        card(ctx, 0, 0, CB.w, CB.h, { fill: C.mint, r: 34 });
        text(ctx, 'ArtifactStore', CB.w / 2, 52, { size: 44, weight: 'bold' });
        for (let i = 0; i < 4; i++) {
          const dy = drawerY(i) - CB.y;
          const opened = prog(t, 11.6 + i * 0.5, 12.0 + i * 0.5);
          const pop = Math.sin(opened * Math.PI) * 12;
          card(ctx, 30 - pop * 0.3, dy - pop, CB.w - 60, 88, { fill: C.paper, r: 18, lw: 4, shadow: false });
          card(ctx, CB.w / 2 - 40, dy + 30 - pop, 80, 26, { fill: C.butter, r: 13, lw: 4, shadow: false });
          if (opened >= 1) icon(ctx, 'check', CB.w - 70, dy + 44, 34, C.green);
        }
        ctx.restore();
        // artifacts flying from shelf into drawers
        for (let i = 0; i < 4; i++) {
          const t0 = 11.0 + i * 0.5, fp = prog(t, t0, t0 + 0.8);
          if (fp <= 0 || fp >= 1) continue;
          const e = Ease.inOut(fp);
          const x = lerp(SH.x + SH.w - 30, CB.x + CB.w / 2, e), y = lerp(chipY(i), drawerY(i) + 44, e) - Math.sin(fp * Math.PI) * 90;
          ctx.save(); ctx.translate(x, y); ctx.rotate(Math.sin(fp * 6) * 0.2);
          card(ctx, -34, -34, 68, 68, { fill: C.butter, r: 14, lw: 4 });
          icon(ctx, ['film', 'scissors', 'eye', 'pen'][i], 0, 0, 40, C.ink);
          ctx.restore();
        }
      }
      if (t > 12.6) confetti(ctx, t, 12.6, 5, 28, CB.x + CB.w / 2, CB.y + 100, 450);
    },
  });
})();
