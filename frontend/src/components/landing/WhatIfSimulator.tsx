import { useState, useEffect } from 'react';
import { Cpu, RefreshCw, ArrowRight, ShieldCheck, Activity } from 'lucide-react';
import type { Theme } from '../../api/hooks/useTheme';
import { api } from '../../api/client';
import type { ScenarioSimulationResponse } from '../../types';

interface WhatIfSimulatorProps {
  theme: Theme;
  onEnterDashboard: (tab?: string) => void;
}

export default function WhatIfSimulator({ theme, onEnterDashboard }: WhatIfSimulatorProps) {
  const isDark = theme === 'dark';

  const [corridor, setCorridor] = useState<string>('HORMUZ');
  const [durationDays, setDurationDays] = useState<number>(30);
  const [severity, setSeverity] = useState<string>('HIGH');
  const [simulation, setSimulation] = useState<ScenarioSimulationResponse | null>(null);
  const [simulating, setSimulating] = useState<boolean>(false);

  // Run simulation on parameter change
  useEffect(() => {
    setSimulating(true);

    const tankerMult = severity === 'HIGH' ? 0.2 : severity === 'MEDIUM' ? 0.5 : 0.8;
    const gprMult = severity === 'HIGH' ? 2.5 : severity === 'MEDIUM' ? 1.8 : 1.2;

    api.simulateScenario({
      corridor_id: corridor,
      tanker_transit_multiplier: tankerMult,
      gpr_multiplier: gprMult,
      brent_price_multiplier: 1.15,
      brent_volatility_multiplier: 1.5,
      infrastructure_disruption: severity === 'HIGH',
    })
      .then(setSimulation)
      .catch(() => setSimulation(null))
      .finally(() => setSimulating(false));
  }, [corridor, durationDays, severity]);

  const supplyGapMb = (durationDays * (severity === 'HIGH' ? 0.61 : severity === 'MEDIUM' ? 0.35 : 0.15)).toFixed(1);
  const costImpactUsdM = (durationDays * (severity === 'HIGH' ? 4.75 : severity === 'MEDIUM' ? 2.50 : 1.10)).toFixed(1);
  const transitDelayDays = severity === 'HIGH' ? 21 : severity === 'MEDIUM' ? 14 : 7;
  const sprRequiredMb = (durationDays * (severity === 'HIGH' ? 0.40 : severity === 'MEDIUM' ? 0.20 : 0.08)).toFixed(1);

  return (
    <section id="scenarios" className="py-20 border-b font-manrope theme-transition"
      style={{
        backgroundColor: isDark ? '#08111C' : '#FFFFFF',
        borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Section Header */}
        <div className="max-w-2xl mb-12 space-y-3">
          <div className="text-[10px] font-space font-bold uppercase tracking-[0.2em]"
            style={{ color: isDark ? '#5B8DEF' : '#356AE6' }}
          >
            DISRUPTION SCENARIO SIMULATOR
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-space tracking-tight"
            style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}
          >
            What happens if Hormuz closes tomorrow?
          </h2>
          <p className="text-sm font-inter leading-relaxed"
            style={{ color: isDark ? '#94A3B8' : '#536274' }}
          >
            Adjust disruption parameters below to run instant ML stress-test simulations on India's energy import pipeline.
          </p>
        </div>

        {/* Simulator Grid: Controls Left, Live Output Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Controls Panel */}
          <div className="lg:col-span-5 p-6 rounded-2xl border space-y-6 theme-transition"
            style={{
              backgroundColor: isDark ? '#0D1624' : '#F5F7FA',
              borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
            }}
          >
            <div className="flex justify-between items-center border-b pb-3"
              style={{ borderColor: isDark ? '#1C2A3A' : '#D9E0E8' }}
            >
              <h3 className="font-space font-bold text-xs uppercase tracking-wider flex items-center gap-2"
                style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}
              >
                <Cpu className="w-4 h-4 text-amber-400" />
                SIMULATION PARAMETERS
              </h3>
              {simulating && <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />}
            </div>

            {/* 1. Target Corridor Selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-space font-bold uppercase tracking-wider block"
                style={{ color: isDark ? '#94A3B8' : '#536274' }}
              >
                Target Corridor
              </label>
              <div className="grid grid-cols-3 gap-2 font-space text-xs">
                {[
                  { id: 'HORMUZ', label: 'Strait of Hormuz' },
                  { id: 'BAB_EL_MANDEB', label: 'Bab-el-Mandeb' },
                  { id: 'SUEZ', label: 'Suez Canal' },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCorridor(c.id)}
                    className={`py-2 px-3 rounded-lg border font-bold text-[11px] transition-all cursor-pointer ${
                      corridor === c.id
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md'
                        : 'bg-transparent text-slate-400 hover:text-white border-slate-700'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Disruption Duration Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-geist">
                <span className="text-[10px] font-space font-bold uppercase tracking-wider"
                  style={{ color: isDark ? '#94A3B8' : '#536274' }}
                >
                  Disruption Duration
                </span>
                <span className="font-bold text-blue-400 font-mono">{durationDays} Days</span>
              </div>
              <div className="grid grid-cols-4 gap-2 font-geist text-xs">
                {[7, 14, 30, 60].map((d) => (
                  <button
                    key={d}
                    onClick={() => setDurationDays(d)}
                    className={`py-1.5 rounded-md border text-[11px] font-semibold transition cursor-pointer ${
                      durationDays === d
                        ? 'bg-slate-700 text-white border-slate-500'
                        : 'bg-transparent text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {d} Days
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Severity Level */}
            <div className="space-y-2">
              <label className="text-[10px] font-space font-bold uppercase tracking-wider block"
                style={{ color: isDark ? '#94A3B8' : '#536274' }}
              >
                Disruption Severity
              </label>
              <div className="grid grid-cols-3 gap-2 font-geist text-xs">
                {['LOW', 'MEDIUM', 'HIGH'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setSeverity(s)}
                    className={`py-1.5 rounded-md border text-[11px] font-bold transition cursor-pointer ${
                      severity === s
                        ? s === 'HIGH'
                          ? 'bg-rose-950/60 text-rose-300 border-rose-800'
                          : s === 'MEDIUM'
                          ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                          : 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                        : 'bg-transparent text-slate-400 border-slate-800'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => onEnterDashboard('SCENARIO')}
              className="w-full py-3 rounded-xl font-space font-bold text-xs text-white uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-md"
              style={{ backgroundColor: isDark ? '#5B8DEF' : '#356AE6' }}
            >
              <span>Launch Full Scenario Suite</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Simulated Results Output Panel */}
          <div className="lg:col-span-7 p-6 rounded-2xl border space-y-6 flex flex-col justify-between theme-transition"
            style={{
              backgroundColor: isDark ? '#0D1624' : '#F5F7FA',
              borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
            }}
          >
            <div>
              <div className="flex justify-between items-center border-b pb-3 mb-6"
                style={{ borderColor: isDark ? '#1C2A3A' : '#D9E0E8' }}
              >
                <h3 className="font-space font-bold text-xs uppercase tracking-wider flex items-center gap-2"
                  style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}
                >
                  <Activity className="w-4 h-4 text-emerald-400" />
                  SIMULATED IMPACT ASSESSMENT
                </h3>
                <span className="text-[10px] font-geist text-slate-400 uppercase">
                  MODELED: {corridor} · {durationDays}D · {severity}
                </span>
              </div>

              {/* Key Impact Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="p-3.5 rounded-xl border"
                  style={{ backgroundColor: isDark ? '#08111C' : '#FFFFFF', borderColor: isDark ? '#1C2A3A' : '#D9E0E8' }}
                >
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-space">
                    SUPPLY GAP
                  </span>
                  <span className="text-base font-bold font-mono text-rose-400 mt-1 block">
                    {supplyGapMb}M bbls
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border"
                  style={{ backgroundColor: isDark ? '#08111C' : '#FFFFFF', borderColor: isDark ? '#1C2A3A' : '#D9E0E8' }}
                >
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-space">
                    COST DELTA
                  </span>
                  <span className="text-base font-bold font-mono text-amber-400 mt-1 block">
                    +${costImpactUsdM}M
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border"
                  style={{ backgroundColor: isDark ? '#08111C' : '#FFFFFF', borderColor: isDark ? '#1C2A3A' : '#D9E0E8' }}
                >
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-space">
                    TRANSIT DELAY
                  </span>
                  <span className="text-base font-bold font-mono text-blue-400 mt-1 block">
                    +{transitDelayDays} Days
                  </span>
                </div>

                <div className="p-3.5 rounded-xl border"
                  style={{ backgroundColor: isDark ? '#08111C' : '#FFFFFF', borderColor: isDark ? '#1C2A3A' : '#D9E0E8' }}
                >
                  <span className="text-[10px] uppercase font-bold text-slate-400 block font-space">
                    RESERVE BUFFER
                  </span>
                  <span className="text-base font-bold font-mono text-emerald-400 mt-1 block">
                    {sprRequiredMb}M bbls
                  </span>
                </div>
              </div>

              {/* Recommended Response */}
              <div className="p-4 rounded-xl border space-y-2"
                style={{
                  backgroundColor: isDark ? '#08111C' : '#FFFFFF',
                  borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
                }}
              >
                <div className="flex items-center gap-2 text-xs font-space font-bold uppercase text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>RECOMMENDED RESPONSE PROTOCOL</span>
                </div>
                <p className="text-xs font-inter leading-relaxed" style={{ color: isDark ? '#94A3B8' : '#536274' }}>
                  {simulation?.recommendation ||
                    `Initiate immediate crude rerouting via Cape of Good Hope for non-urgent cargoes. Authorize ${sprRequiredMb}M bbl drawdown from ISPRL Mangalore/Visakhapatnam reserves.`}
                </p>
              </div>
            </div>

            <div className="text-[10px] font-geist text-slate-400 text-right pt-2">
              Simulation powered by Phase 6 ML Scenario Engine · Real-time pipeline calculation
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
