// core.js — shared drawing kit for the OpenStoryline explainer.
// RULE: every frame is a pure function of time. No Math.random(), no state
// carried between frames. Use rng(seed) for deterministic randomness.

const W = 1920, H = 1080, FPS = 30;
const STAGE_H = 860;          // scenes keep key content above this line
const FONT = '"WenQuanYi Zen Hei", "Noto Color Emoji", sans-serif';
const MONO = '"DejaVu Sans Mono", "WenQuanYi Zen Hei Mono", monospace';

const C = {
  cream: '#FBF6EC', paper: '#FFFDF8', ink: '#3D3929', inkSoft: '#7A7160',
  claude: '#D97757', claudeDark: '#B85C3E', claudeLight: '#F2B8A0',
  fire: '#E8453C', pink: '#F7B6C2', mint: '#A8DCC4', sky: '#A9CBEF',
  butter: '#F8DC8A', lavender: '#C9B8EC', peach: '#FFD1B3', white: '#FFFFFF',
  green: '#6BBF8A', blue: '#5B8DEF',
};

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const prog = (t, a, b) => clamp((t - a) / (b - a));
const Ease = {
  inOut: x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  outCubic: x => 1 - Math.pow(1 - x, 3),
  inCubic: x => x * x * x,
  outBack: x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  outElastic: x => x === 0 ? 0 : x === 1 ? 1 : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
};
// scale for a "pop in" that starts at time `at` (seconds) and takes `d` seconds
const popIn = (t, at, d = 0.45) => Ease.outBack(prog(t, at, at + d));
// 0→1 in, hold, 1→0 out
const fadeInOut = (t, a, b, f = 0.3) => Math.min(prog(t, a, a + f), 1 - prog(t, b - f, b));

function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ---------- primitives ----------
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// soft "sticker" card: offset shadow + fill + ink outline
function card(ctx, x, y, w, h, o = {}) {
  const r = o.r ?? 28, lw = o.lw ?? 5;
  ctx.save();
  if (o.shadow !== false) {
    roundRect(ctx, x + 8, y + 10, w, h, r);
    ctx.fillStyle = 'rgba(61,57,41,0.14)'; ctx.fill();
  }
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = o.fill || C.paper; ctx.fill();
  if (lw > 0) { ctx.lineWidth = lw; ctx.strokeStyle = o.stroke || C.ink; ctx.stroke(); }
  ctx.restore();
}

function text(ctx, str, x, y, o = {}) {
  ctx.save();
  ctx.font = `${o.weight || 'normal'} ${o.size || 40}px ${o.mono ? MONO : FONT}`;
  ctx.fillStyle = o.color || C.ink;
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = o.baseline || 'middle';
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (o.outline) { ctx.lineWidth = o.outline; ctx.strokeStyle = o.outlineColor || C.white; ctx.lineJoin = 'round'; ctx.strokeText(str, x, y); }
  ctx.fillText(str, x, y);
  ctx.restore();
}

// char-based wrap (works for mixed CJK / latin)
function wrapLines(ctx, str, maxW) {
  // tokens: latin words (kept whole) or single CJK chars / spaces
  const toks = str.match(/[A-Za-z0-9_\-.:/]+|\n|[\s\S]/gu) || [];
  const lines = []; let cur = '';
  for (const tk of toks) {
    if (tk === '\n') { lines.push(cur); cur = ''; continue; }
    if (ctx.measureText(cur + tk).width > maxW && cur.trim()) { lines.push(cur); cur = tk.trim() ? tk : ''; } else cur += tk;
  }
  if (cur) lines.push(cur);
  return lines;
}

// typewriter: how much of `str` is visible at time t if it starts at `at`
function typed(str, t, at, cps = 14) {
  const chars = Array.from(str);
  return chars.slice(0, Math.floor(clamp((t - at) * cps, 0, chars.length))).join('');
}

