import { useEffect, useRef } from 'react';

interface NodeDef {
  rx: number; ry: number; color: string; r: number;
  phaseX: number; phaseY: number; freqX: number; freqY: number; amp: number;
}
interface EdgeDef { from: number; to: number; color: string; alpha: number; }
interface Cluster {
  x: number; y: number; vx: number; vy: number;
  nodes: NodeDef[]; edges: EdgeDef[];
  pad: number;
}
interface Particle { x: number; y: number; vx: number; vy: number; r: number; }

// deterministic pseudo-random from seed
function seededRand(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

function wobbleNode(n: NodeDef, t: number) {
  return {
    x: n.rx + Math.sin(t * n.freqX + n.phaseX) * n.amp,
    y: n.ry + Math.sin(t * n.freqY + n.phaseY) * n.amp,
  };
}

function buildNeuralNet(cx: number, cy: number): Cluster {
  const rand = seededRand(42);
  const layers = [4, 7, 2, 5, 1];
  const colSpacing = 68;
  const rowSpacing = 32;
  const teal = 'rgba(56,189,183,';
  const totalWidth = (layers.length - 1) * colSpacing;

  const nodes: NodeDef[] = [];
  const layerStart: number[] = [];

  for (let l = 0; l < layers.length; l++) {
    layerStart.push(nodes.length);
    const count = layers[l];
    const colHeight = (count - 1) * rowSpacing;
    const rx = l * colSpacing - totalWidth / 2;
    for (let n = 0; n < count; n++) {
      nodes.push({
        rx, ry: n * rowSpacing - colHeight / 2,
        color: teal + '0.9)', r: 4,
        phaseX: rand() * Math.PI * 2, phaseY: rand() * Math.PI * 2,
        freqX: 0.4 + rand() * 0.3, freqY: 0.4 + rand() * 0.3,
        amp: 3 + rand() * 4,
      });
    }
  }

  const edges: EdgeDef[] = [];
  for (let l = 0; l < layers.length - 1; l++) {
    for (let f = 0; f < layers[l]; f++) {
      for (let t = 0; t < layers[l + 1]; t++) {
        edges.push({ from: layerStart[l] + f, to: layerStart[l + 1] + t, color: teal, alpha: 0.18 });
      }
    }
  }

  return { x: cx, y: cy, vx: 0.22, vy: 0.15, nodes, edges, pad: 130 };
}

function buildCircularNet(cx: number, cy: number): Cluster {
  const rand = seededRand(99);
  const count = 14;
  const radius = 95;
  const nodeColors = [
    '#e879f9','#f97316','#facc15','#4ade80','#60a5fa',
    '#f472b6','#a78bfa','#34d399','#fb923c','#38bdb7',
    '#e11d48','#7c3aed','#0891b2','#65a30d',
  ];

  const nodes: NodeDef[] = [];
  for (let i = 0; i < count; i++) {
    const a = (2 * Math.PI * i) / count - Math.PI / 2;
    nodes.push({
      rx: Math.cos(a) * radius, ry: Math.sin(a) * radius,
      color: nodeColors[i], r: 5,
      phaseX: rand() * Math.PI * 2, phaseY: rand() * Math.PI * 2,
      freqX: 0.3 + rand() * 0.35, freqY: 0.3 + rand() * 0.35,
      amp: 4 + rand() * 5,
    });
  }

  const edges: EdgeDef[] = [];
  for (let i = 0; i < count; i++) {
    for (let j = i + 2; j < count; j++) {
      const h = ((i * 7 + j * 13) % 17);
      if (h < 3) {
        const isGreen = (i + j) % 3 !== 0;
        edges.push({ from: i, to: j, color: isGreen ? 'rgba(74,222,128,' : 'rgba(248,113,113,', alpha: 0.65 });
      }
    }
    const j = (i + 1) % count;
    const seed = [3,7,1,9,5,11,2,8,4,12,6,10,0,13];
    if (seed[i % seed.length] % 2 === 0) {
      edges.push({ from: i, to: j, color: 'rgba(74,222,128,', alpha: 0.5 });
    }
  }

  return { x: cx, y: cy, vx: -0.18, vy: 0.2, nodes, edges, pad: radius + 15 };
}

function buildParticles(W: number, H: number): Particle[] {
  const rand = seededRand(7);
  return Array.from({ length: 55 }, () => ({
    x: rand() * W, y: rand() * H,
    vx: (rand() - 0.5) * 0.4, vy: (rand() - 0.5) * 0.4,
    r: rand() * 2 + 1,
  }));
}

export default function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;

    let W = canvas.offsetWidth;
    let H = canvas.offsetHeight;
    canvas.width = W;
    canvas.height = H;

    const clusters: Cluster[] = [
      buildNeuralNet(W * 0.28, H * 0.42),
      buildCircularNet(W * 0.72, H * 0.55),
    ];
    const particles = buildParticles(W, H);
    const MAX_DIST = 140;

    let animId: number;
    let startTime: number | null = null;

    function drawCluster(c: Cluster, t: number) {
      const pos = c.nodes.map(n => ({
        x: c.x + wobbleNode(n, t).x,
        y: c.y + wobbleNode(n, t).y,
      }));

      for (const e of c.edges) {
        const a = pos[e.from], b = pos[e.to];
        ctx.beginPath();
        ctx.strokeStyle = e.color + e.alpha + ')';
        ctx.lineWidth = 1;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
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
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            ctx.strokeStyle = `rgba(56,189,183,${(1 - dist / MAX_DIST) * 0.2})`;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        ctx.beginPath();
        ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56,189,183,0.45)';
        ctx.fill();
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

    const onResize = () => {
      W = canvas.offsetWidth; H = canvas.offsetHeight;
      canvas.width = W; canvas.height = H;
    };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', onResize); };
  }, []);

  return (
    <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
  );
}
