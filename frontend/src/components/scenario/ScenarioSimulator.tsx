import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sliders, RefreshCw, AlertTriangle, HelpCircle, ArrowRight } from 'lucide-react';
import { api } from '../../api/client';
import type { Corridor, ScenarioSimulationResponse } from '../../types';

interface ScenarioSimulatorProps {
  corridors: Corridor[];
}

export default function ScenarioSimulator({ corridors }: ScenarioSimulatorProps) {
  const [simCorridor, setSimCorridor] = useState<string>('HORMUZ');
  const [simTransit, setSimTransit] = useState<number>(1.0);
  const [simGpr, setSimGpr] = useState<number>(1.0);
  const [simPrice, setSimPrice] = useState<number>(1.0);
  const [simVol, setSimVol] = useState<number>(1.0);
  const [simInfra, setSimInfra] = useState<boolean>(false);
  
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
  const deltaColorClass = delta === 0 
    ? 'text-slate-400' 
    : isDeltaPositive 
    ? 'text-rose-600 font-extrabold' 
    : 'text-emerald-600 font-extrabold';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 select-none font-manrope">
      
      {/* Left Column: Sliders and Controls */}
      <div className="lg:col-span-5 space-y-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sliders className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase font-space">
              Simulation Inputs
            </h3>
          </div>

          {/* Corridor Selection */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-jakarta">Target Corridor</label>
            <select
              value={simCorridor}
              onChange={(e) => setSimCorridor(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-600 cursor-pointer"
            >
              {corridors.map((c) => (
                <option key={c.corridor_id} value={c.corridor_id}>
                  {c.name} {c.corridor_id === 'RED_SEA' ? '(PROXY)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Tanker transit modifier */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold font-geist">
              <span className="text-slate-500 uppercase text-[10px]">Tanker Flow Multiplier</span>
              <span className="text-blue-600 font-black">{simTransit.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.1"
              value={simTransit}
              onChange={(e) => setSimTransit(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
            />
          </div>

          {/* GPR modifier */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold font-geist">
              <span className="text-slate-500 uppercase text-[10px]">Geopolitical Risk Multiplier</span>
              <span className="text-orange-600 font-black">{simGpr.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={simGpr}
              onChange={(e) => setSimGpr(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
            />
          </div>

          {/* Oil price modifier */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold font-geist">
              <span className="text-slate-500 uppercase text-[10px]">Brent Price Multiplier</span>
              <span className="text-blue-600 font-black">{simPrice.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={simPrice}
              onChange={(e) => setSimPrice(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* Volatility modifier */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-bold font-geist">
              <span className="text-slate-500 uppercase text-[10px]">Brent Volatility Multiplier</span>
              <span className="text-orange-600 font-black">{simVol.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={simVol}
              onChange={(e) => setSimVol(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-orange-600"
            />
          </div>

          {/* Infrastructure Stress flag */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <div className="text-xs">
              <span className="text-slate-800 font-bold block font-space">DISRUPT LOCAL INFRASTRUCTURE</span>
              <span className="text-slate-400 block text-[10px] font-inter">Simulate physical sabotage/weather stress</span>
            </div>
            <input
              type="checkbox"
              checked={simInfra}
              onChange={(e) => setSimInfra(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-orange-600 focus:ring-orange-500 cursor-pointer"
            />
          </div>

          {/* Trigger Button */}
          <button
            onClick={handleRunSimulation}
            disabled={simulating}
            className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-xs transition uppercase tracking-wider shadow-md shadow-orange-500/20 hover:shadow-lg transition-all cursor-pointer mt-2"
          >
            {simulating ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
            <span>EXECUTE WHAT-IF SIMULATION</span>
          </button>
        </div>
      </div>

      {/* Right Column: Comparative Results Panel */}
      <div className="lg:col-span-7 space-y-5">
        <AnimatePresence mode="wait">
          {simError && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs font-inter"
            >
              <AlertTriangle className="w-5 h-5 inline-block mr-2 shrink-0 text-rose-600" />
              <span>{simError}</span>
            </motion.div>
          )}

          {simResult ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Score comparisons */}
              <div className="grid grid-cols-3 gap-4">
                {/* Baseline card */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[9px] text-slate-400 uppercase block font-bold font-jakarta">BASELINE RISK</span>
                  <span className="text-xl font-black font-space text-slate-900 block mt-1">
                    {(simResult.baseline_probability * 100).toFixed(1)}%
                  </span>
                  <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-600 font-extrabold border border-slate-200 rounded-md inline-block mt-1.5 uppercase font-geist">
                    {simResult.baseline_risk_level}
                  </span>
                </div>

                {/* Arrow */}
                <div className="flex flex-col items-center justify-center">
                  <span className={`text-xs ${deltaColorClass} font-bold font-geist`}>
                    {isDeltaPositive ? '+' : ''}{(delta * 100).toFixed(1)}%
                  </span>
                  <ArrowRight className="w-5 h-5 text-slate-400 mt-1" />
                </div>

                {/* Simulated card */}
                <div className={`bg-white p-4 rounded-2xl border shadow-2xs ${isDeltaPositive ? 'border-rose-200 bg-rose-50/20' : 'border-emerald-200 bg-emerald-50/20'}`}>
                  <span className="text-[9px] text-slate-400 uppercase block font-bold font-jakarta">SIMULATED RISK</span>
                  <span className="text-xl font-black font-space text-slate-900 block mt-1">
                    {(simResult.simulated_probability * 100).toFixed(1)}%
                  </span>
                  <span className={`text-[9px] px-2 py-0.5 font-extrabold border rounded-md inline-block mt-1.5 uppercase font-geist ${
                    simResult.simulated_risk_level === 'LOW' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : simResult.simulated_risk_level === 'MODERATE' 
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {simResult.simulated_risk_level}
                  </span>
                </div>
              </div>

              {/* Recommendations/Audit */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <span className="text-[10px] text-orange-600 font-extrabold uppercase tracking-wider block border-b border-slate-100 pb-2 font-jakarta">
                  RECOMMENDED INTERVENTION
                </span>
                <p className="text-xs text-slate-700 leading-relaxed font-inter">
                  {simResult.recommendation}
                </p>
                <div className="text-xs text-slate-600 mt-2 bg-slate-50 p-3 border border-slate-200/80 rounded-xl font-inter">
                  <span className="font-bold block text-slate-800 mb-1 font-space">EXPLANATORY STATEMENT:</span>
                  {simResult.explanation}
                </div>
              </div>

              {/* Feature Mutations table */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-wider block font-jakarta">
                  Feature Mutations
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-geist">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 uppercase text-[9px]">
                        <th className="pb-2">FEATURE ID</th>
                        <th className="pb-2 text-right">BASELINE</th>
                        <th className="pb-2 text-right">MUTATED</th>
                        <th className="pb-2 text-right">DELTA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {Object.entries(simResult.feature_mutations).map(([feature, vals]) => {
                        const featureDelta = vals.simulated - vals.baseline;
                        return (
                          <tr key={feature}>
                            <td className="py-2 font-bold uppercase">{feature.replace('gpr_', 'GPR ').replace('brent_', 'BRENT ')}</td>
                            <td className="py-2 text-right">{vals.baseline.toFixed(3)}</td>
                            <td className="py-2 text-right font-bold text-slate-900">{vals.simulated.toFixed(3)}</td>
                            <td className={`py-2 text-right font-bold ${featureDelta === 0 ? 'text-slate-400' : featureDelta > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
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
            <div className="h-[260px] flex flex-col justify-center items-center text-center text-slate-500 bg-white border border-dashed border-slate-300 rounded-2xl p-6 select-none shadow-2xs">
              <HelpCircle className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-xs font-bold uppercase tracking-wider font-space text-slate-700">Awaiting Simulation Parameters</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed font-inter">
                Choose values on the left panel and click "EXECUTE WHAT-IF SIMULATION" to trigger active pipeline twin metrics.
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
