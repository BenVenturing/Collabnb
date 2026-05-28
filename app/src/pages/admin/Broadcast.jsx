import { useState } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../../convex/_generated/api';

const INK   = '#192524';
const SLATE = '#3C5759';
const SAGE  = '#959D90';
const BONE  = '#F7F5F2';
const MINT  = '#D1EBDB';

const AUDIENCES = [
  { id: 'all',      label: 'All Verified',   icon: '👥', desc: 'Every verified user on the platform' },
  { id: 'creators', label: 'Creators',        icon: '🎬', desc: 'Verified creators only'              },
  { id: 'hosts',    label: 'Hosts',           icon: '🏡', desc: 'Verified hosts only'                 },
  { id: 'founders', label: 'Founders',        icon: '🌟', desc: 'Founder-status users only'           },
];

export default function Broadcast() {
  const [audience, setAudience] = useState('all');
  const [subject,  setSubject]  = useState('');
  const [body,     setBody]     = useState('');
  const [copied,   setCopied]   = useState(false);

  const emailList = useQuery(api.admin.getEmailList, { audience });

  const emails = emailList?.map((r) => r.email) ?? [];

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
    const query = params.toString();
    window.location.href = `mailto:?bcc=${encodeURIComponent(bcc)}${query ? '&' + query : ''}`;
  }

  const selected = AUDIENCES.find((a) => a.id === audience);

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 700 }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: INK, letterSpacing: '-0.025em', margin: 0 }}>
        Broadcast
      </h1>
      <p style={{ fontSize: '0.85rem', color: SAGE, marginTop: '0.3rem', marginBottom: '1.75rem' }}>
        Send an email to a segment of your users via your mail client.
      </p>

      {/* ── Audience selector ── */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: SAGE, marginBottom: '0.75rem' }}>
          Audience
        </div>
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
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                }}
              >
                <span style={{ fontSize: '1.25rem', lineHeight: 1, marginTop: '0.1rem' }}>{a.icon}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{a.label}</div>
                  <div style={{ fontSize: '0.72rem', opacity: 0.7, marginTop: '0.1rem' }}>{a.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Recipient count ── */}
      <div style={{ background: emailList === undefined ? BONE : MINT, borderRadius: '0.625rem', padding: '0.75rem 1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
        {emailList === undefined ? (
          <span style={{ fontSize: '0.82rem', color: SAGE }}>Loading recipients…</span>
        ) : (
          <>
            <span style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontWeight: 700, fontSize: '1.25rem', color: '#166534', lineHeight: 1 }}>
              {emails.length}
            </span>
            <span style={{ fontSize: '0.82rem', color: SLATE }}>
              recipient{emails.length !== 1 ? 's' : ''} in <strong>{selected?.label}</strong>
            </span>
          </>
        )}
      </div>

      {/* ── Compose ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: SAGE, marginBottom: '0.75rem' }}>
          Compose (optional)
        </div>
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
            placeholder="Write your message here… (will pre-fill your mail client)"
            rows={6}
            style={{ display: 'block', width: '100%', padding: '0.875rem 1rem', border: 'none', fontSize: '0.875rem', fontFamily: 'inherit', color: INK, background: 'transparent', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* ── Actions ── */}
      <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap' }}>
        <button
          onClick={openInMail}
          disabled={!emails.length}
          style={{
            padding: '0.6rem 1.25rem', borderRadius: '0.5rem',
            background: emails.length ? INK : '#D0D5CE',
            color: '#fff', fontSize: '0.875rem', fontWeight: 600,
            border: 'none', cursor: emails.length ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '0.4rem',
          }}
        >
          ✉️ Open in Mail
        </button>

        <button
          onClick={copyEmails}
          disabled={!emails.length}
          style={{
            padding: '0.6rem 1.25rem', borderRadius: '0.5rem',
            background: copied ? MINT : '#fff',
            color: copied ? '#166534' : SLATE,
            fontSize: '0.875rem', fontWeight: 600,
            border: '1px solid rgba(25,37,36,0.12)',
            cursor: emails.length ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit', transition: 'all 0.2s',
          }}
        >
          {copied ? '✓ Copied!' : '📋 Copy Emails'}
        </button>
      </div>

      <p style={{ fontSize: '0.75rem', color: SAGE, marginTop: '1rem', lineHeight: 1.5 }}>
        "Open in Mail" launches your default mail client with all recipients in BCC and your message pre-filled.
        For large lists (&gt; 50), use "Copy Emails" and paste into your preferred email tool.
      </p>
    </div>
  );
}
