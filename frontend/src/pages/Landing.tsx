import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Ship, ArrowRight, ArrowLeft, ChevronRight,
  Shield, Globe2, AlertTriangle, TrendingUp, Radio, Sun, Moon
} from 'lucide-react';
import { api } from '../api/client';
import type { Theme } from '../api/hooks/useTheme';

interface LandingProps {
  onEnterDashboard: (tab?: string) => void;
  theme: Theme;
  onToggleTheme: () => void;
}

const NAV_LINKS = [
  { label: 'Home', id: 'home', tab: null },
  { label: 'Corridors', id: 'corridors', tab: 'MONITOR' },
  { label: 'Intelligence', id: 'intelligence', tab: 'INTELLIGENCE' },
  { label: 'Governance', id: 'governance', tab: 'GOVERNANCE' },
];

const SLIDES = [
  {
    headline: ['Smarter Risk.', 'Faster Decisions.', 'Global Maritime Reach.'],
    sub: `AI-driven corridor risk intelligence for India's crude oil supply chain — real-time geopolitical threat monitoring across the world's most critical chokepoints.`,
    cta: 'Enter Command Center',
    tab: 'MONITOR',
    badge: 'LIVE THREAT FEED',
    badgeColor: '#e11d48',
  },
  {
    headline: ['Predict Disruptions', 'Before They', 'Strike.'],
    sub: `Our XGBoost ensemble model scores 4 chokepoints every 24 hours — Strait of Hormuz, Bab-el-Mandeb, Suez Canal, Red Sea — with full SHAP explainability.`,
    cta: 'View Risk Models',
    tab: 'MODELS',
    badge: 'AI RISK ENGINE',
    badgeColor: '#2563eb',
  },
  {
    headline: ['Scenario', 'Simulation.', 'What-If Analysis.'],
    sub: `Stress-test India's energy supply chain. Simulate geopolitical escalations, tanker flow disruptions, and Brent price shocks with interactive multipliers.`,
    cta: 'Run Simulation',
    tab: 'SCENARIO',
    badge: 'SCENARIO PLANNER',
    badgeColor: '#d97706',
  },
];

const STATS = [
  { value: '4', label: 'Monitored Chokepoints', sub: 'Hormuz · Suez · Bab-el-Mandeb · Red Sea', tab: 'MONITOR' },
  { value: '88%', label: 'India Oil Imports', sub: 'Seaborne dependency on these corridors', tab: 'COMPARISON' },
  { value: '3.2K+', label: 'Daily AIS Records', sub: 'PortWatch vessel tracking feed', tab: 'INTELLIGENCE' },
  { value: '0.94', label: 'ROC-AUC Score', sub: 'XGBoost champion model accuracy', tab: 'MODELS' },
];

