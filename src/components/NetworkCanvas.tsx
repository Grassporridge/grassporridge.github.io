import { useEffect, useRef } from 'react';

interface NodeDef {
  rx: number; ry: number; color: string; r: number;
  phaseX: number; phaseY: number; freqX: number; freqY: number; amp: number;
}
interface EdgeDef { from: number; to: number; color: string; alpha: number; }
interface Cluster { x: number; y: number; vx: number; vy: number; nodes: NodeDef[]; edges: EdgeDef[]; pad: number; }
interface Particle { x: number; y: number; vx: number; vy: number; r: number; }

const SESSION = Date.now() % 256;

function seededRand(seed: number) {
  let s = ((seed + 1) * 48271) % 2147483647;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

function wobble(n: NodeDef, t: number) {
  return { x: n.rx + Math.sin(t * n.freqX + n.phaseX) * n.amp, y: n.ry + Math.sin(t * n.freqY + n.phaseY) * n.amp };
}

function node(rx: number, ry: number, color: string, r: number, rand: () => number, amp = 4): NodeDef {
  return { rx, ry, color, r, phaseX: rand() * Math.PI * 2, phaseY: rand() * Math.PI * 2, freqX: 0.3 + rand() * 0.4, freqY: 0.3 + rand() * 0.4, amp: amp * (0.6 + rand() * 0.8) };
}

function clusterStart(W: number, H: number, fx: number, fy: number, bvx: number, bvy: number, idx: number) {
  const r = seededRand(SESSION * 7 + idx * 31);
  return {
    x: Math.max(160, Math.min(W - 160, W * fx + (r() - 0.5) * W * 0.28)),
    y: Math.max(130, Math.min(H - 130, H * fy + (r() - 0.5) * H * 0.28)),
    vx: bvx + (r() - 0.5) * 0.15,
    vy: bvy + (r() - 0.5) * 0.15,
  };
}

// --- Autoencoder ---
function buildAutoencoder(W: number, H: number): Cluster {
  const rand = seededRand(42);
  const { x, y, vx, vy } = clusterStart(W, H, 0.25, 0.42, 0.22, 0.15, 0);
  const layers = [4, 7, 2, 5, 1];
  const colSpacing = 68, rowSpacing = 32;
  const teal = 'rgba(56,189,183,';
  const totalW = (layers.length - 1) * colSpacing;
  const nodes: NodeDef[] = [];
  const layerStart: number[] = [];
  for (let l = 0; l < layers.length; l++) {
    layerStart.push(nodes.length);
    const cnt = layers[l], h = (cnt - 1) * rowSpacing;
    const rx = l * colSpacing - totalW / 2;
    for (let n = 0; n < cnt; n++) nodes.push(node(rx, n * rowSpacing - h / 2, teal + '0.9)', 4, rand));
  }
  const edges: EdgeDef[] = [];
  for (let l = 0; l < layers.length - 1; l++)
    for (let f = 0; f < layers[l]; f++)
      for (let t = 0; t < layers[l + 1]; t++)
        edges.push({ from: layerStart[l] + f, to: layerStart[l + 1] + t, color: teal, alpha: 0.18 });
  return { x, y, vx, vy, nodes, edges, pad: 130 };
}

// --- Circular biological network ---
function buildCircular(W: number, H: number): Cluster {
  const rand = seededRand(99);
  const { x, y, vx, vy } = clusterStart(W, H, 0.75, 0.55, -0.18, 0.2, 1);
  const count = 14, radius = 95;
  const colors = ['#e879f9','#f97316','#facc15','#4ade80','#60a5fa','#f472b6','#a78bfa','#34d399','#fb923c','#38bdb7','#e11d48','#7c3aed','#0891b2','#65a30d'];
  const nodes: NodeDef[] = [];
  for (let i = 0; i < count; i++) {
    const a = (2 * Math.PI * i) / count - Math.PI / 2;
    nodes.push(node(Math.cos(a) * radius, Math.sin(a) * radius, colors[i], 5, rand, 5));
  }
  const edges: EdgeDef[] = [];
  for (let i = 0; i < count; i++) {
    for (let j = i + 2; j < count; j++) {
      if (((i * 7 + j * 13) % 17) < 3)
        edges.push({ from: i, to: j, color: (i + j) % 3 !== 0 ? 'rgba(74,222,128,' : 'rgba(248,113,113,', alpha: 0.65 });
    }
    if ([3,7,1,9,5,11,2,8,4,12,6,10,0,13][i % 14] % 2 === 0)
      edges.push({ from: i, to: (i + 1) % count, color: 'rgba(74,222,128,', alpha: 0.5 });
  }
  return { x, y, vx, vy, nodes, edges, pad: radius + 15 };
}

// --- Unrolled GRU/RNN ---
function buildGRU(W: number, H: number): Cluster {
  const rand = seededRand(137);
  const { x, y, vx, vy } = clusterStart(W, H, 0.62, 0.28, -0.14, 0.19, 2);
  const steps = 4, stepW = 72, hiddenCount = 2, hiddenSpacing = 26;
  const purple = 'rgba(167,139,250,';
  const nodes: NodeDef[] = [];

  // per step: [input, hidden0, hidden1, output]
  const inputIdx: number[] = [], hiddenIdx: number[][] = [], outputIdx: number[] = [];
  const totalW = (steps - 1) * stepW;

  for (let s = 0; s < steps; s++) {
    const rx = s * stepW - totalW / 2;
    inputIdx.push(nodes.length);
    nodes.push(node(rx, 52, purple + '0.75)', 4, rand, 3));
    hiddenIdx.push([]);
    for (let h = 0; h < hiddenCount; h++) {
      hiddenIdx[s].push(nodes.length);
      nodes.push(node(rx, h * hiddenSpacing - (hiddenCount - 1) * hiddenSpacing / 2, purple + '0.9)', 5, rand, 4));
    }
    outputIdx.push(nodes.length);
    nodes.push(node(rx, -52, purple + '0.6)', 3.5, rand, 3));
  }

  const edges: EdgeDef[] = [];
  for (let s = 0; s < steps; s++) {
    // input -> hidden
    for (let h = 0; h < hiddenCount; h++)
      edges.push({ from: inputIdx[s], to: hiddenIdx[s][h], color: purple, alpha: 0.35 });
    // hidden -> output
    for (let h = 0; h < hiddenCount; h++)
      edges.push({ from: hiddenIdx[s][h], to: outputIdx[s], color: purple, alpha: 0.25 });
    // hidden within step
    if (hiddenCount > 1)
      edges.push({ from: hiddenIdx[s][0], to: hiddenIdx[s][1], color: purple, alpha: 0.2 });
    // recurrent: hidden[t] -> hidden[t+1]
    if (s < steps - 1)
      for (let h = 0; h < hiddenCount; h++)
        edges.push({ from: hiddenIdx[s][h], to: hiddenIdx[s + 1][h], color: purple, alpha: 0.45 });
  }
  return { x, y, vx, vy, nodes, edges, pad: totalW / 2 + 30 };
}

// --- Bayesian time series with uncertainty bands ---
function buildBayesianTS(W: number, H: number): Cluster {
  const rand = seededRand(211);
  const { x, y, vx, vy } = clusterStart(W, H, 0.38, 0.72, 0.16, -0.17, 3);
  const steps = 7, stepW = 52;
  const totalW = (steps - 1) * stepW;
  const levels = [
    { ry: -48, color: 'rgba(147,197,253,', r: 2.5, alpha: 0.12, amp: 2 }, // 2σ above
    { ry: -26, color: 'rgba(191,219,254,', r: 3,   alpha: 0.28, amp: 3 }, // 1σ above
    { ry:   0, color: 'rgba(226,232,240,', r: 4,   alpha: 0.7,  amp: 2 }, // mean
    { ry:  26, color: 'rgba(191,219,254,', r: 3,   alpha: 0.28, amp: 3 }, // 1σ below
    { ry:  48, color: 'rgba(147,197,253,', r: 2.5, alpha: 0.12, amp: 2 }, // 2σ below
  ];

  const nodes: NodeDef[] = [];
  const idx: number[][] = []; // idx[step][level]
  for (let s = 0; s < steps; s++) {
    idx.push([]);
    const rx = s * stepW - totalW / 2;
    for (const lv of levels) {
      idx[s].push(nodes.length);
      nodes.push(node(rx, lv.ry, lv.color + lv.alpha + ')', lv.r, rand, lv.amp));
    }
  }

  const edges: EdgeDef[] = [];
  const hAlphas = [0.08, 0.2, 0.45, 0.2, 0.08];
  for (let s = 0; s < steps; s++) {
    // vertical uncertainty connections within timestep
    for (let l = 0; l < levels.length - 1; l++)
      edges.push({ from: idx[s][l], to: idx[s][l + 1], color: 'rgba(147,197,253,', alpha: 0.12 });
    // horizontal connections across time
    if (s < steps - 1)
      for (let l = 0; l < levels.length; l++)
        edges.push({ from: idx[s][l], to: idx[s + 1][l], color: levels[l].color, alpha: hAlphas[l] });
    // diagonal cross-bands (mean to adjacent uncertainty next step)
    if (s < steps - 1) {
      edges.push({ from: idx[s][2], to: idx[s + 1][1], color: 'rgba(191,219,254,', alpha: 0.1 });
      edges.push({ from: idx[s][2], to: idx[s + 1][3], color: 'rgba(191,219,254,', alpha: 0.1 });
    }
  }
  return { x, y, vx, vy, nodes, edges, pad: totalW / 2 + 30 };
}

function buildParticles(W: number, H: number): Particle[] {
  const rand = seededRand(7);
  return Array.from({ length: 55 }, () => ({
    x: rand() * W, y: rand() * H, vx: (rand() - 0.5) * 0.4, vy: (rand() - 0.5) * 0.4, r: rand() * 2 + 1,
  }));
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
      buildCircular(W, H),
      buildGRU(W, H),
      buildBayesianTS(W, H),
    ];
    const particles = buildParticles(W, H);
    const MAX_DIST = 140;
    let animId: number, startTime: number | null = null;

    function drawCluster(c: Cluster, t: number) {
      const pos = c.nodes.map(n => ({ x: c.x + wobble(n, t).x, y: c.y + wobble(n, t).y }));
      for (const e of c.edges) {
        const a = pos[e.from], b = pos[e.to];
        ctx.beginPath();
        ctx.strokeStyle = e.color + e.alpha + ')';
        ctx.lineWidth = 1;
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      for (let i = 0; i < c.nodes.length; i++) {
        ctx.beginPath();
        ctx.arc(pos[i].x, pos[i].y, c.nodes[i].r, 0, Math.PI * 2);
        ctx.fillStyle = c.nodes[i].color;
        ctx.fill();
      }
    }

    function tick(ts: number) {
      if (!startTime) startTime = ts;
      const t = (ts - startTime) / 1000;
      ctx.clearRect(0, 0, W, H);

      // background particles
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x, dy = a.y - b.y, dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            ctx.strokeStyle = `rgba(56,189,183,${(1 - dist / MAX_DIST) * 0.2})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56,189,183,0.45)'; ctx.fill();
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > W) a.vx *= -1;
        if (a.y < 0 || a.y > H) a.vy *= -1;
      }

      // structured clusters
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
