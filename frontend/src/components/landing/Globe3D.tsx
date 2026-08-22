import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const CHOKEPOINTS = [
  { id: 'HORMUZ',       name: 'Strait of Hormuz',    lat: 26.57,  lng: 56.25,  color: '#ff1744' },
  { id: 'BAB_EL_MANDEB',name: 'Bab-el-Mandeb',       lat: 12.58,  lng: 43.33,  color: '#ff9100' },
  { id: 'SUEZ',         name: 'Suez Canal',           lat: 29.98,  lng: 32.55,  color: '#ffea00' },
  { id: 'RED_SEA',      name: 'Red Sea Corridor',     lat: 20.0,   lng: 38.5,   color: '#ff1744' },
  { id: 'INDIA',        name: 'India Hub',            lat: 18.94,  lng: 72.85,  color: '#00e676' },
];

const ROUTES = [
  { fromLat: 26.57, fromLng: 56.25, toLat: 18.94, toLng: 72.85, color: '#00f2fe' },
  { fromLat: 12.58, fromLng: 43.33, toLat: 18.94, toLng: 72.85, color: '#4facfe' },
  { fromLat: 29.98, fromLng: 32.55, toLat: 12.58, toLng: 43.33, color: '#ffb199' },
  { fromLat: 26.57, fromLng: 56.25, toLat: 20.00, toLng: 38.50, color: '#f107a3' },
];

function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi   = (90 - lat)  * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta),
  );
}

function buildArc(fromLat: number, fromLng: number, toLat: number, toLng: number, radius: number): THREE.Line {
  const from = latLngToVec3(fromLat, fromLng, radius);
  const to   = latLngToVec3(toLat, toLng, radius);
  const points: THREE.Vector3[] = [];
  const segments = 60;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const v = new THREE.Vector3().lerpVectors(from, to, t).normalize().multiplyScalar(
      radius + Math.sin(Math.PI * t) * 0.12,
    );
    points.push(v);
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.8, linewidth: 2 });
  return new THREE.Line(geo, mat);
}