export default function Landing({ onEnterDashboard, theme, onToggleTheme }: LandingProps) {
  const isDark = theme === 'dark';

  const [activeSlide, setActiveSlide] = useState(0);
  const [activeNav, setActiveNav] = useState('home');
  const [liveRisk, setLiveRisk] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-cycle slides
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length);
    }, 6500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Fetch live risk for Hormuz
  useEffect(() => {
    setLoading(true);
    api.getCorridorRisk('HORMUZ')
      .then(setLiveRisk)
      .catch(() => setLiveRisk(null))
      .finally(() => setLoading(false));
  }, []);

  const goSlide = (dir: 1 | -1) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setActiveSlide((prev) => (prev + dir + SLIDES.length) % SLIDES.length);
    intervalRef.current = setInterval(() => {
      setActiveSlide((p) => (p + 1) % SLIDES.length);
    }, 6500);
  };

  const slide = SLIDES[activeSlide];
  const riskLevel = liveRisk?.risk_level || 'LOW';
  const riskColor =
    riskLevel === 'LOW' ? '#22c55e' :
    riskLevel === 'MODERATE' ? '#f59e0b' :
    riskLevel === 'HIGH' ? '#f97316' :
    '#ef4444';

  // Light mode: dark overlay on top of image (so white text stays readable)
  // Dark mode: lighter opacity overlay so image shows through
  const overlayDark = isDark
    ? 'linear-gradient(to right, rgba(4,9,20,0.92) 0%, rgba(4,9,20,0.75) 42%, rgba(4,9,20,0.10) 100%)'
    : 'linear-gradient(to right, rgba(255,255,255,0.90) 0%, rgba(255,255,255,0.72) 40%, rgba(255,255,255,0.06) 100%)';

  const overlayBottom = isDark
    ? 'linear-gradient(to top, rgba(4,9,20,0.95) 0%, transparent 50%)'
    : 'linear-gradient(to top, rgba(245,247,250,0.96) 0%, transparent 50%)';

  // text colours
  const headlineColor = isDark ? '#f8fafc' : '#0f172a';
  const subColor = isDark ? '#94a3b8' : '#374151';
  const navBg = isDark ? 'rgba(4,9,20,0.82)' : 'rgba(255,255,255,0.88)';
  const navBorder = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.1)';
  const pillBg = isDark ? 'rgba(4,9,20,0.80)' : 'rgba(255,255,255,0.88)';
  const pillBorder = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.13)';
  const pillText = isDark ? '#f1f5f9' : '#0f172a';
  const statsBg = isDark ? 'rgba(4,9,20,0.90)' : 'rgba(245,247,250,0.94)';
  const statsBorder = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.1)';
  const statsNumColor = isDark ? '#ffffff' : '#0f172a';
  const statsLabelColor = isDark ? '#e2e8f0' : '#1e293b';
  const statsSubColor = isDark ? '#64748b' : '#64748b';
  const ctaBg = isDark ? '#ffffff' : '#0f172a';
  const ctaText = isDark ? '#0f172a' : '#ffffff';

  return (
    <div className="relative w-full h-screen overflow-hidden font-manrope select-none">

      {/* ─── FULL-SCREEN SHIP BACKGROUND ─── */}
      <div className="absolute inset-0 z-0">
        <img
          src="/hero-ship.jpg"
          alt="Maritime shipping vessel"
          className="w-full h-full object-cover object-center"
          style={{ filter: isDark ? 'brightness(0.78) saturate(1.1)' : 'brightness(0.88) saturate(1.05)' }}
        />
        {/* Horizontal gradient — left side for text legibility */}
        <div className="absolute inset-0" style={{ background: overlayDark }} />
        {/* Bottom gradient — for stats bar legibility */}
        <div className="absolute bottom-0 left-0 right-0 h-48" style={{ background: overlayBottom }} />
      </div>

      {/* ─── NAVIGATION BAR ─── */}
      <nav
        className="relative z-30 flex items-center justify-between px-8 py-4 border-b backdrop-blur-md"
        style={{ backgroundColor: navBg, borderColor: navBorder }}
      >
        {/* Left: Nav Links */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              onClick={() => { setActiveNav(link.id); if (link.tab) onEnterDashboard(link.tab); }}
              className="px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer"
              style={
                activeNav === link.id
                  ? { backgroundColor: '#2563eb', color: '#ffffff' }
                  : { color: isDark ? '#94a3b8' : '#374151', backgroundColor: 'transparent' }
              }
            >
              {link.label}
            </button>
          ))}
        </div>

        {/* Center: Brand */}
        <div
          className="flex items-center gap-3 absolute left-1/2 -translate-x-1/2 cursor-pointer group"
          onClick={() => onEnterDashboard('MONITOR')}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
            <Ship className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="font-black text-sm tracking-tight font-space leading-none" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
              ENERGY RESILIENCE
            </div>
            <div className="text-blue-500 text-[9px] font-bold tracking-[0.2em] uppercase font-geist">
              INTELLIGENCE PLATFORM
            </div>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2.5">
          {/* Light / Dark Toggle */}
          <button
            onClick={onToggleTheme}
            aria-label="Toggle theme"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all cursor-pointer"
            style={{ backgroundColor: pillBg, borderColor: navBorder, color: isDark ? '#f8fafc' : '#0f172a' }}
          >
            {isDark
              ? <><Sun className="w-3.5 h-3.5 text-amber-400" /><span className="text-[11px]">Light</span></>
              : <><Moon className="w-3.5 h-3.5 text-blue-600" /><span className="text-[11px]">Dark</span></>
            }
          </button>

          {/* Live Risk Badge */}
          <div
            onClick={() => onEnterDashboard('MONITOR')}
            className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold font-geist cursor-pointer hover:opacity-90 transition"
            style={{ borderColor: riskColor + '50', backgroundColor: riskColor + '18', color: riskColor }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: riskColor }} />
            <span>HORMUZ: {loading ? '...' : riskLevel}</span>
          </div>

          {/* CTA */}
          <button
            onClick={() => onEnterDashboard('MONITOR')}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold rounded-full transition-all shadow-lg cursor-pointer hover:scale-[1.02] font-space"
          >
            <span>Enter Dashboard</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </nav>

      {/* ─── HERO CONTENT: Text floats over the image left side ─── */}
      <div className="relative z-20 flex flex-col justify-center h-full pb-32 pt-6 px-12 max-w-[52%]">
        <AnimatePresence mode="wait">
          <motion.div
            key={`slide-content-${activeSlide}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            {/* Badge */}
            <div className="mb-5">
              <span
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black text-white uppercase tracking-widest font-geist shadow-lg"
                style={{ backgroundColor: slide.badgeColor }}
              >
                <Radio className="w-3 h-3 animate-pulse" />
                {slide.badge}
              </span>
            </div>

            {/* Headline — word by word left-to-right stagger */}
            <motion.h1
              className="font-black leading-[1.07] mb-5 font-space tracking-tight"
              style={{ fontSize: 'clamp(2.4rem, 4.5vw, 3.6rem)', color: headlineColor }}
            >
              {slide.headline.map((line, li) => (
                <motion.span
                  key={li}
                  className="block"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 30 }}
                  transition={{ duration: 0.5, delay: li * 0.10, ease: [0.16, 1, 0.3, 1] }}
                >
                  {line}
                </motion.span>
              ))}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, x: -35 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.42, delay: 0.28 }}
              className="text-[15px] leading-relaxed mb-8 max-w-[460px] font-inter"
              style={{ color: subColor }}
            >
              {slide.sub}
            </motion.p>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, x: -28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 15 }}
              transition={{ duration: 0.36, delay: 0.38 }}
            >
              <button
                onClick={() => onEnterDashboard(slide.tab)}
                className="inline-flex items-center gap-2.5 font-extrabold text-sm px-7 py-3.5 rounded-full transition-all shadow-xl cursor-pointer font-space tracking-wide group hover:scale-[1.03]"
                style={{ backgroundColor: ctaBg, color: ctaText }}
              >
                {slide.cta}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </button>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─── FLOATING FEATURE PILLS — top-right over the ship ─── */}
      <div className="absolute top-24 right-8 z-20 flex flex-col gap-2.5">
        {[
          { icon: Globe2,        label: 'Real-time AIS Stream',        color: 'text-sky-400',     tab: 'MONITOR' },
          { icon: AlertTriangle, label: 'GDELT Geopolitical Feed',      color: 'text-amber-400',   tab: 'INTELLIGENCE' },
          { icon: TrendingUp,    label: '7-Day Disruption Forecast',    color: 'text-emerald-400', tab: 'TRENDS' },
          { icon: Shield,        label: 'SHAP Explainability',          color: 'text-purple-400',  tab: 'MODELS' },
        ].map((feat, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
            onClick={() => onEnterDashboard(feat.tab)}
            className="flex items-center gap-2.5 px-4 py-2 rounded-full text-[11px] font-bold font-geist cursor-pointer backdrop-blur-md border shadow-xl transition-all hover:scale-105 text-left"
            style={{ backgroundColor: pillBg, borderColor: pillBorder, color: pillText }}
          >
            <feat.icon className={`w-3.5 h-3.5 ${feat.color} shrink-0`} />
            {feat.label}
          </motion.button>
        ))}
      </div>

      {/* ─── BOTTOM STATS + SLIDE CONTROLS ─── */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div
          className="flex items-stretch border-t"
          style={{ backgroundColor: statsBg, borderColor: statsBorder }}
        >
          {STATS.map((stat, i) => (
            <button
              key={i}
              onClick={() => onEnterDashboard(stat.tab)}
              className={`flex-1 px-6 py-4 text-left cursor-pointer hover:opacity-80 transition ${
                i < STATS.length - 1 ? 'border-r' : ''
              }`}
              style={{ borderColor: statsBorder }}
            >
              <div className="text-3xl font-black font-space leading-none" style={{ color: statsNumColor }}>{stat.value}</div>
              <div className="text-xs font-bold mt-1 font-inter" style={{ color: statsLabelColor }}>{stat.label}</div>
              <div className="text-[10px] mt-0.5 font-geist" style={{ color: statsSubColor }}>{stat.sub}</div>
            </button>
          ))}

          {/* Slide Controls */}
          <div className="flex items-center gap-3 px-6 border-l" style={{ borderColor: statsBorder }}>
            <button
              onClick={() => goSlide(-1)}
              className="w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer hover:scale-110"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)', color: isDark ? '#ffffff' : '#0f172a' }}
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => goSlide(1)}
              className="w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer hover:scale-110"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)', color: isDark ? '#ffffff' : '#0f172a' }}
            >
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Slide counter + bar */}
            <div className="flex items-center gap-2">
              <div className="w-14 h-1 rounded-full overflow-hidden" style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' }}>
                <motion.div
                  className="h-full bg-blue-600 rounded-full"
                  animate={{ width: `${((activeSlide + 1) / SLIDES.length) * 100}%` }}
                  transition={{ duration: 0.35 }}
                />
              </div>
              <span className="text-xs font-bold font-geist" style={{ color: statsSubColor }}>
                0{activeSlide + 1} / 0{SLIDES.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SLIDE INDICATOR DOTS (bottom-left, above stats bar) ─── */}
      <div className="absolute bottom-[78px] left-12 z-20 flex gap-2">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => { if (intervalRef.current) clearInterval(intervalRef.current); setActiveSlide(i); }}
            className="transition-all cursor-pointer rounded-full"
            style={{
              width: i === activeSlide ? '28px' : '6px',
              height: '6px',
              backgroundColor: i === activeSlide ? '#2563eb' : isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.28)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
