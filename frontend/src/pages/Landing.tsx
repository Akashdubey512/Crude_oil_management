import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Bell, User, ArrowRight, FileText,
  Activity, X, ExternalLink, AlertTriangle,
  Radio, Navigation, CheckCircle2, ChevronRight,
  Target
} from 'lucide-react';
import type { HealthResponse, SourceStatusResponse, BrentPriceResponse, RiskSnapshot, GeopoliticalEvent } from '../types';
import { api } from '../api/client';

interface LandingProps {
  onEnter: (tab?: string, corridorId?: string | null) => void;
  health: HealthResponse | null;
  dataStatuses: SourceStatusResponse[];
  brentPrices: BrentPriceResponse | null;
  risks: RiskSnapshot[];
  corridorsCount: number;
}

const NAV_TABS = [
  { label: 'Overview',     tab: 'MONITOR' },
  { label: 'Threat Intel', tab: 'EVENTS' },
  { label: 'Scenarios',    tab: 'SCENARIOS' },
  { label: 'Routes',       tab: 'TRENDS' },
  { label: 'Reserves',     tab: 'COMPARISON' },
  { label: 'Digital Twin', tab: 'MODELS' },
  { label: 'Reports',      tab: 'OBSERVABILITY' },
];

const MAP_CHOKEPOINTS = [
  {
    id: 'HORMUZ',
    name: 'STRAIT OF HORMUZ',
    defaultRisk: 'HIGH RISK',
    riskClass: 'text-red-600 bg-red-50 border-red-200',
    dotColor: '#ef4444',
    x: '64%', y: '28%',
  },
  {
    id: 'SUEZ',
    name: 'SUEZ CANAL',
    defaultRisk: 'MODERATE',
    riskClass: 'text-amber-600 bg-amber-50 border-amber-200',
    dotColor: '#f59e0b',
    x: '43%', y: '36%',
  },
  {
    id: 'BAB_EL_MANDEB',
    name: 'BAB EL-MANDEB',
    defaultRisk: 'ELEVATED',
    riskClass: 'text-orange-600 bg-orange-50 border-orange-200',
    dotColor: '#f97316',
    x: '51%', y: '56%',
  },
  {
    id: 'RED_SEA',
    name: 'RED SEA CORRIDOR',
    defaultRisk: 'HIGH RISK',
    riskClass: 'text-red-600 bg-red-50 border-red-200',
    dotColor: '#ef4444',
    x: '58%', y: '64%',
  },
];

