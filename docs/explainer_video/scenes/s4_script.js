// Scene 4 (38–52s): script style transfer -> voiceover waveform -> BGM onsets -> clips bounce on beat.
(() => {
  const nz = (i, seed = 1) => rng(i * 7919 + seed * 104729)();
  const REF = ['清晨的风，吹醒了小城～', '慢慢走，慢慢看。', '这一刻，刚刚好 ✨'];
  const NEW = ['海风轻轻，撩动了衣角～', '慢慢逛，慢慢拍。', '这一秒，刚刚好 ✨'];
  const HL = ['rgba(247,182,194,0.75)', 'rgba(168,220,196,0.85)', 'rgba(248,220,138,0.85)'];
  const X0 = 140, BEAT = 112, NB = 15;            // bgm bar region: 15 beats * 112px
  const BARS = 120, BW = 14;
  // onset design (bar index): beats every 8 bars (strong), offbeats at +4 (kept if 'keep')
  const ONS = [];
  for (let k = 0; k < NB; k++) {
    ONS.push({ bar: k * 8, amp: 1, keep: true, beat: k });
    if (k < NB - 1) ONS.push({ bar: k * 8 + 4, amp: 0.6, keep: k % 2 === 0, beat: k + 0.5 });
  }
  const SPUR = [2, 11, 19, 27, 35, 50, 61, 70, 83, 97, 108].map((b, i) => ({ bar: b, amp: 0.3, keep: false }));
  function bgmAmp(i) {
    let a = 0.22 + 0.12 * nz(i, 3);
    for (const o of ONS.concat(SPUR)) {
      const d = i - o.bar; if (d < -1 || d > 6) continue;
      a = Math.max(a, (d < 0 ? 0.5 : Math.exp(-d * 0.45)) * (0.25 + 0.75 * o.amp) + 0.1 * nz(i, 5));
    }
    return clamp(a, 0, 1);
  }
  function voiceAmp(i) {
    const w = Math.floor(i / 7.5), ph = (i % 7.5) / 7.5;
    if (nz(w, 9) < 0.14 || ph > 0.88) return 0.1;
    return clamp((0.35 + 0.65 * nz(i, 2)) * Math.sin(Math.PI * clamp(ph * 1.1, 0, 1)) * 1.05 + 0.1, 0.08, 1);
  }
  function wideCard(ctx, x, y, w, h, s, fill) {
    ctx.save(); ctx.translate(x + w / 2, y + h / 2); ctx.scale(s, s); ctx.translate(-w / 2, -h / 2);
    card(ctx, 0, 0, w, h, { fill, r: 26 }); ctx.restore();
  }

  registerScene('s4_script', {
    bg: C.cream,
    draw(ctx, t, dur) {
      // background sparkles
      const rb = rng(21);
      for (let i = 0; i < 14; i++) {
        const x = rb() * W, y = rb() * 820, ph = rb() * 6;
        sparkle(ctx, x, y, (8 + rb() * 10) * (0.6 + 0.4 * Math.sin(t * 3 + ph)), t + ph, [C.butter, C.pink, C.mint, C.sky][i % 4]);
      }
      const eD = Ease.inOut(prog(t, 11.2, 11.9));   // phase D: upper rows leave
      const upA = 1 - eD;

      // ================= Row 1: style transfer =================
      if (upA > 0.01) {
        ctx.save(); ctx.globalAlpha = upA; ctx.translate(0, -eD * 60);
        const s1 = popIn(t, 0.3, 0.5), s2 = popIn(t, 1.0, 0.5);
        if (s1 > 0) chip(ctx, 'script_template_rec', 80 + 210, 60, { scale: s1, fill: C.peach });
        if (s2 > 0) chip(ctx, 'generate_script', 1060 + 175, 60, { scale: s2, fill: C.butter });
        wideCard(ctx, 80, 105, 780, 235, s1, C.paper);
        wideCard(ctx, 1060, 105, 780, 235, s2, C.paper);
        if (s1 > 0.9) {
          text(ctx, '参考文案', 80 + 24, 138, { size: 30, color: C.inkSoft, align: 'left' });
          REF.forEach((l, i) => {
            const y = 195 + i * 50, a = prog(t, 0.7 + i * 0.25, 1.0 + i * 0.25);
            const hw = 20 + Array.from(l).length * 34;
            ctx.fillStyle = HL[i]; roundRect(ctx, 100, y - 22, hw * a, 44, 12); ctx.fill();
            ctx.save(); ctx.globalAlpha *= a; text(ctx, l, 110, y, { size: 34, align: 'left' }); ctx.restore();
          });
        }
        if (s2 > 0.9) {
          text(ctx, '新文案', 1060 + 24, 138, { size: 30, color: C.inkSoft, align: 'left' });
          NEW.forEach((l, i) => {
            const y = 195 + i * 50, st = 1.9 + i * 0.6;
            const shown = typed(l, t, st, 11);
            const hw = 20 + Array.from(shown).length * 34;
            if (shown) { ctx.fillStyle = HL[i]; roundRect(ctx, 1080, y - 22, hw, 44, 12); ctx.fill(); }
            text(ctx, shown, 1090, y, { size: 34, align: 'left' });
            if (t > st && t < st + Array.from(l).length / 11 + 0.3) {   // pen cursor
              icon(ctx, 'pen', 1090 + hw - 6, y - 18 + Math.sin(t * 25) * 3, 40, C.claudeDark);
            }
          });
        }
        // style-transfer arrows between lines + copy badge
        for (let i = 0; i < 3; i++) {
          const p = prog(t, 1.6 + i * 0.5, 2.2 + i * 0.5);
          if (p > 0) arrow(ctx, 870, 195 + i * 50, 1050, 195 + i * 50, p, { color: [C.claude, C.green, C.blue][i], lw: 6, bend: -14 + i * 14 });
        }
        if (t > 1.5) {
          const bp = popIn(t, 1.5, 0.4);
          ctx.save(); ctx.translate(960, 130); ctx.scale(bp, bp); ctx.rotate(Math.sin(t * 4) * 0.05);
          text(ctx, '复制风格', 0, 0, { size: 32, weight: 'bold', color: C.claudeDark });
          ctx.restore();
        }
        ctx.restore();
      }

      // ================= Row 2: voiceover =================
      if (t > 3.8 && upA > 0.01) {
        ctx.save(); ctx.globalAlpha = upA; ctx.translate(0, -eD * 60);
        const s = popIn(t, 4.0, 0.5);
        chip(ctx, 'generate_voiceover', 80 + 235, 378, { scale: s, fill: C.pink });
        wideCard(ctx, 80, 415, 1760, 160, s, C.paper);
        if (s > 0.9) {
          const pr = Ease.inOut(prog(t, 4.6, 7.4));
          const mp = 1 + Math.max(0, Math.sin(t * 9)) * 0.08 * (pr > 0 && pr < 1 ? 1 : 0);
          icon(ctx, 'mic', 170, 495, 80 * mp, C.claudeDark);
          const N = 88, bx0 = 260, bw = 17;
          for (let i = 0; i < N; i++) {
            const show = i / N < pr;
            const a = voiceAmp(i);
            const near = Math.abs(i / N - pr) < 0.05 && pr < 1;
            const wob = 1 + (show ? 0.12 * Math.sin(t * 7 + i) : 0) + (near ? 0.3 * Math.sin(t * 30 + i) : 0);
            const h = Math.max(6, a * 120 * wob * (show ? 1 : 0.0));
            if (show) { ctx.fillStyle = i % 2 ? C.pink : C.claudeLight; roundRect(ctx, bx0 + i * 18, 495 - h / 2, bw - 3, h, 6); ctx.fill(); }
            else { ctx.fillStyle = 'rgba(122,113,96,0.25)'; roundRect(ctx, bx0 + i * 18, 492, bw - 3, 6, 3); ctx.fill(); }
          }
          // sound arcs from mic
          if (pr > 0 && pr < 1) for (let k = 0; k < 3; k++) {
            const ph = (t * 1.6 + k / 3) % 1;
            ctx.strokeStyle = C.claude; ctx.lineWidth = 5; ctx.globalAlpha = upA * (1 - ph);
            ctx.beginPath(); ctx.arc(170, 495, 50 + ph * 40, -0.7, 0.7); ctx.stroke(); ctx.globalAlpha = upA;
          }
        }
        // flying text blob: script -> waveform
        const fp = prog(t, 4.1, 4.9);
        if (fp > 0 && fp < 1) {
          const e = Ease.inOut(fp);
          const x = lerp(1450, 300, e), y = lerp(330, 480, e) - Math.sin(fp * Math.PI) * 70;
          ctx.save(); ctx.globalAlpha = 1 - prog(fp, 0.8, 1);
          text(ctx, '海风轻轻…', x, y, { size: 36, weight: 'bold', color: C.claudeDark, outline: 8 });
          ctx.restore();
        }
        ctx.restore();
      }

      // ================= Row 3: BGM waveform + onsets =================
      if (t > 7.4) {
        const y0 = -Ease.inOut(prog(t, 11.2, 11.9)) * 50;
        const s = popIn(t, 7.6, 0.5);
        ctx.save(); ctx.translate(0, y0);
        chip(ctx, 'select_bgm', 80 + 130, 618, { scale: s, fill: C.lavender });
        wideCard(ctx, 80, 650, 1760, 190, s, C.paper);
        if (s > 0.9) {
          const scan = prog(t, 8.0, 11.0);
          const sx = X0 + scan * BARS * BW;
          const play = t > 11.4 ? X0 + (t - 11.4) * BEAT * 2 : -1;
          const base = 760;
          for (let i = 0; i < BARS; i++) {
            const x = X0 + i * BW;
            const a = bgmAmp(i), h = a * 115;
            const hit = play > 0 && Math.abs(x - play) < 50;
            const grow = popIn(t, 7.9 + i * 0.004, 0.3);
            const pulse = hit ? 1 + 0.3 * (1 - Math.abs(x - play) / 50) : 1;
            ctx.fillStyle = x < sx && t < 11.4 ? C.sky : (play > 0 && x < play ? C.claudeLight : C.sky);
            if (t < 11.4 && x > sx) ctx.fillStyle = 'rgba(169,203,239,0.55)';
            roundRect(ctx, x, base - h * pulse * grow / 2, BW - 3, Math.max(4, h * pulse * grow), 5); ctx.fill();
          }
          // spurious onsets: flash then get struck out
          SPUR.forEach((o, i) => {
            const x = X0 + o.bar * BW + 5, tt = 8.0 + o.bar * BW / (BARS * BW) * 3.0;
            const p = prog(t, tt, tt + 0.25), q = prog(t, tt + 0.5, tt + 1.0);
            if (p > 0 && q < 1) { ctx.save(); ctx.globalAlpha = 1 - q; ctx.fillStyle = C.inkSoft; ctx.beginPath(); ctx.arc(x, 676, 7 * p, 0, 7); ctx.fill();
              ctx.strokeStyle = C.fire; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x - 9, 667); ctx.lineTo(x + 9, 685); ctx.moveTo(x + 9, 667); ctx.lineTo(x - 9, 685); ctx.stroke(); ctx.restore(); }
          });
          // kept onset markers popping on local peaks
          ONS.forEach(o => {
            if (!o.keep) return;
            const x = X0 + o.bar * BW + 5, tt = 8.0 + o.bar / BARS * 3.0;
            const p = popIn(t, tt, 0.35); if (p <= 0) return;
            const ab = base - bgmAmp(o.bar) * 115 / 2 - 6;
            let flash = 0;
            if (play > 0) flash = Math.max(0, 1 - Math.abs(play - x) / 40);
            ctx.save(); ctx.strokeStyle = C.claude; ctx.lineWidth = 3; ctx.globalAlpha = 0.6;
            ctx.beginPath(); ctx.moveTo(x, 681); ctx.lineTo(x, ab); ctx.stroke(); ctx.globalAlpha = 1;
            ctx.fillStyle = flash > 0.3 ? C.fire : C.claude; ctx.strokeStyle = C.ink; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(x, 676, (o.amp === 1 ? 12 : 9) * p * (1 + flash * 0.5), 0, 7); ctx.fill(); ctx.stroke();
            const rp = prog(t, tt, tt + 0.5);
            if (rp < 1) { ctx.globalAlpha = 1 - rp; ctx.beginPath(); ctx.arc(x, 676, 12 + rp * 26, 0, 7); ctx.stroke(); }
            ctx.restore();
          });
          if (t < 11.4) { ctx.strokeStyle = C.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(sx, 672); ctx.lineTo(sx, 830); ctx.stroke();
            ctx.fillStyle = C.ink; ctx.beginPath(); ctx.moveTo(sx - 9, 668); ctx.lineTo(sx + 9, 668); ctx.lineTo(sx, 682); ctx.fill(); }
          else { ctx.strokeStyle = C.fire; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(play, 672); ctx.lineTo(play, 830); ctx.stroke(); }
          // legend
          const lg = popIn(t, 9.2, 0.4);
          if (lg > 0 && t < 11.4) {
            ctx.save(); ctx.translate(1590, 618); ctx.scale(lg, lg);
            text(ctx, '只留局部峰值', 0, 0, { size: 32, weight: 'bold', color: C.claudeDark });
            ctx.restore();
          }
        }
        ctx.restore();
      }

      // ================= Phase D: clips bounce on the beat =================
      if (t > 11.2) {
        const e = popIn(t, 11.3, 0.5);
        const tb = Math.max(0, t - 11.4) / 0.5, fr = tb % 1;
        const up = 4 * fr * (1 - fr) * 1.0, onGround = fr < 0.12 || fr > 0.9;
        const pal = [C.sky, C.mint, C.butter, C.pink, C.lavender], ic = ['image', 'film', 'clapper', 'image', 'film'];
        for (let i = 0; i < 5; i++) {
          const cx = 260 + i * 270, sq = onGround && t > 11.4 ? 0.12 : 0;
          const lift = t > 11.4 ? up * 130 : 0;
          ctx.save(); ctx.translate(cx, 440 - lift); ctx.scale(e * (1 + sq), e * (1 - sq));
          ctx.rotate(Math.sin(tb * Math.PI + i) * 0.04);
          card(ctx, -105, -150, 210, 150, { fill: pal[i], r: 22 });
          icon(ctx, ic[i], 0, -75, 76);
          ctx.restore();
          // ground shadow
          ctx.fillStyle = 'rgba(61,57,41,0.15)'; ctx.beginPath(); ctx.ellipse(cx, 462, 95 * (1 - up * 0.3) * e, 12 * e, 0, 0, 7); ctx.fill();
        }
        ctx.strokeStyle = C.inkSoft; ctx.lineWidth = 4; ctx.setLineDash([14, 12]); ctx.globalAlpha = e;
        ctx.beginPath(); ctx.moveTo(100, 472); ctx.lineTo(1450, 472); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
        // beat counter
        if (t > 11.4) {
          const bn = Math.floor(tb) % 4 + 1, pop = 1 + (fr < 0.2 ? (0.2 - fr) * 2 : 0);
          text(ctx, '♪ ' + bn, 1720, 90, { size: 80 * pop, weight: 'bold', color: C.claude });
          text(ctx, '卡点', 1720, 165, { size: 40, color: C.inkSoft });
        }
        drawClaude(ctx, 1680, 400 - (t > 11.4 ? up * 40 : 0), 240 * e, { t, mood: 'wink', wave: 0, squash: onGround ? 0.5 : 0, rot: Math.sin(tb * Math.PI * 2) * 0.08 });
        if (t > 11.4 && fr < 0.15) for (let k = 0; k < 4; k++) sparkle(ctx, 260 + (Math.floor(tb) * 270 + k * 190) % 1350, 380 - k * 10, 18 * (0.15 - fr) / 0.15, t * 3 + k, [C.butter, C.pink][k % 2]);
      }
    },
  });
})();
