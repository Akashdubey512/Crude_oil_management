import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import type { InfrastructureNode, RiskSnapshot } from '../../types';

interface GlobeMapProps {
  infrastructure: InfrastructureNode[];
  risks: RiskSnapshot[];
  onSelectCorridor: (corridorId: string) => void;
  selectedCorridor: string | null;
}

const CHOKEPOINTS = [
  { id: 'HORMUZ',        name: 'Strait of Hormuz',  lat: 26.57, lng: 56.25 },
  { id: 'BAB_EL_MANDEB', name: 'Bab-el-Mandeb',     lat: 12.58, lng: 43.33 },
  { id: 'SUEZ',          name: 'Suez Canal',         lat: 29.98, lng: 32.55 },
  { id: 'RED_SEA',       name: 'Red Sea Corridor',   lat: 20.00, lng: 38.50 },
];

const ROUTES = [
  { fromLat: 26.57, fromLng: 56.25, toLat: 18.94, toLng: 72.85, color: '#00f2fe', label: 'Hormuz → Mumbai' },
  { fromLat: 12.58, fromLng: 43.33, toLat: 18.94, toLng: 72.85, color: '#4facfe', label: 'Bab-el-Mandeb → Mumbai' },
  { fromLat: 29.98, fromLng: 32.55, toLat: 12.58, toLng: 43.33, color: '#ffb199', label: 'Suez → Bab-el-Mandeb' },
  { fromLat: 20.00, fromLng: 38.50, toLat: 12.58, toLng: 43.33, color: '#ff0844', label: 'Red Sea → Bab-el-Mandeb' },
  { fromLat: 26.57, fromLng: 56.25, toLat: 20.00, toLng: 38.50, color: '#f107a3', label: 'Hormuz → Red Sea' },
];

const RISK_COLORS: Record<string, string> = {
  CRITICAL: '#ff1744',
  HIGH:     '#ff9100',
  MODERATE: '#ffea00',
  LOW:      '#00e676',
  UNKNOWN:  '#00e5ff',
  UNAVAILABLE: '#78909c',
};

// Convert lat/lng degrees to 3D unit vector × radius
function ll2v(lat: number, lng: number, r: number): THREE.Vector3 {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  );
}

function buildArc(fromLat: number, fromLng: number, toLat: number, toLng: number, r: number, seg = 100): THREE.Vector3[] {
  const a = ll2v(fromLat, fromLng, r);
  const b = ll2v(toLat,   toLng,   r);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const v = new THREE.Vector3().lerpVectors(a, b, t).normalize()
                .multiplyScalar(r + Math.sin(Math.PI * t) * 0.14);
    pts.push(v);
  }
  return pts;
}

