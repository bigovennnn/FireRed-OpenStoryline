// Scene 8 (85–92s): one spark spreads into a field of flames; Claude waves; title + repo; calm hold at the end.
(() => {
  const ORIGIN = { x: 1000, y: 930 };
  function flame(ctx, x, y, s, t, ph, amp, body, inner) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
    const fw = 1 + Math.sin(t * 7 + ph) * 0.07 * amp;
    ctx.rotate(Math.sin(t * 3 + ph) * 0.05 * amp);
    ctx.scale(fw, 2 - fw);
    ctx.fillStyle = body; ctx.beginPath(); ctx.moveTo(0, -70); ctx.bezierCurveTo(45, -20, 45, 40, 0, 45); ctx.bezierCurveTo(-45, 40, -45, -20, 0, -70); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = C.ink; ctx.stroke();
    ctx.fillStyle = inner; ctx.beginPath(); ctx.moveTo(0, -20); ctx.bezierCurveTo(22, 5, 22, 35, 0, 38); ctx.bezierCurveTo(-22, 35, -22, 5, 0, -20); ctx.fill();
    ctx.restore();
  }
  // flame field (deterministic); returns list so draw order is back-to-front
  const FIELD = (() => {
    const r = rng(88), out = [];
    for (let row = 0; row < 4; row++) {
      const y = 790 + row * 65, n = 15 + row * 1;
      for (let i = 0; i < n; i++) {
        const x = (i + 0.5 + (r() - 0.5) * 0.6) * (W / n) + (row % 2) * 10;
        const d = Math.hypot(x - ORIGIN.x, (y - ORIGIN.y) * 2);
        out.push({ x, y: y + (r() - 0.5) * 20, s: 0.55 + row * 0.12 + r() * 0.2, ph: r() * 6, birth: 1.0 + d / 1000 * 2.2, hue: r() });
      }
    }
    return out;
  })();

  registerScene('s8_outro', {
    bg: C.cream,
    narrator: false,
    draw(ctx, t, dur) {
      const calm = Ease.inOut(prog(t, 5.6, 6.3));
      const amp = 1 - 0.75 * calm;

      // warm glow growing from the ground
      const glow = prog(t, 1.0, 3.6);
      const g = ctx.createLinearGradient(0, 600, 0, H);
      g.addColorStop(0, 'rgba(248,220,138,0)'); g.addColorStop(1, `rgba(248,180,110,${0.55 * glow})`);
      ctx.fillStyle = g; ctx.fillRect(0, 600, W, H - 600);

      // the single spark
      const sp = prog(t, 0.3, 0.9);
      if (t < 1.4) {
        const pulse = 1 + 0.25 * Math.sin(t * 14);
        const k = Ease.outBack(sp) * pulse * (1 + prog(t, 0.9, 1.3) * 1.2);
        const y = ORIGIN.y - 120 + Math.sin(prog(t, 0.3, 1.3) * Math.PI) * -60 + prog(t, 0.9, 1.4) * 120;
        sparkle(ctx, ORIGIN.x, y, 46 * k * (1 - prog(t, 1.15, 1.4)), t * 4, C.butter);
        sparkle(ctx, ORIGIN.x, y, 26 * k * (1 - prog(t, 1.15, 1.4)), -t * 3, C.white);
      }
      // ripple from origin
      for (let i = 0; i < 2; i++) {
        const rp = prog(t, 1.0 + i * 0.4, 3.2 + i * 0.4);
        if (rp > 0 && rp < 1) { ctx.save(); ctx.globalAlpha = (1 - rp) * 0.6; ctx.strokeStyle = C.claude; ctx.lineWidth = 10 * (1 - rp) + 2; ctx.beginPath(); ctx.ellipse(ORIGIN.x, ORIGIN.y + 10, rp * 1500, rp * 420, 0, 0, 7); ctx.stroke(); ctx.restore(); }
      }

      // flames (back to front = by y)
      const sorted = FIELD;
      for (const f of sorted) {
        const p = Ease.outBack(prog(t, f.birth, f.birth + 0.5));
        if (p <= 0) continue;
        const body = f.hue < 0.5 ? C.fire : C.claude;
        flame(ctx, f.x, f.y, f.s * p * 1.1, t, f.ph, amp, body, f.hue > 0.75 ? C.butter : C.peach);
      }
      // rising sparks
      const r = rng(23);
      for (let i = 0; i < 46; i++) {
        const x0 = r() * W, sp2 = 50 + r() * 70, ph = r() * 10, col = [C.butter, C.fire, C.claudeLight, C.peach][i % 4], sz = 8 + r() * 12;
        const d = Math.hypot(x0 - ORIGIN.x, 100) / 1000 * 2.2 + 1.3;
        const on = prog(t, d, d + 0.6) * (1 - 0.7 * calm);
        if (on <= 0) continue;
        const life = ((t * sp2 * (1 - 0.6 * calm) + ph * 100) % 620);
        const y = 880 - life, x = x0 + Math.sin(t * 2 + ph) * 25;
        sparkle(ctx, x, y, sz * on * (1 - life / 620), t * 3 + ph, col);
      }

      // Claude
      const enter = Ease.outBack(prog(t, 0.2, 0.9));
      const cx = 420, cy = lerp(1100, 560, enter);
      const sub = SCRIPT.subs.find(s => s.s >= 85 && s.e <= 92 && (t + 85) >= s.s && (t + 85) < s.e);
      const talking = sub && typed(sub.text, t + 85, sub.s, 16).length < Array.from(sub.text).length;
      drawClaude(ctx, cx, cy, 400, { t, talk: !!talking, mood: 'happy', wave: t > 3.6 && t < 6.0 ? 1 : 0, squash: Math.sin(prog(t, 0.6, 1.0) * Math.PI) * 0.6, look: { x: t < 3.5 ? 0.9 : 0.3, y: t < 3.5 ? 0.5 : -0.1 } });
      // Claude's line: first sub pops at his side early (he is on stage from 0.3 in a small hop)
      if (sub) {
        const s0 = sub.s - 85, e0 = sub.e - 85;
        const sc = popIn(t, s0, 0.35) * (1 - prog(t, e0 - 0.15, e0));
        bubble(ctx, typed(sub.text, t + 85, sub.s, 16), cx + 60, cy - 190, { dir: 'down', size: 50, maxW: 640, full: sub.text, scale: sc, anchor: 0.2 });
      }

      // title card
      const tp = popIn(t, 4.0, 0.6);
      if (tp > 0) {
        const bob = calm > 0 ? 0 : Math.sin(t * 2) * 3;
        ctx.save(); ctx.translate(1300, 560 + bob); ctx.scale(tp, tp); ctx.rotate(-0.015 * (1 - calm));
        card(ctx, -570, -140, 1140, 280, { fill: C.paper, r: 44 });
        text(ctx, 'FireRed-OpenStoryline', 0, -45, { size: 88, weight: 'bold', color: C.fire });
        text(ctx, 'github.com/FireRedTeam/FireRed-OpenStoryline', 0, 55, { size: 37, mono: true, color: C.ink });
        ctx.restore();
        confetti(ctx, t, 4.1, 5, 40, 1300, 560, 700);
      }
    },
  });
})();
