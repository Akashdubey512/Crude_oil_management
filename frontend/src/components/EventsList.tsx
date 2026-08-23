import { ShieldAlert, Info } from 'lucide-react';
import type { GeopoliticalEvent } from '../types';

interface EventsListProps {
  events: GeopoliticalEvent[];
}

export default function EventsList({ events }: EventsListProps) {
  if (!events || events.length === 0) {
    return (
      <div className="flex items-center justify-center p-5 border border-slate-800/80 rounded-xl bg-[#0a1322] text-slate-400 text-xs font-inter">
        No recent geopolitical events mapped to this corridor in the active window.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800/80 bg-[#0a1322] p-4 max-h-[300px] overflow-y-auto font-manrope">
      <span className="text-xs uppercase font-bold tracking-wide text-slate-400 mb-3 block font-space">Geopolitical Event Logs</span>

      <div className="flex flex-col gap-2.5">
        {events.map((evt) => (
          <div key={evt.event_id} className="p-2.5 rounded-lg border border-slate-800 bg-[#060b13] text-xs flex items-start gap-2.5 font-inter">
            {evt.event_type.includes('attack') || evt.event_type.includes('disruption') ? (
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            )}
            
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1 text-slate-400 text-[10px] font-geist">
                <span className="font-semibold text-slate-200 capitalize">{evt.event_type}</span>
                <span>{evt.event_date}</span>
              </div>
              <p className="text-slate-300 mb-1.5 leading-relaxed text-[11px]">{evt.text_reference}</p>
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-geist">
                <span>Source: <span className="font-semibold text-slate-400">{evt.source}</span></span>
                {evt.source_url ? (
                  <a
                    href={evt.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    View Source
                  </a>
                ) : (
                  <span>No URL Available</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
