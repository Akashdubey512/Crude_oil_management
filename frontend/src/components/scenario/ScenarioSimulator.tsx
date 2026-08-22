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
    ? 'text-gray-400' 
    : isDeltaPositive 
    ? 'text-rose-500 font-extrabold' 
    : 'text-emerald-500 font-extrabold';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 select-none font-mono">
      
      {/* Left Column: Sliders and Controls */}
      <div className="lg:col-span-5 space-y-5">
        <div className="glass-panel p-4 rounded-xl border border-gray-900/60 space-y-4">
          <div className="flex items-center gap-2 border-b border-gray-900 pb-2.5">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-black tracking-wider text-white uppercase">
              Simulation Inputs
            </h3>
          </div>

          {/* Corridor Selection */}
          <div className="space-y-1">
            <label className="text-[9px] text-gray-500 uppercase font-bold">Target Corridor</label>
            <select
              value={simCorridor}
              onChange={(e) => setSimCorridor(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
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
            <div className="flex justify-between text-[9px] font-bold">
              <span className="text-gray-500 uppercase">Tanker Flow Multiplier</span>
              <span className="text-cyan-400 font-black">{simTransit.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="2.0"
              step="0.1"
              value={simTransit}
              onChange={(e) => setSimTransit(parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* GPR modifier */}
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-bold">
              <span className="text-gray-500 uppercase">Geopolitical Risk Multiplier</span>
              <span className="text-cyan-400 font-black">{simGpr.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="3.0"
              step="0.1"
              value={simGpr}
              onChange={(e) => setSimGpr(parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* Oil price modifier */}
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-bold">
              <span className="text-gray-500 uppercase">Brent Price Multiplier</span>
              <span className="text-cyan-400 font-black">{simPrice.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={simPrice}
              onChange={(e) => setSimPrice(parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* Volatility modifier */}
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-bold">
              <span className="text-gray-500 uppercase">Brent Volatility Multiplier</span>
              <span className="text-cyan-400 font-black">{simVol.toFixed(2)}x</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={simVol}
              onChange={(e) => setSimVol(parseFloat(e.target.value))}
              className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* Infrastructure Stress flag */}
          <div className="flex items-center justify-between border-t border-gray-900 pt-3">
            <div className="text-[10px]">
              <span className="text-gray-300 font-bold block">DISRUPT LOCAL INFRASTRUCTURE</span>
              <span className="text-gray-500 block text-[9px]">Simulate physical sabotage/weather stress</span>
            </div>
            <input
              type="checkbox"
              checked={simInfra}
              onChange={(e) => setSimInfra(e.target.checked)}
              className="w-4 h-4 rounded border-gray-800 bg-gray-900 text-cyan-500 focus:ring-cyan-500"
            />
          </div>

          {/* Trigger Button */}
          <button
            onClick={handleRunSimulation}
            disabled={simulating}
            className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-bold py-2 rounded text-xs transition uppercase tracking-wider hover:cursor-pointer mt-2"
          >
            {simulating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
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
              className="bg-rose-950/20 border border-rose-500/20 text-rose-500 p-4 rounded-xl text-xs"
            >
              <AlertTriangle className="w-5 h-5 inline-block mr-2 shrink-0" />
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
                <div className="glass-panel p-3.5 rounded-xl border border-gray-900/60">
                  <span className="text-[8px] text-gray-500 uppercase block font-bold">BASELINE RISK</span>
                  <span className="text-lg font-black text-white block mt-1">
                    {(simResult.baseline_probability * 100).toFixed(1)}%
                  </span>
                  <span className="text-[8px] px-1 bg-gray-900 text-gray-400 font-bold border border-gray-800 rounded inline-block mt-1 uppercase">
                    {simResult.baseline_risk_level}
                  </span>
                </div>

                {/* Arrow */}
                <div className="flex flex-col items-center justify-center">
                  <span className={`text-[9px] ${deltaColorClass} font-bold`}>
                    {isDeltaPositive ? '+' : ''}{(delta * 100).toFixed(1)}%
                  </span>
                  <ArrowRight className="w-5 h-5 text-gray-500 mt-1" />
                </div>

                {/* Simulated card */}
                <div className={`glass-panel p-3.5 rounded-xl border ${isDeltaPositive ? 'border-rose-900/40 bg-rose-950/5' : 'border-emerald-900/40 bg-emerald-950/5'}`}>
                  <span className="text-[8px] text-gray-500 uppercase block font-bold">SIMULATED RISK</span>
                  <span className="text-lg font-black text-white block mt-1">
                    {(simResult.simulated_probability * 100).toFixed(1)}%
                  </span>
                  <span className={`text-[8px] px-1 font-bold border rounded inline-block mt-1 uppercase ${
                    simResult.simulated_risk_level === 'LOW' 
                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30' 
                      : simResult.simulated_risk_level === 'MODERATE' 
                      ? 'bg-amber-950/40 text-amber-400 border-amber-900/30'
                      : 'bg-rose-950/40 text-rose-400 border-rose-900/30'
                  }`}>
                    {simResult.simulated_risk_level}
                  </span>
                </div>
              </div>

              {/* Recommendations/Audit */}
              <div className="glass-panel p-4 rounded-xl border border-gray-900/60 space-y-2">
                <span className="text-[8px] text-cyan-400 font-bold uppercase tracking-wider block border-b border-gray-900 pb-1.5">
                  RECOMMENDED INTERVENTION
                </span>
                <p className="text-[10px] text-gray-300 leading-relaxed">
                  {simResult.recommendation}
                </p>
                <div className="text-[9px] text-gray-500 mt-2 bg-gray-900/40 p-2 border border-gray-900 rounded">
                  <span className="font-extrabold block text-gray-400 mb-0.5">EXPLANATORY STATEMENT:</span>
                  {simResult.explanation}
                </div>
              </div>

              {/* Feature Mutations table */}
              <div className="glass-panel p-4 rounded-xl border border-gray-900/60 space-y-3">
                <span className="text-[8px] text-cyan-400 font-bold uppercase tracking-wider block">
                  Feature Mutations
                </span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[9px]">
                    <thead>
                      <tr className="border-b border-gray-900 text-gray-500 uppercase">
                        <th className="pb-1.5">FEATURE ID</th>
                        <th className="pb-1.5 text-right">BASELINE</th>
                        <th className="pb-1.5 text-right">MUTATED</th>
                        <th className="pb-1.5 text-right">DELTA</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-900/40 text-gray-300">
                      {Object.entries(simResult.feature_mutations).map(([feature, vals]) => {
                        const featureDelta = vals.simulated - vals.baseline;
                        return (
                          <tr key={feature}>
                            <td className="py-1.5 font-bold uppercase">{feature.replace('gpr_', 'GPR ').replace('brent_', 'BRENT ')}</td>
                            <td className="py-1.5 text-right">{vals.baseline.toFixed(3)}</td>
                            <td className="py-1.5 text-right font-semibold text-white">{vals.simulated.toFixed(3)}</td>
                            <td className={`py-1.5 text-right ${featureDelta === 0 ? 'text-gray-500' : featureDelta > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
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
            <div className="h-[250px] flex flex-col justify-center items-center text-center text-gray-500 bg-gray-950/40 border border-dashed border-gray-900 rounded-xl p-6 select-none">
              <HelpCircle className="w-8 h-8 text-gray-600 mb-2" />
              <p className="text-xs font-bold uppercase tracking-wider">Awaiting Simulation Parameters</p>
              <p className="text-[10px] text-gray-600 mt-1 max-w-sm leading-normal">
                Choose values on the left panel and click "EXECUTE WHAT-IF SIMULATION" to trigger active pipeline twin metrics.
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
