import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Zap, Shield, Activity, Globe, AlertTriangle } from 'lucide-react';
import Globe3D from '../components/landing/Globe3D';
import type { HealthResponse, SourceStatusResponse, BrentPriceResponse } from '../types';

interface LandingProps {
  onEnter: () => void;
  health: HealthResponse | null;
  dataStatuses: SourceStatusResponse[];
  brentPrices: BrentPriceResponse | null;
  corridorsCount: number;
}

const CORRIDORS = [
  { id: 'HORMUZ',        label: 'Strait of Hormuz',  lat: '26.57°N', lng: '56.25°E', risk: 'ELEVATED', color: '#f97316' },
  { id: 'BAB_EL_MANDEB', label: 'Bab-el-Mandeb',     lat: '12.58°N', lng: '43.33°E', risk: 'HIGH',     color: '#ef4444' },
  { id: 'SUEZ',          label: 'Suez Canal',         lat: '29.98°N', lng: '32.55°E', risk: 'MEDIUM',   color: '#f59e0b' },
  { id: 'RED_SEA',       label: 'Red Sea Corridor',   lat: '20.00°N', lng: '38.50°E', risk: 'HIGH',     color: '#ef4444' },
];

const STATS = [
  { label: 'Corridors Monitored', value: '4',    icon: Globe,         unit: 'ACTIVE' },
  { label: 'AI Models Running',   value: '13',   icon: Zap,           unit: 'LIVE'   },
  { label: 'Threat Intel',        value: '24/7', icon: Shield,        unit: 'SCAN'   },
  { label: 'Alert Latency',       value: '<2s',  icon: Activity,      unit: 'RT'     },
];

