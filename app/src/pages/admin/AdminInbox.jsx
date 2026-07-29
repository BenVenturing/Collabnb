import { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuth } from '../../contexts/AuthContext';

// Admin-brand inbox. Ben messages users as "Collabnb" (the brand persona).
// Two-pane: thread list (left) + conversation (right), mirroring Inbox.jsx's
// visual language but reading/writing Convex directly — no CollabContext.

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function Avatar({ name, src, size = 40, unread = 0 }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{ position: 'relative', flexShrink: 0, width: size, height: size }}>
      <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', background: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {src ? (
          <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--slate)', fontSize: size * 0.32 }}>{initials}</span>
        )}
      </div>
      {unread > 0 && (
        <span style={{ position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, background: 'var(--slate)', color: 'var(--bone)', fontSize: 9, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{unread}</span>
      )}
    </div>
  );
}

function ThreadRow({ thread, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', border: 'none', borderBottom: '1px solid rgba(25,37,36,0.06)',
        background: active ? 'rgba(255,255,255,0.9)' : 'transparent', cursor: 'pointer',
        textAlign: 'left', transition: 'background 0.15s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.5)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >
      <Avatar name={thread.participant_name} src={thread.participant_avatar} unread={thread.unread} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: thread.unread ? 700 : 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {thread.participant_name}
          </span>
          <span style={{ fontSize: 11, color: 'var(--sage)', flexShrink: 0 }}>{fmtTime(thread.last_at)}</span>
        </div>
        <p style={{ fontSize: 12, color: thread.unread ? 'var(--ink)' : 'var(--sage)', margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {thread.last_message || 'Say hello 👋'}
        </p>
      </div>
    </button>
  );
}

function UserRow({ user, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', border: 'none', borderBottom: '1px solid rgba(25,37,36,0.06)', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.5)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <Avatar name={user.full_name} src={user.avatar_url} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{user.full_name}</span>
        <span style={{ fontSize: 11, color: 'var(--sage)', marginLeft: 6 }}>@{user.username}</span>
        {user.city && <span style={{ fontSize: 11, color: 'var(--sage)', marginLeft: 6 }}>· {user.city}</span>}
      </div>
      <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--sage)', background: 'rgba(60,87,89,0.08)', padding: '2px 8px', borderRadius: 999, textTransform: 'capitalize' }}>{user.role}</span>
    </button>
  );
}

// The sending identity (persona) photo — what users see when messaged. Clicking
// opens the Clerk profile modal to change it; the new photo syncs to the persona.
function SenderChip({ name, photo, onEdit }) {
  const initials = (name || 'C').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <button
      onClick={onEdit}
      title="Change your photo — this is what users see when you message them"
      style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '6px 8px', borderRadius: 12, border: '1px solid rgba(25,37,36,0.08)', background: 'rgba(255,255,255,0.5)', cursor: 'pointer', textAlign: 'left' }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.85)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.5)'}
    >
      <div style={{ position: 'relative', width: 36, height: 36, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', background: 'var(--mint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {photo ? (
            <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--slate)', fontSize: 13 }}>{initials}</span>
          )}
        </div>
        <span style={{ position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: '50%', background: 'var(--ink)', color: 'var(--bone)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bone)' }}>
          <svg viewBox="0 0 24 24" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.25 }}>Sending as {name}</div>
        <div style={{ fontSize: 10.5, color: 'var(--sage)' }}>Tap photo to change · what users see</div>
      </div>
    </button>
  );
}

const SIGN = 'Cheers,\nThe Collabnb team';
const SIGN_BLOCK = '\n\n' + SIGN;

// Rotating "flickering" prompt ideas shown as the composer placeholder.
const AI_SUGGESTIONS = [
  'Welcome them warmly to Collabnb…',
  'Ask what kind of collabs they’re after…',
  'Nudge them to finish their profile…',
  'Answer how collabs work on Collabnb…',
  'Invite them to explore listings…',
  'Check in and see how it’s going…',
];

