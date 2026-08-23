import { useState, useEffect, useCallback } from 'react';
import { api } from '../client';

export function useSecurity(activeApiKey: string) {
  const [securityStatus, setSecurityStatus] = useState<any>(null);
  const [securityKeys, setSecurityKeys]     = useState<any[]>([]);
  const [securityAudits, setSecurityAudits] = useState<any[]>([]);
  const [loading, setLoading]               = useState<boolean>(false);
  const [error, setError]                   = useState<string | null>(null);

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
      // /status now includes actor_id, actor_role, and scopes on the response
      const statusData = await api.getSecurityStatus();
      setSecurityStatus(statusData);

      // /keys — admin gets all, non-admin gets own key
      try {
        const keysData = await api.getKeys();
        setSecurityKeys(Array.isArray(keysData) ? keysData : []);
      } catch {
        setSecurityKeys([]);
      }

      // /audit — admin gets all, non-admin gets own events (no longer throws 403)
      try {
        const auditData = await api.getAuditLogs(1, 50);
        setSecurityAudits(auditData?.items ?? []);
      } catch {
        setSecurityAudits([]);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your API key.');
      setSecurityStatus(null);
      setSecurityKeys([]);
      setSecurityAudits([]);
    } finally {
      setLoading(false);
    }
  }, [activeApiKey]);

  useEffect(() => {
    fetchSecurityData();
  }, [fetchSecurityData]);

  const generateNewKey = async (actorId: string, actorRole: string, expiresInDays: number) => {
    const result = await api.generateKey({
      actor_id: actorId,
      actor_role: actorRole,
      expires_in_days: expiresInDays,
    });
    // Refresh table after key creation
    await fetchSecurityData();
    return result;
  };

  const revokeApiKey = async (publicId: string) => {
    await api.revokeKey(publicId);
    await fetchSecurityData();
  };

  return {
    securityStatus,
    securityKeys,
    securityAudits,
    loading,
    error,
    refresh: fetchSecurityData,
    generateNewKey,
    revokeApiKey,
  };
}
