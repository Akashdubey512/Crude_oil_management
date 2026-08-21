import type { ModelInfo } from '../types';

interface ModelCardProps {
  modelInfo: ModelInfo | null;
}

export default function ModelCard({ modelInfo }: ModelCardProps) {
  if (!modelInfo) {
    return (
      <div className="flex items-center justify-center p-6 border border-gray-800 rounded-xl bg-gray-950 text-gray-500 text-xs">
        Model transparency statistics not loaded
      </div>
    );
  }

  // Handle nested test metrics
  const valMetrics = modelInfo.metrics?.validation || {};
  const testMetrics = modelInfo.metrics?.test || {};

  return (
    <div className="p-4 rounded-xl border border-gray-800 bg-gray-950/50 flex flex-col gap-4 text-xs">
      <span className="text-xs uppercase font-extrabold tracking-widest text-gray-400 block border-b border-gray-800 pb-2">
        Model Card & Transparency: {modelInfo.model_name} (v{modelInfo.version})
      </span>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-gray-400 font-semibold mb-1">Model Parameters</p>
          <ul className="text-gray-300 list-disc list-inside flex flex-col gap-0.5">
            <li>Type: {modelInfo.model_name}</li>
            <li>Version: {modelInfo.version}</li>
            <li>Training Timeline:</li>
            <li className="list-none pl-3 text-cyan-400 font-mono">
              {modelInfo.training_start} {"->"} {modelInfo.training_end}
            </li>
          </ul>
        </div>

        <div>
          <p className="text-gray-400 font-semibold mb-1">Out-of-Time Metrics</p>
          <div className="grid grid-cols-2 gap-2 text-gray-300">
            <div className="p-2 border border-gray-800 rounded bg-gray-950">
              <p className="text-[10px] text-gray-500 uppercase font-bold">Val ROC-AUC</p>
              <p className="text-sm font-black text-white">{valMetrics.roc_auc !== undefined ? valMetrics.roc_auc : 'N/A'}</p>
            </div>
            <div className="p-2 border border-gray-800 rounded bg-gray-950">
              <p className="text-[10px] text-gray-500 uppercase font-bold">Test ROC-AUC</p>
              <p className="text-sm font-black text-cyan-400">{testMetrics.roc_auc !== undefined ? testMetrics.roc_auc : 'N/A'}</p>
            </div>
            <div className="p-2 border border-gray-800 rounded bg-gray-950">
              <p className="text-[10px] text-gray-500 uppercase font-bold">Val PR-AUC</p>
              <p className="text-sm font-black text-white">{valMetrics.pr_auc !== undefined ? valMetrics.pr_auc : 'N/A'}</p>
            </div>
            <div className="p-2 border border-gray-800 rounded bg-gray-950">
              <p className="text-[10px] text-gray-500 uppercase font-bold">Test F1-Score</p>
              <p className="text-sm font-black text-cyan-400">{testMetrics.f1 !== undefined ? testMetrics.f1 : 'N/A'}</p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <p className="text-gray-400 font-semibold mb-1">Trained Features List ({modelInfo.features_used?.length || 0})</p>
        <div className="max-h-[80px] overflow-y-auto border border-gray-800 rounded bg-gray-950 p-2 text-[10px] font-mono text-gray-400 flex flex-wrap gap-1">
          {modelInfo.features_used?.map((feat) => (
            <span key={feat} className="bg-gray-800/50 px-1.5 py-0.5 rounded border border-gray-800">
              {feat}
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className="text-gray-400 font-semibold mb-1">Known Limitations</p>
        <ul className="text-gray-300 list-disc list-inside flex flex-col gap-1 text-[11px] leading-relaxed">
          {modelInfo.limitations?.map((lim, idx) => (
            <li key={idx} className="text-gray-400">
              <span className="text-gray-300">{lim}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