function Conversation({ thread, persona }) {
  const [draft, setDraft] = useState(SIGN_BLOCK);
  const [sending, setSending] = useState(false);
  const [drafting, setDrafting] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const bottomRef = useRef(null);
  const taRef = useRef(null);
  const firstName = (thread.participant_name || 'there').split(' ')[0];
  const messages = useQuery(api.threadMessages.getByThread, { threadKey: thread.thread_key });
  const send = useMutation(api.threadMessages.sendMessage);
  const draftMessage = useAction(api.adminThreads.draftMessage);

  // The message body is everything before the trailing signature block.
  const body = draft.endsWith(SIGN_BLOCK) ? draft.slice(0, draft.length - SIGN_BLOCK.length) : draft;
  const hasBody = body.trim().length > 0;

  const resetDraft = () => {
    setDraft(SIGN_BLOCK);
    requestAnimationFrame(() => { const el = taRef.current; if (el) { el.selectionStart = el.selectionEnd = 0; } });
  };

  // New thread → reset composer to just the signature, cursor at the top; leave AI mode.
  useEffect(() => { resetDraft(); setAiMode(false); setAiPrompt(''); /* eslint-disable-next-line */ }, [thread.thread_key]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // Auto-grow the message textarea with its content (up to ~6 lines, then scroll).
  useEffect(() => {
    const el = taRef.current;
    if (!el || aiMode) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }, [draft, aiMode]);

  const bubbles = (messages || []).map((m) => ({
    id: String(m._id),
    mine: m.sender_id === persona?._id,
    text: m.text,
    time: fmtTime(m.created_at),
  }));

  const sendNow = async () => {
    const text = draft.trim();
    if (!hasBody || sending || !persona) return;
    setSending(true);
    resetDraft();
    try {
      await send({
        threadKey: thread.thread_key,
        senderId: persona._id,
        senderName: persona.full_name,
        senderAvatar: persona.avatar_url,
        senderRole: 'admin',
        text,
        recipientId: thread.participant_id,
      });
    } catch { /* ignore */ } finally {
      setSending(false);
    }
  };

  // Draft a message via NVIDIA from the AI-mode prompt, then drop the result into
  // the composer (above the signature) and leave AI mode, ready to edit and send.
  const runDraft = async () => {
    if (drafting || !thread.participant_id) return;
    const seed = aiPrompt.trim() || AI_SUGGESTIONS[0];
    setDrafting(true);
    try {
      const result = await draftMessage({ recipientId: thread.participant_id, prompt: seed });
      const clean = (result || '').trim();
      setDraft(clean + SIGN_BLOCK);
      setAiMode(false);
      setAiPrompt('');
      requestAnimationFrame(() => { const el = taRef.current; if (el) { el.focus(); el.selectionStart = el.selectionEnd = clean.length; } });
    } catch { /* ignore */ } finally {
      setDrafting(false);
    }
  };

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendNow(); } };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid rgba(25,37,36,0.08)', flexShrink: 0 }}>
        <Avatar name={thread.participant_name} src={thread.participant_avatar} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{thread.participant_name}</div>
          <div style={{ fontSize: 11, color: 'var(--sage)' }}>@{thread.participant_username} · {thread.participant_role || 'user'}</div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#166534', background: 'rgba(209,235,219,0.6)', padding: '3px 10px', borderRadius: 999 }}>Admin</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {bubbles.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <p style={{ color: 'var(--sage)', fontSize: 13 }}>No messages yet. Welcome them to Collabnb 👋</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {bubbles.map(b => (
              <div key={b.id} style={{ display: 'flex', justifyContent: b.mine ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '72%', padding: '8px 14px', borderRadius: 16,
                  background: b.mine ? 'var(--slate)' : 'rgba(255,255,255,0.9)',
                  color: b.mine ? 'var(--bone)' : 'var(--ink)',
                  fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap',
                  borderBottomRightRadius: b.mine ? 4 : 16,
                  borderBottomLeftRadius: b.mine ? 16 : 4,
                  border: b.mine ? 'none' : '1px solid rgba(25,37,36,0.08)',
                }}>
                  {b.text}
                  <div style={{ fontSize: 9, marginTop: 3, opacity: 0.6, textAlign: b.mine ? 'right' : 'left' }}>{b.time}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ padding: 12, borderTop: '1px solid rgba(25,37,36,0.08)', flexShrink: 0 }}>
        {aiMode ? (
          /* ── AI draft mode ── */
          <div style={{ borderRadius: 16, padding: '10px 12px 12px', background: 'linear-gradient(135deg, rgba(209,235,219,0.55), rgba(219,234,254,0.5))', border: '1px solid rgba(22,101,52,0.22)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 700, color: '#166534' }}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M19 14l0.7 2.1L22 17l-2.3 0.9L19 20l-0.7-2.1L16 17l2.3-0.9z"/>
                </svg>
                Draft with AI
              </span>
              <span style={{ fontSize: 11, color: 'var(--slate)', flex: 1, minWidth: 0 }}>
                Prompt me what you’d like to say — I’ll draft a nice message to {firstName}.
              </span>
              <button
                onClick={() => { setAiMode(false); setAiPrompt(''); }}
                aria-label="Exit AI mode"
                style={{ width: 22, height: 22, flexShrink: 0, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.7)', color: 'var(--slate)', cursor: 'pointer', fontSize: 14, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                ×
              </button>
            </div>

            {/* Quick prompt ideas */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {AI_SUGGESTIONS.slice(0, 3).map(s => (
                <button
                  key={s}
                  onClick={() => setAiPrompt(s)}
                  style={{ fontSize: 11, color: 'var(--slate)', background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(25,37,36,0.08)', borderRadius: 999, padding: '3px 10px', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                >
                  {s}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, background: 'rgba(255,255,255,0.85)', borderRadius: 12, padding: '8px 12px', border: '1px solid rgba(25,37,36,0.08)' }}>
              <textarea
                autoFocus
                rows={1}
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); runDraft(); } }}
                placeholder={`e.g. welcome them and ask what they’re working on…`}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, minHeight: '1.4rem', maxHeight: 90 }}
              />
              <button
                onClick={runDraft}
                disabled={drafting}
                style={{ display: 'flex', alignItems: 'center', gap: 6, height: 32, padding: '0 14px', borderRadius: 999, border: 'none', cursor: drafting ? 'default' : 'pointer', flexShrink: 0, background: 'var(--slate)', color: 'white', fontSize: 12, fontWeight: 700, fontFamily: 'var(--font-body)' }}
              >
                {drafting ? (
                  <>
                    <span style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                    Drafting…
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/>
                    </svg>
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ── Message mode ── */
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, background: 'var(--bone)', borderRadius: 16, padding: '8px 14px', border: '1px solid rgba(25,37,36,0.1)' }}>
            <textarea
              ref={taRef}
              rows={1}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={onKey}
              placeholder="Message as Collabnb…"
              style={{ flex: 1, display: 'block', boxSizing: 'border-box', background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, minHeight: '1.4rem', maxHeight: 140, overflowY: 'auto' }}
            />
            {/* AI mode toggle — same colour profile as send, sat next to it */}
            <button
              onClick={() => setAiMode(true)}
              title="Draft with AI"
              aria-label="Draft with AI"
              style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0, background: 'var(--slate)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z"/><path d="M19 14l0.7 2.1L22 17l-2.3 0.9L19 20l-0.7-2.1L16 17l2.3-0.9z"/>
              </svg>
            </button>
            {/* Send */}
            <button
              onClick={sendNow}
              disabled={!hasBody || sending}
              title="Send"
              aria-label="Send"
              style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer', flexShrink: 0, background: hasBody ? 'var(--slate)' : 'rgba(60,87,89,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke={hasBody ? 'white' : 'var(--sage)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        )}
        <p style={{ textAlign: 'center', fontSize: 10, color: 'var(--sage)', opacity: 0.7, margin: '4px 0 0' }}>
          {aiMode ? 'AI draft mode · Enter to generate' : 'Signed “Cheers, The Collabnb team” · ✨ to draft with AI · Enter to send'}
        </p>
      </div>
    </div>
  );
}

export default function AdminInbox() {
  const { profile, openUserProfile, avatarUrl } = useAuth();
  const persona = useQuery(api.profiles.getAdminPersona);
  const ensurePersona = useMutation(api.profiles.ensureAdminPersona);
  const setPersonaPhoto = useMutation(api.profiles.updateProfile);
  const threads = useQuery(api.adminThreads.list) ?? [];
  const messagable = useQuery(api.profiles.listMessagable) ?? [];
  const startThread = useMutation(api.adminThreads.startWithUser);

  const [selectedKey, setSelectedKey] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');

  // Ensure the persona exists on first mount (idempotent server-side).
  useEffect(() => { if (persona === null) ensurePersona({}).catch(() => {}); }, [persona, ensurePersona]);

  // Keep the sending persona's photo in sync with the admin's Clerk avatar, so
  // what users see matches the photo shown here (and changing it via Clerk propagates).
  useEffect(() => {
    if (!persona?._id || !avatarUrl || persona.avatar_url === avatarUrl) return;
    setPersonaPhoto({ profileId: persona._id, updates: { avatar_url: avatarUrl } }).catch(() => {});
  }, [persona, avatarUrl, setPersonaPhoto]);

  const selected = threads.find(t => t.thread_key === selectedKey) || null;

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return messagable;
    return messagable.filter(u =>
      u.full_name.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.city || '').toLowerCase().includes(q)
    );
  }, [messagable, query]);

  const startWith = async (user) => {
    if (!persona) return;
    setPickerOpen(false);
    setQuery('');
    const { threadKey } = await startThread({ participantId: user._id, asPersonaId: persona._id });
    setSelectedKey(threadKey);
  };

  if (persona === undefined) {
    return <div style={{ padding: 40, color: 'var(--sage)' }}>Loading inbox…</div>;
  }

  return (
    <div style={{ padding: '1.5rem', height: 'calc(100dvh - 52px)', boxSizing: 'border-box' }}>
      <div style={{ display: 'flex', height: '100%', background: 'rgba(255,255,255,0.58)', borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.72)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 8px 32px rgba(25,37,36,0.08)', overflow: 'hidden' }}>

        {/* Left: thread list */}
        <div style={{ width: 320, flexShrink: 0, borderRight: '1px solid rgba(25,37,36,0.08)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(25,37,36,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, color: 'var(--ink)', margin: 0 }}>Inbox</h2>
              <button
                onClick={() => setPickerOpen(o => !o)}
                style={{ width: 30, height: 30, borderRadius: '50%', border: 'none', cursor: 'pointer', background: 'var(--ink)', color: 'var(--bone)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                title="New message"
              >
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </button>
            </div>
            {pickerOpen ? (
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search users to message…"
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 999, border: '1px solid rgba(25,37,36,0.12)', background: 'var(--bone)', fontFamily: 'var(--font-body)', fontSize: 13, color: 'var(--ink)', outline: 'none' }}
              />
            ) : (
              <SenderChip
                name={persona?.full_name || 'Collabnb'}
                photo={avatarUrl || persona?.avatar_url}
                onEdit={() => openUserProfile?.()}
              />
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {pickerOpen ? (
              filteredUsers.length === 0 ? (
                <p style={{ padding: 16, fontSize: 12, color: 'var(--sage)' }}>No users match.</p>
              ) : filteredUsers.map(u => (
                <UserRow key={u._id} user={u} onClick={() => startWith(u)} />
              ))
            ) : threads.length === 0 ? (
              <p style={{ padding: 20, fontSize: 12, color: 'var(--sage)', lineHeight: 1.6 }}>
                No conversations yet. Click <strong>+</strong> to welcome a creator or host.
              </p>
            ) : threads.map(t => (
              <ThreadRow key={t._id} thread={t} active={t.thread_key === selectedKey} onClick={() => setSelectedKey(t.thread_key)} />
            ))}
          </div>
        </div>

        {/* Right: conversation */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {selected && persona ? (
            <Conversation thread={selected} persona={persona} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, padding: 20, textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(209,235,219,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="var(--slate)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--ink)', margin: '0 0 4px' }}>Select a conversation</p>
                <p style={{ fontSize: 13, color: 'var(--sage)', margin: 0 }}>Or start a new one to welcome someone to Collabnb.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
