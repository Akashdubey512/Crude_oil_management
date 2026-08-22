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
    <div className="space-y-6 select-none font-manrope">
      {/* Target selector and warning banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1.5 font-jakarta">
            Select Model Segment
          </label>
          <select
            value={modelHealthCorridor}
            onChange={(e) => onCorridorChange(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-600 cursor-pointer"
          >
            {corridors.map((c) => (
              <option key={c.corridor_id} value={c.corridor_id}>
                {c.name} {c.corridor_id === 'RED_SEA' ? '(PROXY)' : ''}
              </option>
            ))}
          </select>
        </div>

        {modelHealth && (
          <div className="flex items-center gap-4 text-xs font-geist">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">OVERALL STATUS:</span>
              <span className={`font-extrabold px-2.5 py-0.5 rounded-md border text-[10px] ${
                modelHealth.status === 'GOOD'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-rose-50 text-rose-700 border-rose-200'
              }`}>
                {modelHealth.status}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">DRIFT:</span>
              <span className={`font-extrabold uppercase text-[11px] ${modelHealth.drift_status === 'GOOD' ? 'text-emerald-600' : 'text-orange-600'}`}>
                {modelHealth.drift_status}
              </span>
            </div>
          </div>
        )}
      </div>

      {isRedSea && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 text-xs leading-relaxed text-orange-800 font-inter">
          <span className="font-bold uppercase block mb-1 font-space">⚠️ Model Data Restriction: Bab el-Mandeb Traffic Proxy</span>
          The Red Sea segment uses vessel traffic proxies from Bab el-Mandeb PortWatch data to evaluate threat model performance. Direct Suez to Red Sea flow calculations are unavailable.
        </div>
      )}

      {/* Main Grid: Performance vs Calibration */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Metrics Table */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase border-b border-slate-100 pb-3 flex items-center gap-2 font-sora">
              <Activity className="w-4 h-4 text-blue-600" />
              Performance Metrics
            </h3>

            {metrics ? (
              <div className="space-y-2 text-xs font-geist">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">ROC-AUC SCORE</span>
                  <span className="font-bold text-slate-900">{metrics.roc_auc?.toFixed(4) || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">PR-AUC SCORE</span>
                  <span className="font-bold text-slate-900">{metrics.pr_auc?.toFixed(4) || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">BRIER SCORE</span>
                  <span className="font-bold text-slate-900">{metrics.brier_score?.toFixed(4) || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">ECE (CALIBRATION)</span>
                  <span className="font-bold text-slate-900">{calibration?.ece?.toFixed(4) || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">F1 MEASURE</span>
                  <span className="font-bold text-slate-900">{metrics.f1?.toFixed(4) || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">PRECISION / PPV</span>
                  <span className="font-bold text-slate-900">{metrics.precision?.toFixed(4) || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">RECALL / SENSITIVITY</span>
                  <span className="font-bold text-slate-900">{metrics.recall?.toFixed(4) || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">SPECIFICITY / TNR</span>
                  <span className="font-bold text-slate-900">{metrics.specificity?.toFixed(4) || 'N/A'}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500">MCC (MATTHEWS CORR)</span>
                  <span className="font-bold text-slate-900">{metrics.mcc?.toFixed(4) || 'N/A'}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-xs text-slate-400 font-inter">
                Evaluation data unavailable for this corridor split.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Calibration Plot */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs h-full flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase border-b border-slate-100 pb-3 flex items-center gap-2 font-sora">
                <Award className="w-4 h-4 text-blue-600" />
                Reliability Calibration Curve
              </h3>
              <p className="text-xs text-slate-500 mt-2 font-inter">
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
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase border-b border-slate-100 pb-3 flex items-center gap-2 font-sora">
            <ShieldAlert className="w-4 h-4 text-orange-600" />
            Covariate Feature Drift Assessment
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 text-xs font-geist">
            {/* Drift table list */}
            <div className="md:col-span-7 overflow-x-auto max-h-[220px] overflow-y-auto pr-1 scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 uppercase text-[9px] font-bold font-jakarta">
                    <th className="pb-2">Feature Name</th>
                    <th className="pb-2 text-right">Method</th>
                    <th className="pb-2 text-right">KS Score</th>
                    <th className="pb-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {modelDrift.features?.map((f: any) => (
                    <tr
                      key={f.feature}
                      onClick={() => setSelectedDriftFeature(f)}
                      className={`hover:bg-slate-50 transition cursor-pointer ${
                        selectedDriftFeature?.feature === f.feature ? 'bg-blue-50/80 text-blue-700 font-bold' : ''
                      }`}
                    >
                      <td className="py-2.5 uppercase font-bold">{f.feature.replace('gpr_', 'GPR ')}</td>
                      <td className="py-2.5 text-right">{f.drift_method}</td>
                      <td className="py-2.5 text-right">{f.drift_score.toFixed(4)}</td>
                      <td className="py-2.5 text-right">
                        <span className={`px-2 py-0.5 rounded-md font-extrabold text-[9px] uppercase border ${
                          f.severity === 'LOW'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : f.severity === 'MEDIUM'
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
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
            <div className="md:col-span-5 border-l border-slate-100 pl-6 flex flex-col justify-between">
              {selectedDriftFeature ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-slate-900 uppercase font-space">{selectedDriftFeature.feature.replace('gpr_', 'GPR ')}</span>
                    <span className="text-[9px] text-slate-400 uppercase font-bold">THRESHOLD: {selectedDriftFeature.threshold}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-inter">
                    {selectedDriftFeature.recommendation || 'No warning triggered for this metric.'}
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-slate-400 flex flex-col justify-center items-center h-full font-inter text-xs">
                  <Info className="w-6 h-6 text-slate-300 mb-1" />
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
