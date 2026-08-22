import { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Maritime chokepoints with real coordinates
const CHOKEPOINTS = [
  { id: 'HORMUZ',       name: 'Strait of Hormuz',    lat: 26.57,  lng: 56.25,  color: '#ef4444', risk: 'ELEVATED' },
  { id: 'BAB_EL_MANDEB',name: 'Bab-el-Mandeb',       lat: 12.58,  lng: 43.33,  color: '#f59e0b', risk: 'HIGH'     },
  { id: 'SUEZ',         name: 'Suez Canal',           lat: 29.98,  lng: 32.55,  color: '#f59e0b', risk: 'MEDIUM'   },
  { id: 'RED_SEA',      name: 'Red Sea',              lat: 20.0,   lng: 38.5,   color: '#ef4444', risk: 'HIGH'     },
  { id: 'INDIA',        name: 'India — West Coast',   lat: 15.3,   lng: 73.9,   color: '#10b981', risk: 'LOW'      },
  { id: 'MUMBAI',       name: 'Mumbai Port',          lat: 18.94,  lng: 72.85,  color: '#06b6d4', risk: 'LOW'      },
];

// Great-circle arc pairs (from → to)
const ROUTES = [
  { from: 'HORMUZ',        to: 'INDIA',         color: '#06b6d4' },
  { from: 'BAB_EL_MANDEB', to: 'INDIA',         color: '#3b82f6' },
  { from: 'SUEZ',          to: 'BAB_EL_MANDEB', color: '#f59e0b' },
  { from: 'HORMUZ',        to: 'BAB_EL_MANDEB', color: '#8b5cf6' },
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

function buildArc(
  from: THREE.Vector3,
  to:   THREE.Vector3,
  color: string,
  radius: number,
): THREE.Line {
  const points: THREE.Vector3[] = [];
  const segments = 60;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const v = new THREE.Vector3().lerpVectors(from, to, t).normalize().multiplyScalar(
      radius + Math.sin(Math.PI * t) * 0.08, // arc lift
    );
    points.push(v);
  }
  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8, linewidth: 1 });
  return new THREE.Line(geo, mat);
}

