import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useCollabs } from '../contexts/CollabContext';
import { SAMPLE_LISTINGS, THREAD_MESSAGES } from '../lib/mockData';
import CollabDetail from '../components/CollabDetail';
import ProfilePopupCard from '../components/ProfilePopupCard';
import { useAuth } from '../contexts/AuthContext';
import { useVerification } from '../contexts/VerificationContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import SkeletonCard from '../components/SkeletonCard';

const TAG_STYLES = {
  Collab:      'bg-mint text-slate',
  Application: 'bg-stone text-slate',
  Pitch:       'bg-red-100 text-red-500',
  Contract:    'bg-amber-100 text-amber-700',
  Archived:    'bg-stone/40 text-sage',
};

const FILTERS = ['All', 'Applications', 'Collabs', 'Pitches'];

// ─── Avatar helper ────────────────────────────────────────────────────────────
function Avatar({ name, src, size = 44, unread = 0, isFounder = false }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2);
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <div
        className="rounded-full bg-mint flex items-center justify-center overflow-hidden"
        style={{ width: size, height: size }}
      >
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span className="font-display font-bold text-slate" style={{ fontSize: size * 0.3 }}>{initials}</span>
        )}
      </div>
      {isFounder && (
        <span
          className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center"
          style={{
            width: 15, height: 15, borderRadius: '50%',
            background: 'linear-gradient(135deg, #D4A843, #B8922A)',
            border: '1.5px solid white',
            boxShadow: '0 1px 4px rgba(212,168,67,0.4)',
          }}
        >
          <svg viewBox="0 0 16 16" fill="white" width="7" height="7">
            <path d="M8 1.5l1.67 3.38 3.73.54-2.7 2.63.64 3.72L8 9.77l-3.34 1.76.64-3.72L2.6 5.42l3.73-.54z"/>
          </svg>
        </span>
      )}
      {unread > 0 && (
        <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-slate text-bone text-[9px] font-bold flex items-center justify-center">
          {unread}
        </span>
      )}
    </div>
  );
}