export default function Landing({
  onEnter, health, brentPrices, corridorsCount,
}: LandingProps) {
  const scanlineRef = useRef<HTMLCanvasElement>(null);
  const [tick, setTick] = useState(0);
  const [activeCorridor, setActiveCorridor] = useState(0);

  // Scanline canvas effect
  useEffect(() => {
    const canvas = scanlineRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let af = 0;
    let offset = 0;
    const draw = () => {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(0,255,180,0.03)';
      ctx.lineWidth   = 1;
      for (let y = offset; y < canvas.height; y += 4) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
      offset = (offset + 0.5) % 4;
      af = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(af);
  }, []);

  // Corridor cycle ticker
  useEffect(() => {
    const id = setInterval(() => {
      setActiveCorridor(c => (c + 1) % CORRIDORS.length);
      setTick(t => t + 1);
    }, 2400);
    return () => clearInterval(id);
  }, []);

  const brent = brentPrices?.latest_price?.toFixed(2) ?? '—';

  return (
    <div className="relative min-h-screen bg-[#020810] text-white overflow-hidden flex flex-col">

      {/* ── Scanline Overlay ─────────────────────────────────────────── */}
      <canvas
        ref={scanlineRef}
        className="absolute inset-0 pointer-events-none z-50"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* ── Deep Space Background ────────────────────────────────────── */}
      <div className="absolute inset-0 z-0">
        {/* Radial nebula */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_50%,_rgba(0,40,80,0.5)_0%,_transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_30%,_rgba(0,20,50,0.4)_0%,_transparent_60%)]" />
        {/* Grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(0,255,200,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,200,0.8) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* Horizon line */}
        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
      </div>

      {/* ── Top Nav Bar ──────────────────────────────────────────────── */}
      <header className="relative z-30 flex items-center justify-between px-8 py-4 border-b border-cyan-900/20 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {/* Logo icon */}
          <div className="w-8 h-8 rounded border border-cyan-500/40 flex items-center justify-center bg-cyan-950/40">
            <Shield className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-[11px] font-black tracking-[0.25em] text-white uppercase">
              Energy Resilience Intel
            </div>
            <div className="text-[9px] font-mono text-cyan-500/70 tracking-widest">
              MARITIME CORRIDOR THREAT PLATFORM
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Live data feed ticker */}
          <div className="hidden md:flex items-center gap-2 text-[10px] font-mono text-gray-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400">BRENT</span>
            <span className="text-white font-bold">${brent}</span>
            <span className="ml-3 text-amber-400">API</span>
            <span className={health?.status === 'ok' ? 'text-emerald-400' : 'text-red-400'}>
              {health?.status === 'ok' ? 'CONNECTED' : 'OFFLINE'}
            </span>
          </div>
          <button
            onClick={onEnter}
            className="text-[11px] font-mono text-gray-500 hover:text-cyan-400 transition-colors"
          >
            Skip Intro →
          </button>
        </div>
      </header>

      {/* ── Main Hero ────────────────────────────────────────────────── */}
      <main className="relative z-20 flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0">

        {/* LEFT: Copy + CTA */}
        <div className="flex flex-col justify-center px-8 lg:px-16 py-12 lg:py-0">

          {/* Alert badge */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-2 mb-8 w-fit"
          >
            <div className="flex items-center gap-2 bg-red-950/50 border border-red-800/40 px-3 py-1.5 rounded-full text-[10px] font-mono text-red-400">
              <AlertTriangle className="w-3 h-3" />
              ACTIVE GEOPOLITICAL MONITORING — INDIAN OCEAN THEATRE
            </div>
          </motion.div>

          {/* Headline */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7 }}
          >
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black leading-none tracking-tighter uppercase mb-2">
              <span className="text-white">MARITIME</span>
              <br />
              <span
                className="text-transparent bg-clip-text"
                style={{
                  backgroundImage: 'linear-gradient(90deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
                }}
              >
                ENERGY RISK
              </span>
              <br />
              <span className="text-white">INTELLIGENCE</span>
            </h1>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 text-gray-400 text-sm md:text-base leading-relaxed max-w-md"
          >
            Real-time AI-powered situational awareness across critical maritime energy corridors.
            Protecting India's crude oil supply chain through explainable ML threat intelligence.
          </motion.p>

          {/* Live corridor ticker */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-8 p-4 rounded-xl border border-gray-800/60 bg-gray-900/30 backdrop-blur-sm"
          >
            <div className="text-[9px] font-mono text-gray-600 mb-3 tracking-widest">
              LIVE CORRIDOR THREAT FEED
            </div>
            <div className="space-y-2">
              {CORRIDORS.map((c, i) => (
                <div
                  key={c.id}
                  className={`flex items-center justify-between py-1.5 px-2 rounded transition-all duration-500 ${
                    i === activeCorridor ? 'bg-gray-800/60' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-1.5 h-1.5 rounded-full"
                      style={{
                        backgroundColor: c.color,
                        boxShadow: i === activeCorridor ? `0 0 6px ${c.color}` : 'none',
                      }}
                    />
                    <span className="text-[11px] font-mono text-gray-300">{c.label}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[9px] font-mono text-gray-600">{c.lat} {c.lng}</span>
                    <span
                      className="text-[9px] font-bold font-mono px-2 py-0.5 rounded"
                      style={{
                        color: c.color,
                        backgroundColor: `${c.color}18`,
                        border: `1px solid ${c.color}33`,
                      }}
                    >
                      {c.risk}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0 }}
            className="flex gap-4 mt-8"
          >
            <button
              onClick={onEnter}
              className="flex items-center gap-2 px-8 py-3.5 rounded-lg text-sm font-bold uppercase tracking-widest transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_30px_rgba(6,182,212,0.4)]"
              style={{
                background: 'linear-gradient(135deg, #0e7490 0%, #1d4ed8 100%)',
                boxShadow: '0 0 20px rgba(6,182,212,0.2)',
              }}
            >
              <span>Enter Command Center</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onEnter}
              className="px-6 py-3.5 rounded-lg text-sm font-bold uppercase tracking-widest border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-all duration-300"
            >
              View Intel
            </button>
          </motion.div>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="flex gap-6 mt-10"
          >
            {STATS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5 text-[9px] font-mono text-gray-600 uppercase">
                    <Icon className="w-3 h-3 text-cyan-600" />
                    {s.unit}
                  </div>
                  <div className="text-xl font-black text-white">{s.value}</div>
                  <div className="text-[9px] text-gray-600">{s.label}</div>
                </div>
              );
            })}
          </motion.div>
        </div>

        {/* RIGHT: 3D Globe */}
        <div className="relative flex items-center justify-center overflow-hidden min-h-[500px] lg:min-h-0">

          {/* HUD frame corners */}
          <div className="absolute top-8 left-8 w-8 h-8 border-t-2 border-l-2 border-cyan-500/40 z-20" />
          <div className="absolute top-8 right-8 w-8 h-8 border-t-2 border-r-2 border-cyan-500/40 z-20" />
          <div className="absolute bottom-8 left-8 w-8 h-8 border-b-2 border-l-2 border-cyan-500/40 z-20" />
          <div className="absolute bottom-8 right-8 w-8 h-8 border-b-2 border-r-2 border-cyan-500/40 z-20" />

          {/* Globe container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 1.0, ease: 'easeOut' }}
            className="w-full h-full absolute inset-0"
          >
            <Globe3D />
          </motion.div>

          {/* Coordinate readout overlay */}
          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
            <AnimatePresence mode="wait">
              <motion.div
                key={tick}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-3 bg-gray-950/80 border border-cyan-900/40 backdrop-blur-sm px-4 py-2 rounded-lg"
              >
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: CORRIDORS[activeCorridor].color }}
                />
                <div className="text-[10px] font-mono text-gray-400">
                  <span className="text-white font-bold">{CORRIDORS[activeCorridor].label}</span>
                  <span className="mx-2 text-gray-700">|</span>
                  <span className="text-cyan-500">{CORRIDORS[activeCorridor].lat}</span>
                  <span className="mx-1 text-gray-700">/</span>
                  <span className="text-cyan-500">{CORRIDORS[activeCorridor].lng}</span>
                  <span className="mx-2 text-gray-700">|</span>
                  <span style={{ color: CORRIDORS[activeCorridor].color }}>
                    {CORRIDORS[activeCorridor].risk}
                  </span>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Top HUD label */}
          <div className="absolute top-10 left-1/2 -translate-x-1/2 z-20 text-[9px] font-mono text-cyan-600/60 tracking-[0.25em] pointer-events-none">
            NORTH INDIAN OCEAN // LIVE SCAN
          </div>

          {/* Side coordinate labels */}
          <div className="absolute top-1/4 right-6 z-20 text-right pointer-events-none">
            <div className="text-[8px] font-mono text-gray-700">LAT / LNG</div>
            <div className="text-[10px] font-mono text-cyan-600">
              {CORRIDORS[activeCorridor].lat}
            </div>
            <div className="text-[10px] font-mono text-cyan-600">
              {CORRIDORS[activeCorridor].lng}
            </div>
          </div>
        </div>
      </main>

      {/* ── Bottom Operations Strip ───────────────────────────────────── */}
      <footer className="relative z-30 border-t border-cyan-900/20 bg-gray-950/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-8 py-3 overflow-x-auto">
          <div className="flex items-center gap-6 text-[10px] font-mono whitespace-nowrap">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-gray-600">API STATUS:</span>
              <span className={health?.status === 'ok' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                {health?.status === 'ok' ? 'OPERATIONAL' : 'DEGRADED'}
              </span>
            </div>
            <div className="text-gray-700">|</div>
            <div className="text-gray-600">
              CORRIDORS: <span className="text-cyan-400 font-bold">{corridorsCount || 4} MONITORED</span>
            </div>
            <div className="text-gray-700">|</div>
            <div className="text-gray-600">
              BRENT CRUDE: <span className="text-amber-400 font-bold">${brent}/bbl</span>
            </div>
            <div className="text-gray-700">|</div>
            <div className="text-gray-600">
              REGION: <span className="text-white font-bold">NORTH INDIAN OCEAN</span>
            </div>
          </div>

          <div className="text-[9px] font-mono text-gray-700 whitespace-nowrap pl-6">
            ENERGY RESILIENCE INTEL v1.4.0 // PHASE 15
          </div>
        </div>
      </footer>
    </div>
  );
}