// speech bubble. (x,y) = tail tip. o.dir: 'down' (bubble above tip) | 'left' (bubble right of tip) | 'up'
function bubble(ctx, str, x, y, o = {}) {
  const size = o.size || 40, pad = o.pad || 26, maxW = o.maxW || 700;
  const sc = o.scale ?? 1; if (sc <= 0.01) return;
  ctx.save();
  ctx.font = `${o.weight || 'normal'} ${size}px ${FONT}`;
  const full = wrapLines(ctx, o.full || str, maxW);           // size box on full text so it doesn't jiggle
  const shown = wrapLines(ctx, str, maxW);
  const bw = Math.max(...full.map(l => ctx.measureText(l).width), size) + pad * 2;
  const bh = full.length * size * 1.3 + pad * 2 - size * 0.3;
  const dir = o.dir || 'down';
  let bx, by;
  if (dir === 'down') { bx = x - (o.anchor ?? 0.3) * bw; by = y - 30 - bh; }
  else if (dir === 'up') { bx = x - (o.anchor ?? 0.3) * bw; by = y + 30; }
  else { bx = x + 30; by = y - (o.anchor ?? 0.5) * bh; }
  ctx.translate(x, y); ctx.scale(sc, sc); ctx.translate(-x, -y);
  // shadow
  roundRect(ctx, bx + 6, by + 8, bw, bh, 30); ctx.fillStyle = 'rgba(61,57,41,0.13)'; ctx.fill();
  // body + tail
  ctx.fillStyle = o.fill || C.white; ctx.strokeStyle = o.stroke || C.ink; ctx.lineWidth = 5; ctx.lineJoin = 'round';
  roundRect(ctx, bx, by, bw, bh, 30); ctx.fill(); ctx.stroke();
  ctx.beginPath();
  if (dir === 'down') { ctx.moveTo(x - 18, by + bh - 3); ctx.lineTo(x, y); ctx.lineTo(x + 20, by + bh - 3); }
  else if (dir === 'up') { ctx.moveTo(x - 18, by + 3); ctx.lineTo(x, y); ctx.lineTo(x + 20, by + 3); }
  else { ctx.moveTo(bx + 3, y - 16); ctx.lineTo(x, y); ctx.lineTo(bx + 3, y + 18); }
  ctx.fill(); ctx.stroke();
  // re-cover the seam
  ctx.beginPath();
  if (dir === 'down') { ctx.moveTo(x - 14, by + bh - 3); ctx.lineTo(x + 16, by + bh - 3); }
  else if (dir === 'up') { ctx.moveTo(x - 14, by + 3); ctx.lineTo(x + 16, by + 3); }
  else { ctx.moveTo(bx + 3, y - 12); ctx.lineTo(bx + 3, y + 14); }
  ctx.strokeStyle = o.fill || C.white; ctx.lineWidth = 7; ctx.stroke();
  ctx.fillStyle = o.color || C.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  shown.forEach((l, i) => ctx.fillText(l, bx + pad, by + pad + i * size * 1.3));
  ctx.restore();
  return { x: bx, y: by, w: bw, h: bh };
}

