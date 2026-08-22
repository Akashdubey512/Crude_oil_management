import { useState, useEffect } from 'react';
import { api } from '../client';
import type { RiskSnapshot, GeopoliticalEvent, TrafficObservation, ModelInfo, ExplainabilityResponse } from '../../types';

export function useCorridorRisk(corridorId: string | null) {
  const [activeRisk, setActiveRisk] = useState<RiskSnapshot | null>(null);
  const [activeEvents, setActiveEvents] = useState<GeopoliticalEvent[]>([]);
  const [activeTraffic, setActiveTraffic] = useState<TrafficObservation[]>([]);
  const [activeModelInfo, setActiveModelInfo] = useState<ModelInfo | null>(null);
  const [activeExplainability, setActiveExplainability] = useState<ExplainabilityResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!corridorId) {
      setActiveRisk(null);
      setActiveEvents([]);
      setActiveTraffic([]);
      setActiveModelInfo(null);
      setActiveExplainability(null);
      return;
    }

    let isCurrent = true;
    setLoading(true);

    const fetchDetails = async () => {
      try {
        const [risk, events, traffic] = await Promise.all([
          api.getCorridorRisk(corridorId).catch(() => null),
          api.getCorridorEvents(corridorId, 20).catch(() => []),
          api.getCorridorTraffic(corridorId, 60).catch(() => []),
        ]);

        if (!isCurrent) return;

        if (risk) setActiveRisk(risk);
        setActiveEvents(events);
        setActiveTraffic(traffic);

        // Fetch model info and explainability in parallel (non-blocking)
        api.getModelInfo(corridorId)
          .then((info) => { if (isCurrent) setActiveModelInfo(info); })
          .catch(() => { if (isCurrent) setActiveModelInfo(null); });

        api.getExplainability(corridorId)
          .then((explain) => { if (isCurrent) setActiveExplainability(explain); })
          .catch(() => { if (isCurrent) setActiveExplainability(null); });

      } catch (err) {
        console.error(`Failed to fetch details for corridor ${corridorId}:`, err);
      } finally {
        if (isCurrent) setLoading(false);
      }
    };

    fetchDetails();

    return () => {
      isCurrent = false;
    };
  }, [corridorId]);

  return {
    activeRisk,
    activeEvents,
    activeTraffic,
    activeModelInfo,
    activeExplainability,
    loading
  };
}