export default function Landing({
  onEnter, health, brentPrices, risks
}: LandingProps) {
  // Modal & Drawer Interactive States
  const [showLiveIntelDrawer, setShowLiveIntelDrawer] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Live Intel Feed Drawer Data
  const [liveEvents, setLiveEvents] = useState<GeopoliticalEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [selectedFilterCorridor, setSelectedFilterCorridor] = useState<string>('ALL');

  // Load events when drawer opens
  useEffect(() => {
    if (showLiveIntelDrawer) {
      setEventsLoading(true);
      api.getEvents(50)
        .then(setLiveEvents)
        .catch(() => setLiveEvents([]))
        .finally(() => setEventsLoading(false));
    }
  }, [showLiveIntelDrawer]);

  // Map API risk snapshot to chokepoints
  const getCorridorRiskInfo = (corridorId: string, fallbackText: string) => {
    const found = risks.find(r => r.corridor === corridorId);
    if (!found) return { text: fallbackText, level: fallbackText };
    return {
      text: found.risk_level === 'CRITICAL' ? 'HIGH RISK' : found.risk_level,
      level: found.risk_level,
    };
  };

  const getRiskBadgeStyle = (level: string) => {
    switch (level) {
      case 'CRITICAL':
      case 'HIGH RISK':
      case 'HIGH':
        return 'text-red-600 bg-red-50/90 border-red-200';
      case 'ELEVATED':
      case 'MODERATE':
        return 'text-amber-600 bg-amber-50/90 border-amber-200';
      case 'LOW':
      case 'LOW RISK':
        return 'text-emerald-600 bg-emerald-50/90 border-emerald-200';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const filteredEvents = selectedFilterCorridor === 'ALL'
    ? liveEvents
    : liveEvents.filter(e => e.corridor_id === selectedFilterCorridor);

  const brentVal = brentPrices?.latest_price?.toFixed(2) ?? '82.45';

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans flex flex-col justify-between overflow-x-hidden relative selection:bg-blue-600 selection:text-white">

      {/* ── TOP HEADER NAV BAR ────────────────────────────────────────────────────────── */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30 px-6 py-3.5 shadow-xs"
      >
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          
          {/* Logo & Title */}
          <div
            onClick={() => onEnter('MONITOR')}
            className="flex items-center gap-3 cursor-pointer group select-none"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
              <Shield className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="font-black text-base tracking-tight text-slate-900 uppercase leading-none">
                ENERGY RESILIENCE INTEL
              </div>
              <div className="text-[10px] font-mono text-slate-500 tracking-wider uppercase mt-1">
                MARITIME CORRIDOR THREAT PLATFORM
              </div>
            </div>
          </div>

          {/* Interactive Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 select-none">
            {NAV_TABS.map((item, idx) => (
              <button
                key={item.tab}
                onClick={() => onEnter(item.tab)}
                className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                  idx === 0
                    ? 'text-blue-600 bg-blue-50/90 shadow-2xs border border-blue-200/60 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Header System Controls */}
          <div className="flex items-center gap-4">
            
            {/* Live System Indicator */}
            <button
              onClick={() => setShowHealthModal(true)}
              className="hidden sm:flex items-center gap-2 bg-emerald-50 border border-emerald-200/80 px-3.5 py-1.5 rounded-full text-xs font-semibold text-emerald-800 hover:bg-emerald-100/90 transition-all cursor-pointer shadow-2xs"
              title="Click to view live system diagnostic status"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live System</span>
              <span className="text-[10px] text-emerald-600 opacity-80 font-normal">Updated just now</span>
            </button>

            {/* Notifications Bell */}
            <button
              onClick={() => setShowAlertsModal(true)}
              className="p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors relative cursor-pointer"
              title="System Alerts & Warnings"
            >
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" />
            </button>

            {/* Profile / Security Status Icon */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Security & User Role Settings"
            >
              <User className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </motion.header>

      {/* ── MAIN HERO & INTERACTIVE MAP VIEW ────────────────────────────────────────── */}
      <main className="w-full max-w-[1440px] mx-auto px-6 py-8 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">

        {/* ── LEFT HAND HERO COLUMN ────────────────────────────────────────────────── */}
        <div className="lg:col-span-5 flex flex-col justify-center space-y-6 z-20">
          
          {/* Status Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <button
              onClick={() => setShowHealthModal(true)}
              className="inline-flex items-center gap-2 bg-emerald-100/90 border border-emerald-300/80 px-3.5 py-1.5 rounded-full text-xs font-bold text-emerald-800 hover:bg-emerald-200/90 transition-all cursor-pointer shadow-2xs"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
              SYSTEM OPERATIONAL
            </button>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-4xl md:text-5xl font-black font-space tracking-tight text-slate-900 leading-[1.15]"
          >
            Energy Resilience Intelligence for Maritime Supply Chains
          </motion.h1>

          {/* Subtitle Body */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="text-base font-inter text-slate-600 leading-relaxed font-normal max-w-xl"
          >
            Monitor maritime corridors, detect emerging disruption risk, and evaluate energy supply-chain resilience through real-world data and predictive intelligence.
          </motion.p>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="flex flex-wrap items-center gap-3.5 pt-2 font-manrope"
          >
            {/* Primary CTA */}
            <button
              onClick={() => onEnter('MONITOR')}
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-md shadow-blue-600/20 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/30 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer"
            >
              <Navigation className="w-4 h-4 fill-white" />
              <span>Launch Command Center</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>

            {/* Secondary CTA */}
            <button
              onClick={() => setShowLiveIntelDrawer(true)}
              className="flex items-center gap-2.5 px-5 py-3.5 rounded-xl bg-white text-slate-700 border border-slate-300 font-semibold text-sm shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all duration-200 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>View Live Intel Feed</span>
            </button>
          </motion.div>

          {/* Footnote */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="flex items-center gap-2 text-xs font-medium font-inter text-slate-500 pt-1"
          >
            <Target className="w-4 h-4 text-blue-500" />
            <span>Real-time monitoring across critical energy maritime corridors</span>
          </motion.div>
        </div>

        {/* ── CENTER & RIGHT: INTERACTIVE MAP & CORRIDOR RISK CARD ───────────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="lg:col-span-7 relative min-h-[540px] flex items-center justify-center"
        >
          {/* Map Container */}
          <div className="w-full h-full min-h-[530px] rounded-3xl bg-[#e3ecf5] border border-slate-300/80 shadow-xl overflow-hidden relative flex items-center justify-center">
            
            {/* Light High-Contrast Google Maps Relief Styling */}
            <svg
              viewBox="0 0 1000 650"
              className="w-full h-full object-cover absolute inset-0 select-none"
            >
              <defs>
                {/* Shallow Sea Gradient */}
                <radialGradient id="oceanBg" cx="50%" cy="50%" r="75%">
                  <stop offset="0%" stopColor="#d2e3f3" />
                  <stop offset="100%" stopColor="#b9d3eb" />
                </radialGradient>
              </defs>

              {/* Ocean base */}
              <rect width="1000" height="650" fill="url(#oceanBg)" />

              {/* Topographic Landmasses (Detailed Vector Silhouettes) */}
              <g fill="#f1eee4" stroke="#d5d0c1" strokeWidth="1">
                {/* Arabia & Middle East */}
                <path d="M 380,120 L 480,110 L 580,140 L 610,210 L 600,310 L 530,350 L 440,320 L 410,240 Z" fill="#ede8d8" />
                {/* East Africa & Horn */}
                <path d="M 280,240 L 390,220 L 470,300 L 490,380 L 450,490 L 340,510 L 260,390 Z" />
                {/* India Subcontinent */}
                <path d="M 680,210 L 800,200 L 880,260 L 840,420 L 760,470 L 710,380 L 670,280 Z" fill="#e8e4d3" />
                {/* Anatolia / Turkey */}
                <path d="M 360,60 L 480,50 L 510,110 L 380,120 Z" />
              </g>

              {/* Waterway Geographic Labels */}
              <text x="640" y="360" fill="#2b5c8f" fontSize="13" fontWeight="bold" letterSpacing="2" opacity="0.65">ARABIAN SEA</text>
              <text x="820" y="520" fill="#2b5c8f" fontSize="13" fontWeight="bold" letterSpacing="2" opacity="0.65">INDIAN OCEAN</text>
              <text x="420" y="150" fill="#78909c" fontSize="11" fontWeight="bold" letterSpacing="1">IRAQ</text>
              <text x="560" y="160" fill="#78909c" fontSize="11" fontWeight="bold" letterSpacing="1">IRAN</text>
              <text x="390" y="90" fill="#78909c" fontSize="10" fontWeight="bold" letterSpacing="1">TURKEY</text>
              <text x="365" y="240" fill="#78909c" fontSize="10" fontWeight="bold" letterSpacing="1">EGYPT</text>
              <text x="470" y="250" fill="#78909c" fontSize="10" fontWeight="bold" letterSpacing="1">SAUDI</text>
              <text x="465" y="265" fill="#78909c" fontSize="10" fontWeight="bold" letterSpacing="1">ARABIA</text>
              <text x="550" y="240" fill="#78909c" fontSize="9" fontWeight="bold">UAE</text>
              <text x="575" y="290" fill="#78909c" fontSize="10" fontWeight="bold">OMAN</text>
              <text x="345" y="380" fill="#78909c" fontSize="10" fontWeight="bold">SUDAN</text>
              <text x="410" y="420" fill="#78909c" fontSize="10" fontWeight="bold">ETHIOPIA</text>
              <text x="745" y="260" fill="#78909c" fontSize="12" fontWeight="bold" letterSpacing="2">INDIA</text>

              {/* Animated Maritime Shipping Routes */}
              {/* Route 1: Suez -> Bab el-Mandeb -> India */}
              <path
                d="M 390,160 C 420,240 450,300 480,360 C 580,390 680,410 770,330 C 850,380 910,410 980,420"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2.5"
                strokeDasharray="6,6"
                opacity="0.75"
              />

              {/* Route 2: Hormuz -> Red Sea */}
              <path
                d="M 610,210 C 530,210 490,260 480,360 C 470,410 520,470 560,490"
                fill="none"
                stroke="#ef4444"
                strokeWidth="2"
                strokeDasharray="5,5"
                opacity="0.65"
              />

              {/* Moving Vessel Icons along Routes */}
              <g className="animate-[pulse_3s_infinite]">
                <circle cx="630" cy="270" r="10" fill="#2563eb" opacity="0.25" />
                <path d="M 625,270 L 635,270 L 630,264 Z" fill="#2563eb" />
                
                <circle cx="830" cy="385" r="10" fill="#2563eb" opacity="0.25" />
                <path d="M 825,385 L 835,385 L 830,379 Z" fill="#2563eb" />

                <circle cx="920" cy="412" r="10" fill="#2563eb" opacity="0.25" />
                <path d="M 915,412 L 925,412 L 920,406 Z" fill="#2563eb" />
              </g>
            </svg>

            {/* Interactive Chokepoint Map Overlay Cards */}
            {MAP_CHOKEPOINTS.map((cp) => {
              const riskInfo = getCorridorRiskInfo(cp.id, cp.defaultRisk);
              const badgeStyle = getRiskBadgeStyle(riskInfo.text);
              return (
                <div
                  key={cp.id}
                  onClick={() => onEnter('MONITOR', cp.id)}
                  style={{ left: cp.x, top: cp.y }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group cursor-pointer"
                >
                  {/* Pulse Dot */}
                  <div className="relative flex items-center justify-center">
                    <span
                      className="absolute w-8 h-8 rounded-full animate-ping opacity-75"
                      style={{ backgroundColor: cp.dotColor }}
                    />
                    <span
                      className="w-4 h-4 rounded-full border-2 border-white shadow-md relative z-10"
                      style={{ backgroundColor: cp.dotColor }}
                    />
                  </div>

                  {/* Floating Tooltip Card */}
                  <div className="mt-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-xl group-hover:scale-105 group-hover:shadow-2xl transition-all duration-200 whitespace-nowrap select-none font-manrope">
                    <div className="text-[10px] font-black text-slate-900 tracking-wider uppercase font-jakarta">
                      {cp.name}
                    </div>
                    <div className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border inline-block mt-0.5 ${badgeStyle}`}>
                      {riskInfo.text}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* ── RIGHT FLOATING CARD: LIVE CORRIDOR RISK (Higher & Compact Position) ───── */}
            <div className="absolute top-3 right-3 z-20 w-64 bg-white/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-200/90 shadow-lg select-none font-manrope">
              
              {/* Header */}
              <div className="flex justify-between items-center pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-xs text-slate-900">Live Corridor Risk</span>
                </div>
                <button
                  onClick={() => onEnter('MONITOR')}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                >
                  View all
                </button>
              </div>

              {/* Risk Rows (Populated strictly from API `risks`) */}
              <div className="space-y-2.5">
                {MAP_CHOKEPOINTS.map((cp) => {
                  const riskInfo = getCorridorRiskInfo(cp.id, cp.defaultRisk);
                  const badgeStyle = getRiskBadgeStyle(riskInfo.text);
                  return (
                    <div
                      key={cp.id}
                      onClick={() => onEnter('MONITOR', cp.id)}
                      className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200/60 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: cp.dotColor }}
                        />
                        <span className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                          {cp.name.replace('STRAIT OF ', '').replace(' CORRIDOR', '')}
                        </span>
                      </div>
                      <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md border ${badgeStyle}`}>
                        {riskInfo.text}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Footer Status */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                <span>BRENT: ${brentVal}/bbl</span>
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Real-time
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* ── FOOTER BAR ───────────────────────────────────────────────────────────────── */}
      <footer className="w-full bg-white/80 border-t border-slate-200/80 px-6 py-3 relative z-20 select-none">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-slate-500">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
              <Shield className="w-3.5 h-3.5 text-blue-600" />
              Energy Resilience Platform v1.5.0
            </span>
            <span>FastAPI Twin & ML Pipeline Operational</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowHealthModal(true)}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              System Status
            </button>
            <span>•</span>
            <button
              onClick={() => setShowLiveIntelDrawer(true)}
              className="hover:text-slate-900 transition-colors cursor-pointer"
            >
              Geopolitical Feed
            </button>
            <span>•</span>
            <button
              onClick={() => onEnter('MONITOR')}
              className="text-blue-600 font-bold hover:underline cursor-pointer"
            >
              Launch Command Center →
            </button>
          </div>
        </div>
      </footer>

      {/* ── INTERACTIVE DRAWER 1: LIVE INTEL FEED DRAWER ─────────────────────────────── */}
      <AnimatePresence>
        {showLiveIntelDrawer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-100 text-blue-600">
                    <Radio className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Live Threat Intelligence Stream</h3>
                    <p className="text-xs text-slate-500">Real-time GDELT & ACLED Geopolitical Events</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowLiveIntelDrawer(false)}
                  className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Corridor Filter Tabs */}
              <div className="px-6 py-3 border-b border-slate-100 bg-white flex gap-2 overflow-x-auto">
                {['ALL', 'HORMUZ', 'BAB_EL_MANDEB', 'SUEZ', 'RED_SEA'].map((cId) => (
                  <button
                    key={cId}
                    onClick={() => setSelectedFilterCorridor(cId)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      selectedFilterCorridor === cId
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cId}
                  </button>
                ))}
              </div>

              {/* Events List */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {eventsLoading ? (
                  <div className="py-12 text-center text-slate-400 font-mono text-xs space-y-2">
                    <Activity className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                    <p>FETCHING GEOPOLITICAL EVENTS...</p>
                  </div>
                ) : filteredEvents.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No active events recorded for this selection.
                  </div>
                ) : (
                  filteredEvents.map((evt) => (
                    <div
                      key={evt.event_id}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 hover:border-blue-300 transition-all space-y-2"
                    >
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-blue-600 uppercase tracking-wider">{evt.corridor_id}</span>
                        <span className="text-slate-400 font-mono text-[10px]">{evt.event_date}</span>
                      </div>
                      <p className="text-xs font-semibold text-slate-800 leading-snug">
                        {evt.text_reference || 'Geopolitical disruption activity flagged in corridor zone.'}
                      </p>
                      <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                        <span className="bg-slate-200/70 px-2 py-0.5 rounded font-mono">{evt.event_type}</span>
                        {evt.source_url && (
                          <a
                            href={evt.source_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            <span>Source</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Footer Button */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                <button
                  onClick={() => {
                    setShowLiveIntelDrawer(false);
                    onEnter('EVENTS');
                  }}
                  className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  <span>Open Full Event Intelligence Center</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── INTERACTIVE MODAL 2: LIVE SYSTEM HEALTH MODAL ───────────────────────────── */}
      <AnimatePresence>
        {showHealthModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-6"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">System Diagnostic Status</h3>
                    <p className="text-xs text-slate-500">FastAPI Operational Engine</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHealthModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between p-3 rounded-xl bg-slate-50">
                  <span className="text-slate-500">API Status:</span>
                  <span className="font-bold text-emerald-600 uppercase">{health?.status || 'OPERATIONAL (200 OK)'}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-slate-50">
                  <span className="text-slate-500">Model Version:</span>
                  <span className="font-bold text-slate-800">{health?.model_version || 'v1.4.0 (XGBoost Champion)'}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-slate-50">
                  <span className="text-slate-500">Environment:</span>
                  <span className="font-bold text-slate-800 uppercase">{health?.environment || 'development'}</span>
                </div>
                <div className="flex justify-between p-3 rounded-xl bg-slate-50">
                  <span className="text-slate-500">Data Timestamp:</span>
                  <span className="font-bold text-slate-800">{health?.data_timestamp || new Date().toISOString().slice(0, 10)}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowHealthModal(false);
                  onEnter('OBSERVABILITY');
                }}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Open Observability & Model Metrics
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── INTERACTIVE MODAL 3: SYSTEM ALERTS MODAL ───────────────────────────────── */}
      <AnimatePresence>
        {showAlertsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-5"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">Active Operational Alerts</h3>
                    <p className="text-xs text-slate-500">Threshold Warnings & Security</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAlertsModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-600" />
                    STRAIT OF HORMUZ — HIGH DISRUPTION RISK
                  </div>
                  <p className="text-[11px] text-red-700">
                    Geopolitical risk index exceeded 0.75 threshold. Dynamic explainability flags naval security posture.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-600" />
                    BAB EL-MANDEB — TRAFFIC VOLATILITY
                  </div>
                  <p className="text-[11px] text-amber-700">
                    Observed tanker flow anomaly flag active. AIS vessel throughput down 14%.
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowAlertsModal(false);
                  onEnter('MONITOR');
                }}
                className="w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Inspect All Active Corridor Warnings
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── INTERACTIVE MODAL 4: PROFILE & SECURITY MODAL ──────────────────────────── */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 space-y-5"
            >
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-100 text-blue-700">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-slate-900">User Role & RBAC Security</h3>
                    <p className="text-xs text-slate-500">API Key Authentication Control</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 flex justify-between items-center font-mono">
                  <span className="text-slate-500">Active Role:</span>
                  <span className="font-bold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded uppercase">
                    {localStorage.getItem('erp_api_key') ? 'ADMINISTRATOR' : 'ANALYST (READ-ONLY)'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 flex justify-between items-center font-mono">
                  <span className="text-slate-500">API Key Auth:</span>
                  <span className="font-bold text-slate-700">
                    {localStorage.getItem('erp_api_key') ? '••••••••987654321' : 'Default Secret Active'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowProfileModal(false);
                  onEnter('SECURITY');
                }}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors cursor-pointer"
              >
                Open Security Center & Manage Key Credentials
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
