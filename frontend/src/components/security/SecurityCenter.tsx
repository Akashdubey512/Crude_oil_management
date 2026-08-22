import { useState } from 'react';
import { Shield, Key, FileText, Clipboard, AlertTriangle, Check } from 'lucide-react';

interface SecurityCenterProps {
  securityStatus: any;
  securityKeys: any[];
  securityAudits: any[];
  activeApiKey: string;
  onApiKeyChange: (key: string) => void;
  securityError: string | null;
  onGenerateKey: (actorId: string, actorRole: string, expiresInDays: number) => Promise<any>;
  onRevokeKey: (publicId: string) => Promise<void>;
}

export default function SecurityCenter({
  securityStatus,
  securityKeys,
  securityAudits,
  activeApiKey,
  onApiKeyChange,
  securityError,
  onGenerateKey,
  onRevokeKey,
}: SecurityCenterProps) {
  const [newKeyActorId, setNewKeyActorId] = useState<string>('');
  const [newKeyActorRole, setNewKeyActorRole] = useState<string>('VIEWER');
  const [newKeyExpiryDays, setNewKeyExpiryDays] = useState<number>(30);
  const [generatedPlaintextKey, setGeneratedPlaintextKey] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleCopy = () => {
    if (generatedPlaintextKey) {
      navigator.clipboard.writeText(generatedPlaintextKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyActorId.trim()) return;
    setSubmitting(true);
    setActionError(null);
    setGeneratedPlaintextKey(null);
    try {
      const res = await onGenerateKey(newKeyActorId, newKeyActorRole, newKeyExpiryDays);
      if (res && res.api_key) {
        setGeneratedPlaintextKey(res.api_key);
        setNewKeyActorId('');
      } else {
        setActionError('Key generation request succeeded but no secret key returned.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Key generation failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (publicId: string) => {
    if (!window.confirm(`Revoke API Key ${publicId}? This action is immediate and permanent.`)) return;
    try {
      await onRevokeKey(publicId);
    } catch (err: any) {
      alert(err.message || 'Failed to revoke key.');
    }
  };

  const currentRole = securityStatus?.role || 'VIEWER';
  const isAdmin = currentRole === 'ADMIN';

  return (
    <div className="space-y-6 font-mono select-none text-[10px]">
      {/* Configuration status header */}
      <div className="glass-panel p-4 rounded-xl border border-gray-900/60 space-y-4">
        <h3 className="text-xs font-black tracking-wider text-white uppercase border-b border-gray-900 pb-2 flex items-center gap-2">
          <Shield className="w-4 h-4 text-cyan-400" />
          Active Security Credentials Configuration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-[10px]">
          {/* Left panel: configure key */}
          <div className="space-y-3">
            <div>
              <label className="text-[9px] text-gray-500 uppercase font-bold block mb-1">Set Session Authorization Token</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Enter erp_ public_secret Bearer Token"
                  value={activeApiKey}
                  onChange={(e) => onApiKeyChange(e.target.value)}
                  className="flex-1 bg-gray-900 border border-gray-800 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <p className="text-[8px] text-gray-500 mt-1 leading-normal">
                Credentials are saved to browser local session storage. Requests to governance or key management routes require scoped tokens.
              </p>
            </div>

            {securityError && (
              <div className="bg-rose-950/20 border border-rose-500/20 text-rose-400 p-2.5 rounded flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{securityError}</span>
              </div>
            )}
          </div>

          {/* Right panel: current status metadata */}
          {securityStatus && (
            <div className="space-y-2 border-l border-gray-900/60 pl-6">
              <div className="flex justify-between border-b border-gray-900/30 py-0.5">
                <span className="text-gray-500">AUTHORIZATION ROLE</span>
                <span className="font-bold text-cyan-400 uppercase tracking-widest">{currentRole}</span>
              </div>
              <div className="flex justify-between border-b border-gray-900/30 py-0.5">
                <span className="text-gray-500">CLIENT ENCRYPTION</span>
                <span className="font-bold text-white">HMAC-SHA256 (SECURE)</span>
              </div>
              <div className="flex justify-between border-b border-gray-900/30 py-0.5">
                <span className="text-gray-500">SSRF PROTECTION CLIENT</span>
                <span className="font-bold text-emerald-400">ACTIVE</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Generated key display modal block */}
      {generatedPlaintextKey && (
        <div className="bg-cyan-950/20 border border-cyan-800/40 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center text-cyan-400 border-b border-cyan-900/40 pb-2">
            <span className="font-extrabold uppercase">API Key Successfully Provisioned</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[9px] hover:text-white hover:cursor-pointer font-bold"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Clipboard className="w-3 h-3" />}
              <span>{copied ? 'COPIED TO CLIPBOARD' : 'COPY SECRET'}</span>
            </button>
          </div>
          <div className="bg-gray-950 border border-gray-900 rounded p-2.5 select-all font-bold text-xs text-white text-center break-all select-text font-mono">
            {generatedPlaintextKey}
          </div>
          <p className="text-[8px] text-amber-500 leading-normal font-bold">
            ⚠️ IMPORTANT: Save this secret key now. It will not be shown again.
          </p>
        </div>
      )}

      {/* Main security grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: API key inventory & generation */}
        <div className="lg:col-span-7 space-y-5">
          {/* Key list table */}
          <div className="glass-panel p-4 rounded-xl border border-gray-900/60 space-y-4">
            <h3 className="text-xs font-black tracking-wider text-white uppercase border-b border-gray-900 pb-2 flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400" />
              API Credentials Inventory
            </h3>

            <div className="overflow-x-auto max-h-[200px] overflow-y-auto pr-1 scrollbar">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-900 text-gray-500 uppercase text-[8px]">
                    <th className="pb-1.5">PUBLIC ID</th>
                    <th className="pb-1.5">ACTOR</th>
                    <th className="pb-1.5">SCOPE</th>
                    <th className="pb-1.5">EXPIRES</th>
                    <th className="pb-1.5 text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900/40 text-gray-300">
                  {securityKeys.map((key: any) => (
                    <tr key={key.public_id}>
                      <td className="py-2 font-bold">{key.public_id}</td>
                      <td className="py-2 uppercase">{key.actor_id}</td>
                      <td className="py-2 uppercase text-cyan-400">{key.actor_role}</td>
                      <td className="py-2 text-gray-500">{key.expires_at ? key.expires_at.split('T')[0] : 'NEVER'}</td>
                      <td className="py-2 text-right">
                        {key.is_active ? (
                          isAdmin ? (
                            <button
                              onClick={() => handleRevoke(key.public_id)}
                              className="px-1.5 py-0.5 rounded bg-rose-950/40 text-rose-400 border border-rose-900/30 hover:bg-rose-900 hover:text-white transition hover:cursor-pointer font-bold"
                            >
                              REVOKE
                            </button>
                          ) : (
                            <span className="text-emerald-400 font-bold uppercase">ACTIVE</span>
                          )
                        ) : (
                          <span className="text-gray-500 uppercase">REVOKED</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {securityKeys.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-gray-500">No active keys registered.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Provision Key control */}
          {isAdmin && (
            <div className="glass-panel p-4 rounded-xl border border-gray-900/60 space-y-4">
              <h3 className="text-xs font-black tracking-wider text-white uppercase border-b border-gray-900 pb-2">
                Provision New API Key
              </h3>

              {actionError && (
                <div className="bg-rose-950/20 border border-rose-500/20 text-rose-500 p-2.5 rounded text-[9px]">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-[8px] text-gray-500 uppercase font-bold">ACTOR ID</label>
                  <input
                    type="text"
                    placeholder="e.g. system_cron"
                    value={newKeyActorId}
                    onChange={(e) => setNewKeyActorId(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] text-gray-500 uppercase font-bold">SCOPE ROLE</label>
                  <select
                    value={newKeyActorRole}
                    onChange={(e) => setNewKeyActorRole(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="VIEWER">VIEWER</option>
                    <option value="ANALYST">ANALYST</option>
                    <option value="ML_ENGINEER">ML_ENGINEER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] text-gray-500 uppercase font-bold">EXPIRY DAYS</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={newKeyExpiryDays}
                    onChange={(e) => setNewKeyExpiryDays(parseInt(e.target.value))}
                    className="w-full bg-gray-900 border border-gray-800 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-bold py-1.5 rounded transition uppercase tracking-wider text-[9px] hover:cursor-pointer"
                >
                  PROVISION KEY
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Audit Logs timeline */}
        <div className="lg:col-span-5 space-y-5">
          <div className="glass-panel p-4 rounded-xl border border-gray-900/60 space-y-4">
            <h3 className="text-xs font-black tracking-wider text-white uppercase border-b border-gray-900 pb-2 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              Security Audit Stream Logs
            </h3>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar">
              {securityAudits.map((log: any, idx: number) => (
                <div key={idx} className="border-b border-gray-900/60 last:border-0 pb-2 mb-2 last:pb-0 last:mb-0">
                  <div className="flex justify-between items-center text-[8px] font-mono text-gray-500">
                    <span>IP: {log.ip_address || '127.0.0.1'}</span>
                    <span>{log.timestamp ? log.timestamp.split('T')[0] : 'N/A'}</span>
                  </div>
                  <p className="text-[10px] text-gray-300 mt-1 leading-normal font-bold">
                    {log.action}
                  </p>
                  <div className="flex justify-between text-[8px] text-gray-500 mt-0.5">
                    <span>ACTOR: {log.actor_id || 'UNKNOWN'}</span>
                    <span className={log.status === 'success' ? 'text-emerald-400 font-bold' : 'text-rose-500 font-bold'}>
                      {log.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
              {securityAudits.length === 0 && (
                <div className="text-center py-8 text-gray-500">No security logs recorded.</div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
