import { useState } from 'react';
import { SAMPLE_THREADS } from '../lib/mockData';

const TAG_STYLES = {
  Collab:      'bg-mint text-slate',
  Application: 'bg-stone text-slate',
  Pitch:       'bg-red-100 text-red-500',
};

function ThreadRow({ thread }) {
  const tagStyle = TAG_STYLES[thread.tag] || TAG_STYLES.Application;
  const initials = thread.host_name.split(' ').map((n) => n[0]).join('').slice(0, 2);
  return (
    <button className="w-full flex items-center gap-3.5 px-4 py-4 hover:bg-white/60 transition-colors border-b border-stone/30 text-left">
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-11 h-11 rounded-full bg-mint flex items-center justify-center">
          <span className="font-display font-bold text-slate text-sm">{initials}</span>
        </div>
        {thread.is_founder && (
          <span className="absolute -bottom-0.5 -right-0.5 text-xs leading-none">⭐</span>
        )}
        {thread.unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-slate text-bone text-[9px] font-bold flex items-center justify-center">
            {thread.unread}
          </span>
        )}
      </div>
      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className={`text-sm font-semibold truncate ${thread.unread ? 'text-ink' : 'text-slate'}`}>
            {thread.listing_title}
          </p>
          <p className="text-sage text-xs flex-shrink-0 ml-2">{thread.timestamp}</p>
        </div>
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded ${tagStyle}`}>
            {thread.tag}
          </span>
        </div>
        <p className="text-sage text-xs truncate">{thread.host_name}: {thread.last_message}</p>
      </div>
    </button>
  );
}

const FILTERS = ['All', 'Applications', 'Collabs', 'Pitches'];

export default function Inbox() {
  const [activeFilter, setActiveFilter] = useState('All');

  const filtered = activeFilter === 'All'
    ? SAMPLE_THREADS
    : SAMPLE_THREADS.filter((t) => t.tag === activeFilter.slice(0, -1) || t.tag === activeFilter);

  return (
    <div className="min-h-dvh bg-bone">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-md border-b border-stone/50 px-4 pt-6 pb-0 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-display font-bold text-ink text-2xl">Messages</h1>
          <div className="flex gap-2">
            <button className="w-9 h-9 rounded-full bg-bone flex items-center justify-center hover:bg-stone/60 transition-colors">
              <svg viewBox="0 0 256 256" fill="none" stroke="#3C5759" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <circle cx="112" cy="112" r="80"/><line x1="168.57" y1="168.57" x2="224" y2="224"/>
              </svg>
            </button>
            <button className="w-9 h-9 rounded-full bg-bone flex items-center justify-center hover:bg-stone/60 transition-colors">
              <svg viewBox="0 0 256 256" fill="none" stroke="#3C5759" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <circle cx="128" cy="128" r="40"/>
                <path d="M130.05,24a104.22,104.22,0,0,1,22.08,4.29l6.81,11.79a88,88,0,0,1,15.23,8.79l13.55-1a104.58,104.58,0,0,1,15.73,22.16l-5.57,12.38a87.87,87.87,0,0,1,3.6,17.34l11.05,8.35a103.86,103.86,0,0,1,0,25.56l-11.05,8.35a87.87,87.87,0,0,1-3.6,17.34l5.57,12.38a104.58,104.58,0,0,1-15.73,22.16l-13.55-1a88,88,0,0,1-15.23,8.79l-6.81,11.79a104.22,104.22,0,0,1-22.08,4.29l-8.36-9.1a87.89,87.89,0,0,1-17.58,0Z"/>
              </svg>
            </button>
          </div>
        </div>
        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`flex-none px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors mb-3 ${
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
      <div className="max-w-2xl mx-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-sage text-sm">No messages yet</p>
          </div>
        ) : (
          filtered.map((t) => <ThreadRow key={t.id} thread={t} />)
        )}
      </div>
    </div>
  );
}