// arrow from (x1,y1) to (x2,y2) drawn up to progress p. o.bend bends it (pixels, perpendicular)
function arrow(ctx, x1, y1, x2, y2, p = 1, o = {}) {
  if (p <= 0) return;
  const bend = o.bend || 0;
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
  const cx = mx - dy / L * bend, cy = my + dx / L * bend;
  const pt = s => [(1 - s) * (1 - s) * x1 + 2 * (1 - s) * s * cx + s * s * x2, (1 - s) * (1 - s) * y1 + 2 * (1 - s) * s * cy + s * s * y2];
  ctx.save();
  ctx.strokeStyle = o.color || C.ink; ctx.lineWidth = o.lw || 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  if (o.dash) ctx.setLineDash(o.dash);
  ctx.beginPath(); ctx.moveTo(x1, y1);
  const N = 30; for (let i = 1; i <= N; i++) { const [a, b] = pt(i / N * p); ctx.lineTo(a, b); }
  ctx.stroke(); ctx.setLineDash([]);
  if (o.head !== false) {
    const [ex, ey] = pt(p), [px, py] = pt(Math.max(0, p - 0.03));
    const ang = Math.atan2(ey - py, ex - px), hs = o.headSize || 22;
    ctx.fillStyle = o.color || C.ink; ctx.beginPath();
    ctx.moveTo(ex + Math.cos(ang) * 4, ey + Math.sin(ang) * 4);
    ctx.lineTo(ex - Math.cos(ang - 0.5) * hs, ey - Math.sin(ang - 0.5) * hs);
    ctx.lineTo(ex - Math.cos(ang + 0.5) * hs, ey - Math.sin(ang + 0.5) * hs);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// 4-point twinkle
function sparkle(ctx, x, y, r, rot = 0, color = C.butter) {
  if (r <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    ctx.quadraticCurveTo(Math.cos(a - Math.PI / 4) * r * 0.18, Math.sin(a - Math.PI / 4) * r * 0.18, Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.quadraticCurveTo(Math.cos(-Math.PI / 4) * r * 0.18, Math.sin(-Math.PI / 4) * r * 0.18, r, 0);
  ctx.fillStyle = color; ctx.fill();
  ctx.restore();
}

// pill with a monospace node name, e.g. chip(ctx,'split_shots',x,y,{fill:C.mint})
function chip(ctx, label, x, y, o = {}) {
  const size = o.size || 30;
  ctx.save();
  ctx.font = `bold ${size}px ${MONO}`;
  const w = ctx.measureText(label).width + size * 1.4, h = size * 1.8;
  const sc = o.scale ?? 1; ctx.translate(x, y); ctx.scale(sc, sc);
  card(ctx, -w / 2, -h / 2, w, h, { fill: o.fill || C.butter, r: h / 2, lw: 4, shadow: o.shadow });
  ctx.fillStyle = o.color || C.ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, 0, 2);
  ctx.restore();
  return { w, h };
}

// simple cute icons, centred at x,y, size s
function icon(ctx, name, x, y, s = 60, color = C.ink) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 100, s / 100);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const P = () => ctx.beginPath();
  switch (name) {
    case 'film':
      roundRect(ctx, -45, -35, 90, 70, 10); ctx.stroke();
      for (let i = -3; i <= 3; i++) { ctx.fillRect(i * 12 - 4, -30, 7, 8); ctx.fillRect(i * 12 - 4, 22, 7, 8); }
      break;
    case 'music':
      P(); ctx.moveTo(-15, 30); ctx.lineTo(-15, -35); ctx.lineTo(30, -45); ctx.lineTo(30, 20); ctx.stroke();
      P(); ctx.ellipse(-28, 32, 15, 11, -0.3, 0, 7); ctx.fill();
      P(); ctx.ellipse(17, 22, 15, 11, -0.3, 0, 7); ctx.fill();
      break;
    case 'eye':
      P(); ctx.moveTo(-48, 0); ctx.quadraticCurveTo(0, -45, 48, 0); ctx.quadraticCurveTo(0, 45, -48, 0); ctx.stroke();
      P(); ctx.arc(0, 0, 15, 0, 7); ctx.fill();
      break;
    case 'pen':
      ctx.rotate(-0.7); roundRect(ctx, -12, -45, 24, 70, 5); ctx.stroke();
      P(); ctx.moveTo(-12, 25); ctx.lineTo(0, 48); ctx.lineTo(12, 25); ctx.stroke();
      break;
    case 'mic':
      roundRect(ctx, -18, -48, 36, 60, 18); ctx.stroke();
      P(); ctx.arc(0, 0, 32, 0.1, Math.PI - 0.1); ctx.stroke();
      P(); ctx.moveTo(0, 32); ctx.lineTo(0, 48); ctx.moveTo(-18, 48); ctx.lineTo(18, 48); ctx.stroke();
      break;
    case 'search':
      P(); ctx.arc(-10, -10, 28, 0, 7); ctx.stroke();
      P(); ctx.moveTo(10, 10); ctx.lineTo(40, 40); ctx.lineWidth = 12; ctx.stroke();
      break;
    case 'scissors':
      P(); ctx.arc(-25, 28, 14, 0, 7); ctx.stroke(); P(); ctx.arc(25, 28, 14, 0, 7); ctx.stroke();
      P(); ctx.moveTo(-16, 17); ctx.lineTo(25, -45); ctx.moveTo(16, 17); ctx.lineTo(-25, -45); ctx.stroke();
      break;
    case 'folder':
      P(); ctx.moveTo(-45, -30); ctx.lineTo(-12, -30); ctx.lineTo(-4, -20); ctx.lineTo(45, -20); ctx.lineTo(45, 35); ctx.lineTo(-45, 35); ctx.closePath(); ctx.stroke();
      break;
    case 'gear':
      for (let i = 0; i < 8; i++) { ctx.save(); ctx.rotate(i * Math.PI / 4); ctx.fillRect(-8, -46, 16, 18); ctx.restore(); }
      P(); ctx.arc(0, 0, 32, 0, 7); ctx.stroke(); P(); ctx.arc(0, 0, 11, 0, 7); ctx.stroke();
      break;
    case 'chat':
      roundRect(ctx, -45, -38, 90, 62, 18); ctx.stroke();
      P(); ctx.moveTo(-20, 24); ctx.lineTo(-28, 44); ctx.lineTo(0, 24); ctx.stroke();
      break;
    case 'brain':
      P(); ctx.arc(-15, -10, 26, Math.PI * 0.6, Math.PI * 1.8); ctx.arc(15, -10, 26, Math.PI * 1.2, Math.PI * 0.4); ctx.arc(0, 18, 24, 0.2, Math.PI - 0.2); ctx.closePath(); ctx.stroke();
      P(); ctx.moveTo(0, -30); ctx.lineTo(0, 30); ctx.stroke();
      break;
    case 'check':
      P(); ctx.moveTo(-32, 0); ctx.lineTo(-8, 26); ctx.lineTo(36, -26); ctx.lineWidth = 14; ctx.stroke();
      break;
    case 'image':
      roundRect(ctx, -45, -35, 90, 70, 10); ctx.stroke();
      P(); ctx.moveTo(-38, 28); ctx.lineTo(-10, -2); ctx.lineTo(8, 16); ctx.lineTo(20, 4); ctx.lineTo(38, 28); ctx.stroke();
      P(); ctx.arc(22, -16, 8, 0, 7); ctx.fill();
      break;
    case 'clapper':
      roundRect(ctx, -45, -15, 90, 55, 8); ctx.stroke();
      P(); ctx.moveTo(-45, -18); ctx.lineTo(40, -42); ctx.stroke();
      break;
    case 'box':
      P(); ctx.moveTo(-40, -20); ctx.lineTo(0, -40); ctx.lineTo(40, -20); ctx.lineTo(40, 25); ctx.lineTo(0, 45); ctx.lineTo(-40, 25); ctx.closePath(); ctx.stroke();
      P(); ctx.moveTo(-40, -20); ctx.lineTo(0, 0); ctx.lineTo(40, -20); ctx.moveTo(0, 0); ctx.lineTo(0, 45); ctx.stroke();
      break;
    case 'star':
      P(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 20 : 45, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill();
      break;
  }
  ctx.restore();
}

// ---------- the star of the show ----------
// Cute Claude: orange sun-burst blob with a face.
// o: { t (seconds, for idle motion), talk (bool), mood: 'happy'|'wow'|'wink'|'think'|'proud',
//      wave (0..1 amount of waving right arm), look: {x,y} (-1..1), squash (0..1), rot }
function drawClaude(ctx, x, y, s, o = {}) {
  const t = o.t || 0;
  ctx.save();
  const bob = Math.sin(t * 3.2) * s * 0.03;
  ctx.translate(x, y + bob);
  ctx.rotate(o.rot || 0);
  const sq = o.squash || 0;
  ctx.scale(1 + sq * 0.15, 1 - sq * 0.15);
  ctx.scale(s / 200, s / 200); // design space: body radius ~ 100

  // ground shadow
  ctx.save(); ctx.globalAlpha = 0.18; ctx.fillStyle = C.ink;
  ctx.beginPath(); ctx.ellipse(0, 128 - bob * 200 / s, 80, 14, 0, 0, 7); ctx.fill(); ctx.restore();

  // rays — Claude's burst, softened into rounded petals
  const spin = t * 0.35;
  ctx.fillStyle = C.claude;
  for (let i = 0; i < 12; i++) {
    const a = spin + i * Math.PI / 6;
    const len = 118 + Math.sin(t * 4 + i * 1.7) * 5;
    ctx.save(); ctx.rotate(a);
    ctx.beginPath(); ctx.ellipse(len * 0.55, 0, len * 0.5, 17, 0, 0, 7); ctx.fill();
    ctx.restore();
  }
  // little arms (over rays, under body)
  ctx.lineCap = 'round'; ctx.strokeStyle = C.claudeDark; ctx.lineWidth = 16;
  ctx.beginPath(); ctx.moveTo(-70, 20); ctx.quadraticCurveTo(-110, 40, -104, 70); ctx.stroke();
  const wave = o.wave || 0, wa = -0.3 - wave * (1.6 + Math.sin(t * 14) * 0.45);
  ctx.save(); ctx.translate(70, 20); ctx.rotate(wa);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(40, 20, 34, 52); ctx.stroke();
  ctx.restore();

  // body
  const g = ctx.createRadialGradient(-25, -30, 10, 0, 0, 100);
  g.addColorStop(0, '#EB9677'); g.addColorStop(1, C.claude);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 90, 0, 7); ctx.fill();

  // face
  const lx = (o.look?.x || 0) * 10, ly = (o.look?.y || 0) * 8;
  const mood = o.mood || 'happy';
  const blinkPhase = (t + (o.blinkOffset || 0)) % 3.3;
  const blink = blinkPhase > 3.15 ? 1 : 0;
  ctx.fillStyle = C.ink;
  const eye = (ex, wink) => {
    if (blink || wink || mood === 'proud') {
      ctx.strokeStyle = C.ink; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(ex + lx, -12 + ly, 13, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      return;
    }
    const big = mood === 'wow' ? 1.25 : 1;
    ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(ex + lx, -10 + ly, 13 * big, 17 * big, 0, 0, 7); ctx.fill();
    ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(ex + lx + 5, -17 + ly, 5.5 * big, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + lx - 4, -3 + ly, 2.5, 0, 7); ctx.fill();
  };
  eye(-32, false); eye(32, mood === 'wink');
  if (mood === 'think') { // raised brow
    ctx.strokeStyle = C.ink; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(18 + lx, -42 + ly); ctx.lineTo(46 + lx, -48 + ly); ctx.stroke();
  }
  // blush
  ctx.fillStyle = 'rgba(247,140,150,0.65)';
  ctx.beginPath(); ctx.ellipse(-55 + lx, 18 + ly, 16, 9, 0, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.ellipse(55 + lx, 18 + ly, 16, 9, 0, 0, 7); ctx.fill();
  // mouth
  ctx.strokeStyle = C.ink; ctx.fillStyle = '#7A2E2E'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  const open = o.talk ? Math.max(0, Math.sin(t * 22)) * 0.8 + Math.max(0, Math.sin(t * 13.7)) * 0.4 : 0;
  if (mood === 'wow') {
    ctx.beginPath(); ctx.ellipse(lx, 26 + ly, 11, 14, 0, 0, 7); ctx.fill(); ctx.stroke();
  } else if (open > 0.15) {
    ctx.beginPath(); ctx.ellipse(lx, 22 + ly, 13, 5 + open * 11, 0, 0, 7); ctx.fill(); ctx.stroke();
  } else { // cat-ish "w" smile
    ctx.beginPath(); ctx.moveTo(-16 + lx, 18 + ly);
    ctx.quadraticCurveTo(-8 + lx, 30 + ly, 0 + lx, 20 + ly);
    ctx.quadraticCurveTo(8 + lx, 30 + ly, 16 + lx, 18 + ly); ctx.stroke();
  }
  ctx.restore();
}

// deterministic confetti burst starting at t0
function confetti(ctx, t, t0, seed, n, cx, cy, spread = 700) {
  const dt = t - t0; if (dt < 0 || dt > 3) return;
  const r = rng(seed), cols = [C.claude, C.butter, C.pink, C.mint, C.sky, C.lavender];
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, v = (0.4 + r() * 0.6) * spread, spin = (r() - 0.5) * 12;
    const x = cx + Math.cos(a) * v * dt, y = cy + Math.sin(a) * v * dt * 0.8 + 500 * dt * dt;
    ctx.save(); ctx.globalAlpha = clamp(1 - dt / 3); ctx.translate(x, y); ctx.rotate(spin * dt);
    ctx.fillStyle = cols[i % cols.length]; ctx.fillRect(-8, -5, 16, 10); ctx.restore();
  }
}

// ---------- scene registry & frame renderer ----------
const SCRIPT = window.__SCRIPT__;
const SCENES = {};
function registerScene(id, def) { SCENES[id] = def; }

let _grain = null;
function grain() {
  if (_grain) return _grain;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), r = rng(7);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(120,100,70,${r() * 0.06})`; g.fillRect(r() * W, r() * H, 2, 2); }
  return (_grain = c);
}

const TR = 0.6; // circle-wipe transition length (s)

function drawSceneAt(ctx, sc, t) {
  const def = SCENES[sc.id];
  ctx.save();
  ctx.fillStyle = (def && def.bg) || C.cream; ctx.fillRect(0, 0, W, H);
  if (def) def.draw(ctx, t - sc.start, sc.end - sc.start, t);
  ctx.restore();
}

function drawNarrator(ctx, t, sc) {
  const def = SCENES[sc.id];
  if (def && def.narrator === false) return;
  const sub = SCRIPT.subs.find(s => t >= s.s && t < s.e);
  // caption strip
  ctx.save();
  const cx = 230, cy = 975;
  const shown = sub ? typed(sub.text, t, sub.s, 16) : '';
  const talking = sub && shown.length < Array.from(sub.text).length;
  drawClaude(ctx, 140, cy, 150, { t, talk: talking, mood: 'happy', look: { x: 0.6, y: 0 } });
  if (sub) {
    const a = fadeInOut(t, sub.s, sub.e, 0.2);
    ctx.globalAlpha = a;
    bubble(ctx, shown, cx, cy, { dir: 'left', size: 46, maxW: 1500, full: sub.text, anchor: 0.5, pad: 24 });
  }
  ctx.restore();
}

function renderFrame(ctx, f) {
  const t = f / FPS;
  const scs = SCRIPT.scenes;
  let i = scs.findIndex(s => t >= s.start && t < s.end);
  if (i < 0) i = scs.length - 1;
  const sc = scs[i];
  if (i > 0 && t - sc.start < TR) {
    drawSceneAt(ctx, scs[i - 1], t);
    const p = Ease.inOut(prog(t, sc.start, sc.start + TR));
    ctx.save();
    ctx.beginPath(); ctx.arc(W / 2, H / 2, p * 1150, 0, 7); ctx.clip();
    drawSceneAt(ctx, sc, t);
    ctx.restore();
    // cute ring on the wipe edge
    ctx.save(); ctx.strokeStyle = C.claude; ctx.lineWidth = 16 * (1 - p);
    ctx.beginPath(); ctx.arc(W / 2, H / 2, p * 1150, 0, 7); ctx.stroke(); ctx.restore();
  } else {
    drawSceneAt(ctx, sc, t);
  }
  drawNarrator(ctx, t, sc);
  ctx.drawImage(grain(), 0, 0);
}