export default function Globe3D() {
  const mountRef  = useRef<HTMLDivElement>(null);
  const frameRef  = useRef<number>(0);

  useEffect(() => {
    if (!mountRef.current) return;

    const W = mountRef.current.clientWidth;
    const H = mountRef.current.clientHeight;

    // ── Renderer ─────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    mountRef.current.appendChild(renderer.domElement);

    // ── Scene / Camera ────────────────────────────────────────────────────────
    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(0, 0, 2.8);

    // ── Lighting ──────────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0x1a2a4a, 1.2);
    scene.add(ambient);
    const sun = new THREE.DirectionalLight(0x4488ff, 2.5);
    sun.position.set(5, 3, 5);
    scene.add(sun);
    const rimLight = new THREE.DirectionalLight(0x00ffcc, 0.4);
    rimLight.position.set(-5, -2, -3);
    scene.add(rimLight);

    // ── Earth Sphere ──────────────────────────────────────────────────────────
    const R = 1;
    const earthGeo = new THREE.SphereGeometry(R, 64, 64);

    // Procedural dark ocean / land texture on canvas
    const texSize = 1024;
    const canvas  = document.createElement('canvas');
    canvas.width  = texSize;
    canvas.height = texSize / 2;
    const ctx = canvas.getContext('2d')!;

    // Deep ocean gradient
    const seaGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    seaGrad.addColorStop(0,   '#050d1a');
    seaGrad.addColorStop(0.5, '#071424');
    seaGrad.addColorStop(1,   '#040e1a');
    ctx.fillStyle = seaGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Simplified continent silhouettes (approximate polygons)
    ctx.fillStyle = '#0d2235';
    const landMasses: [number, number][][] = [
      // Eurasia broad shape
      [[150,60],[650,60],[700,120],[720,180],[650,220],[600,200],[560,240],[520,200],[480,180],[420,160],[350,130],[280,130],[220,150],[180,130],[150,100]],
      // Africa
      [[320,230],[390,230],[410,270],[420,340],[390,420],[340,440],[300,420],[280,360],[285,290]],
      // Arabian Peninsula (key for our corridors)
      [[420,180],[470,170],[490,210],[475,240],[460,255],[440,250],[420,220]],
      // Indian Subcontinent
      [[510,200],[550,200],[560,230],[545,280],[520,290],[500,260],[500,225]],
      // Americas
      [[20,80],[100,80],[110,150],[95,250],[60,340],[30,380],[10,360],[5,200]],
      // Southeast Asia
      [[620,220],[680,210],[700,250],[680,270],[650,260],[620,250]],
      // Australia
      [[640,330],[720,320],[740,370],[720,400],[670,410],[630,380],[620,350]],
    ];
    for (const shape of landMasses) {
      ctx.beginPath();
      ctx.moveTo(shape[0][0], shape[0][1]);
      for (let i = 1; i < shape.length; i++) ctx.lineTo(shape[i][0], shape[i][1]);
      ctx.closePath();
      ctx.fill();
    }

    // Red Sea / Persian Gulf highlight
    ctx.fillStyle = '#0a1f2f';
    ctx.beginPath();
    ctx.ellipse(430, 220, 12, 50, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(455, 195, 15, 22, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Subtle grid lines
    ctx.strokeStyle = '#0f2a3a';
    ctx.lineWidth = 0.5;
    for (let x = 0; x < canvas.width; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 32) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
    }

    const earthTex = new THREE.CanvasTexture(canvas);
    const earthMat = new THREE.MeshPhongMaterial({
      map: earthTex,
      specular: new THREE.Color(0x112244),
      shininess: 15,
      transparent: false,
    });
    const earth = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earth);

    // ── Atmosphere Glow ───────────────────────────────────────────────────────
    const atmosGeo = new THREE.SphereGeometry(R + 0.04, 64, 64);
    const atmosMat = new THREE.MeshPhongMaterial({
      color: 0x003366,
      transparent: true,
      opacity: 0.15,
      side: THREE.FrontSide,
    });
    scene.add(new THREE.Mesh(atmosGeo, atmosMat));

    // Outer glow ring
    const outerGeo = new THREE.SphereGeometry(R + 0.08, 64, 64);
    const outerMat = new THREE.MeshPhongMaterial({
      color: 0x001133,
      transparent: true,
      opacity: 0.08,
      side: THREE.FrontSide,
    });
    scene.add(new THREE.Mesh(outerGeo, outerMat));

    // ── Routes (Great-Circle Arcs) ────────────────────────────────────────────
    const chopMap = Object.fromEntries(CHOKEPOINTS.map(c => [c.id, latLngToVec3(c.lat, c.lng, R)]));

    const routeGroup = new THREE.Group();
    for (const route of ROUTES) {
      const from = chopMap[route.from];
      const to   = chopMap[route.to];
      if (from && to) routeGroup.add(buildArc(from, to, route.color, R));
    }
    earth.add(routeGroup);

    // ── Chokepoint Markers ────────────────────────────────────────────────────
    const markerGroup = new THREE.Group();
    for (const cp of CHOKEPOINTS) {
      const pos = latLngToVec3(cp.lat, cp.lng, R);

      // Core dot
      const dotGeo = new THREE.SphereGeometry(0.018, 8, 8);
      const dotMat = new THREE.MeshBasicMaterial({ color: cp.color });
      const dot    = new THREE.Mesh(dotGeo, dotMat);
      dot.position.copy(pos);
      markerGroup.add(dot);

      // Pulse ring
      const ringGeo = new THREE.RingGeometry(0.025, 0.035, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: cp.color, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
      const ring    = new THREE.Mesh(ringGeo, ringMat);
      ring.position.copy(pos);
      ring.lookAt(new THREE.Vector3(0, 0, 0));
      markerGroup.add(ring);

      // Spike line toward camera center
      const spikeGeo = new THREE.BufferGeometry().setFromPoints([
        pos.clone().multiplyScalar(1.0),
        pos.clone().multiplyScalar(1.06),
      ]);
      const spikeMat = new THREE.LineBasicMaterial({ color: cp.color, transparent: true, opacity: 0.7 });
      markerGroup.add(new THREE.Line(spikeGeo, spikeMat));
    }
    earth.add(markerGroup);

    // ── Star Field ────────────────────────────────────────────────────────────
    const starCount = 2000;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      starPositions[i] = (Math.random() - 0.5) * 50;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.02, transparent: true, opacity: 0.5 });
    scene.add(new THREE.Points(starGeo, starMat));

    // ── Animation ─────────────────────────────────────────────────────────────
    let t = 0;
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      t += 0.003;

      // Slow auto-rotate, centered on Indian Ocean
      earth.rotation.y = t + 0.85;

      // Pulsing marker rings
      markerGroup.children.forEach((child, i) => {
        if (child instanceof THREE.Mesh && child.geometry instanceof THREE.RingGeometry) {
          const mat = child.material as THREE.MeshBasicMaterial;
          mat.opacity = 0.3 + 0.4 * Math.abs(Math.sin(t * 2 + i));
          const s = 1 + 0.15 * Math.abs(Math.sin(t * 1.5 + i));
          child.scale.setScalar(s);
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    // ── Resize ────────────────────────────────────────────────────────────────
    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ── Interactive drag rotate ────────────────────────────────────────────────
    let isDragging = false;
    let prevMouse = { x: 0, y: 0 };
    const onMouseDown = (e: MouseEvent) => { isDragging = true; prevMouse = { x: e.clientX, y: e.clientY }; };
    const onMouseUp   = () => { isDragging = false; };
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouse.x;
      earth.rotation.y += dx * 0.005;
      prevMouse = { x: e.clientX, y: e.clientY };
    };
    renderer.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup',   onMouseUp);
    window.addEventListener('mousemove', onMouseMove);

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize',    onResize);
      window.removeEventListener('mouseup',   onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      renderer.dispose();
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div
      ref={mountRef}
      className="w-full h-full"
      style={{ cursor: 'grab' }}
    />
  );
}
