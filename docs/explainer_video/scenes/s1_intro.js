// Scene 1 (0–8s): big Claude pops in, waves, title + fire sparks.
registerScene('s1_intro', {
  bg: C.cream,
  narrator: false,
  draw(ctx, t, dur) {
    // floating sparkles in the background
    const r = rng(11);
    for (let i = 0; i < 26; i++) {
      const x = r() * W, y0 = r() * H, sp = 20 + r() * 40, ph = r() * 6;
      const y = ((y0 - t * sp) % H + H) % H;
      sparkle(ctx, x, y, (10 + r() * 16) * (0.6 + 0.4 * Math.sin(t * 3 + ph)), t + ph, [C.butter, C.pink, C.claudeLight, C.mint][i % 4]);
    }

    // Claude drops in with a squash
    const drop = Ease.outBack(prog(t, 0.1, 0.8));
    const land = prog(t, 0.55, 0.9);
    const sq = Math.sin(land * Math.PI) * 0.8;
    const cy = lerp(-250, 470, drop);
    const sub = SCRIPT.subs.find(s => t >= s.s && t < s.e);
    const talking = sub && typed(sub.text, t, sub.s, 16).length < Array.from(sub.text).length;
    const exit = Ease.inOut(prog(t, 4.0, 4.8));           // slides left to make room for title
    const cx = lerp(W / 2, 400, exit);
    drawClaude(ctx, cx, cy, lerp(420, 330, exit), {
      t, talk: !!talking, mood: t < 1.2 ? 'wow' : 'happy', wave: t > 0.9 && t < 4 ? 1 : 0, squash: sq,
      look: { x: exit * 0.7, y: 0 },
    });

    // bubble from Claude
    if (sub) {
      const sc = popIn(t, sub.s, 0.35) * (1 - prog(t, sub.e - 0.15, sub.e));
      bubble(ctx, typed(sub.text, t, sub.s, 16), cx + (exit > 0.5 ? 60 : 110), cy - 190,
        { dir: 'down', size: 50, maxW: 760, full: sub.text, scale: sc, anchor: exit > 0.5 ? 0.12 : 0.2 });
    }

    // title card
    const tp = popIn(t, 4.6, 0.6);
    if (tp > 0) {
      ctx.save(); ctx.translate(1270, 560); ctx.scale(tp, tp); ctx.rotate(-0.02);
      card(ctx, -560, -150, 1120, 300, { fill: C.paper, r: 44 });
      text(ctx, 'FireRed-OpenStoryline', 0, -50, { size: 92, weight: 'bold', color: C.fire });
      const tag = '一句话  →  一支视频';
      text(ctx, tag, 0, 70, { size: 58, color: C.ink });
      ctx.restore();
      // tiny flame on the corner
      const fx = 1790, fy = 430, fl = popIn(t, 5.0, 0.4);
      ctx.save(); ctx.translate(fx, fy); ctx.scale(fl, fl);
      const fw = 1 + Math.sin(t * 9) * 0.06;
      ctx.scale(fw, 2 - fw);
      ctx.fillStyle = C.fire; ctx.beginPath(); ctx.moveTo(0, -70); ctx.bezierCurveTo(45, -20, 45, 40, 0, 45); ctx.bezierCurveTo(-45, 40, -45, -20, 0, -70); ctx.fill();
      ctx.fillStyle = C.butter; ctx.beginPath(); ctx.moveTo(0, -20); ctx.bezierCurveTo(22, 5, 22, 35, 0, 38); ctx.bezierCurveTo(-22, 35, -22, 5, 0, -20); ctx.fill();
      ctx.restore();
    }
    confetti(ctx, t, 4.7, 3, 60, 1270, 560, 800);
  },
});