// ─── Thread row (left panel) ──────────────────────────────────────────────────
function ThreadRow({ thread, isActive, onClick, onDelete }) {
  const [showDelete, setShowDelete] = useState(false);
  const tagStyle = TAG_STYLES[thread.tag] || TAG_STYLES.Application;

  return (
    <div
      className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-stone/20 text-left transition-colors relative group ${
        isActive ? 'bg-white/90' : 'hover:bg-white/50'
      }`}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <button onClick={onClick} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <Avatar name={thread.host_name} src={thread.host_avatar} unread={thread.unread} isFounder={thread.is_founder} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <p className={`text-sm truncate pr-2 ${thread.unread ? 'font-bold text-ink' : 'font-semibold text-slate'}`}>
              {thread.listing_title}
            </p>
            <p className="text-sage text-[11px] flex-shrink-0">{thread.timestamp}</p>
          </div>
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${tagStyle}`}>
              {thread.tag}
            </span>
            {thread.is_sample && (
              <span className="inline-block text-[9px] font-bold px-1 py-0.5 rounded bg-amber-100 text-amber-600 uppercase tracking-wide">Sample</span>
            )}
            <span className="text-sage text-[11px] truncate">{thread.host_name}</span>
          </div>
          <p className={`text-xs truncate ${thread.unread ? 'text-ink/70' : 'text-sage'}`}>
            {thread.last_message}
          </p>
        </div>
      </button>

      {/* Delete button (visible on hover) */}
      {onDelete && showDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors"
          style={{ background: 'rgba(200,60,60,0.1)', color: '#c0392b' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(200,60,60,0.18)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(200,60,60,0.1)'; }}
          title="Delete conversation"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="13" height="13">
            <polyline points="2 4 14 4"/>
            <path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/>
            <path d="M13 4l-1 9H4L3 4"/>
            <line x1="6.5" y1="7" x2="6.5" y2="11"/>
            <line x1="9.5" y1="7" x2="9.5" y2="11"/>
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function Bubble({ msg }) {
  const isMe = msg.from === 'me';
  const isImage = msg.type === 'image';
  const isFile = msg.type === 'file';
  return (
    <div className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`max-w-[72%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isMe
            ? 'bg-slate text-bone rounded-br-sm'
            : 'bg-white border border-stone/30 text-ink rounded-bl-sm'
        }`}
      >
        {isImage && (
          <div className="mb-2 rounded-xl overflow-hidden">
            <img src={msg.blobUrl} alt="Attached" className="w-full max-h-48 object-cover rounded-xl" />
          </div>
        )}
        {isFile && (
          <div className="mb-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-white/20 border border-stone/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            <span className="text-xs truncate flex-1">{msg.fileName}</span>
            <span className={`text-[10px] ${isMe ? 'text-bone/50' : 'text-sage'}`}>{msg.fileSize}</span>
          </div>
        )}
        {msg.text && <p>{msg.text}</p>}
        <p className={`text-[10px] mt-1 ${isMe ? 'text-bone/50 text-right' : 'text-sage'}`}>
          {msg.time}
        </p>
      </div>
    </div>
  );
}

// ─── Three-dot dropdown menu ──────────────────────────────────────────────────
function ThreadMenu({ thread, onClose, onArchive, onUpdateTag }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="absolute right-0 top-full mt-1 z-50 w-48 rounded-xl bg-white border border-stone/30 shadow-lg py-1"
      style={{ boxShadow: '0 8px 30px rgba(25,37,36,0.12)' }}
    >
      <button
        onClick={() => { onArchive(thread.id); onClose(); }}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate hover:bg-bone transition-colors text-left"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
          <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
        </svg>
        Archive
      </button>
      <div className="border-t border-stone/20 my-1" />
      <p className="px-4 py-1 text-[10px] font-bold text-sage uppercase tracking-wider">Change Stage</p>
      {['Application', 'Collab', 'Pitch'].map((tag) => (
        <button
          key={tag}
          onClick={() => { onUpdateTag(thread.id, tag); onClose(); }}
          className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors text-left ${
            thread.tag === tag ? 'text-ink font-semibold bg-bone/60' : 'text-slate hover:bg-bone'
          }`}
        >
          <span className={`inline-block w-2 h-2 rounded-full ${(TAG_STYLES[tag] || '').split(' ')[0]}`} />
          {tag}
        </button>
      ))}
    </div>
  );
}

// ─── Conversation panel (right side) ─────────────────────────────────────────
function ConversationPanel({ thread, onViewCollab, onArchive, onUpdateTag }) {
  const [draft, setDraft] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [popupPerson, setPopupPerson] = useState(null);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const bottomRef = useRef(null);
  const fileInputRef = useRef(null);
  const tagStyle = TAG_STYLES[thread.tag] || TAG_STYLES.Application;
  const { profile } = useAuth();
  const { openModal } = useVerification();
  const { isSubscribed, openModal: openSubModal } = useSubscription();
  const isVerified = profile?.is_verified === true;

  const threadKey = thread.thread_key || thread.id;
  const convexMessages = useQuery(api.threadMessages.getByThread, { threadKey });
  const sendMutation = useMutation(api.threadMessages.sendMessage);

  // Use sample messages for the demo thread
  const sampleMessages = thread.is_sample && THREAD_MESSAGES[thread.id]
    ? THREAD_MESSAGES[thread.id]
    : null;

  // Build message list: prefer Convex messages, fall back to sample
  const messages = (() => {
    if (convexMessages && convexMessages.length > 0) {
      const senderId = profile?._id ? String(profile._id) : (profile?.id ? String(profile.id) : null);
      return convexMessages.map((msg) => ({
        id: String(msg._id),
        from: msg.sender_id === senderId ? 'me' : 'them',
        text: msg.text,
        time: new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }));
    }
    // Fall back to sample messages
    if (sampleMessages) {
      return sampleMessages;
    }
    return [];
  })();

  // Prepend local attachments to messages
  const allMessages = attachments.length > 0
    ? [...attachments.map((a, i) => ({ id: `attach-${i}`, ...a })), ...messages]
    : messages;

  useEffect(() => {
    setDraft('');
    setAttachments([]);
  }, [thread.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, attachments]);

  const handleAttach = (e) => {
    const files = e.target.files;
    if (!files?.length) return;
    Array.from(files).forEach((file) => {
      // Only accept small files (< 100KB)
      if (file.size > 100 * 1024) return;
      const isImage = file.type.startsWith('image/');
      const reader = new FileReader();
      reader.onload = (ev) => {
        const blobUrl = ev.target.result;
        setAttachments((prev) => [...prev, {
          from: 'me',
          type: isImage ? 'image' : 'file',
          blobUrl,
          fileName: file.name,
          fileSize: `${(file.size / 1024).toFixed(1)} KB`,
          time: 'Just now',
        }]);
      };
      reader.readAsDataURL(file);
    });
    // Clear the input so the same file can be picked again
    e.target.value = '';
    // Auto-cleanup attachments after 30 minutes
    setTimeout(() => {
      setAttachments((prev) => prev.filter((a) => a.time === 'Just now'));
    }, 30 * 60 * 1000);
  };

  const sendMessage = async () => {
    if (!isVerified) { openModal(); return; }
    if (!isSubscribed) { openSubModal(); return; }
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft('');
    try {
      const senderId = profile?._id ? String(profile._id) : (profile?.id ? String(profile.id) : 'unknown');
      await sendMutation({
        threadKey,
        senderId,
        senderName: profile?.full_name || profile?.name || 'Creator',
        senderAvatar: profile?.avatar_url,
        senderRole: 'creator',
        text,
      });
    } catch {
      // silently ignore send errors
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Conversation header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-stone/30 bg-white/25 backdrop-blur-md flex-shrink-0">
        <button
          onClick={() => setPopupPerson({ name: thread.host_name, avatar: thread.host_avatar, isFounder: thread.is_founder })}
          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', borderRadius: '50%', flexShrink: 0 }}
          title="View profile"
        >
          <Avatar name={thread.host_name} src={thread.host_avatar} size={40} isFounder={thread.is_founder} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-display font-bold text-ink text-base truncate">{thread.listing_title}</h2>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${tagStyle}`}>
              {thread.tag}
            </span>
          </div>
          <p className="text-sage text-xs">{thread.host_name}</p>
        </div>
        {/* Action icons */}
        <div className="flex gap-2">
          <button
            onClick={() => onViewCollab(thread)}
            className="w-8 h-8 rounded-full bg-bone hover:bg-stone/60 flex items-center justify-center transition-colors"
            title="View collaboration"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
              <polyline points="10 17 15 12 10 7"/>
              <line x1="15" y1="12" x2="3" y2="12"/>
            </svg>
          </button>
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-8 h-8 rounded-full bg-bone hover:bg-stone/60 flex items-center justify-center transition-colors"
              title="More options"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-slate">
                <circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>
              </svg>
            </button>
            {menuOpen && (
              <ThreadMenu
                thread={thread}
                onClose={() => setMenuOpen(false)}
                onArchive={onArchive}
                onUpdateTag={onUpdateTag}
              />
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
        {thread.is_sample && !convexMessages?.length ? (
          allMessages.map((msg) => (
            <Bubble key={msg.id} msg={msg} />
          ))
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sage text-sm">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <Bubble key={msg.id} msg={msg} />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Compose bar */}
      <div className="px-4 py-3 border-t border-stone/30 bg-white/60 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-end gap-2 bg-bone rounded-2xl px-4 py-2.5 border border-stone/40">
          <textarea
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Write a message…"
            className="flex-1 bg-transparent text-sm text-ink placeholder-sage resize-none outline-none leading-relaxed max-h-28"
            style={{ minHeight: '1.4rem' }}
          />
          {/* Attachment button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors hover:bg-stone/30"
            title="Attach a file (max 100KB)"
            style={{ background: 'rgba(60,87,89,0.12)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="var(--slate)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
            onChange={handleAttach}
            style={{ display: 'none' }}
            multiple
          />
          <button
            onClick={!isVerified ? openModal : !isSubscribed ? openSubModal : sendMessage}
            disabled={isVerified && isSubscribed && (!draft.trim() || sending)}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
            style={{
              background: (!isVerified || !isSubscribed) ? 'rgba(60,87,89,0.18)' : draft.trim() ? 'var(--slate)' : 'rgba(60,87,89,0.15)',
            }}
          >
            {(!isVerified || !isSubscribed) ? (
              <svg viewBox="0 0 16 16" fill="none" stroke="var(--sage)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <rect x="3" y="8" width="10" height="6" rx="1"/>
                <path d="M5 8V5.5a3 3 0 0 1 6 0V8"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke={draft.trim() ? 'white' : 'var(--sage)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            )}
          </button>
        </div>
        <div className="flex items-center justify-center gap-3 mt-1.5">
          <p className="text-[10px] text-sage/60">Enter to send · Shift+Enter for new line</p>
          {attachments.length > 0 && (
            <p className="text-[10px] font-semibold text-slate/60">
              {attachments.length} file{attachments.length > 1 ? 's' : ''} attached (auto-removed after 30 min)
            </p>
          )}
        </div>
      </div>

      {popupPerson && (
        <ProfilePopupCard
          person={popupPerson}
          onClose={() => setPopupPerson(null)}
          onMessage={() => setPopupPerson(null)}
        />
      )}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
      <div className="w-16 h-16 rounded-full bg-mint/30 flex items-center justify-center">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--slate)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <div>
        <p className="font-display font-bold text-ink text-base mb-1">Select a conversation</p>
        <p className="text-sage text-sm">Choose a thread on the left to read and reply to messages.</p>
      </div>
    </div>
  );
}

// ─── New Message Modal ─────────────────────────────────────────────────────────
function NewMessageModal({ listings, onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    const handler = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const filtered = query.trim()
    ? listings.filter((l) =>
        l.title.toLowerCase().includes(query.toLowerCase()) ||
        l.location.toLowerCase().includes(query.toLowerCase())
      )
    : listings;

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(25,37,36,0.25)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '12vh',
      }}
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-xl border border-stone/20 overflow-hidden"
        style={{ width: 'min(90vw, 420px)', maxHeight: '70vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(25,37,36,0.18)' }}
      >
        {/* Header */}
        <div className="px-5 pt-4 pb-3 border-b border-stone/20">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display font-bold text-ink text-base">New Message</h2>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-bone hover:bg-stone/50 flex items-center justify-center transition-colors"
            >
              <svg viewBox="0 0 16 16" fill="none" stroke="#3C5759" strokeWidth="2" strokeLinecap="round" width="12" height="12">
                <line x1="2" y1="2" x2="14" y2="14"/><line x1="14" y1="2" x2="2" y2="14"/>
              </svg>
            </button>
          </div>
          <div className="bg-bone rounded-xl px-3 py-2 flex items-center gap-2 border border-stone/30">
            <svg viewBox="0 0 256 256" fill="none" stroke="#959D90" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
              <circle cx="112" cy="112" r="80"/><line x1="168.57" y1="168.57" x2="224" y2="224"/>
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search listings..."
              className="flex-1 bg-transparent text-sm text-ink placeholder-sage outline-none"
            />
          </div>
        </div>

        {/* Listing list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sage text-sm">No listings found</p>
            </div>
          ) : (
            filtered.map((listing) => (
              <button
                key={listing.id}
                onClick={() => onSelect(listing)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-bone/60 transition-colors text-left border-b border-stone/10 last:border-0"
              >
                {/* Thumbnail */}
                <div
                  className="w-10 h-10 rounded-lg bg-mint overflow-hidden flex-shrink-0"
                >
                  {listing.image ? (
                    <img src={listing.image} alt={listing.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #D1EBDB, #959D90)' }}>
                      <span className="font-display font-bold text-slate text-xs">{listing.title[0]}</span>
                    </div>
                  )}
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{listing.title}</p>
                  <p className="text-xs text-sage truncate">{listing.location}</p>
                </div>
                <svg viewBox="0 0 256 256" fill="none" stroke="#959D90" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
                  <polyline points="96 48 176 128 96 208"/>
                </svg>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Inbox ───────────────────────────────────────────────────────────────
function ShimmerRow() {
  return <SkeletonCard variant="thread" />;
}

export default function Inbox() {
  const { threads, collabs, archiveThread, deleteThread, updateThreadTag, createThread } = useCollabs();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const [activeFilter, setActiveFilter] = useState('All');
  const [selectedId, setSelectedId] = useState(() => location.state?.selectedThreadId ?? null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingCollab, setViewingCollab] = useState(null);
  const [toastMsg, setToastMsg] = useState('');
  const [newMessageOpen, setNewMessageOpen] = useState(false);
  const searchInputRef = useRef(null);
  const creatorParamHandled = useRef(false);

  // Open or create a thread when navigated from HostCreators with ?creatorName=
  useEffect(() => {
    if (creatorParamHandled.current) return;
    const creatorName   = searchParams.get('creatorName');
    const creatorAvatar = searchParams.get('creatorAvatar');
    if (!creatorName) return;
    creatorParamHandled.current = true;

    const existing = threads.find(t => !t.archived && t.host_name === creatorName);
    if (existing) {
      setSelectedId(existing.id);
    } else {
      const newId = createThread(creatorName, creatorName, 'Collab');
      // Patch the avatar onto the new thread (createThread doesn't support it yet)
      // The thread will show initials; avatar is best-effort
      setSelectedId(newId);
      if (creatorAvatar) {
        // Store avatar in session so ConversationPanel can pick it up if needed
        try { sessionStorage.setItem(`inbox_avatar_${newId}`, creatorAvatar); } catch {}
      }
    }
    setSearchParams({}, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-focus search input
  useEffect(() => {
    if (isSearching && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearching]);

  // Show a brief toast message
  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 2500);
  }, []);

  // Handle View Collab click
  const handleViewCollab = useCallback((thread) => {
    const collab = collabs.find((c) => c.id === thread.collab_id);
    if (collab) {
      setViewingCollab(collab);
    } else {
      showToast('No collaboration found for this thread');
    }
  }, [collabs, showToast]);

  // Handle selecting a listing to start a new message
  const handleNewMessage = useCallback((listing) => {
    const newId = createThread(listing.title, 'Ben Venturing');
    setSelectedId(newId);
    setNewMessageOpen(false);
  }, [createThread]);

  // Non-archived threads
  const activeThreads = threads.filter((t) => !t.archived);

  // Apply tag filter
  const tagFiltered = activeFilter === 'All'
    ? activeThreads
    : activeThreads.filter((t) => t.tag === activeFilter.slice(0, -1) || t.tag === activeFilter);

  // Apply search filter
  const filtered = searchQuery.trim()
    ? tagFiltered.filter((t) => {
        const q = searchQuery.toLowerCase();
        return (
          t.listing_title.toLowerCase().includes(q) ||
          t.host_name.toLowerCase().includes(q) ||
          t.last_message.toLowerCase().includes(q)
        );
      })
    : tagFiltered;

  const selectedThread = activeThreads.find((t) => t.id === selectedId) || null;

  // Deduplicated listings for New Message
  const existingTitles = new Set(threads.map((t) => t.listing_title));
  const listingsForNewMessage = SAMPLE_LISTINGS.filter((l) => !existingTitles.has(l.title));

  return (
    <div className="flex overflow-hidden" style={{ height: 'calc(100dvh - 7rem)' }}>

      {/* ── Left panel: thread list ── */}
      <div
        className="flex flex-col border-r border-stone/30 bg-white/25 backdrop-blur-md flex-shrink-0"
        style={{ width: 340 }}
      >
        {/* Header */}
        <div className="px-5 pt-6 pb-0 border-b border-stone/20">
          <div className="flex items-center justify-between mb-4">
            {isSearching ? (
              <>
                <button
                  onClick={() => { setIsSearching(false); setSearchQuery(''); }}
                  className="w-8 h-8 rounded-full bg-bone hover:bg-stone/60 flex items-center justify-center transition-colors flex-shrink-0"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="#3C5759" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                  </svg>
                </button>
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages…"
                  className="flex-1 mx-2 text-sm text-ink bg-transparent border-none outline-none placeholder-sage"
                />
              </>
            ) : (
              <>
                <h1 className="font-display font-bold text-ink text-xl">Messages</h1>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setIsSearching(true)}
                    className="w-8 h-8 rounded-full bg-bone hover:bg-stone/60 flex items-center justify-center transition-colors"
                  >
                    <svg viewBox="0 0 256 256" fill="none" stroke="#3C5759" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <circle cx="112" cy="112" r="80"/><line x1="168.57" y1="168.57" x2="224" y2="224"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => setNewMessageOpen(true)}
                    className="w-8 h-8 rounded-full bg-bone hover:bg-stone/60 flex items-center justify-center transition-colors"
                    title="New message"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="#3C5759" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
          {/* Filter pills */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-3">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`flex-none px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                  activeFilter === f
                    ? 'bg-ink text-bone border-ink'
                    : 'bg-transparent text-slate border-stone hover:border-slate'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Thread list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && !searchQuery ? (
            // Empty state: shimmer placeholders to show where conversations will appear
            <div>
              {[0, 1, 2].map((i) => <ShimmerRow key={i} />)}
              <div className="px-4 py-5 text-center">
                <p className="text-sage text-xs leading-relaxed">
                  Your conversations will appear here once you apply to a listing and start chatting with a host.
                </p>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-sage text-sm">No matching messages</p>
            </div>
          ) : (
            filtered.map((t) => (
              <ThreadRow
                key={t.id}
                thread={t}
                isActive={t.id === selectedId}
                onClick={() => {
                  setSelectedId(t.id);
                  if (t.id !== selectedId) setIsSearching(false);
                }}
                onDelete={deleteThread ? () => {
                  deleteThread(t.id);
                  if (selectedId === t.id) setSelectedId(null);
                } : undefined}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right panel: conversation ── */}
      <div className="flex-1 min-w-0">
        {selectedThread ? (
          <ConversationPanel
            thread={selectedThread}
            onViewCollab={handleViewCollab}
            onArchive={archiveThread}
            onUpdateTag={updateThreadTag}
          />
        ) : (
          <EmptyState />
        )}
      </div>

      {/* ── CollabDetail modal ── */}
      {viewingCollab && (
        <CollabDetail
          collab={viewingCollab}
          onClose={() => setViewingCollab(null)}
        />
      )}

      {/* ── Toast notification ── */}
      {toastMsg && (
        <div className="toast">{toastMsg}</div>
      )}

      {/* ── New Message Modal ── */}
      {newMessageOpen && (
        <NewMessageModal
          listings={listingsForNewMessage}
          onSelect={handleNewMessage}
          onClose={() => setNewMessageOpen(false)}
        />
      )}
    </div>
  );
}
