import { useState, useEffect, useCallback } from 'react';
import { api } from '../client';

export function useSecurity(activeApiKey: string) {
  const [securityStatus, setSecurityStatus] = useState<any>(null);
  const [securityKeys, setSecurityKeys] = useState<any[]>([]);
  const [securityAudits, setSecurityAudits] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSecurityData = useCallback(async () => {
    if (!activeApiKey) {
      setSecurityStatus(null);
      setSecurityKeys([]);
      setSecurityAudits([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const statusData = await api.getSecurityStatus();
      setSecurityStatus(statusData);

      try {
        const keysData = await api.getKeys();
        setSecurityKeys(keysData);
      } catch (kErr) {
        setSecurityKeys([]);
      }

      try {
        const auditData = await api.getAuditLogs(1, 20);
        setSecurityAudits(auditData?.items || []);
      } catch (aErr) {
        setSecurityAudits([]);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify API key.');
      setSecurityStatus(null);
    } finally {
      setLoading(false);
    }
  }, [activeApiKey]);

  useEffect(() => {
    fetchSecurityData();
  }, [fetchSecurityData]);

  const generateNewKey = async (actorId: string, actorRole: string, expiresInDays: number) => {
    try {
      const result = await api.generateKey({ actor_id: actorId, actor_role: actorRole, expires_in_days: expiresInDays });
      await fetchSecurityData();
      return result;
    } catch (err: any) {
      throw new Error(err.message || 'Failed to generate API Key');
    }
  };

  const revokeApiKey = async (publicId: string) => {
    try {
      await api.revokeKey(publicId);
      await fetchSecurityData();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to revoke API Key');
    }
  };

  return {
    securityStatus,
    securityKeys,
    securityAudits,
    loading,
    error,
    refresh: fetchSecurityData,
    generateNewKey,
    revokeApiKey
  };
}
