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
    <div className="space-y-6 font-manrope select-none">
      {/* Configuration status header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase border-b border-slate-100 pb-3 flex items-center gap-2 font-space">
          <Shield className="w-4 h-4 text-blue-600" />
          Active Security Credentials Configuration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Left panel: configure key */}
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1.5 font-jakarta">Set Session Authorization Token</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Enter erp_ public_secret Bearer Token"
                  value={activeApiKey}
                  onChange={(e) => onApiKeyChange(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 font-geist"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed font-inter">
                Credentials are saved to browser local session storage. Requests to governance or key management routes require scoped tokens.
              </p>
            </div>

            {securityError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-xl flex items-center gap-2 text-xs font-inter">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{securityError}</span>
              </div>
            )}
          </div>

          {/* Right panel: current status metadata */}
          {securityStatus && (
            <div className="space-y-2 border-l border-slate-200 pl-6 font-geist">
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-500 font-bold text-[10px] uppercase">AUTHORIZATION ROLE</span>
                <span className="font-extrabold text-blue-700 uppercase tracking-widest">{currentRole}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-500 font-bold text-[10px] uppercase">CLIENT ENCRYPTION</span>
                <span className="font-extrabold text-slate-900">HMAC-SHA256 (SECURE)</span>
              </div>
              <div className="flex justify-between border-b border-slate-100 py-1.5">
                <span className="text-slate-500 font-bold text-[10px] uppercase">SSRF PROTECTION CLIENT</span>
                <span className="font-extrabold text-emerald-700">ACTIVE</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Generated key display modal block */}
      {generatedPlaintextKey && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 space-y-3">
          <div className="flex justify-between items-center text-blue-700 border-b border-blue-200 pb-2.5">
            <span className="font-extrabold uppercase font-space text-xs">API Key Successfully Provisioned</span>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-[10px] hover:text-blue-900 cursor-pointer font-bold font-inter"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Clipboard className="w-3 h-3" />}
              <span>{copied ? 'COPIED TO CLIPBOARD' : 'COPY SECRET'}</span>
            </button>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 select-all font-bold text-xs text-emerald-400 text-center break-all select-text font-geist">
            {generatedPlaintextKey}
          </div>
          <p className="text-[10px] text-amber-600 leading-relaxed font-bold font-inter">
            ⚠️ IMPORTANT: Save this secret key now. It will not be shown again.
          </p>
        </div>
      )}

      {/* Main security grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: API key inventory & generation */}
        <div className="lg:col-span-7 space-y-5">
          {/* Key list table */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase border-b border-slate-100 pb-3 flex items-center gap-2 font-space">
              <Key className="w-4 h-4 text-orange-600" />
              API Credentials Inventory
            </h3>

            <div className="overflow-x-auto max-h-[200px] overflow-y-auto pr-1 scrollbar">
              <table className="w-full text-left text-xs font-geist">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase text-[9px]">
                    <th className="pb-2">PUBLIC ID</th>
                    <th className="pb-2">ACTOR</th>
                    <th className="pb-2">SCOPE</th>
                    <th className="pb-2">EXPIRES</th>
                    <th className="pb-2 text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {securityKeys.map((key: any) => (
                    <tr key={key.public_id}>
                      <td className="py-2 font-bold text-slate-900">{key.public_id}</td>
                      <td className="py-2 uppercase">{key.actor_id}</td>
                      <td className="py-2 uppercase text-blue-700 font-bold">{key.actor_role}</td>
                      <td className="py-2 text-slate-500">{key.expires_at ? key.expires_at.split('T')[0] : 'NEVER'}</td>
                      <td className="py-2 text-right">
                        {key.is_active ? (
                          isAdmin ? (
                            <button
                              onClick={() => handleRevoke(key.public_id)}
                              className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white transition cursor-pointer font-extrabold text-[9px]"
                            >
                              REVOKE
                            </button>
                          ) : (
                            <span className="text-emerald-700 font-extrabold uppercase">ACTIVE</span>
                          )
                        ) : (
                          <span className="text-slate-400 uppercase font-bold">REVOKED</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {securityKeys.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-400 font-inter">No active keys registered.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Provision Key control */}
          {isAdmin && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase border-b border-slate-100 pb-3 font-space">
                Provision New API Key
              </h3>

              {actionError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-xl text-xs font-inter">
                  {actionError}
                </div>
              )}

              <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold font-jakarta">ACTOR ID</label>
                  <input
                    type="text"
                    placeholder="e.g. system_cron"
                    value={newKeyActorId}
                    onChange={(e) => setNewKeyActorId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 font-geist"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold font-jakarta">SCOPE ROLE</label>
                  <select
                    value={newKeyActorRole}
                    onChange={(e) => setNewKeyActorRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 font-geist cursor-pointer"
                  >
                    <option value="VIEWER">VIEWER</option>
                    <option value="ANALYST">ANALYST</option>
                    <option value="ML_ENGINEER">ML_ENGINEER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold font-jakarta">EXPIRY DAYS</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={newKeyExpiryDays}
                    onChange={(e) => setNewKeyExpiryDays(parseInt(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 font-geist"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-extrabold py-1.5 rounded-xl transition uppercase tracking-wider text-[10px] shadow-md shadow-orange-500/20 cursor-pointer font-space"
                >
                  PROVISION KEY
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Audit Logs timeline */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
            <h3 className="text-xs font-black tracking-wider text-slate-900 uppercase border-b border-slate-100 pb-3 flex items-center gap-2 font-space">
              <FileText className="w-4 h-4 text-blue-600" />
              Security Audit Stream Logs
            </h3>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 scrollbar">
              {securityAudits.map((log: any, idx: number) => (
                <div key={idx} className="border-b border-slate-100 last:border-0 pb-2.5 mb-2.5 last:pb-0 last:mb-0">
                  <div className="flex justify-between items-center text-[10px] font-geist text-slate-400">
                    <span className="font-bold text-blue-600">IP: {log.ip_address || '127.0.0.1'}</span>
                    <span>{log.timestamp ? log.timestamp.split('T')[0] : 'N/A'}</span>
                  </div>
                  <p className="text-xs text-slate-800 mt-1 leading-relaxed font-bold font-inter">
                    {log.action}
                  </p>
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5 font-geist">
                    <span>ACTOR: {log.actor_id || 'UNKNOWN'}</span>
                    <span className={log.status === 'success' ? 'text-emerald-700 font-extrabold' : 'text-rose-600 font-extrabold'}>
                      {log.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
              {securityAudits.length === 0 && (
                <div className="text-center py-8 text-slate-400 font-inter text-xs">No security logs recorded.</div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
