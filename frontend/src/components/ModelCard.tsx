import type { ModelInfo } from '../types';

interface ModelCardProps {
  modelInfo: ModelInfo | null;
}

export default function ModelCard({ modelInfo }: ModelCardProps) {
  if (!modelInfo) {
    return (
      <div className="flex items-center justify-center p-5 border border-slate-800/80 rounded-xl bg-[#0a1322] text-slate-400 text-xs font-inter">
        Model transparency statistics not loaded
      </div>
    );
  }

  // Handle nested test metrics
  const valMetrics = modelInfo.metrics?.validation || {};
  const testMetrics = modelInfo.metrics?.test || {};

  return (
    <div className="p-4 rounded-xl border border-slate-800/80 bg-[#0a1322] flex flex-col gap-3.5 text-xs font-manrope">
      <span className="text-xs uppercase font-bold tracking-wider text-slate-300 block border-b border-slate-800/80 pb-2 font-space">
        Model Card & Transparency: {modelInfo.model_name} (v{modelInfo.version})
      </span>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-slate-400 font-medium mb-1">Model Parameters</p>
          <ul className="text-slate-300 list-disc list-inside flex flex-col gap-0.5 font-inter">
            <li>Type: {modelInfo.model_name}</li>
            <li>Version: {modelInfo.version}</li>
            <li>Training Timeline:</li>
            <li className="list-none pl-3 text-blue-300 font-mono text-[11px]">
              {modelInfo.training_start} {"->"} {modelInfo.training_end}
            </li>
          </ul>
        </div>

        <div>
          <p className="text-slate-400 font-medium mb-1">Out-of-Time Metrics</p>
          <div className="grid grid-cols-2 gap-2 text-slate-300">
            <div className="p-2 border border-slate-800 rounded-lg bg-[#060b13]">
              <p className="text-[10px] text-slate-500 uppercase font-medium">Val ROC-AUC</p>
              <p className="text-sm font-bold text-white font-space">{valMetrics.roc_auc !== undefined ? valMetrics.roc_auc : 'N/A'}</p>
            </div>
            <div className="p-2 border border-slate-800 rounded-lg bg-[#060b13]">
              <p className="text-[10px] text-slate-500 uppercase font-medium">Test ROC-AUC</p>
              <p className="text-sm font-bold text-blue-300 font-space">{testMetrics.roc_auc !== undefined ? testMetrics.roc_auc : 'N/A'}</p>
            </div>
            <div className="p-2 border border-slate-800 rounded-lg bg-[#060b13]">
              <p className="text-[10px] text-slate-500 uppercase font-medium">Val PR-AUC</p>
              <p className="text-sm font-bold text-white font-space">{valMetrics.pr_auc !== undefined ? valMetrics.pr_auc : 'N/A'}</p>
            </div>
            <div className="p-2 border border-slate-800 rounded-lg bg-[#060b13]">
              <p className="text-[10px] text-slate-500 uppercase font-medium">Test F1-Score</p>
              <p className="text-sm font-bold text-blue-300 font-space">{testMetrics.f1 !== undefined ? testMetrics.f1 : 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-slate-400 font-medium mb-1">Trained Features List ({modelInfo.features_used?.length || 0})</p>
        <div className="max-h-[80px] overflow-y-auto border border-slate-800 rounded-lg bg-[#060b13] p-2 text-[10px] font-mono text-slate-400 flex flex-wrap gap-1">
          {modelInfo.features_used?.map((feat) => (
            <span key={feat} className="bg-slate-800/60 px-1.5 py-0.5 rounded border border-slate-700/60 text-slate-300">
              {feat}
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className="text-slate-400 font-medium mb-1">Known Limitations</p>
        <ul className="text-slate-300 list-disc list-inside flex flex-col gap-1 text-[11px] leading-relaxed font-inter">
          {modelInfo.limitations?.map((lim, idx) => (
            <li key={idx} className="text-slate-400">
              <span className="text-slate-300">{lim}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
