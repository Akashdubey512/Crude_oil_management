import { useState } from 'react';
import { Activity, ShieldAlert, Award, Info } from 'lucide-react';
import CalibrationChart from '../charts/CalibrationChart';
import type { Corridor } from '../../types';

interface ModelCenterProps {
  corridors: Corridor[];
  modelHealthCorridor: string;
  onCorridorChange: (id: string) => void;
  modelHealth: any;
  modelEval: any;
  modelDrift: any;
}

export default function ModelCenter({
  corridors,
  modelHealthCorridor,
  onCorridorChange,
  modelHealth,
  modelEval,
  modelDrift,
}: ModelCenterProps) {
  const [selectedDriftFeature, setSelectedDriftFeature] = useState<any | null>(null);
  const isRedSea = modelHealthCorridor === 'RED_SEA';

  // Extract model evaluation metrics
  const metrics = modelEval?.metrics;
  const calibration = modelEval?.calibration;

  return (
    <div className="space-y-6 font-mono select-none">
      {/* Target selector and warning banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-900 pb-4">
        <div>
          <label className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Select Model Segment</label>
          <select
            value={modelHealthCorridor}
            onChange={(e) => onCorridorChange(e.target.value)}
            className="bg-gray-900 border border-gray-800 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            {corridors.map((c) => (
              <option key={c.corridor_id} value={c.corridor_id}>
                {c.name} {c.corridor_id === 'RED_SEA' ? '(PROXY)' : ''}
              </option>
            ))}
          </select>
        </div>

        {modelHealth && (
          <div className="flex items-center gap-4 text-[10px]">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">OVERALL STATUS:</span>
              <span className={`font-bold px-2 py-0.5 rounded border ${
                modelHealth.status === 'GOOD'
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/30'
                  : 'bg-rose-950/40 text-rose-400 border-rose-900/30'
              }`}>
                {modelHealth.status}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">DRIFT:</span>
              <span className={`font-bold uppercase ${modelHealth.drift_status === 'GOOD' ? 'text-emerald-400' : 'text-amber-400'}`}>
                {modelHealth.drift_status}
              </span>
            </div>
          </div>
        )}
      </div>

      {isRedSea && (
        <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-3 text-[10px] leading-relaxed text-amber-500">
          <span className="font-extrabold uppercase block mb-0.5">⚠️ Model Data Restriction: Bab el-Mandeb Traffic Proxy</span>
          The Red Sea segment uses vessel traffic proxies from Bab el-Mandeb PortWatch data to evaluate threat model performance. Direct Suez to Red Sea flow calculations are unavailable.
        </div>
      )}

      {/* Main Grid: Performance vs Calibration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Metrics Table */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel p-4 rounded-xl border border-gray-900/60 space-y-3">
            <h3 className="text-xs font-black tracking-wider text-white uppercase border-b border-gray-900 pb-2 flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              Performance Metrics
            </h3>

            {metrics ? (
              <div className="space-y-1.5 text-[10px]">
                <div className="flex justify-between py-1.5 border-b border-gray-900/40">
                  <span className="text-gray-500">ROC-AUC SCORE</span>
                  <span className="font-bold text-white">{metrics.roc_auc?.toFixed(4) || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-900/40">
                  <span className="text-gray-500">PR-AUC SCORE</span>
                  <span className="font-bold text-white">{metrics.pr_auc?.toFixed(4) || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-900/40">
                  <span className="text-gray-500">BRIER SCORE</span>
                  <span className="font-bold text-white">{metrics.brier_score?.toFixed(4) || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-900/40">
                  <span className="text-gray-500">ECE (CALIBRATION)</span>
                  <span className="font-bold text-white">{calibration?.ece?.toFixed(4) || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-900/40">
                  <span className="text-gray-500">F1 MEASURE</span>
                  <span className="font-bold text-white">{metrics.f1?.toFixed(4) || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-900/40">
                  <span className="text-gray-500">PRECISION / PPV</span>
                  <span className="font-bold text-white">{metrics.precision?.toFixed(4) || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-900/40">
                  <span className="text-gray-500">RECALL / SENSITIVITY</span>
                  <span className="font-bold text-white">{metrics.recall?.toFixed(4) || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-gray-900/40">
                  <span className="text-gray-500">SPECIFICITY / TNR</span>
                  <span className="font-bold text-white">{metrics.specificity?.toFixed(4) || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-gray-500">MCC (MATTHEWS CORR)</span>
                  <span className="font-bold text-white">{metrics.mcc?.toFixed(4) || 'N/A'}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-gray-500">
                Evaluation data unavailable for this corridor split.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Calibration Plot */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-panel p-4 rounded-xl border border-gray-900/60 h-full flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-black tracking-wider text-white uppercase border-b border-gray-900 pb-2 flex items-center gap-2">
                <Award className="w-4 h-4 text-cyan-400" />
                Reliability Calibration Curve
              </h3>
              <p className="text-[9px] text-gray-500 mt-1.5">
                Displays predicted risk probabilities against actual observed disruption frequencies.
              </p>
            </div>

            <div className="h-[200px] w-full mt-4">
              <CalibrationChart calibration={calibration} />
            </div>
          </div>
        </div>
      </div>

      {/* Feature Drift Panel */}
      {modelDrift && (
        <div className="glass-panel p-4 rounded-xl border border-gray-900/60 space-y-4">
          <h3 className="text-xs font-black tracking-wider text-white uppercase border-b border-gray-900 pb-2 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            Covariate Feature Drift Assessment
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-[10px]">
            {/* Drift table list */}
            <div className="md:col-span-7 overflow-x-auto max-h-[220px] overflow-y-auto pr-1 scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-900 text-gray-500 uppercase text-[9px]">
                    <th className="pb-1.5">Feature Name</th>
                    <th className="pb-1.5 text-right">Method</th>
                    <th className="pb-1.5 text-right">KS Score</th>
                    <th className="pb-1.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900/40 text-gray-300">
                  {modelDrift.features?.map((f: any) => (
                    <tr
                      key={f.feature}
                      onClick={() => setSelectedDriftFeature(f)}
                      className={`hover:bg-gray-900/40 transition hover:cursor-pointer ${
                        selectedDriftFeature?.feature === f.feature ? 'bg-cyan-950/20 text-cyan-400' : ''
                      }`}
                    >
                      <td className="py-2 uppercase font-bold">{f.feature.replace('gpr_', 'GPR ')}</td>
                      <td className="py-2 text-right">{f.drift_method}</td>
                      <td className="py-2 text-right">{f.drift_score.toFixed(4)}</td>
                      <td className="py-2 text-right">
                        <span className={`px-1.5 py-0.5 rounded font-extrabold text-[8px] uppercase ${
                          f.severity === 'LOW'
                            ? 'bg-emerald-950/40 text-emerald-400'
                            : f.severity === 'MEDIUM'
                            ? 'bg-amber-950/40 text-amber-400'
                            : 'bg-rose-950/40 text-rose-400'
                        }`}>
                          {f.severity}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Selected feature recommendation */}
            <div className="md:col-span-5 border-l border-gray-900/60 pl-6 flex flex-col justify-between">
              {selectedDriftFeature ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-white uppercase">{selectedDriftFeature.feature.replace('gpr_', 'GPR ')}</span>
                    <span className="text-[9px] text-gray-500 uppercase">THRESHOLD: {selectedDriftFeature.threshold}</span>
                  </div>
                  <p className="text-[9px] text-gray-400 leading-normal">
                    {selectedDriftFeature.recommendation || 'No warning triggered for this metric.'}
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 flex flex-col justify-center items-center h-full">
                  <Info className="w-6 h-6 text-gray-600 mb-1" />
                  <span>Click a feature on the table to view pipeline recommendations</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
