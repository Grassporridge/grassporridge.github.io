import { useEffect, useRef } from 'react';

interface NodeDef { rx: number; ry: number; color: string; r: number; }
interface EdgeDef { from: number; to: number; color: string; alpha: number; }
interface Cluster {
  x: number; y: number; vx: number; vy: number;
  nodes: NodeDef[]; edges: EdgeDef[];
  pad: number; // bounding radius for bounce
}

function buildNeuralNet(cx: number, cy: number): Cluster {
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
      nodes.push({ rx, ry: n * rowSpacing - colHeight / 2, color: teal + '0.9)', r: 4 });
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
    nodes.push({ rx: Math.cos(a) * radius, ry: Math.sin(a) * radius, color: nodeColors[i], r: 5 });
  }

  // deterministic sparse edges using a seeded-like pattern
  const edges: EdgeDef[] = [];
  const seed = [3,7,1,9,5,11,2,8,4,12,6,10,0,13];
  for (let i = 0; i < count; i++) {
    for (let j = i + 2; j < count; j++) {
      // use a deterministic condition instead of Math.random so edges don't change on re-render
      const h = ((i * 7 + j * 13) % 17);
      if (h < 3) {
        const isGreen = (i + j) % 3 !== 0;
        edges.push({
          from: i, to: j,
          color: isGreen ? 'rgba(74,222,128,' : 'rgba(248,113,113,',
          alpha: 0.65,
        });
      }
    }
    // also connect to nearest neighbours
    const j = (i + 1) % count;
    if (seed[i % seed.length] % 2 === 0) {
      edges.push({ from: i, to: j, color: 'rgba(74,222,128,', alpha: 0.5 });
    }
  }

  return { x: cx, y: cy, vx: -0.18, vy: 0.2, nodes, edges, pad: radius + 15 };
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

    let animId: number;

    function drawCluster(c: Cluster) {
      // edges
      for (const e of c.edges) {
        const a = c.nodes[e.from];
        const b = c.nodes[e.to];
        ctx.beginPath();
        ctx.strokeStyle = e.color + e.alpha + ')';
        ctx.lineWidth = 1;
        ctx.moveTo(c.x + a.rx, c.y + a.ry);
        ctx.lineTo(c.x + b.rx, c.y + b.ry);
        ctx.stroke();
      }
      // nodes
      for (const n of c.nodes) {
        ctx.beginPath();
        ctx.arc(c.x + n.rx, c.y + n.ry, n.r, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();
      }
    }

    function tick() {
      ctx.clearRect(0, 0, W, H);

      for (const c of clusters) {
        c.x += c.vx;
        c.y += c.vy;
        if (c.x - c.pad < 0 || c.x + c.pad > W) c.vx *= -1;
        if (c.y - c.pad < 0 || c.y + c.pad > H) c.vy *= -1;
        drawCluster(c);
      }

      animId = requestAnimationFrame(tick);
    }

    tick();

    const onResize = () => {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W;
      canvas.height = H;
    };
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener('resize', onResize); };
  }, []);

  return (
    <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
  );
}