// ─── High-Fidelity Google Earth Style Canvas Texture ────────────────────────
function buildGoogleEarthTexture(): THREE.CanvasTexture {
  const W = 4096, H = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d')!;

  const p = (lng: number, lat: number): [number, number] => [
    ((lng + 180) / 360) * W,
    ((90 - lat)  / 180) * H,
  ];

  // 1. Google Earth Blue Ocean (realistic gradient)
  const oceanGrad = g.createLinearGradient(0, 0, 0, H);
  oceanGrad.addColorStop(0,   '#86a8c7'); // Arctic ocean tint
  oceanGrad.addColorStop(0.3, '#74a2cb');
  oceanGrad.addColorStop(0.5, '#6196c3'); // Equatorial ocean blue
  oceanGrad.addColorStop(0.7, '#679bca');
  oceanGrad.addColorStop(1,   '#8bb0d0'); // Antarctic ocean tint
  g.fillStyle = oceanGrad;
  g.fillRect(0, 0, W, H);

  // Shallow coastal waters highlight
  g.strokeStyle = '#99c3e6';
  g.lineWidth = 4;

  const poly = (pts: [number, number][], fill: string, stroke = '#78909c', sw = 1.2) => {
    g.beginPath();
    g.moveTo(...p(...pts[0]));
    for (let i = 1; i < pts.length; i++) g.lineTo(...p(...pts[i]));
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = sw; g.stroke(); }
  };

  // Color palette matching Google Earth Atlas
  const GREEN_LAND = '#9ec899';
  const TAN_DESERT = '#d8ccaa';
  const ARABIA_TAN = '#e6d3a7';
  const BORDER_COL = 'rgba(255, 255, 255, 0.7)';

  // ── AFRICA ────────────────────────────────────────────────────────────────
  poly([[-17,15],[-15,11],[-12,8],[-8,5],[-5,4],[-1,4],[3,5],[9,4],[12,4],
        [15,3],[18,3],[22,1],[25,2],[30,4],[33,3],[36,1],[38,-2],[40,-5],
        [41,-10],[40,-15],[36,-24],[29,-34],[27,-34],[19,-34],[17,-29],
        [15,-28],[13,-22],[11,-18],[10,-14],[9,-8],[3,-4],[-2,4],[-5,5],
        [-8,5],[-15,11],[-17,13],[-17,15]], TAN_DESERT, BORDER_COL, 1.5);

  // Horn of Africa
  poly([[38,-3],[41,-6],[43,-10],[44,-11],[46,-10],[49,-8],[51,-5],[50,-2],
        [46,-1],[42,2],[40,3],[37,2],[35,1],[37,-1],[38,-3]], TAN_DESERT, BORDER_COL, 1.5);

  // Madagascar
  poly([[44,-12],[46,-12],[48,-15],[49,-20],[47,-25],[45,-25],[43,-22],[43,-17],[44,-12]], GREEN_LAND, BORDER_COL, 1);

  // ── EUROPE ────────────────────────────────────────────────────────────────
  poly([[-10,36],[-5,36],[0,37],[5,37],[10,38],[15,37],[20,38],[28,41],
        [30,43],[32,46],[30,50],[25,54],[22,57],[15,58],[10,58],[5,57],
        [0,55],[-3,54],[-6,54],[-8,52],[-10,48],[-8,44],[-5,43],
        [-2,40],[-1,38],[-10,36]], GREEN_LAND, BORDER_COL, 1.5);

  // Scandinavia
  poly([[5,57],[8,58],[10,58],[15,59],[18,60],[20,63],[20,68],[18,70],
        [15,69],[12,65],[8,63],[5,60],[5,57]], GREEN_LAND, BORDER_COL, 1);

  // UK
  poly([[-6,50],[-3,51],[0,51],[2,52],[1,54],[-2,57],[-5,57],[-5,55],[-6,51],[-6,50]], GREEN_LAND, BORDER_COL, 1);

  // Iceland
  poly([[-24,64],[-18,63],[-13,64],[-13,66],[-18,67],[-24,65],[-24,64]], '#f0f4f8', BORDER_COL, 1);

  // ── ARABIAN PENINSULA ─────────────────────────────────────────────────────
  poly([[32,30],[35,29],[38,28],[40,27],[43,27],[46,25],[50,23],[56,23],
        [59,22],[60,22],[57,25],[56,27],[56,30],[53,23],[50,19],[48,17],
        [46,14],[44,13],[42,12],[40,13],[38,14],[36,15],[34,18],[32,21],
        [32,24],[32,30]], ARABIA_TAN, BORDER_COL, 2);

  // ── INDIA ─────────────────────────────────────────────────────────────────
  poly([[67,23],[70,22],[73,22],[75,20],[78,18],[80,14],[80,9],[79,8],
        [77,8],[75,10],[74,12],[72,18],[70,22],[68,22],[67,23]], GREEN_LAND, BORDER_COL, 2);

  // Sri Lanka
  poly([[80,8],[81,8],[81,7],[80,6],[79,7],[80,8]], GREEN_LAND, BORDER_COL, 1);

  // ── ASIA MAIN ─────────────────────────────────────────────────────────────
  poly([[30,43],[32,46],[36,50],[42,50],[48,47],[54,44],[60,43],[65,44],
        [70,44],[74,42],[78,40],[80,35],[80,30],[78,25],[75,20],[73,18],
        [72,15],[70,10],[72,8],[75,10],[80,8],[82,8],[85,11],[88,12],
        [92,23],[95,24],[98,25],[103,22],[106,20],[108,18],[110,15],
        [115,10],[120,5],[125,2],[130,0],[135,-3],[136,-10],[130,-15],
        [125,-14],[120,-10],[115,-8],[110,-5],[105,-5],[100,-5],[95,-5],
        [90,-5],[85,-3],[80,5],[75,8],[72,8],[70,10],[67,13],[65,15],
        [63,20],[60,22],[57,25],[56,27],[56,30],[55,35],[52,38],[50,40],
        [46,43],[43,45],[40,46],[36,50],[30,43]], GREEN_LAND, BORDER_COL, 2);

  // China / East Asia
  poly([[100,25],[105,28],[110,32],[115,38],[118,35],[120,35],[122,32],
        [120,30],[115,25],[110,20],[108,18],[105,20],[102,23],[100,25]], GREEN_LAND, BORDER_COL, 1);

  // Japan
  poly([[130,32],[132,34],[135,36],[137,38],[136,38],[134,36],[132,34],[130,32]], GREEN_LAND, BORDER_COL, 1);

  // Russia / North
  poly([[30,65],[40,70],[50,72],[60,72],[70,73],[80,73],[90,75],[100,75],
        [110,72],[120,70],[130,68],[135,65],[140,62],[138,58],[135,55],
        [130,50],[120,50],[110,52],[100,52],[90,52],[80,55],[70,60],
        [60,60],[50,58],[40,56],[35,55],[30,60],[30,65]], GREEN_LAND, BORDER_COL, 1.5);

  // ── NORTH AMERICA ─────────────────────────────────────────────────────────
  poly([[-70,50],[-65,47],[-60,46],[-55,47],[-53,48],[-55,52],[-60,55],
        [-65,58],[-70,60],[-75,62],[-80,65],[-90,68],[-100,70],[-110,70],
        [-120,68],[-130,65],[-140,62],[-145,60],[-140,57],[-135,55],
        [-130,52],[-125,48],[-123,45],[-120,40],[-118,35],[-110,30],
        [-105,25],[-97,22],[-88,18],[-85,16],[-80,15],[-78,18],[-80,22],
        [-82,25],[-80,28],[-80,32],[-78,35],[-75,38],[-73,42],[-70,45],
        [-70,48],[-70,50]], GREEN_LAND, BORDER_COL, 2);

  // Greenland
  poly([[-25,71],[-20,73],[-15,76],[-20,78],[-30,80],[-42,80],[-50,78],
        [-55,75],[-55,70],[-50,65],[-40,63],[-30,65],[-25,71]], '#ffffff', BORDER_COL, 1.5);

  // ── SOUTH AMERICA ─────────────────────────────────────────────────────────
  poly([[-75,10],[-70,12],[-62,15],[-62,12],[-60,5],[-52,4],[-50,0],
        [-48,-4],[-45,-8],[-40,-12],[-38,-15],[-38,-20],[-40,-22],
        [-43,-23],[-45,-28],[-50,-32],[-55,-36],[-60,-40],[-65,-45],
        [-67,-48],[-68,-52],[-65,-55],[-60,-55],[-55,-50],[-52,-47],
        [-50,-42],[-48,-38],[-45,-30],[-45,-25],[-42,-20],[-42,-15],
        [-42,-10],[-44,-5],[-48,-2],[-50,0],[-55,2],[-58,5],
        [-60,8],[-62,10],[-65,10],[-70,8],[-75,10]], GREEN_LAND, BORDER_COL, 2);

  // ── AUSTRALIA ─────────────────────────────────────────────────────────────
  poly([[115,-22],[117,-20],[120,-18],[122,-18],[124,-17],[126,-18],
        [128,-20],[130,-22],[132,-22],[135,-22],[138,-22],[140,-23],
        [142,-25],[145,-28],[148,-32],[152,-35],[152,-38],[148,-38],
        [145,-38],[142,-38],[138,-35],[135,-35],[132,-32],[130,-30],
        [128,-25],[125,-22],[120,-22],[117,-22],[115,-22]], TAN_DESERT, BORDER_COL, 2);

  // Antarctica
  poly([[-180,-70],[180,-70],[180,-90],[-180,-90]], '#ffffff', BORDER_COL, 1);

  // ── Lat / Lng Grid lines ──────────────────────────────────────────────────
  g.lineWidth = 1;
  for (let lng = -180; lng <= 180; lng += 30) {
    const [x] = p(lng, 0);
    g.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
  }
  for (let lat = -90; lat <= 90; lat += 30) {
    const [, y] = p(0, lat);
    g.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
  }

  // ── COUNTRY & OCEAN LABELS (Google Earth Typography) ─────────────────────
  g.textAlign = 'center';
  g.textBaseline = 'middle';

  const countryLabels: [string, number, number, string, number, string?][] = [
    // [Name, Lng, Lat, Color, FontSize, FontStyle]
    ['India / Inde', 78, 22, '#212121', 32, 'bold'],
    ['Arabie saoudite', 45, 24, '#37474f', 28, 'bold'],
    ['Égypte', 30, 26, '#37474f', 26, 'bold'],
    ['Iran', 53, 32, '#37474f', 26, 'bold'],
    ['Yémen', 47, 15, '#37474f', 22, 'bold'],
    ['Oman', 56, 21, '#37474f', 22, 'bold'],
    ['Émirats arabes unis', 54, 24, '#37474f', 20, 'bold'],
    ['Irak', 44, 33, '#37474f', 22, 'bold'],
    ['Syrie', 38, 35, '#37474f', 20, 'bold'],
    ['Turquie', 35, 39, '#37474f', 26, 'bold'],
    ['Pakistan', 69, 30, '#37474f', 24, 'bold'],
    ['Afghanistan', 66, 33, '#37474f', 22, 'bold'],
    ['Chine', 104, 35, '#212121', 34, 'bold'],
    ['Russie', 90, 60, '#212121', 38, 'bold'],
    ['Kazakhstan', 68, 48, '#37474f', 26, 'bold'],
    ['Algérie', 3, 28, '#37474f', 28, 'bold'],
    ['Libye', 17, 26, '#37474f', 26, 'bold'],
    ['Soudan', 30, 15, '#37474f', 26, 'bold'],
    ['Éthiopie', 40, 9, '#37474f', 24, 'bold'],
    ['Nigeria', 8, 9, '#37474f', 24, 'bold'],
    ['Groenland', -40, 72, '#37474f', 30, 'bold'],
    ['France', 2, 46, '#212121', 24, 'bold'],
    ['Allemagne', 10, 51, '#212121', 24, 'bold'],
    ['Espagne', -4, 40, '#212121', 24, 'bold'],
    ['Italie', 12, 43, '#212121', 24, 'bold'],
    ['Royaume-Uni', -2, 54, '#212121', 22, 'bold'],
    ['États-Unis', -98, 38, '#212121', 36, 'bold'],
    ['Canada', -106, 56, '#212121', 36, 'bold'],
    ['Brésil', -52, -14, '#212121', 34, 'bold'],
    ['Australie', 133, -25, '#212121', 34, 'bold'],
  ];

  for (const [name, lng, lat, color, size, weight] of countryLabels) {
    const [x, y] = p(lng, lat);
    g.font = `${weight || 'normal'} ${size}px "Inter", "Segoe UI", Roboto, sans-serif`;
    
    // Halo outline for maximum legibility
    g.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    g.lineWidth = 5;
    g.strokeText(name, x, y);

    g.fillStyle = color;
    g.fillText(name, x, y);
  }

  // Ocean / Sea Labels (Blue Typography)
  const oceanLabels: [string, number, number, number][] = [
    ['Mer d\'Arabie', 64, 15, 26],
    ['Golfe d\'Aden', 47, 12, 22],
    ['Mer Rouge', 37, 22, 22],
    ['Golfe du Bengale', 88, 14, 26],
    ['Océan Indien', 75, -10, 34],
    ['Océan Atlantique Nord', -35, 25, 32],
    ['Océan Atlantique Sud', -20, -25, 32],
    ['Mer Méditerranée', 18, 34, 24],
  ];

  for (const [name, lng, lat, size] of oceanLabels) {
    const [x, y] = p(lng, lat);
    g.font = `italic bold ${size}px "Inter", "Segoe UI", Roboto, sans-serif`;
    
    g.strokeStyle = 'rgba(255, 255, 255, 0.7)';
    g.lineWidth = 4;
    g.strokeText(name, x, y);

    g.fillStyle = '#1565c0';
    g.fillText(name, x, y);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  return tex;
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function GlobeMap({ infrastructure, risks, onSelectCorridor, selectedCorridor }: GlobeMapProps) {
  const mountRef    = useRef<HTMLDivElement>(null);
  const frameRef    = useRef<number>(0);
  const earthRef    = useRef<THREE.Group | null>(null);
  const markers     = useRef<{ mesh: THREE.Mesh; id: string }[]>([]);

  // Physics state
  const phys = useRef({
    rotY:       0,
    velocity:   0.0018,
    dragVel:    0,
    isDragging: false,
    lastX:      0,
    lastTime:   0,
    camZ:       4.8,
  });

  const getRiskColor = useCallback((id: string) => {
    const r = risks.find(r => r.corridor === id);
    return RISK_COLORS[r?.risk_level ?? 'UNKNOWN'] ?? '#00e5ff';
  }, [risks]);

  const getRiskLevel = useCallback((id: string) => {
    const r = risks.find(r => r.corridor === id);
    return r?.risk_level ?? 'UNKNOWN';
  }, [risks]);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    let W = el.clientWidth, H = el.clientHeight;

    // ── Renderer ─────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    // ── Scene / Camera ────────────────────────────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 200);

    phys.current.camZ = 4.8;
    camera.position.set(0, 0, phys.current.camZ);

    // Set initial rotation so Indian Ocean (≈55°E) faces camera
    phys.current.rotY = -((55 + 180) / 360) * Math.PI * 2 + Math.PI;

    // ── Lighting ──────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const sun = new THREE.DirectionalLight(0xfff5e6, 2.2);
    sun.position.set(8, 5, 7); scene.add(sun);
    const fill = new THREE.DirectionalLight(0xa0c4ff, 0.5);
    fill.position.set(-6, -2, -5); scene.add(fill);

    // ── Atmosphere Halo ───────────────────────────────────────────────────
    const R  = 1;
    const eg = new THREE.Group();
    earthRef.current = eg;
    eg.rotation.y = phys.current.rotY;
    scene.add(eg);

    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(R, 128, 64),
      new THREE.MeshPhongMaterial({
        map: buildGoogleEarthTexture(),
        specular: new THREE.Color(0x335577),
        shininess: 14,
      }),
    );
    eg.add(sphere);

    // Soft outer atmosphere glow (Google Earth blue halo)
    eg.add(new THREE.Mesh(
      new THREE.SphereGeometry(R + 0.02, 64, 64),
      new THREE.MeshPhongMaterial({ color: 0x90caf9, transparent: true, opacity: 0.15, side: THREE.FrontSide }),
    ));

    // ── Routes + Particles ────────────────────────────────────────────────
    interface Track { pts: THREE.Vector3[]; pnts: THREE.Points; prog: number; spd: number; cnt: number }
    const tracks: Track[] = [];
    const rg = new THREE.Group();
    eg.add(rg);

    for (const route of ROUTES) {
      const pts = buildArc(route.fromLat, route.fromLng, route.toLat, route.toLng, R);
      const geo  = new THREE.BufferGeometry().setFromPoints(pts);

      // Arc line
      rg.add(new THREE.Line(geo.clone(), new THREE.LineBasicMaterial({
        color: route.color, transparent: true, opacity: 0.75, linewidth: 2,
      })));

      // Particle stream
      const cnt = 16;
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(cnt * 3), 3));
      const pMat = new THREE.PointsMaterial({
        color: route.color, size: 0.038, transparent: true, opacity: 1.0, depthWrite: false, sizeAttenuation: true,
      });
      const pnts = new THREE.Points(pGeo, pMat);
      rg.add(pnts);
      tracks.push({ pts, pnts, prog: Math.random(), spd: 0.001 + Math.random() * 0.0006, cnt });
    }

    // ── Chokepoint Markers ────────────────────────────────────────────────
    markers.current = [];
    const mg = new THREE.Group();
    eg.add(mg);

    for (const cp of CHOKEPOINTS) {
      const pos = ll2v(cp.lat, cp.lng, R);
      const col = new THREE.Color(getRiskColor(cp.id));

      // Core sphere
      const core = new THREE.Mesh(
        new THREE.SphereGeometry(0.032, 16, 16),
        new THREE.MeshBasicMaterial({ color: col }),
      );
      core.position.copy(pos);
      (core as any).__cpId = cp.id;
      mg.add(core);
      markers.current.push({ mesh: core, id: cp.id });

      // Pulsing ring 1
      const r1 = new THREE.Mesh(
        new THREE.RingGeometry(0.04, 0.058, 32),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
      );
      r1.position.copy(pos);
      r1.lookAt(new THREE.Vector3(0, 0, 0));
      (r1 as any).__p1 = true;
      mg.add(r1);

      // Spike
      mg.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          pos.clone().multiplyScalar(1.0),
          pos.clone().multiplyScalar(1.10),
        ]),
        new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.8 }),
      ));
    }

    // Infrastructure dots
    const ig = new THREE.Group();
    eg.add(ig);
    for (const node of infrastructure) {
      if (!node.latitude || !node.longitude) continue;
      const pos = ll2v(node.latitude, node.longitude, R);
      const col = node.facility_type === 'refinery' ? 0xd500f9
                : node.facility_type === 'spr'      ? 0x2979ff
                :                                     0x00e5ff;
      const d = new THREE.Mesh(
        new THREE.SphereGeometry(0.01, 6, 6),
        new THREE.MeshBasicMaterial({ color: col }),
      );
      d.position.copy(pos);
      ig.add(d);
    }

    // ── Raycaster & Drag Controls ─────────────────────────────────────────
    const ray  = new THREE.Raycaster();
    const mv2  = new THREE.Vector2();

    const getHit = (e: MouseEvent | Touch) => {
      const rect = el.getBoundingClientRect();
      const cx   = e.clientX;
      const cy   = e.clientY;
      mv2.x =  ((cx - rect.left) / rect.width)  * 2 - 1;
      mv2.y = -((cy - rect.top)  / rect.height) * 2 + 1;
      ray.setFromCamera(mv2, camera);
      return ray.intersectObjects(markers.current.map(m => m.mesh));
    };

    let clickStartX = 0, clickStartY = 0;

    const onMouseDown = (e: MouseEvent) => {
      phys.current.isDragging = true;
      phys.current.lastX      = e.clientX;
      phys.current.lastTime   = performance.now();
      phys.current.dragVel    = 0;
      clickStartX = e.clientX; clickStartY = e.clientY;
      renderer.domElement.style.cursor = 'grabbing';
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!phys.current.isDragging) {
        const hits = getHit(e);
        renderer.domElement.style.cursor = hits.length ? 'pointer' : 'grab';
        return;
      }
      const now = performance.now();
      const dt  = Math.max(now - phys.current.lastTime, 1);
      const dx  = e.clientX - phys.current.lastX;
      phys.current.dragVel  = (dx / dt) * 16.67 * 0.008;
      phys.current.rotY    += dx * 0.006;
      phys.current.lastX    = e.clientX;
      phys.current.lastTime = now;
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!phys.current.isDragging) return;
      phys.current.isDragging = false;
      renderer.domElement.style.cursor = 'grab';

      const moved = Math.abs(e.clientX - clickStartX) + Math.abs(e.clientY - clickStartY);
      if (moved < 6) {
        const hits = getHit(e);
        if (hits.length) {
          const id = (hits[0].object as any).__cpId as string;
          if (id) onSelectCorridor(id);
        }
        phys.current.dragVel = 0;
      }
    };

    renderer.domElement.addEventListener('mousedown',  onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);

    // ── Resize ────────────────────────────────────────────────────────────
    const onResize = () => {
      W = el.clientWidth; H = el.clientHeight;
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      renderer.setSize(W, H);
    };
    window.addEventListener('resize', onResize);

    // ── Animation Loop ────────────────────────────────────────────────────
    let clock = 0;
    const TARGET_CAM_Z = 2.55;

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      clock += 0.016;

      if (phys.current.camZ > TARGET_CAM_Z + 0.005) {
        phys.current.camZ += (TARGET_CAM_Z - phys.current.camZ) * 0.025;
        camera.position.z = phys.current.camZ;
      }

      const BASE_SPEED = 0.0015;
      if (!phys.current.isDragging) {
        phys.current.dragVel *= 0.96;
        phys.current.rotY    += BASE_SPEED + phys.current.dragVel;
      }
      eg.rotation.y = phys.current.rotY;

      // Particles
      for (const tr of tracks) {
        tr.prog = (tr.prog + tr.spd) % 1;
        const pos = tr.pnts.geometry.attributes.position as THREE.BufferAttribute;
        const n   = tr.pts.length;
        for (let k = 0; k < tr.cnt; k++) {
          const frac = (tr.prog + k / tr.cnt) % 1;
          const pt   = tr.pts[Math.min(Math.floor(frac * n), n - 1)];
          pos.setXYZ(k, pt.x, pt.y, pt.z);
        }
        pos.needsUpdate = true;
        const mat = tr.pnts.material as THREE.PointsMaterial;
        mat.opacity = 0.7 + 0.3 * Math.sin(clock * 3 + tr.prog * 8);
      }

      // Pulse rings
      for (const child of mg.children) {
        const p1 = (child as any).__p1;
        if (!p1) continue;
        const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        const idx = mg.children.indexOf(child);
        const s = 1 + 0.35 * Math.abs(Math.sin(clock * 2.5 + idx));
        child.scale.setScalar(s);
        mat.opacity = 0.4 + 0.6 * Math.abs(Math.sin(clock * 2.5 + idx));
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize',    onResize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
      renderer.domElement.removeEventListener('mousedown',  onMouseDown);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, [infrastructure]);

  // Live-update marker colors
  useEffect(() => {
    for (const { mesh, id } of markers.current) {
      (mesh.material as THREE.MeshBasicMaterial).color.set(getRiskColor(id));
    }
  }, [risks, getRiskColor]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden shadow-2xl" style={{ background: '#0a192f' }}>
      <div ref={mountRef} className="absolute inset-0" style={{ cursor: 'grab' }} />

      {/* HUD: top-left title */}
      <div className="absolute top-3 left-3 z-20 pointer-events-none select-none">
        <div className="text-[10px] font-mono text-cyan-300 tracking-[0.25em] uppercase font-bold bg-black/60 px-3 py-1.5 rounded-lg border border-cyan-500/30 backdrop-blur-md">
          🌐 3D GOOGLE EARTH MAP · MARITIME INTELLIGENCE
        </div>
      </div>

      {/* HUD: top-right — corridor risk badges */}
      <div className="absolute top-3 right-3 z-20 space-y-1.5 pointer-events-none select-none">
        {CHOKEPOINTS.map(cp => {
          const level = getRiskLevel(cp.id);
          const color = getRiskColor(cp.id);
          return (
            <div
              key={cp.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-mono border backdrop-blur-md transition-all duration-300 ${
                selectedCorridor === cp.id
                  ? 'bg-white/20 border-white/40 shadow-lg'
                  : 'bg-black/65 border-white/10'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }} />
              <span className="text-white font-bold min-w-[130px]">{cp.name}</span>
              <span className="font-extrabold text-[9px] px-2 py-0.5 rounded bg-black/50" style={{ color }}>
                {level}
              </span>
            </div>
          );
        })}
      </div>

      {/* HUD: bottom-left stats */}
      <div className="absolute bottom-3 left-3 z-20 flex gap-2 flex-wrap pointer-events-none select-none">
        <div className="bg-black/70 border border-cyan-500/30 backdrop-blur-md px-3 py-1.5 rounded-lg text-[9px] font-mono text-cyan-300 font-bold">
          ⚡ 5 CORRIDOR ROUTES
        </div>
        <div className="bg-black/70 border border-blue-500/30 backdrop-blur-md px-3 py-1.5 rounded-lg text-[9px] font-mono text-blue-300 font-bold">
          📍 {infrastructure.length} INFRA NODES
        </div>
      </div>
    </div>
  );
}
