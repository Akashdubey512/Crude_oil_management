import { useState, useEffect, useCallback } from 'react';
import { api } from '../client';
import type { HealthResponse, Corridor, RiskSnapshot, InfrastructureNode, BrentPriceResponse, SourceStatusResponse } from '../../types';

export function useGlobalData() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [corridors, setCorridors] = useState<Corridor[]>([]);
  const [risks, setRisks] = useState<RiskSnapshot[]>([]);
  const [infrastructure, setInfrastructure] = useState<InfrastructureNode[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [brentPrices, setBrentPrices] = useState<BrentPriceResponse | null>(null);
  const [dataStatuses, setDataStatuses] = useState<SourceStatusResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGlobalData = useCallback(async () => {
    try {
      setError(null);
      const [h, c, r, i, m] = await Promise.all([
        api.getHealth(),
        api.getCorridors(),
        api.getAllRisks(),
        api.getInfrastructure(),
        api.getMetrics(),
      ]);
      setHealth(h);
      setCorridors(c);
      setRisks(r);
      setInfrastructure(i);
      setMetrics(m);

      // Non-blocking background fetches
      api.getBrentPrices(90).then(setBrentPrices).catch(() => setBrentPrices(null));
      api.getDataStatus().then(setDataStatuses).catch(() => setDataStatuses([]));
    } catch (err: any) {
      setError(`API connection error: ${err.message || err}. Ensure FastAPI server is running.`);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchGlobalData();
    setRefreshing(false);
  }, [fetchGlobalData]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchGlobalData();
      setLoading(false);
    };
    init();
  }, [fetchGlobalData]);

  return {
    health,
    corridors,
    risks,
    infrastructure,
    metrics,
    brentPrices,
    dataStatuses,
    loading,
    refreshing,
    error,
    refresh
  };
}
