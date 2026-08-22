import { useState, useEffect, useCallback } from 'react';
import { api } from '../client';

export function useGovernance(corridorId: string | null) {
  const [corridorVersions, setCorridorVersions] = useState<any[]>([]);
  const [championChallenger, setChampionChallenger] = useState<any>(null);
  const [retrainStatus, setRetrainStatus] = useState<any>(null);
  const [modelCardMarkdown, setModelCardMarkdown] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchGovernanceData = useCallback(async () => {
    if (!corridorId) return;
    setLoading(true);
    setError(null);
    try {
      const [versions, comp, retrain] = await Promise.all([
        api.getCorridorVersions(corridorId).catch(() => []),
        api.getComparisonMetrics(corridorId).catch(() => null),
        api.getRetrainStatus(corridorId).catch(() => null),
      ]);

      setCorridorVersions(versions);
      setChampionChallenger(comp);
      setRetrainStatus(retrain);

      if (corridorId === 'RED_SEA') {
        try {
          const card = await api.getModelCard(corridorId);
          setModelCardMarkdown(card?.markdown || null);
        } catch {
          setModelCardMarkdown(null);
        }
      } else {
        setModelCardMarkdown(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch governance metrics');
    } finally {
      setLoading(false);
    }
  }, [corridorId]);

  useEffect(() => {
    fetchGovernanceData();
  }, [fetchGovernanceData]);

  const promoteModel = async (challengerKey: string, reason: string) => {
    if (!corridorId) return;
    try {
      const result = await api.promoteModel(corridorId, { challenger_key: challengerKey, reason });
      await fetchGovernanceData();
      return result;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to promote model');
    }
  };

  const rollbackModel = async (rollbackKey: string, reason: string) => {
    if (!corridorId) return;
    try {
      const result = await api.rollbackModel(corridorId, { rollback_key: rollbackKey, reason });
      await fetchGovernanceData();
      return result;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to rollback model');
    }
  };

  return {
    corridorVersions,
    championChallenger,
    retrainStatus,
    modelCardMarkdown,
    loading,
    error,
    refresh: fetchGovernanceData,
    promoteModel,
    rollbackModel
  };
}
