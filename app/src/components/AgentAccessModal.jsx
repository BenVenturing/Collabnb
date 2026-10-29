import { useState } from 'react';
import { useQuery, useAction, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useTranslation } from 'react-i18next';

const MCP_URL = `${import.meta.env.VITE_CONVEX_SITE_URL}/mcp`;

const label = { display: 'block', fontSize: '0.7rem', fontWeight: 700, color: 'var(--sage)', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.08em' };
const input = { width: '100%', padding: '0.75rem 1rem', borderRadius: '0.875rem', background: 'rgba(255,255,255,0.75)', border: '1px solid rgba(25,37,36,0.12)', fontFamily: 'var(--font-body)', fontSize: '0.875rem', color: 'var(--ink)', outline: 'none', boxSizing: 'border-box' };
const code = { display: 'block', padding: '0.625rem 0.75rem', borderRadius: '0.625rem', background: 'rgba(25,37,36,0.06)', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.7rem', color: 'var(--ink)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', margin: 0 };

function CopyBlock({ text, t }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <pre style={code}>{text}</pre>
      <button
        type="button"
        onClick={async () => { try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {} }}
        style={{ position: 'absolute', top: '0.375rem', right: '0.375rem', padding: '0.2rem 0.5rem', borderRadius: '0.5rem', border: 'none', background: 'rgba(255,255,255,0.9)', fontSize: '0.68rem', fontWeight: 700, color: 'var(--slate)', cursor: 'pointer' }}
      >
        {copied ? t('agent.copied', 'Copied') : t('agent.copy', 'Copy')}
      </button>
    </div>
  );
}

export default function AgentAccessModal({ onClose }) {
  const { t } = useTranslation('settings');
  const keys = useQuery(api.mcp.listMyKeys, {});
  const createKey = useAction(api.mcp.createApiKey);
  const revokeKey = useMutation(api.mcp.revokeKey);
  const [name, setName] = useState('');
  const [newKey, setNewKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const claudeCmd = `claude mcp add --transport http collabnb ${MCP_URL} --header "Authorization: Bearer ${newKey || 'YOUR_KEY'}"`;
  const genericCfg = JSON.stringify({ mcpServers: { collabnb: { type: 'http', url: MCP_URL, headers: { Authorization: `Bearer ${newKey || 'YOUR_KEY'}` } } } }, null, 2);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 10000, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '1rem', background: 'rgba(25,37,36,0.5)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        style={{ width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '1.5rem', padding: 'clamp(1.25rem, 5vw, 2rem)', background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(255,255,255,0.85)', boxShadow: '0 20px 60px rgba(25,37,36,0.18)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.15rem', color: 'var(--slate)', margin: 0 }}>{t('agent.title', 'Agent access (MCP)')}</h4>
          <button onClick={onClose} style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'rgba(209,235,219,0.5)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--slate)' }}>✕</button>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'var(--sage)', margin: '0 0 1.25rem', lineHeight: 1.5 }}>
          {t('agent.body', 'Run your Collabnb account from Claude, Codex, Grok, Hermes or any MCP-compatible agent: search and apply to stays, review applicants, read, draft and send replies, edit listings, manage saved stays and check your stats. Agents act as you, but can never pay, sign contracts or publish.')}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.5rem', padding: '1rem', borderRadius: '1rem', background: 'rgba(209,235,219,0.25)' }}>
          <span style={label}>{t('agent.signInTitle', 'Claude.ai & Claude Desktop — sign in, no key needed')}</span>
          <ol style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.78rem', color: 'var(--slate)', lineHeight: 1.6 }}>
            <li>{t('agent.signInStep1', 'In Claude, open Settings → Connectors → Add custom connector.')}</li>
            <li>{t('agent.signInStep2', 'Name it "Collabnb" and paste this URL:')}</li>
          </ol>
          <CopyBlock text={MCP_URL} t={t} />
          <ol start={3} style={{ margin: 0, paddingLeft: '1.1rem', fontSize: '0.78rem', color: 'var(--slate)', lineHeight: 1.6 }}>
            <li>{t('agent.signInStep3', 'Click Add, then Connect, and sign in with your Collabnb account.')}</li>
          </ol>
          <p style={{ fontSize: '0.72rem', color: 'var(--sage)', margin: 0, lineHeight: 1.5 }}>
            {t('agent.signInNote', 'Works with any agent that supports MCP sign-in (OAuth). To disconnect, remove the connector in Claude.')}
          </p>
        </div>

        <span style={label}>{t('agent.apiKeyTitle', 'Or use an API key (Claude Code, Codex, Cursor, Grok, Hermes)')}</span>

        {newKey ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '0.75rem 1rem', borderRadius: '0.875rem', background: 'rgba(255,200,80,0.18)', fontSize: '0.78rem', color: 'var(--slate)', fontWeight: 600 }}>
              {t('agent.copyOnce', "Copy this key now — you won't be able to see it again.")}
            </div>
            <CopyBlock text={newKey} t={t} />
            <span style={label}>{t('agent.claudeCode', 'Claude Code')}</span>
            <CopyBlock text={claudeCmd} t={t} />
            <span style={label}>{t('agent.otherAgents', 'Codex, Cursor, Grok, Hermes & other agents')}</span>
            <CopyBlock text={genericCfg} t={t} />
            <button className="btn-glass" style={{ fontSize: '0.85rem' }} onClick={() => setNewKey('')}>{t('agent.done', 'Done')}</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={label}>{t('agent.keyName', 'Key name')}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('agent.keyNamePlaceholder', 'e.g. Claude on my laptop')} style={input} maxLength={60} />
            </div>
            {error && <p style={{ fontSize: '0.78rem', color: '#b3261e', margin: 0 }}>{error}</p>}
            <button
              className="btn-primary"
              style={{ fontSize: '0.85rem' }}
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  setNewKey(await createKey({ name: name.trim() || 'Agent' }));
                  setName('');
                } catch (err) {
                  setError(err?.data || err?.message || t('agent.errorCreate', "Couldn't create a key."));
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? t('agent.creating', 'Creating…') : t('agent.create', 'Create API key')}
            </button>
          </div>
        )}

        {keys?.length > 0 && (
          <div>
            <span style={label}>{t('agent.activeKeys', 'Active keys')}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {keys.map((k) => (
                <div key={k.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', padding: '0.625rem 0.875rem', borderRadius: '0.875rem', background: 'rgba(209,235,219,0.25)' }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--slate)' }}>{k.name}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--sage)' }}>
                      {k.prefix}… · {k.last_used_at
                        ? t('agent.lastUsed', 'last used {{date}}', { date: new Date(k.last_used_at).toLocaleDateString() })
                        : t('agent.neverUsed', 'never used')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => revokeKey({ id: k.id })}
                    style={{ flexShrink: 0, padding: '0.35rem 0.75rem', borderRadius: '0.625rem', border: '1px solid rgba(239,68,68,0.35)', background: 'none', color: '#ef4444', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {t('agent.revoke', 'Revoke')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
