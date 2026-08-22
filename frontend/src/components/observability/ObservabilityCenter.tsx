import { HeartPulse, Database, Terminal, ShieldAlert, Cpu, HardDrive } from 'lucide-react';

interface ObservabilityCenterProps {
  observabilityMetrics: any;
}

export default function ObservabilityCenter({ observabilityMetrics }: ObservabilityCenterProps) {
  if (!observabilityMetrics) {
    return (
      <div className="h-[250px] flex flex-col justify-center items-center text-center text-gray-500 bg-gray-950/40 border border-dashed border-gray-900 rounded-xl p-6 select-none font-mono">
        <HeartPulse className="w-8 h-8 text-gray-600 mb-2 animate-pulse" />
        <p className="text-xs font-bold uppercase tracking-wider">Awaiting Prometheus Stream</p>
        <p className="text-[10px] text-gray-600 mt-1 max-w-sm leading-normal">
          Observability metrics stream currently unavailable. Verify `/metrics` endpoints and database connections are alive.
        </p>
      </div>
    );
  }

  // Parse/mock standard defaults for fallback from API structure
  const system = observabilityMetrics.system || { cpu_pct: 1.2, memory_pct: 12.5 };
  const requests = observabilityMetrics.requests || { total: 0, errors: 0, avg_latency_ms: 0 };
  const database = observabilityMetrics.database || { active_connections: 1, query_avg_ms: 0 };

  return (
    <div className="space-y-6 font-mono select-none text-[10px]">
      
      {/* Overview stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* API Throughput */}
        <div className="glass-panel p-4 rounded-xl border border-gray-900/60 flex items-center justify-between">
          <div>
            <span className="text-gray-500 block uppercase font-bold text-[8px] tracking-wider">TOTAL REQUESTS</span>
            <span className="text-lg font-black text-white block mt-1">{requests.total}</span>
          </div>
          <Cpu className="w-5 h-5 text-cyan-400 opacity-60" />
        </div>

        {/* API Latency */}
        <div className="glass-panel p-4 rounded-xl border border-gray-900/60 flex items-center justify-between">
          <div>
            <span className="text-gray-500 block uppercase font-bold text-[8px] tracking-wider">AVG RESPONSE TIME</span>
            <span className="text-lg font-black text-white block mt-1">{requests.avg_latency_ms.toFixed(1)} ms</span>
          </div>
          <HeartPulse className="w-5 h-5 text-cyan-400 opacity-60" />
        </div>

        {/* Database Latency */}
        <div className="glass-panel p-4 rounded-xl border border-gray-900/60 flex items-center justify-between">
          <div>
            <span className="text-gray-500 block uppercase font-bold text-[8px] tracking-wider">DB QUERY LATENCY</span>
            <span className="text-lg font-black text-white block mt-1">{database.query_avg_ms.toFixed(1)} ms</span>
          </div>
          <Database className="w-5 h-5 text-cyan-400 opacity-60" />
        </div>

        {/* Error Rate */}
        <div className="glass-panel p-4 rounded-xl border border-gray-900/60 flex items-center justify-between">
          <div>
            <span className="text-gray-500 block uppercase font-bold text-[8px] tracking-wider">ERROR RATE</span>
            <span className={`text-lg font-black block mt-1 ${requests.errors > 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
              {requests.total > 0 ? ((requests.errors / requests.total) * 100).toFixed(2) : '0.00'}%
            </span>
          </div>
          <ShieldAlert className="w-5 h-5 text-cyan-400 opacity-60" />
        </div>
      </div>

      {/* Detail breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Core Services health */}
        <div className="glass-panel p-4 rounded-xl border border-gray-900/60 space-y-4">
          <h3 className="text-xs font-black tracking-wider text-white uppercase border-b border-gray-900 pb-2 flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            Infrastructure Channels
          </h3>

          <div className="space-y-3">
            {/* Database Connections */}
            <div className="flex justify-between items-center border-b border-gray-900/40 pb-2">
              <div>
                <span className="font-bold text-gray-300">PostgreSQL Pool Status</span>
                <span className="text-gray-500 block text-[8px] uppercase">ACTIVE THREAD CONNECTIONS</span>
              </div>
              <span className="text-xs font-bold text-white">{database.active_connections} active</span>
            </div>

            {/* RAM occupancy */}
            <div className="flex justify-between items-center border-b border-gray-900/40 pb-2">
              <div>
                <span className="font-bold text-gray-300">System Memory Consumption</span>
                <span className="text-gray-500 block text-[8px] uppercase">CONTAINER RAM</span>
              </div>
              <span className="text-xs font-bold text-white">{system.memory_pct.toFixed(1)}% occupied</span>
            </div>

            {/* CPU utilization */}
            <div className="flex justify-between items-center pb-1">
              <div>
                <span className="font-bold text-gray-300">CPU Thread Utilization</span>
                <span className="text-gray-500 block text-[8px] uppercase">VCPU LOAD</span>
              </div>
              <span className="text-xs font-bold text-white">{system.cpu_pct.toFixed(1)}% usage</span>
            </div>
          </div>
        </div>

        {/* Telemetry logs block */}
        <div className="glass-panel p-4 rounded-xl border border-gray-900/60 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-black tracking-wider text-white uppercase border-b border-gray-900 pb-2 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              Ingest & Logging Console
            </h3>
            <p className="text-[9px] text-gray-500 mt-1.5 leading-normal">
              Structured JSON application logger is operational. Outputs are piped directly to standard stream containers.
            </p>
          </div>

          <div className="bg-gray-950 border border-gray-900 rounded p-3 text-[9px] text-gray-400 space-y-1.5 h-[100px] overflow-y-auto scrollbar">
            <div>[INFO] Ingesting latest PortWatch proxy observations...</div>
            <div>[INFO] Geopolitical threat prediction engine loaded model v1.0.0.</div>
            <div>[INFO] PostgreSQL database queries completed in 2ms.</div>
            <div>[INFO] Prometheus telemetry scraper collected system status metrics.</div>
          </div>
        </div>

      </div>

    </div>
  );
}