function buildGoogleEarthCanvasTexture(): THREE.CanvasTexture {
  const W = 4096, H = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const g = canvas.getContext('2d')!;

  const p = (lng: number, lat: number): [number, number] => [
    ((lng + 180) / 360) * W,
    ((90 - lat)  / 180) * H,
  ];

  // Ocean
  const oceanGrad = g.createLinearGradient(0, 0, 0, H);
  oceanGrad.addColorStop(0,   '#86a8c7');
  oceanGrad.addColorStop(0.5, '#6196c3');
  oceanGrad.addColorStop(1,   '#8bb0d0');
  g.fillStyle = oceanGrad;
  g.fillRect(0, 0, W, H);

  const poly = (pts: [number, number][], fill: string, stroke = 'rgba(255,255,255,0.7)', sw = 1.2) => {
    g.beginPath();
    g.moveTo(...p(...pts[0]));
    for (let i = 1; i < pts.length; i++) g.lineTo(...p(...pts[i]));
    g.closePath();
    g.fillStyle = fill;
    g.fill();
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = sw; g.stroke(); }
  };

  const GREEN_LAND = '#9ec899';
  const TAN_DESERT = '#d8ccaa';
  const ARABIA_TAN = '#e6d3a7';
  const BORDER_COL = 'rgba(255, 255, 255, 0.7)';

  // Africa
  poly([[-17,15],[-15,11],[-12,8],[-8,5],[-5,4],[-1,4],[3,5],[9,4],[12,4],
        [15,3],[18,3],[22,1],[25,2],[30,4],[33,3],[36,1],[38,-2],[40,-5],
        [41,-10],[40,-15],[36,-24],[29,-34],[27,-34],[19,-34],[17,-29],
        [15,-28],[13,-22],[11,-18],[10,-14],[9,-8],[3,-4],[-2,4],[-5,5],
        [-8,5],[-15,11],[-17,13],[-17,15]], TAN_DESERT, BORDER_COL, 1.5);

  // Europe
  poly([[-10,36],[-5,36],[0,37],[5,37],[10,38],[15,37],[20,38],[28,41],
        [30,43],[32,46],[30,50],[25,54],[22,57],[15,58],[10,58],[5,57],
        [0,55],[-3,54],[-6,54],[-8,52],[-10,48],[-8,44],[-5,43],
        [-2,40],[-1,38],[-10,36]], GREEN_LAND, BORDER_COL, 1.5);

  // Arabia
  poly([[32,30],[35,29],[38,28],[40,27],[43,27],[46,25],[50,23],[56,23],
        [59,22],[60,22],[57,25],[56,27],[56,30],[53,23],[50,19],[48,17],
        [46,14],[44,13],[42,12],[40,13],[38,14],[36,15],[34,18],[32,21],
        [32,24],[32,30]], ARABIA_TAN, BORDER_COL, 2);

  // India
  poly([[67,23],[70,22],[73,22],[75,20],[78,18],[80,14],[80,9],[79,8],
        [77,8],[75,10],[74,12],[72,18],[70,22],[68,22],[67,23]], GREEN_LAND, BORDER_COL, 2);

  // Asia
  poly([[30,43],[32,46],[36,50],[42,50],[48,47],[54,44],[60,43],[65,44],
        [70,44],[74,42],[78,40],[80,35],[80,30],[78,25],[75,20],[73,18],
        [72,15],[70,10],[72,8],[75,10],[80,8],[82,8],[85,11],[88,12],
        [92,23],[95,24],[98,25],[103,22],[106,20],[108,18],[110,15],
        [115,10],[120,5],[125,2],[130,0],[135,-3],[136,-10],[130,-15],
        [125,-14],[120,-10],[115,-8],[110,-5],[105,-5],[100,-5],[95,-5],
        [90,-5],[85,-3],[80,5],[75,8],[72,8],[70,10],[67,13],[65,15],
        [63,20],[60,22],[57,25],[56,27],[56,30],[55,35],[52,38],[50,40],
        [46,43],[43,45],[40,46],[36,50],[30,43]], GREEN_LAND, BORDER_COL, 2);

  // Americas
  poly([[-70,50],[-65,47],[-60,46],[-55,47],[-53,48],[-55,52],[-60,55],
        [-65,58],[-70,60],[-75,62],[-80,65],[-90,68],[-100,70],[-110,70],
        [-120,68],[-130,65],[-140,62],[-145,60],[-140,57],[-135,55],
        [-130,52],[-125,48],[-123,45],[-120,40],[-118,35],[-110,30],
        [-105,25],[-97,22],[-88,18],[-85,16],[-80,15],[-78,18],[-80,22],
        [-82,25],[-80,28],[-80,32],[-78,35],[-75,38],[-73,42],[-70,45],
        [-70,48],[-70,50]], GREEN_LAND, BORDER_COL, 2);

  // Australia
  poly([[115,-22],[117,-20],[120,-18],[122,-18],[124,-17],[126,-18],
        [128,-20],[130,-22],[132,-22],[135,-22],[138,-22],[140,-23],
        [142,-25],[145,-28],[148,-32],[152,-35],[152,-38],[148,-38],
        [145,-38],[142,-38],[138,-35],[135,-35],[132,-32],[130,-30],
        [128,-25],[125,-22],[120,-22],[117,-22],[115,-22]], TAN_DESERT, BORDER_COL, 2);

  // Labels
  g.textAlign = 'center';
  g.textBaseline = 'middle';

  const countryLabels: [string, number, number, string, number, string?][] = [
    ['Inde', 78, 22, '#212121', 32, 'bold'],
    ['Arabie saoudite', 45, 24, '#37474f', 28, 'bold'],
    ['Égypte', 30, 26, '#37474f', 26, 'bold'],
    ['Iran', 53, 32, '#37474f', 26, 'bold'],
    ['Yémen', 47, 15, '#37474f', 22, 'bold'],
    ['Oman', 56, 21, '#37474f', 22, 'bold'],
    ['Chine', 104, 35, '#212121', 34, 'bold'],
    ['Russie', 90, 60, '#212121', 38, 'bold'],
    ['France', 2, 46, '#212121', 24, 'bold'],
    ['États-Unis', -98, 38, '#212121', 36, 'bold'],
    ['Brésil', -52, -14, '#212121', 34, 'bold'],
    ['Australie', 133, -25, '#212121', 34, 'bold'],
  ];

  for (const [name, lng, lat, color, size, weight] of countryLabels) {
    const [x, y] = p(lng, lat);
    g.font = `${weight || 'normal'} ${size}px "Inter", "Segoe UI", Roboto, sans-serif`;
    g.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    g.lineWidth = 5;
    g.strokeText(name, x, y);
    g.fillStyle = color;
    g.fillText(name, x, y);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.anisotropy = 16;
  return tex;
}

export default function Globe3D() {
  const mountRef  = useRef<HTMLDivElement>(null);
  const frameRef  = useRef<number>(0);

  useEffect(() => {
    if (!mountRef.current) return;

    const W = mountRef.current.clientWidth;
    const H = mountRef.current.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0, 2.8);

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const sun = new THREE.DirectionalLight(0xfff5e6, 2.2);
    sun.position.set(5, 3, 5);
    scene.add(sun);

    const R = 1;
    const earthGeo = new THREE.SphereGeometry(R, 64, 64);
    const earthMat = new THREE.MeshPhongMaterial({
      map: buildGoogleEarthCanvasTexture(),
      specular: new THREE.Color(0x224466),
      shininess: 15,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earth);

    // Routes
    const routeGroup = new THREE.Group();
    for (const route of ROUTES) {
      routeGroup.add(buildArc(route.fromLat, route.fromLng, route.toLat, route.toLng, R));
    }
    earth.add(routeGroup);

    // Markers
    const markerGroup = new THREE.Group();
    for (const cp of CHOKEPOINTS) {
      const pos = latLngToVec3(cp.lat, cp.lng, R);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 12), new THREE.MeshBasicMaterial({ color: cp.color }));
      dot.position.copy(pos);
      markerGroup.add(dot);
    }
    earth.add(markerGroup);

    let t = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      t += 0.003;
      earth.rotation.y = t + 0.85;
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="w-full h-full" style={{ cursor: 'grab' }} />;
}
