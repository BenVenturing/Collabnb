import { useState } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const INK   = '#192524';
const SLATE = '#3C5759';
const SAGE  = '#959D90';
const BONE  = '#F7F5F2';
const MINT  = '#D1EBDB';

const AUDIENCES = [
  { id: 'all',      label: 'All Verified',   icon: 'A', desc: 'Every verified user' },
  { id: 'creators', label: 'Creators',        icon: 'C', desc: 'Verified creators'    },
  { id: 'hosts',    label: 'Hosts',           icon: 'H', desc: 'Verified hosts'       },
  { id: 'founders', label: 'Founders',        icon: 'F', desc: 'Founder-status users' },
];

function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const FIELD_LABELS = {
  subject:       'Subject line',
  heading:       'Heading',
  body:          'Body',
  calloutLabel:  'Callout label',
  calloutText:   'Callout text',
  callout2Label: 'Second callout label',
  callout2Text:  'Second callout text',
  buttonLabel:   'Button label',
  footnote:      'Footnote',
};
const TEXTAREA_FIELDS = new Set(['body', 'calloutText', 'callout2Text', 'footnote']);

function TemplateCard({ t, testEmail }) {
  const [open, setOpen]       = useState(false);
  const [values, setValues]   = useState(() => ({ ...t.current }));
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // 'ok' | error string

  const save     = useMutation(api.emailTemplates.save);
  const reset    = useMutation(api.emailTemplates.reset);
  const sendTest = useAction(api.emailTemplates.sendTest);

  const fields = Object.keys(t.defaults);
  const dirty  = fields.some(f => (values[f] ?? '') !== (t.current[f] ?? ''));

  async function handleSave() {
    setSaving(true);
    try {
      const copy = {};
      // Only persist fields that differ from the code default; blanks fall back too.
      for (const f of fields) {
        const val = (values[f] ?? '').trim();
        copy[f] = val !== '' && val !== t.defaults[f] ? values[f] : undefined;
      }
      await save({ templateId: t.id, ...copy });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    await reset({ templateId: t.id });
    setValues({ ...t.defaults });
  }

  async function handleTest() {
    if (!testEmail.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      await sendTest({ templateId: t.id, to: testEmail.trim() });
      setTestResult('ok');
    } catch (err) {
      setTestResult(err?.message || 'Test send failed.');
    } finally {
      setTesting(false);
      setTimeout(() => setTestResult(null), 4000);
    }
  }

  return (
    <div style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.08)', borderRadius: '0.75rem', overflow: 'hidden' }}>
      {/* Row header */}
      <button
        onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', padding: '0.8rem 1rem', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}
      >
        <span style={{ color: SAGE, fontSize: '0.7rem', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▶</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: INK }}>{t.name}</span>
            {t.customized && (
              <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: 99, background: '#FEF3C7', color: '#92400E' }}>Customized</span>
            )}
          </div>
          <div style={{ fontSize: '0.72rem', color: SAGE, marginTop: '0.1rem' }}>{t.trigger}</div>
        </div>
        <span style={{ fontSize: '0.72rem', color: SLATE, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {values.subject}
        </span>
      </button>

      {/* Editor */}
      {open && (
        <div style={{ padding: '0 1rem 1rem', borderTop: '1px solid rgba(25,37,36,0.06)' }}>
          {/* Variables legend */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center', margin: '0.75rem 0' }}>
            <span style={{ fontSize: '0.68rem', color: SAGE }}>Variables:</span>
            {t.vars.map(v => (
              <code key={v} style={{ fontSize: '0.68rem', padding: '0.1rem 0.4rem', borderRadius: '0.3rem', background: BONE, color: SLATE }}>
                {v === 'name' ? '{name}' : `{{${v}}}`}
              </code>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {fields.map(f => (
              <div key={f}>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: SLATE, marginBottom: '0.25rem' }}>{FIELD_LABELS[f] || f}</label>
                {TEXTAREA_FIELDS.has(f) ? (
                  <textarea
                    value={values[f] ?? ''}
                    onChange={e => setValues(prev => ({ ...prev, [f]: e.target.value }))}
                    rows={2}
                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '0.5rem', border: '1px solid rgba(25,37,36,0.12)', fontSize: '0.78rem', fontFamily: 'inherit', color: INK, outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5 }}
                  />
                ) : (
                  <input
                    value={values[f] ?? ''}
                    onChange={e => setValues(prev => ({ ...prev, [f]: e.target.value }))}
                    style={{ width: '100%', padding: '0.45rem 0.65rem', borderRadius: '0.5rem', border: '1px solid rgba(25,37,36,0.12)', fontSize: '0.78rem', fontFamily: 'inherit', color: INK, outline: 'none', boxSizing: 'border-box' }}
                  />
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.875rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              style={{ padding: '0.4rem 1rem', borderRadius: '0.5rem', background: dirty ? INK : '#D0D5CE', color: '#fff', fontSize: '0.78rem', fontWeight: 600, border: 'none', cursor: saving || !dirty ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
            >
              {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save copy'}
            </button>
            {t.customized && (
              <button
                onClick={handleReset}
                style={{ padding: '0.4rem 0.875rem', borderRadius: '0.5rem', background: 'transparent', color: SLATE, fontSize: '0.78rem', border: '1px solid rgba(25,37,36,0.12)', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Reset to default
              </button>
            )}
            <button
              onClick={handleTest}
              disabled={testing || !testEmail.trim()}
              style={{ padding: '0.4rem 0.875rem', borderRadius: '0.5rem', background: '#fff', color: '#166534', fontSize: '0.78rem', fontWeight: 600, border: '1px solid rgba(22,101,52,0.25)', cursor: testing ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
            >
              {testing ? 'Sending…' : '✈️ Send test'}
            </button>
            {testResult === 'ok' && <span style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 600 }}>Test sent to {testEmail}</span>}
            {testResult && testResult !== 'ok' && <span style={{ fontSize: '0.75rem', color: '#991B1B' }}>{testResult}</span>}
            {dirty && <span style={{ fontSize: '0.72rem', color: '#D97706' }}>Unsaved changes — tests use the last saved copy.</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function Templates() {
  const templates = useQuery(api.emailTemplates.list);
  const [testEmail, setTestEmail] = useState('benventuring@gmail.com');

  if (templates === undefined) {
    return <div style={{ color: SAGE, fontSize: '0.85rem', padding: '2rem 0' }}>Loading templates…</div>;
  }

  const categories = [...new Set(templates.map(t => t.category))];

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.78rem', color: SLATE, fontWeight: 600 }}>Send tests to</span>
        <input
          value={testEmail}
          onChange={e => setTestEmail(e.target.value)}
          style={{ padding: '0.4rem 0.75rem', borderRadius: '0.5rem', border: '1px solid rgba(25,37,36,0.12)', fontSize: '0.8rem', fontFamily: 'inherit', color: INK, outline: 'none', minWidth: 240, background: '#fff' }}
        />
        <span style={{ fontSize: '0.72rem', color: SAGE }}>Tests use sample data and a [TEST] subject prefix.</span>
      </div>

      {categories.map(cat => (
        <div key={cat} style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: SAGE, marginBottom: '0.625rem' }}>{cat}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {templates.filter(t => t.category === cat).map(t => (
              <TemplateCard key={`${t.id}-${t.updatedAt ?? 'default'}`} t={t} testEmail={testEmail} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Broadcast() {
  const [mode, setMode]         = useState('broadcast');
  const [audience, setAudience] = useState('all');
  const [subject,  setSubject]  = useState('');
  const [body,     setBody]     = useState('');
  const [copied,      setCopied]      = useState(false);
  const [sending,     setSending]     = useState(false);
  const [sendResult,  setSendResult]  = useState(null); // { sent: N } | { error: string }
  const [showHistory, setShowHistory] = useState(false);

  const emailList     = useQuery(api.admin.getEmailList, { audience });
  const broadcasts    = useQuery(api.admin.getBroadcasts);
  const saveBroadcast = useMutation(api.admin.saveBroadcast);
  const broadcastSend = useAction(api.admin.broadcastSend);

  const emails = emailList?.map((r) => r.email) ?? [];
  const selected = AUDIENCES.find((a) => a.id === audience);

  function copyEmails() {
    if (!emails.length) return;
    navigator.clipboard.writeText(emails.join(', ')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  function openInMail() {
    if (!emails.length) return;
    const bcc = emails.join(',');
    const params = new URLSearchParams();
    if (subject) params.set('subject', subject);
    if (body)    params.set('body', body);
    window.location.href = `mailto:?bcc=${encodeURIComponent(bcc)}${params.toString() ? '&' + params.toString() : ''}`;
    if (subject) {
      try { saveBroadcast({ audience, subject, recipientCount: emails.length }); } catch {}
    }
  }

  async function sendViaResend() {
    if (!emails.length || !subject.trim() || sending) return;
    setSending(true);
    setSendResult(null);
    try {
      const result = await broadcastSend({ audience, subject, body });
      setSendResult({ sent: result.sent });
    } catch (err) {
      setSendResult({ error: err?.message || 'Send failed. Check that RESEND_API_KEY is set in Convex.' });
    }
    setSending(false);
  }

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 700 }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: INK, letterSpacing: '-0.025em', margin: 0 }}>
        Emails
      </h1>
      <p style={{ fontSize: '0.85rem', color: SAGE, marginTop: '0.3rem', marginBottom: '1.25rem' }}>
        {mode === 'broadcast' ? 'Send an email to a segment of your users.' : 'Edit the copy of every automated email — changes apply to real sends immediately.'}
      </p>

      {/* Mode switch */}
      <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '1.5rem', background: BONE, padding: '0.2rem', borderRadius: 999, width: 'fit-content', border: '1px solid rgba(25,37,36,0.06)' }}>
        {[
          { id: 'broadcast', label: 'Broadcast' },
          { id: 'templates', label: 'Templates' },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            style={{
              padding: '0.4rem 1rem', borderRadius: 999, fontSize: '0.82rem',
              fontWeight: mode === m.id ? 600 : 400,
              background: mode === m.id ? INK : 'transparent',
              color: mode === m.id ? '#fff' : SLATE,
              border: 'none', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'templates' && <Templates />}

      {mode === 'broadcast' && <>
      {/* Audience */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: SAGE, marginBottom: '0.75rem' }}>Audience</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.625rem' }}>
          {AUDIENCES.map((a) => {
            const active = audience === a.id;
            return (
              <button
                key={a.id}
                onClick={() => setAudience(a.id)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
                  padding: '0.875rem 1rem', borderRadius: '0.75rem', textAlign: 'left',
                  background: active ? INK : '#fff',
                  color: active ? '#fff' : SLATE,
                  border: `1.5px solid ${active ? 'transparent' : 'rgba(25,37,36,0.1)'}`,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <span style={{ width: 28, height: 28, borderRadius: '0.4rem', background: 'rgba(25,37,36,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 }}>{a.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{a.label}</div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.7, marginTop: '0.1rem' }}>{a.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recipient count */}
      <div style={{ background: emailList === undefined ? BONE : MINT, borderRadius: '0.625rem', padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        {emailList === undefined ? (
          <span style={{ fontSize: '0.82rem', color: SAGE }}>Loading recipients…</span>
        ) : (
          <>
            <span style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: '1.25rem', color: '#166534', lineHeight: 1 }}>{emails.length}</span>
            <span style={{ fontSize: '0.82rem', color: SLATE }}>recipient{emails.length !== 1 ? 's' : ''} in <strong>{selected?.label}</strong></span>
          </>
        )}
      </div>

      {/* Compose */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: SAGE, marginBottom: '0.75rem' }}>Compose (optional)</div>
        <div style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.1)', borderRadius: '0.75rem', overflow: 'hidden' }}>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject line…"
            style={{ display: 'block', width: '100%', padding: '0.75rem 1rem', border: 'none', borderBottom: '1px solid rgba(25,37,36,0.07)', fontSize: '0.875rem', fontFamily: 'inherit', color: INK, background: 'transparent', outline: 'none', boxSizing: 'border-box' }}
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message here…"
            rows={6}
            style={{ display: 'block', width: '100%', padding: '0.875rem 1rem', border: 'none', fontSize: '0.875rem', fontFamily: 'inherit', color: INK, background: 'transparent', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          onClick={sendViaResend}
          disabled={!emails.length || !subject.trim() || sending}
          style={{
            padding: '0.6rem 1.375rem', borderRadius: '0.5rem',
            background: (!emails.length || !subject.trim() || sending) ? '#D0D5CE' : INK,
            color: '#fff', fontSize: '0.875rem', fontWeight: 600,
            border: 'none', cursor: (!emails.length || !subject.trim() || sending) ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.4rem',
          }}
        >
          {sending ? '⏳ Sending…' : '🚀 Send via Resend'}
        </button>
        <button onClick={openInMail} disabled={!emails.length} style={{
          padding: '0.6rem 1rem', borderRadius: '0.5rem',
          background: '#fff', color: SLATE, fontSize: '0.875rem', fontWeight: 500,
          border: '1px solid rgba(25,37,36,0.12)',
          cursor: emails.length ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
        }}>
          ✉️ Mail client
        </button>
        <button onClick={copyEmails} disabled={!emails.length} style={{
          padding: '0.6rem 1rem', borderRadius: '0.5rem',
          background: copied ? MINT : '#fff',
          color: copied ? '#166534' : SLATE, fontSize: '0.875rem', fontWeight: 500,
          border: '1px solid rgba(25,37,36,0.12)',
          cursor: emails.length ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
        }}>
          {copied ? '✓ Copied!' : '📋 Copy Emails'}
        </button>
        <button onClick={() => setShowHistory(!showHistory)} style={{
          padding: '0.6rem 1rem', borderRadius: '0.5rem',
          background: '#fff', color: SLATE, fontSize: '0.875rem', fontWeight: 500,
          border: '1px solid rgba(25,37,36,0.12)',
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {showHistory ? '↑ Hide History' : 'History'}
        </button>
      </div>

      {!subject.trim() && emails.length > 0 && (
        <p style={{ fontSize: '0.75rem', color: '#D97706', marginTop: '0.625rem' }}>
          Add a subject line to enable sending.
        </p>
      )}

      {sendResult && (
        <div style={{
          marginTop: '0.875rem', padding: '0.625rem 1rem', borderRadius: '0.5rem',
          background: sendResult.error ? '#FEF2F2' : '#D1EBDB',
          color: sendResult.error ? '#991B1B' : '#166534',
          fontSize: '0.82rem', fontWeight: 500,
          border: `1px solid ${sendResult.error ? 'rgba(153,27,27,0.15)' : 'rgba(22,101,52,0.15)'}`,
        }}>
          {sendResult.error ? `⚠️ ${sendResult.error}` : `✓ Sent to ${sendResult.sent} recipient${sendResult.sent !== 1 ? 's' : ''}`}
        </div>
      )}

      {/* History */}
      {showHistory && (
        <div style={{ marginTop: '2rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: SAGE, marginBottom: '0.75rem' }}>Sent Broadcasts</div>
          {broadcasts === undefined ? (
            <div style={{ color: SAGE, fontSize: '0.82rem' }}>Loading…</div>
          ) : broadcasts.length === 0 ? (
            <div style={{ color: SAGE, fontSize: '0.82rem', padding: '1rem 0' }}>No broadcasts sent yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {broadcasts.map((b) => (
                <div key={String(b._id)} style={{ padding: '0.75rem 1rem', background: '#fff', borderRadius: '0.625rem', border: '1px solid rgba(25,37,36,0.07)', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, color: INK }}>{b.subject}</span>
                    <span style={{ fontSize: '0.72rem', color: SAGE }}>{fmtDate(b.sent_at)}</span>
                  </div>
                  <div style={{ color: SLATE, fontSize: '0.75rem', marginTop: '0.2rem' }}>
                    Audience: {b.audience} · {b.recipient_count} recipients
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </>}
    </div>
  );
}
