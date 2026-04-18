import { useEffect, useRef } from 'react';

interface NodeDef {
  rx: number; ry: number; color: string; r: number;
  phaseX: number; phaseY: number; freqX: number; freqY: number; amp: number;
  phaseSlow: number; freqSlow: number; ampSlow: number;
}
interface EdgeDef { from: number; to: number; color: string; alpha: number; }
interface Cluster { x: number; y: number; vx: number; vy: number; nodes: NodeDef[]; edges: EdgeDef[]; pad: number; }
interface Particle { x: number; y: number; vx: number; vy: number; r: number; }

const SESSION = Date.now() % 256;
const PI2 = Math.PI * 2;

function seededRand(seed: number) {
  let s = ((seed + 1) * 48271) % 2147483647;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// slow drift (large amp, low freq) + fast wobble (small amp, higher freq)
// over ~30-90s nodes drift far enough to dissolve structure, then slowly reform
function wobble(n: NodeDef, t: number) {
  return {
    x: n.rx + Math.sin(t * n.freqSlow + n.phaseSlow) * n.ampSlow + Math.sin(t * n.freqX + n.phaseX) * n.amp,
    y: n.ry + Math.sin(t * n.freqSlow * 0.93 + n.phaseSlow + 1.7) * n.ampSlow + Math.sin(t * n.freqY + n.phaseY) * n.amp,
  };
}

function nd(rx: number, ry: number, color: string, r: number, rand: () => number, ampFast = 4, ampSlow = 22): NodeDef {
  return {
    rx, ry, color, r,
    phaseX: rand() * PI2, phaseY: rand() * PI2,
    freqX: 0.3 + rand() * 0.4, freqY: 0.3 + rand() * 0.4, amp: ampFast * (0.6 + rand() * 0.8),
    phaseSlow: 0, freqSlow: 0.025 + rand() * 0.055, ampSlow: ampSlow * (0.7 + rand() * 0.7),
  };
}

function clusterStart(W: number, H: number, fx: number, fy: number, bvx: number, bvy: number, idx: number) {
  const r = seededRand(SESSION * 7 + idx * 31);
  return {
    x: Math.max(180, Math.min(W - 180, W * fx + (r() - 0.5) * W * 0.22)),
    y: Math.max(140, Math.min(H - 140, H * fy + (r() - 0.5) * H * 0.22)),
    vx: bvx + (r() - 0.5) * 0.14,
    vy: bvy + (r() - 0.5) * 0.14,
  };
}

// ── Big autoencoder ──────────────────────────────────────────────────────────
function buildAutoencoder(W: number, H: number): Cluster {
  const rand = seededRand(42);
  const { x, y, vx, vy } = clusterStart(W, H, 0.22, 0.42, 0.22, 0.15, 0);
  const layers = [4, 7, 2, 5, 1], colW = 68, rowH = 32;
  const teal = 'rgba(56,189,183,', totalW = (layers.length - 1) * colW;
  const nodes: NodeDef[] = []; const ls: number[] = [];
  for (let l = 0; l < layers.length; l++) {
    ls.push(nodes.length); const cnt = layers[l], h = (cnt - 1) * rowH;
    for (let n = 0; n < cnt; n++) nodes.push(nd(l * colW - totalW / 2, n * rowH - h / 2, teal + '0.9)', 4, rand, 4, 20));
  }
  const edges: EdgeDef[] = [];
  for (let l = 0; l < layers.length - 1; l++)
    for (let f = 0; f < layers[l]; f++)
      for (let t = 0; t < layers[l + 1]; t++)
        edges.push({ from: ls[l] + f, to: ls[l + 1] + t, color: teal, alpha: 0.18 });
  return { x, y, vx, vy, nodes, edges, pad: 140 };
}

// ── Small neural nets ────────────────────────────────────────────────────────
function buildSmallNN(W: number, H: number, seed: number, layers: number[], fx: number, fy: number, idx: number, colorStr: string): Cluster {
  const rand = seededRand(seed);
  const { x, y, vx, vy } = clusterStart(W, H, fx, fy, (rand() - 0.5) * 0.3, (rand() - 0.5) * 0.3, idx);
  const colW = 52, rowH = 26, totalW = (layers.length - 1) * colW;
  const nodes: NodeDef[] = []; const ls: number[] = [];
  for (let l = 0; l < layers.length; l++) {
    ls.push(nodes.length); const cnt = layers[l], h = (cnt - 1) * rowH;
    for (let n = 0; n < cnt; n++) nodes.push(nd(l * colW - totalW / 2, n * rowH - h / 2, colorStr + '0.85)', 3.5, rand, 3, 28));
  }
  const edges: EdgeDef[] = [];
  for (let l = 0; l < layers.length - 1; l++)
    for (let f = 0; f < layers[l]; f++)
      for (let t = 0; t < layers[l + 1]; t++)
        edges.push({ from: ls[l] + f, to: ls[l + 1] + t, color: colorStr, alpha: 0.22 });
  return { x, y, vx, vy, nodes, edges, pad: totalW / 2 + 25 };
}

// ── Circular bacterial network ───────────────────────────────────────────────
function buildCircular(W: number, H: number, seed: number, count: number, radius: number, fx: number, fy: number, idx: number, mostlyRed: boolean): Cluster {
  const rand = seededRand(seed);
  const { x, y, vx, vy } = clusterStart(W, H, fx, fy, (rand() - 0.5) * 0.3, (rand() - 0.5) * 0.3, idx);
  const allColors = ['#e879f9','#f97316','#facc15','#4ade80','#60a5fa','#f472b6','#a78bfa','#34d399','#fb923c','#38bdb7','#e11d48','#7c3aed','#0891b2','#65a30d'];
  const nodeR = count > 10 ? 5 : 4;
  const nodes: NodeDef[] = [];
  for (let i = 0; i < count; i++) {
    const a = (PI2 * i) / count - Math.PI / 2;
    nodes.push(nd(Math.cos(a) * radius, Math.sin(a) * radius, allColors[i % allColors.length], nodeR, rand, count > 10 ? 5 : 4, count > 10 ? 22 : 30));
  }
  const edges: EdgeDef[] = [];
  for (let i = 0; i < count; i++) {
    for (let j = i + 2; j < count; j++) {
      if (((i * 7 + j * 13) % 17) < (count > 10 ? 3 : 4)) {
        const isRed = mostlyRed ? ((i + j) % 3 !== 0) : ((i + j) % 3 === 0);
        edges.push({ from: i, to: j, color: isRed ? 'rgba(248,113,113,' : 'rgba(74,222,128,', alpha: 0.65 });
      }
    }
    const nxt = (i + 1) % count;
    if (seed % 3 !== i % 3) edges.push({ from: i, to: nxt, color: mostlyRed ? 'rgba(248,113,113,' : 'rgba(74,222,128,', alpha: 0.5 });
  }
  return { x, y, vx, vy, nodes, edges, pad: radius + 15 };
}

// ── Decision tree ─────────────────────────────────────────────────────────────
// root → 2 children (green left, red right) → each → 2 grandchildren (green/red)
function buildDecisionTree(W: number, H: number, seed: number, fx: number, fy: number, idx: number): Cluster {
  const rand = seededRand(seed);
  const { x, y, vx, vy } = clusterStart(W, H, fx, fy, (rand() - 0.5) * 0.3, (rand() - 0.5) * 0.3, idx);
  const white = 'rgba(226,232,240,';
  // node layout: root(0), leftChild(1), rightChild(2), ll(3), lr(4), rl(5), rr(6)
  const xs =  [0,   -50,  50,  -75, -25,  25,  75];
  const ys =  [-46,  -8,  -8,   30,  30,  30,  30];
  const rs =  [5,     4,   4,  3.5, 3.5, 3.5, 3.5];
  const nodes: NodeDef[] = [];
  for (let i = 0; i < 7; i++) nodes.push(nd(xs[i], ys[i], white + '0.85)', rs[i], rand, 3, 26));
  const green = 'rgba(74,222,128,', red = 'rgba(248,113,113,';
  const edges: EdgeDef[] = [
    { from: 0, to: 1, color: green, alpha: 0.7 },  // root → left (green)
    { from: 0, to: 2, color: red,   alpha: 0.7 },  // root → right (red)
    { from: 1, to: 3, color: green, alpha: 0.55 }, // left → ll (green)
    { from: 1, to: 4, color: red,   alpha: 0.55 }, // left → lr (red)
    { from: 2, to: 5, color: green, alpha: 0.55 }, // right → rl (green)
    { from: 2, to: 6, color: red,   alpha: 0.55 }, // right → rr (red)
  ];
  return { x, y, vx, vy, nodes, edges, pad: 90 };
}

// ── Unrolled GRU ──────────────────────────────────────────────────────────────
function buildGRU(W: number, H: number): Cluster {
  const rand = seededRand(137);
  const { x, y, vx, vy } = clusterStart(W, H, 0.63, 0.28, -0.14, 0.19, 7);
  const steps = 4, stepW = 72, hCount = 2, hSp = 26, purple = 'rgba(167,139,250,', totalW = (steps - 1) * stepW;
  const nodes: NodeDef[] = [];
  const inIdx: number[] = [], hidIdx: number[][] = [], outIdx: number[] = [];
  for (let s = 0; s < steps; s++) {
    const rx = s * stepW - totalW / 2;
    inIdx.push(nodes.length); nodes.push(nd(rx, 52, purple + '0.75)', 4, rand, 3, 22));
    hidIdx.push([]);
    for (let h = 0; h < hCount; h++) { hidIdx[s].push(nodes.length); nodes.push(nd(rx, h * hSp - (hCount - 1) * hSp / 2, purple + '0.9)', 5, rand, 4, 22)); }
    outIdx.push(nodes.length); nodes.push(nd(rx, -52, purple + '0.6)', 3.5, rand, 3, 22));
  }
  const edges: EdgeDef[] = [];
  for (let s = 0; s < steps; s++) {
    for (let h = 0; h < hCount; h++) edges.push({ from: inIdx[s], to: hidIdx[s][h], color: purple, alpha: 0.35 });
    for (let h = 0; h < hCount; h++) edges.push({ from: hidIdx[s][h], to: outIdx[s], color: purple, alpha: 0.25 });
    if (hCount > 1) edges.push({ from: hidIdx[s][0], to: hidIdx[s][1], color: purple, alpha: 0.2 });
    if (s < steps - 1) for (let h = 0; h < hCount; h++) edges.push({ from: hidIdx[s][h], to: hidIdx[s + 1][h], color: purple, alpha: 0.45 });
  }
  return { x, y, vx, vy, nodes, edges, pad: totalW / 2 + 30 };
}

// ── Bayesian time series ──────────────────────────────────────────────────────
function buildBayesianTS(W: number, H: number): Cluster {
  const rand = seededRand(211);
  const { x, y, vx, vy } = clusterStart(W, H, 0.38, 0.72, 0.16, -0.17, 8);
  const steps = 7, stepW = 52, totalW = (steps - 1) * stepW;
  const levels = [
    { ry: -48, color: 'rgba(147,197,253,', r: 2.5, ha: 0.08, amp: 2, sa: 32 },
    { ry: -26, color: 'rgba(191,219,254,', r: 3,   ha: 0.2,  amp: 3, sa: 28 },
    { ry:   0, color: 'rgba(226,232,240,', r: 4,   ha: 0.45, amp: 2, sa: 20 },
    { ry:  26, color: 'rgba(191,219,254,', r: 3,   ha: 0.2,  amp: 3, sa: 28 },
    { ry:  48, color: 'rgba(147,197,253,', r: 2.5, ha: 0.08, amp: 2, sa: 32 },
  ];
  const nodes: NodeDef[] = []; const idx: number[][] = [];
  for (let s = 0; s < steps; s++) {
    idx.push([]);
    for (const lv of levels) { idx[s].push(nodes.length); nodes.push(nd(s * stepW - totalW / 2, lv.ry, lv.color + lv.ha + ')', lv.r, rand, lv.amp, lv.sa)); }
  }
  const edges: EdgeDef[] = [];
  for (let s = 0; s < steps; s++) {
    for (let l = 0; l < levels.length - 1; l++) edges.push({ from: idx[s][l], to: idx[s][l + 1], color: 'rgba(147,197,253,', alpha: 0.12 });
    if (s < steps - 1) {
      for (let l = 0; l < levels.length; l++) edges.push({ from: idx[s][l], to: idx[s + 1][l], color: levels[l].color, alpha: levels[l].ha });
      edges.push({ from: idx[s][2], to: idx[s + 1][1], color: 'rgba(191,219,254,', alpha: 0.1 });
      edges.push({ from: idx[s][2], to: idx[s + 1][3], color: 'rgba(191,219,254,', alpha: 0.1 });
    }
  }
  return { x, y, vx, vy, nodes, edges, pad: totalW / 2 + 30 };
}

function buildParticles(W: number, H: number): Particle[] {
  const rand = seededRand(7);
  return Array.from({ length: 55 }, () => ({ x: rand() * W, y: rand() * H, vx: (rand() - 0.5) * 0.4, vy: (rand() - 0.5) * 0.4, r: rand() * 2 + 1 }));
}

export default function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let W = canvas.offsetWidth, H = canvas.offsetHeight;
    canvas.width = W; canvas.height = H;

    const clusters: Cluster[] = [
      buildAutoencoder(W, H),
      buildSmallNN(W, H, 71, [3, 5, 1], 0.55, 0.22, 1, 'rgba(56,189,183,'),
      buildSmallNN(W, H, 83, [2, 4, 2], 0.82, 0.38, 2, 'rgba(34,211,238,'),
      buildCircular(W, H, 99, 14, 95, 0.78, 0.65, 3, true),
      buildCircular(W, H, 113, 7, 55, 0.16, 0.68, 4, true),
      buildCircular(W, H, 127, 6, 48, 0.48, 0.78, 5, true),
      buildDecisionTree(W, H, 53, 0.68, 0.55, 6),
      buildGRU(W, H),
      buildBayesianTS(W, H),
    ];
    const particles = buildParticles(W, H);
    const MAX_DIST = 140;
    let animId: number, startTime: number | null = null;

    function drawCluster(c: Cluster, t: number) {
      const pos = c.nodes.map(n => { const w = wobble(n, t); return { x: c.x + w.x, y: c.y + w.y }; });
      for (const e of c.edges) {
        ctx.beginPath(); ctx.strokeStyle = e.color + e.alpha + ')'; ctx.lineWidth = 1;
        ctx.moveTo(pos[e.from].x, pos[e.from].y); ctx.lineTo(pos[e.to].x, pos[e.to].y); ctx.stroke();
      }
      for (let i = 0; i < c.nodes.length; i++) {
        ctx.beginPath(); ctx.arc(pos[i].x, pos[i].y, c.nodes[i].r, 0, PI2);
        ctx.fillStyle = c.nodes[i].color; ctx.fill();
      }
    }

    function tick(ts: number) {
      if (!startTime) startTime = ts;
      const t = (ts - startTime) / 1000;
      ctx.clearRect(0, 0, W, H);

      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j], dx = a.x - b.x, dy = a.y - b.y, dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) { ctx.strokeStyle = `rgba(56,189,183,${(1 - dist / MAX_DIST) * 0.2})`; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
        }
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, PI2); ctx.fillStyle = 'rgba(56,189,183,0.45)'; ctx.fill();
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > W) a.vx *= -1;
        if (a.y < 0 || a.y > H) a.vy *= -1;
      }

      for (const c of clusters) {
        c.x += c.vx; c.y += c.vy;
        if (c.x - c.pad < 0 || c.x + c.pad > W) c.vx *= -1;
        if (c.y - c.pad < 0 || c.y + c.pad > H) c.vy *= -1;
        drawCluster(c, t);
      }

      animId = requestAnimationFrame(tick);
    }

    animId = requestAnimationFrame(tick);
    const onResize = () => { W = canvas.offsetWidth; H = canvas.offsetHeight; canvas.width = W; canvas.height = H; };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', onResize); };
  }, []);

  return <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />;
}
