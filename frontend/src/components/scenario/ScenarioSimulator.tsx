import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sliders, RefreshCw, AlertTriangle, HelpCircle, ArrowRight } from 'lucide-react';
import { api } from '../../api/client';
import type { Corridor, ScenarioSimulationResponse } from '../../types';
import ReserveDrawdownChart from '../charts/ReserveDrawdownChart';

interface ScenarioSimulatorProps {
  corridors: Corridor[];
}

/* ------------ helper: semantic risk class for a level string ------------ */
function riskLevelClass(level: string | null | undefined) {
  switch (level) {
    case 'LOW':      return 'low';
    case 'MODERATE': return 'moderate';
    case 'HIGH':     return 'high';
    case 'CRITICAL': return 'critical';
    default:         return 'moderate';
  }
}

export default function ScenarioSimulator({ corridors }: ScenarioSimulatorProps) {
  const [simCorridor, setSimCorridor] = useState<string>('HORMUZ');
  const [simTransit, setSimTransit] = useState<number>(1.0);
  const [simGpr, setSimGpr] = useState<number>(1.0);
  const [simPrice, setSimPrice] = useState<number>(1.0);
  const [simVol, setSimVol] = useState<number>(1.0);
  const [simInfra, setSimInfra] = useState<boolean>(false);
  const [simSprBuffer, setSimSprBuffer] = useState<number>(9.5);
  const [simStrategy, setSimStrategy] = useState<string>('front_loaded');
  const [simResult, setSimResult] = useState<ScenarioSimulationResponse | null>(null);
  const [simulating, setSimulating] = useState<boolean>(false);
  const [simError, setSimError] = useState<string | null>(null);

  const handleRunSimulation = async () => {
    setSimulating(true);
    setSimError(null);
    try {
      const res = await api.simulateScenario({
        corridor_id: simCorridor,
        tanker_transit_multiplier: simTransit,
        gpr_multiplier: simGpr,
        brent_price_multiplier: simPrice,
        brent_volatility_multiplier: simVol,
        infrastructure_disruption: simInfra,
        spr_buffer_days: simSprBuffer,
        drawdown_strategy: simStrategy,
      });
      setSimResult(res);
    } catch (err: any) {
      setSimError(err.message || 'Simulation execution failed.');
      setSimResult(null);
    } finally {
      setSimulating(false);
    }
  };

  const delta = simResult ? simResult.probability_delta : 0;
  const isDeltaPositive = delta > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 select-none font-manrope">

      {/* ── LEFT: Simulation Inputs ───────────────────────────── */}
      <div className="lg:col-span-5 space-y-4">
        <div className="navy-card p-5 space-y-4">

          {/* Header */}
          <div
            className="flex items-center gap-2 pb-3 border-b"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <Sliders className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            <h3
              className="text-xs font-bold tracking-wider uppercase font-space"
              style={{ color: 'var(--text-primary)' }}
            >
              Simulation Inputs
            </h3>
          </div>

          {/* Corridor Selection */}
          <div className="space-y-1.5">
            <label
              className="text-[10px] font-bold uppercase tracking-wider font-jakarta block"
              style={{ color: 'var(--text-muted)' }}
            >
              Target Corridor
            </label>
            <select
              value={simCorridor}
              onChange={(e) => setSimCorridor(e.target.value)}
              className="theme-select w-full"
            >
              {corridors.map((c) => (
                <option key={c.corridor_id} value={c.corridor_id}>
                  {c.name} {c.corridor_id === 'RED_SEA' ? '(PROXY)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Slider rows */}
          {[
            {
              label: 'Tanker Flow Multiplier',
              value: simTransit, setter: setSimTransit,
              min: 0.1, max: 2.0, step: 0.1,
              isAmber: false,
            },
            {
              label: 'Geopolitical Risk Multiplier',
              value: simGpr, setter: setSimGpr,
              min: 0.1, max: 3.0, step: 0.1,
              isAmber: true,
            },
            {
              label: 'Brent Price Multiplier',
              value: simPrice, setter: setSimPrice,
              min: 0.5, max: 2.5, step: 0.1,
              isAmber: false,
            },
            {
              label: 'Brent Volatility Multiplier',
              value: simVol, setter: setSimVol,
              min: 0.5, max: 3.0, step: 0.1,
              isAmber: true,
            },
          ].map(({ label, value, setter, min, max, step, isAmber }) => (
            <div key={label} className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium font-geist">
                <span
                  className="uppercase text-[10px] font-jakarta"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {label}
                </span>
                <span
                  className="font-bold"
                  style={{ color: isAmber ? 'var(--accent-amber)' : 'var(--accent)' }}
                >
                  {value.toFixed(2)}x
                </span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => setter(parseFloat(e.target.value))}
                className={`theme-range w-full ${isAmber ? 'amber-range' : ''}`}
              />
            </div>
          ))}

          {/* Infrastructure Stress */}
          <div
            className="flex items-center justify-between pt-3 border-t"
            style={{ borderColor: 'var(--border-default)' }}
          >
            <div className="text-xs">
              <span
                className="font-bold block font-space uppercase tracking-wide"
                style={{ color: 'var(--text-primary)' }}
              >
                Disrupt Infrastructure
              </span>
              <span
                className="block text-[10px] mt-0.5 font-inter"
                style={{ color: 'var(--text-muted)' }}
              >
                Simulate sabotage / weather stress
              </span>
            </div>
            <input
              type="checkbox"
              checked={simInfra}
              onChange={(e) => setSimInfra(e.target.checked)}
              className="theme-checkbox"
            />
          </div>

          {/* Strategic Petroleum Reserve (SPR) Controls */}
          <div className="pt-3 border-t space-y-3" style={{ borderColor: 'var(--border-default)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider font-jakarta block" style={{ color: 'var(--text-muted)' }}>
                SPR National Buffer (Days)
              </span>
              <span className="text-xs font-bold font-space text-emerald-400">
                {simSprBuffer.toFixed(1)} days
              </span>
            </div>
            <input
              type="range"
              min={1.0}
              max={30.0}
              step={0.5}
              value={simSprBuffer}
              onChange={(e) => setSimSprBuffer(parseFloat(e.target.value))}
              className="theme-range w-full"
            />

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider font-jakarta block" style={{ color: 'var(--text-muted)' }}>
                Drawdown Strategy
              </label>
              <select
                value={simStrategy}
                onChange={(e) => setSimStrategy(e.target.value)}
                className="theme-select w-full"
              >
                <option value="front_loaded">Front-Loaded (Blunt Initial Shock)</option>
                <option value="smoothed">Smoothed (Uniform Daily Release)</option>
              </select>
            </div>
          </div>

          {/* Execute Button */}
          <button
            onClick={handleRunSimulation}
            disabled={simulating}
            className="w-full flex items-center justify-center gap-2 btn-primary py-2.5 text-xs uppercase font-space tracking-wider mt-1"
          >
            {simulating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>{simulating ? 'Running Simulation…' : 'Execute What-If Simulation'}</span>
          </button>
        </div>
      </div>

      {/* ── RIGHT: Results ───────────────────────────────────── */}
      <div className="lg:col-span-7 space-y-4">
        <AnimatePresence mode="wait">

          {/* Error banner */}
          {simError && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2 p-3.5 rounded-xl border text-xs font-inter"
              style={{
                backgroundColor: 'var(--risk-high-bg)',
                borderColor: 'var(--risk-high-border)',
                color: 'var(--risk-high-text)',
              }}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--risk-high)' }} />
              <span>{simError}</span>
            </motion.div>
          )}

          {simResult ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Strategic Reserve Drawdown Chart Component */}
              <ReserveDrawdownChart drawdownSchedule={simResult.drawdown_schedule || null} />
              {/* Comparison cards */}
              <div className="grid grid-cols-3 gap-3">

                {/* Baseline */}
                <div className="navy-card p-3.5">
                  <span
                    className="text-[9px] uppercase block font-bold font-jakarta"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Baseline Risk
                  </span>
                  <span
                    className="text-2xl font-bold font-space block mt-1.5"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {(simResult.baseline_probability * 100).toFixed(1)}%
                  </span>
                  <span className={`risk-badge mt-1.5 ${riskLevelClass(simResult.baseline_risk_level)}`}>
                    {simResult.baseline_risk_level}
                  </span>
                </div>

                {/* Delta arrow */}
                <div className="flex flex-col items-center justify-center gap-1">
                  <span
                    className="text-xs font-semibold font-geist"
                    style={{ color: isDeltaPositive ? 'var(--risk-high)' : 'var(--risk-low)' }}
                  >
                    {isDeltaPositive ? '+' : ''}{(delta * 100).toFixed(1)}%
                  </span>
                  <ArrowRight className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                </div>

                {/* Simulated */}
                <div
                  className="navy-card p-3.5"
                  style={{
                    borderColor: isDeltaPositive ? 'var(--risk-high-border)' : 'var(--risk-low-border)',
                    backgroundColor: isDeltaPositive ? 'var(--risk-high-bg)' : 'var(--risk-low-bg)',
                  }}
                >
                  <span
                    className="text-[9px] uppercase block font-bold font-jakarta"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Simulated Risk
                  </span>
                  <span
                    className="text-2xl font-bold font-space block mt-1.5"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {(simResult.simulated_probability * 100).toFixed(1)}%
                  </span>
                  <span className={`risk-badge mt-1.5 ${riskLevelClass(simResult.simulated_risk_level)}`}>
                    {simResult.simulated_risk_level}
                  </span>
                </div>
              </div>

              {/* Cascading Refining -> Price -> GDP Economic Impact Card */}
              {simResult.economic_impact && (
                <div className="navy-card p-4 space-y-3 font-geist">
                  <div className="flex justify-between items-center pb-2 border-b" style={{ borderColor: 'var(--border-default)' }}>
                    <span className="text-[10px] font-bold uppercase tracking-wider font-space text-amber-400">
                      Cascading Downstream Impact: Refining → Price → GDP
                    </span>
                    <span className="text-[9px] font-mono uppercase text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      RBI / IMF ELASTICITY
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-2.5 rounded-lg border bg-[#060b13] border-slate-800 space-y-1">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block font-jakarta">REFINING DROP</span>
                      <span className="text-sm font-bold text-amber-400 font-space block">
                        -{simResult.economic_impact.refining_throughput_drop_pct.toFixed(1)}%
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg border bg-[#060b13] border-slate-800 space-y-1">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block font-jakarta">DAILY COST DELTA</span>
                      <span className="text-sm font-bold text-blue-400 font-space block">
                        +${simResult.economic_impact.daily_import_cost_delta_usd_m.toFixed(1)}M /day
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg border bg-[#060b13] border-slate-800 space-y-1">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block font-jakarta">ANNUAL IMPORT BILL</span>
                      <span className="text-sm font-bold text-rose-400 font-space block">
                        +${simResult.economic_impact.annualized_import_bill_delta_usd_b.toFixed(2)}B /yr
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg border bg-[#060b13] border-slate-800 space-y-1">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block font-jakarta">EST. GDP IMPACT</span>
                      <span className="text-sm font-bold text-rose-500 font-space block">
                        {simResult.economic_impact.estimated_gdp_growth_impact_pct.toFixed(3)} pp
                      </span>
                    </div>
                  </div>

                  {/* Formula and Rationale Tooltip Banner */}
                  <div className="p-2.5 rounded-lg border text-[10px] space-y-1 bg-slate-950/60 border-slate-800 text-slate-400 font-inter">
                    <p className="font-mono text-slate-300">
                      📐 <strong className="text-slate-200">Elasticity Formula:</strong> {simResult.economic_impact.elasticity_formula}
                    </p>
                    <p className="italic text-slate-400 pt-0.5 border-t border-slate-800/80">
                      ℹ️ {simResult.economic_impact.methodology_note}
                    </p>
                  </div>
                </div>
              )}

              {/* Recommendation */}
              <div className="navy-card p-4 space-y-2.5">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider block pb-2 border-b font-jakarta"
                  style={{ color: 'var(--text-muted)', borderColor: 'var(--border-default)' }}
                >
                  Recommended Intervention
                </span>
                <p className="text-xs leading-relaxed font-inter" style={{ color: 'var(--text-secondary)' }}>
                  {simResult.recommendation}
                </p>
                <div
                  className="text-xs p-3 rounded-lg border mt-1 font-inter"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span
                    className="font-semibold block mb-1 font-space"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Explanatory Statement:
                  </span>
                  {simResult.explanation}
                </div>
              </div>

              {/* Feature mutations table */}
              <div className="navy-card p-4 space-y-2">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider block font-jakarta"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Feature Mutations
                </span>
                <div className="overflow-x-auto">
                  <table className="theme-table w-full font-geist">
                    <thead>
                      <tr>
                        <th>Feature ID</th>
                        <th className="text-right">Baseline</th>
                        <th className="text-right">Mutated</th>
                        <th className="text-right">Delta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(simResult.feature_mutations).map(([feature, vals]) => {
                        const featureDelta = vals.simulated - vals.baseline;
                        return (
                          <tr key={feature}>
                            <td className="font-medium uppercase" style={{ color: 'var(--text-primary)' }}>
                              {feature.replace('gpr_', 'GPR ').replace('brent_', 'BRENT ')}
                            </td>
                            <td className="text-right" style={{ color: 'var(--text-muted)' }}>
                              {vals.baseline.toFixed(3)}
                            </td>
                            <td className="text-right font-semibold" style={{ color: 'var(--text-primary)' }}>
                              {vals.simulated.toFixed(3)}
                            </td>
                            <td
                              className="text-right font-semibold"
                              style={{
                                color:
                                  featureDelta === 0
                                    ? 'var(--text-muted)'
                                    : featureDelta > 0
                                    ? 'var(--risk-high)'
                                    : 'var(--risk-low)',
                              }}
                            >
                              {featureDelta > 0 ? '+' : ''}{featureDelta.toFixed(3)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : (
            <div
              className="h-[280px] flex flex-col justify-center items-center text-center p-6 rounded-xl border border-dashed select-none"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-default)',
              }}
            >
              <HelpCircle className="w-7 h-7 mb-3" style={{ color: 'var(--text-muted)' }} />
              <p
                className="text-xs font-bold uppercase tracking-wider font-space"
                style={{ color: 'var(--text-primary)' }}
              >
                Awaiting Simulation Parameters
              </p>
              <p
                className="text-xs mt-2 max-w-xs leading-relaxed font-inter"
                style={{ color: 'var(--text-secondary)' }}
              >
                Adjust parameters on the left panel and click "Execute What-If Simulation" to trigger model twins.
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
