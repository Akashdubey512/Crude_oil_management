import type { Theme } from '../../api/hooks/useTheme';

interface ArchitectureSectionProps {
  theme: Theme;
}

const PIPELINE = [
  { step: '01', title: 'DATA SOURCES', sub: 'PortWatch, FRED, GDELT', color: '#5B8DEF' },
  { step: '02', title: 'INGESTION', sub: 'Multi-Feed Pipelines', color: '#6EA8FF' },
  { step: '03', title: 'SIGNAL EXTRACTION', sub: 'Feature Engineering', color: '#F4B740' },
  { step: '04', title: 'RISK ENGINE', sub: 'XGBoost Ensemble', color: '#EF5B5B' },
  { step: '05', title: 'SCENARIO ENGINE', sub: 'Stress-Test Multipliers', color: '#F4B740' },
  { step: '06', title: 'OPTIMIZATION', sub: 'Rerouting & SPR Sourcing', color: '#38D39F' },
  { step: '07', title: 'DECISION', sub: 'Executable Procurement', color: '#38D39F' },
];

export default function ArchitectureSection({ theme }: ArchitectureSectionProps) {
  const isDark = theme === 'dark';

  return (
    <section id="architecture" className="py-20 border-b font-manrope theme-transition"
      style={{
        backgroundColor: isDark ? '#050A12' : '#F5F7FA',
        borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <div className="text-[10px] font-space font-bold uppercase tracking-[0.2em]"
            style={{ color: isDark ? '#5B8DEF' : '#356AE6' }}
          >
            SYSTEM ARCHITECTURE PIPELINE
          </div>
          <h2 className="text-3xl sm:text-4xl font-black font-space tracking-tight"
            style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}
          >
            End-to-End Intelligence Pipeline.
          </h2>
          <p className="text-sm font-inter leading-relaxed"
            style={{ color: isDark ? '#94A3B8' : '#536274' }}
          >
            Modular enterprise architecture processing raw signals into optimized supply-chain responses.
          </p>
        </div>

        {/* Pipeline Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {PIPELINE.map((p) => (
            <div
              key={p.step}
              className="p-4 rounded-xl border space-y-2 text-center theme-transition relative"
              style={{
                backgroundColor: isDark ? '#0D1624' : '#FFFFFF',
                borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
              }}
            >
              <span className="text-[10px] font-geist font-bold px-2 py-0.5 rounded border inline-block"
                style={{
                  backgroundColor: isDark ? '#08111C' : '#F5F7FA',
                  borderColor: isDark ? '#1C2A3A' : '#D9E0E8',
                  color: p.color,
                }}
              >
                {p.step}
              </span>
              <div className="font-space font-bold text-xs uppercase" style={{ color: isDark ? '#F4F7FA' : '#0B1220' }}>
                {p.title}
              </div>
              <div className="text-[10px] font-inter text-slate-400">
                {p.sub}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
