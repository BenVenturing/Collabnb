import { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { formatDate } from '../../lib/dateUtils';

const CATEGORY_COLORS = {
  'Bug Report':       { bg: '#FEE2E2', color: '#991B1B' },
  'Feature Request':  { bg: '#EDE9FE', color: '#5B21B6' },
  'Account Help':     { bg: '#DBEAFE', color: '#1E40AF' },
  'General Question': { bg: '#F0FDF4', color: '#166534' },
  'Other':            { bg: '#F7F5F2', color: '#3C5759' },
};

function CategoryBadge({ category }) {
  const c = CATEGORY_COLORS[category] || CATEGORY_COLORS['Other'];
  return (
    <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.5rem', borderRadius: '99px', background: c.bg, color: c.color, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0 }}>
      {category || 'General'}
    </span>
  );
}

function MessageRow({ msg, toggleRead, archiveMessage, unarchiveMessage }) {
  const [expanded, setExpanded] = useState(false);
  const isUnread = !msg.is_read;

  return (
    <div style={{
      borderBottom: '1px solid rgba(25,37,36,0.06)',
      background: isUnread ? 'rgba(209,235,219,0.08)' : 'transparent',
      transition: 'background 0.2s',
    }}>
      {/* ── Row summary ── */}
      <div
        onClick={() => {
          setExpanded(e => !e);
          if (isUnread) toggleRead(msg._id);
        }}
        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.25rem', cursor: 'pointer' }}
      >
        {/* Unread dot */}
        <div style={{ width: 7, height: 7, borderRadius: '50%', background: isUnread ? '#3C5759' : 'transparent', flexShrink: 0, transition: 'background 0.2s' }} />

        {/* Name + email */}
        <div style={{ flex: '0 0 180px', minWidth: 0 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: isUnread ? 600 : 400, color: '#192524', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {msg.name}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#959D90', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {msg.email}
          </div>
        </div>

        {/* Category */}
        <div style={{ flex: '0 0 140px' }}>
          <CategoryBadge category={msg.category} />
        </div>

        {/* Preview */}
        <div style={{ flex: 1, fontSize: '0.83rem', color: '#3C5759', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {msg.message}
        </div>

        {/* Date */}
        <div style={{ flex: '0 0 80px', fontSize: '0.75rem', color: '#959D90', textAlign: 'right', whiteSpace: 'nowrap' }}>
          {formatDate(msg._creationTime)}
        </div>

        {/* Chevron */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#D0D5CE" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* ── Expanded detail ── */}
      {expanded && (
        <div style={{ padding: '0 1.25rem 1.25rem 2.625rem' }}>
          <div style={{ background: '#F7F5F2', borderRadius: '0.625rem', padding: '0.875rem 1rem', fontSize: '0.85rem', color: '#192524', lineHeight: 1.65, whiteSpace: 'pre-wrap', marginBottom: '0.875rem' }}>
            {msg.message}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => toggleRead(msg._id)}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', borderRadius: '0.4rem', background: '#fff', border: '1px solid rgba(25,37,36,0.1)', color: '#3C5759', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {msg.is_read ? 'Mark Unread' : 'Mark Read'}
            </button>
            <a
              href={`mailto:${msg.email}?subject=${encodeURIComponent('Re: ' + (msg.category || 'Your message') + ' — Collabnb')}`}
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', borderRadius: '0.4rem', background: '#192524', color: '#fff', textDecoration: 'none', fontFamily: 'inherit', fontWeight: 500 }}
            >
              Reply ↗
            </a>
            {!msg.is_archived ? (
              <button
                onClick={() => { setExpanded(false); archiveMessage(msg._id); }}
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', borderRadius: '0.4rem', background: '#F7F5F2', border: '1px solid rgba(25,37,36,0.08)', color: '#959D90', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Archive
              </button>
            ) : (
              <button
                onClick={() => unarchiveMessage(msg._id)}
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', borderRadius: '0.4rem', background: '#F7F5F2', border: '1px solid rgba(25,37,36,0.08)', color: '#3C5759', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Unarchive
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function UserMessages() {
  const [tab, setTab] = useState('unread');

  const active   = useQuery(api.messages.getMessages);
  const archived = useQuery(api.messages.getArchivedMessages);
  const toggleReadMut   = useMutation(api.messages.toggleRead);
  const archiveMut      = useMutation(api.messages.archiveMessage);
  const unarchiveMut    = useMutation(api.messages.unarchiveMessage);

  const allActive = active || [];
  const unread    = allActive.filter(m => !m.is_read);
  const arch      = archived || [];

  const displayList =
    tab === 'unread'   ? unread    :
    tab === 'all'      ? allActive :
    arch;

  const isLoading = active === undefined || archived === undefined;

  function TabBtn({ id, label, count }) {
    const isActive = tab === id;
    return (
      <button
        onClick={() => setTab(id)}
        style={{
          padding: '0.4rem 0.875rem',
          borderRadius: '0.4rem',
          fontSize: '0.82rem',
          fontWeight: isActive ? 600 : 400,
          background: isActive ? '#192524' : 'transparent',
          color: isActive ? '#fff' : '#3C5759',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
        }}
      >
        {label}
        {count > 0 && (
          <span style={{ background: id === 'unread' ? '#D1EBDB' : '#F7F5F2', color: id === 'unread' ? '#166534' : '#3C5759', borderRadius: '99px', padding: '0 0.4rem', fontSize: '0.7rem', fontWeight: 700, lineHeight: 1.6 }}>
            {count}
          </span>
        )}
      </button>
    );
  }

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 900 }}>
      <h1 style={{ fontFamily: 'Cabinet Grotesk, sans-serif', fontSize: '1.5rem', fontWeight: 700, color: '#192524', letterSpacing: '-0.025em', margin: 0 }}>
        User Messages
      </h1>
      <p style={{ fontSize: '0.85rem', color: '#959D90', marginTop: '0.3rem', marginBottom: '1.25rem' }}>
        Support messages submitted via the Help Center.
      </p>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '1.25rem', background: '#F7F5F2', padding: '0.2rem', borderRadius: '0.5rem', width: 'fit-content', border: '1px solid rgba(25,37,36,0.06)' }}>
        <TabBtn id="unread" label="Unread" count={unread.length} />
        <TabBtn id="all"    label="All"    count={allActive.length} />
        <TabBtn id="archived" label="Archived" count={arch.length} />
      </div>

      {/* ── Loading ── */}
      {isLoading && (
        <div style={{ color: '#959D90', fontSize: '0.85rem', padding: '3rem 0', textAlign: 'center' }}>Loading…</div>
      )}

      {/* ── Empty ── */}
      {!isLoading && displayList.length === 0 && (
        <div style={{ color: '#959D90', fontSize: '0.85rem', padding: '3.5rem 0', textAlign: 'center' }}>
          {tab === 'unread' ? 'No unread messages 🎉' : tab === 'archived' ? 'No archived messages.' : 'No messages yet.'}
        </div>
      )}

      {/* ── List ── */}
      {!isLoading && displayList.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid rgba(25,37,36,0.07)', borderRadius: '0.875rem', overflow: 'hidden' }}>
          {/* Column headers */}
          <div style={{ display: 'flex', gap: '0.75rem', padding: '0.55rem 1.25rem 0.55rem 2.625rem', background: '#F7F5F2', borderBottom: '1px solid rgba(25,37,36,0.07)' }}>
            {[['180px', 'Sender'], ['140px', 'Category'], ['1', 'Message'], ['80px', 'Date']].map(([w, label]) => (
              <span key={label} style={{ flex: w === '1' ? 1 : `0 0 ${w}`, fontSize: '0.7rem', fontWeight: 600, color: '#959D90', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
            ))}
          </div>

          {displayList.map(msg => (
            <MessageRow
              key={msg._id}
              msg={msg}
              toggleRead={id => toggleReadMut({ messageId: id })}
              archiveMessage={id => archiveMut({ messageId: id })}
              unarchiveMessage={id => unarchiveMut({ messageId: id })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
