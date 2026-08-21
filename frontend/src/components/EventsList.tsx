import { ShieldAlert, Info } from 'lucide-react';
import type { GeopoliticalEvent } from '../types';

interface EventsListProps {
  events: GeopoliticalEvent[];
}

export default function EventsList({ events }: EventsListProps) {
  if (!events || events.length === 0) {
    return (
      <div className="flex items-center justify-center p-6 border border-gray-800 rounded-xl bg-gray-950 text-gray-500 text-xs">
        No recent geopolitical events mapped to this corridor in the active window.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/50 p-4 max-h-[300px] overflow-y-auto">
      <span className="text-xs uppercase font-extrabold tracking-widest text-gray-400 mb-3 block">Geopolitical Event Logs</span>

      <div className="flex flex-col gap-3">
        {events.map((evt) => (
          <div key={evt.event_id} className="p-3 rounded-lg border border-gray-800/80 bg-gray-950/80 text-xs flex items-start gap-3">
            {evt.event_type.includes('attack') || evt.event_type.includes('disruption') ? (
              <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-5 h-5 text-cyan-500 shrink-0 mt-0.5" />
            )}
            
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1 text-gray-400">
                <span className="font-semibold text-gray-200 capitalize">{evt.event_type}</span>
                <span>{evt.event_date}</span>
              </div>
              <p className="text-gray-300 mb-1.5 leading-relaxed">{evt.text_reference}</p>
              <div className="flex justify-between items-center text-[10px] text-gray-500">
                <span>Source: <span className="font-semibold text-gray-400">{evt.source}</span></span>
                {evt.source_url ? (
                  <a
                    href={evt.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-500 hover:underline"
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
