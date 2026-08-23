import { useState, useEffect } from 'react';
import {
  Shield, Key, FileText, Clipboard, AlertTriangle, Check,
  RefreshCw, Lock, ChevronRight, Eye, EyeOff, XCircle,
} from 'lucide-react';
import { getBadgeStyles } from '../../design-system/theme-utils';

// ── Role colour helpers ──────────────────────────────────────────────────────
const ROLE_STYLE: Record<string, { color: string; bg: string; border: string }> = {
  ADMIN: { color: 'var(--risk-moderate-text)', bg: 'var(--risk-moderate-bg)', border: 'var(--risk-moderate-border)' },
  ANALYST: { color: 'var(--info-blue-text)', bg: 'var(--info-blue-subtle)', border: 'var(--info-blue)' },
  ML_ENGINEER: { color: 'var(--risk-low-text)', bg: 'var(--risk-low-bg)', border: 'var(--risk-low-border)' },
  VIEWER: { color: 'var(--text-secondary)', bg: 'var(--bg-secondary)', border: 'var(--border-default)' },
};

function formatTimestamp(ts: string | null | undefined): string {
  if (!ts) return 'N/A';
  try {
    const d = new Date(ts);
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    });
  } catch {
    return ts;
  }
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface SecurityCenterProps {
  securityStatus: any;
  securityKeys: any[];
  securityAudits: any[];
  activeApiKey: string;
  userRole: string;
  onApiKeyChange: (key: string) => void;
  securityError: string | null;
  onGenerateKey: (actorId: string, actorRole: string, expiresInDays: number) => Promise<any>;
  onRevokeKey: (publicId: string) => Promise<void>;
  onRefresh: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function SecurityCenter({
  securityStatus,
  securityKeys,
  securityAudits,
  activeApiKey,
  userRole,
  onApiKeyChange,
  securityError,
  onGenerateKey,
  onRevokeKey,
  onRefresh,
}: SecurityCenterProps) {
  const isAdmin = userRole === 'ADMIN';

  // ── Local state ──────────────────────────────────────────────────────────
  const [showKey, setShowKey] = useState(false);
  const [newKeyActorId, setNewKeyActorId] = useState('');
  const [newKeyActorRole, setNewKeyActorRole] = useState('VIEWER');
  const [newKeyExpiryDays, setNewKeyExpiryDays] = useState(30);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [auditPage, setAuditPage] = useState(1);

  useEffect(() => {
    setGeneratedKey(null);
    setActionError(null);
  }, [userRole]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCopy = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyActorId.trim()) return;
    setSubmitting(true);
    setActionError(null);
    setGeneratedKey(null);
    try {
      const res = await onGenerateKey(newKeyActorId.trim(), newKeyActorRole, newKeyExpiryDays);
      const key = res?.plaintext_key ?? res?.api_key ?? null;
      if (key) {
        setGeneratedKey(key);
        setNewKeyActorId('');
      } else {
        setActionError('Key generation succeeded but no secret key was returned by the server.');
      }
    } catch (err: any) {
      setActionError(err.message || 'Key generation failed. Check server logs.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (publicId: string) => {
    if (activeApiKey.includes(publicId)) {
      alert(`Cannot revoke the key you are currently using (${publicId}). Switch to a different role first.`);
      return;
    }
    if (!window.confirm(`Permanently revoke API key "${publicId}"? This cannot be undone.`)) return;
    setRevoking(publicId);
    try {
      await onRevokeKey(publicId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to revoke key.');
    } finally {
      setRevoking(null);
    }
  };

  // ── Audit pagination ──────────────────────────────────────────────────────
  const LOGS_PER_PAGE = 8;
  const totalAuditPages = Math.max(1, Math.ceil(securityAudits.length / LOGS_PER_PAGE));
  const pagedLogs = securityAudits.slice(
    (auditPage - 1) * LOGS_PER_PAGE,
    auditPage * LOGS_PER_PAGE,
  );

  return (
    <div className="space-y-5 font-manrope select-none" style={{ color: 'var(--text-primary)' }}>

      {/* ── Header: Credential Config ─────────────────────────────────────── */}
      <div className="navy-card p-5 space-y-4">
        <h3
          className="text-xs font-black tracking-widest uppercase pb-3 border-b flex items-center gap-2 font-space"
          style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
        >
          <Shield className="w-4 h-4" style={{ color: 'var(--info-blue)' }} />
          Active Security Credentials Configuration
          <button
            onClick={onRefresh}
            className="ml-auto flex items-center gap-1 transition text-[10px] font-inter cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Left: token input */}
          <div className="space-y-3">
            <div>
              <label
                className="text-[10px] uppercase font-bold block mb-1.5 font-space tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                Set Session Authorization Token
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={showKey ? 'text' : 'password'}
                    placeholder="erp_<public_id>_<secret>"
                    value={activeApiKey}
                    onChange={(e) => onApiKeyChange(e.target.value)}
                    className="w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-geist pr-8 border"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 transition cursor-pointer"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <p className="text-[10px] mt-1.5 leading-relaxed font-inter" style={{ color: 'var(--text-muted)' }}>
                Credentials are saved to browser session storage. Governance and key-management routes require scoped tokens.
              </p>
            </div>

            {securityError && (
              <div
                className="p-2.5 rounded-lg flex items-center gap-2 text-xs font-inter border"
                style={getBadgeStyles('high')}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{securityError}</span>
              </div>
            )}
          </div>

          {/* Right: live status metadata */}
          <div className="space-y-1.5 border-l pl-6 font-geist text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex justify-between border-b py-1.5" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="uppercase text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>AUTHORIZATION ROLE</span>
              <span
                className="font-bold uppercase tracking-wider text-[11px] px-1.5 py-0.5 rounded border"
                style={ROLE_STYLE[userRole] ? {
                  color: ROLE_STYLE[userRole].color,
                  backgroundColor: ROLE_STYLE[userRole].bg,
                  borderColor: ROLE_STYLE[userRole].border,
                } : { color: 'var(--text-primary)' }}
              >
                {userRole}
              </span>
            </div>
            <div className="flex justify-between border-b py-1.5" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="uppercase text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>ACTOR ID</span>
              <span className="font-medium text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                {securityStatus?.actor_id ?? '—'}
              </span>
            </div>
            <div className="flex justify-between border-b py-1.5" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="uppercase text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>CLIENT ENCRYPTION</span>
              <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>HMAC-SHA256</span>
            </div>
            <div className="flex justify-between border-b py-1.5" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="uppercase text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>SSRF PROTECTION</span>
              <span className="font-semibold" style={{ color: 'var(--risk-low)' }}>ACTIVE</span>
            </div>
            <div className="flex justify-between border-b py-1.5" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="uppercase text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>ENVIRONMENT</span>
              <span className="font-medium uppercase" style={{ color: 'var(--text-secondary)' }}>{securityStatus?.environment ?? 'development'}</span>
            </div>
            {/* Active scopes */}
            {securityStatus?.scopes && (
              <div className="pt-1.5">
                <span className="uppercase text-[10px] font-medium block mb-1.5" style={{ color: 'var(--text-muted)' }}>ACTIVE SCOPES</span>
                <div className="flex flex-wrap gap-1">
                  {securityStatus.scopes.map((s: string) => (
                    <span
                      key={s}
                      className="text-[9px] px-1.5 py-0.5 rounded border font-space font-bold uppercase"
                      style={getBadgeStyles('info')}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Generated Key Banner ─────────────────────────────────────────────── */}
      {generatedKey && (
        <div
          className="navy-card p-4 space-y-2.5 border"
          style={{ borderColor: 'var(--risk-low-border)' }}
        >
          <div className="flex justify-between items-center pb-2 border-b" style={{ borderColor: 'var(--border-default)', color: 'var(--risk-low)' }}>
            <span className="font-semibold uppercase font-space text-xs flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> API Key Successfully Provisioned
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-[10px] cursor-pointer font-medium font-inter transition-colors"
                style={{ color: 'var(--text-primary)' }}
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Clipboard className="w-3 h-3" />}
                <span>{copied ? 'COPIED!' : 'COPY SECRET'}</span>
              </button>
              <button onClick={() => setGeneratedKey(null)} className="cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div
            className="border rounded-lg p-2.5 select-all font-medium text-xs text-center break-all select-text font-geist"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-default)',
              color: 'var(--risk-low)',
            }}
          >
            {generatedKey}
          </div>
          <p className="text-[10px] leading-relaxed font-inter" style={{ color: 'var(--risk-moderate)' }}>
            ⚠ IMPORTANT: Save this secret key now — it will not be displayed again after you close this banner.
          </p>
        </div>
      )}

      {/* ── Main Grid ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* ── Left: Keys Inventory + Provision ─────────────────────────────── */}
        <div className="lg:col-span-7 space-y-4">

          {/* Key inventory table */}
          <div className="navy-card p-4 space-y-3">
            <h3
              className="text-xs font-bold tracking-widest uppercase pb-2.5 flex items-center gap-2 font-space border-b"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
            >
              <Key className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              API Credentials Inventory
              {!isAdmin && (
                <span className="ml-auto text-[9px] font-inter font-medium flex items-center gap-1" style={{ color: 'var(--risk-moderate)' }}>
                  <Lock className="w-2.5 h-2.5" /> Own key only
                </span>
              )}
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-geist">
                <thead>
                  <tr className="border-b uppercase text-[9px] tracking-wider" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                    <th className="pb-2 pr-3">PUBLIC ID</th>
                    <th className="pb-2 pr-3">ACTOR</th>
                    <th className="pb-2 pr-3">ROLE</th>
                    <th className="pb-2 pr-3">EXPIRES</th>
                    <th className="pb-2 text-right">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                  {securityKeys.map((key: any) => {
                    const isRevoked = key.revoked === true || key.revoked === 1;
                    const isOwnKey = activeApiKey.includes(key.public_id);
                    return (
                      <tr key={key.public_id} className={isRevoked ? 'opacity-50' : ''}>
                        <td className="py-2 pr-3 font-medium font-mono text-[11px]" style={{ color: 'var(--text-primary)' }}>
                          {key.public_id}
                          {isOwnKey && (
                            <span
                              className="ml-1.5 text-[9px] border px-1 py-0.5 rounded font-space"
                              style={getBadgeStyles('info')}
                            >
                              ACTIVE SESSION
                            </span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-[11px]" style={{ color: 'var(--text-secondary)' }}>{key.actor_id}</td>
                        <td className="py-2 pr-3 font-bold text-[11px]">
                          <span
                            className="px-1.5 py-0.5 rounded border text-[9px] uppercase"
                            style={ROLE_STYLE[key.actor_role] ? {
                              color: ROLE_STYLE[key.actor_role].color,
                              backgroundColor: ROLE_STYLE[key.actor_role].bg,
                              borderColor: ROLE_STYLE[key.actor_role].border,
                            } : { color: 'var(--text-secondary)' }}
                          >
                            {key.actor_role}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {key.expires_at ? key.expires_at.split('T')[0] : 'NEVER'}
                        </td>
                        <td className="py-2 text-right">
                          {isRevoked ? (
                            <span className="uppercase font-bold text-[9px]" style={{ color: 'var(--text-muted)' }}>REVOKED</span>
                          ) : isAdmin && !isOwnKey ? (
                            <button
                              onClick={() => handleRevoke(key.public_id)}
                              disabled={revoking === key.public_id}
                              className="px-2 py-0.5 rounded border transition cursor-pointer font-bold text-[9px] disabled:opacity-50"
                              style={getBadgeStyles('high')}
                            >
                              {revoking === key.public_id ? '...' : 'REVOKE'}
                            </button>
                          ) : (
                            <span
                              className="font-bold uppercase text-[9px] px-1.5 py-0.5 rounded border"
                              style={getBadgeStyles('low')}
                            >
                              ACTIVE
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {securityKeys.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 font-inter text-xs" style={{ color: 'var(--text-muted)' }}>
                        No keys found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Provision form — ADMIN only */}
          {isAdmin ? (
            <div className="navy-card p-4 space-y-3">
              <h3
                className="text-xs font-bold tracking-widest uppercase pb-2.5 flex items-center gap-2 font-space border-b"
                style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
              >
                <Key className="w-3.5 h-3.5" style={{ color: 'var(--info-blue)' }} />
                Provision New API Key
              </h3>

              {actionError && (
                <div
                  className="p-2.5 rounded-lg text-xs font-inter flex items-start gap-2 border"
                  style={getBadgeStyles('high')}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{actionError}</span>
                </div>
              )}

              <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold font-space tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    ACTOR ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. system_cron"
                    value={newKeyActorId}
                    onChange={(e) => setNewKeyActorId(e.target.value)}
                    className="w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-geist border"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold font-space tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    SCOPE ROLE
                  </label>
                  <select
                    value={newKeyActorRole}
                    onChange={(e) => setNewKeyActorRole(e.target.value)}
                    className="w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-geist cursor-pointer border"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="VIEWER">VIEWER</option>
                    <option value="ANALYST">ANALYST</option>
                    <option value="ML_ENGINEER">ML_ENGINEER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold font-space tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    EXPIRY DAYS
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={newKeyExpiryDays}
                    onChange={(e) => setNewKeyExpiryDays(parseInt(e.target.value))}
                    className="w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none font-geist border"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border-default)',
                      color: 'var(--text-primary)',
                    }}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center justify-center gap-1.5 font-bold py-1.5 rounded-lg transition uppercase tracking-wider text-[10px] border cursor-pointer font-space"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-default)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {submitting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
                  {submitting ? 'GENERATING...' : 'PROVISION KEY'}
                </button>
              </form>
            </div>
          ) : (
            <div className="navy-card p-4 flex items-center gap-3">
              <Lock className="w-5 h-5 shrink-0" style={{ color: 'var(--text-muted)' }} />
              <div>
                <p className="text-xs font-semibold font-space" style={{ color: 'var(--text-primary)' }}>Key Provisioning Restricted</p>
                <p className="text-[11px] font-inter mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  You need the <span className="font-semibold" style={{ color: 'var(--info-blue)' }}>ADMIN</span> role to provision or revoke API keys.
                  Switch roles using the role selector in the top navigation bar.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Audit Log ─────────────────────────────────────────────── */}
        <div className="lg:col-span-5">
          <div className="navy-card p-4 space-y-3 h-full">
            <h3
              className="text-xs font-bold tracking-widest uppercase pb-2.5 flex items-center gap-2 font-space border-b"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
            >
              <FileText className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              Security Audit Stream
              {!isAdmin && (
                <span className="ml-auto text-[9px] font-inter flex items-center gap-1" style={{ color: 'var(--risk-moderate)' }}>
                  <Lock className="w-2.5 h-2.5" /> Own events only
                </span>
              )}
            </h3>

            {securityAudits.length === 0 ? (
              <div className="text-center py-10 font-inter text-xs" style={{ color: 'var(--text-muted)' }}>
                {isAdmin ? 'No security events recorded yet.' : 'No personal events recorded yet.'}
              </div>
            ) : (
              <>
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1 scrollbar">
                  {pagedLogs.map((log: any, idx: number) => {
                    const isSuccess = (log.status ?? '').toLowerCase() === 'success';
                    return (
                      <div
                        key={log.id ?? idx}
                        className="rounded-lg p-2.5 border space-y-1"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          borderColor: 'var(--border-subtle)',
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-semibold font-geist" style={{ color: 'var(--text-primary)' }}>
                            {log.action}
                          </span>
                          <span
                            className="text-[9px] font-bold font-space px-1.5 py-0.5 rounded border"
                            style={getBadgeStyles(isSuccess ? 'low' : 'high')}
                          >
                            {(log.status ?? 'UNKNOWN').toUpperCase()}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] font-geist" style={{ color: 'var(--text-muted)' }}>
                          <span>
                            {log.actor_id ? (
                              <>
                                <span style={{ color: 'var(--text-secondary)' }}>{log.actor_id}</span>
                                {log.actor_role && (
                                  <span className="ml-1" style={{ color: 'var(--text-muted)' }}>
                                    ({log.actor_role})
                                  </span>
                                )}
                              </>
                            ) : 'UNKNOWN'}
                          </span>
                          <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{log.resource}</span>
                        </div>
                        <div className="flex justify-between text-[9px] font-geist" style={{ color: 'var(--text-muted)' }}>
                          <span>IP: {log.ip_address ?? '—'}</span>
                          <span>{formatTimestamp(log.timestamp)}</span>
                        </div>
                        {log.reason && (
                          <p className="text-[9px] font-inter italic border-t pt-1" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                            {log.reason}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Pagination */}
                {totalAuditPages > 1 && (
                  <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                    <button
                      onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                      disabled={auditPage === 1}
                      className="text-[10px] disabled:opacity-30 font-inter cursor-pointer transition"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      ← Prev
                    </button>
                    <span className="text-[10px] font-geist" style={{ color: 'var(--text-muted)' }}>
                      {auditPage} / {totalAuditPages}
                    </span>
                    <button
                      onClick={() => setAuditPage(p => Math.min(totalAuditPages, p + 1))}
                      disabled={auditPage === totalAuditPages}
                      className="text-[10px] disabled:opacity-30 font-inter cursor-pointer transition"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
