import { useState, useEffect, useCallback } from 'react';
import { api } from '../client';

export function useObservability() {
  const [observabilityMetrics, setObservabilityMetrics] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getObservabilityMetrics();
      setObservabilityMetrics(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch observability metrics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    observabilityMetrics,
    loading,
    error,
    refresh: fetchMetrics
  };
}
