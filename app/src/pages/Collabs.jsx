import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SAMPLE_COLLABORATIONS } from '../lib/mockData';

const STATUS_STYLES = {
  pending:  { bg: 'bg-amber-100',  text: 'text-amber-700',  icon: '🟡' },
  uploaded: { bg: 'bg-blue-100',   text: 'text-blue-700',   icon: '🔵' },
  approved: { bg: 'bg-mint',       text: 'text-slate',      icon: '🟢' },
};

function CollabCard({ collab }) {
  const style = STATUS_STYLES[collab.status] || STATUS_STYLES.pending;
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-card border border-stone/30 flex flex-col">
      <div className="flex">
        {/* Photo */}
        <div className="w-28 h-28 flex-shrink-0 bg-stone overflow-hidden">
          <img src={collab.image} alt={collab.property_name} className="w-full h-full object-cover" loading="lazy" />
        </div>
        {/* Details */}
        <div className="flex-1 p-3 relative">
          <button className="absolute top-2 right-2 w-8 h-8 rounded-full bg-bone flex items-center justify-center hover:bg-stone/60 transition-colors">
            <svg viewBox="0 0 256 256" fill="none" stroke="#3C5759" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M92,20H48A28,28,0,0,0,20,48V208a28,28,0,0,0,28,28H208a28,28,0,0,0,28-28V164"/>
              <path d="M228.07,47.93a28,28,0,0,0-39.6,0L104,132.4V152h19.6l84.47-84.47A28,28,0,0,0,228.07,47.93Z"/>
            </svg>
          </button>
          <p className="font-display font-bold text-ink text-sm leading-tight pr-8 line-clamp-1">{collab.property_name}</p>
          <p className="text-slate text-xs mt-1 flex items-center gap-1">
            <span>📍</span>{collab.location}
          </p>
          <p className="text-slate text-xs flex items-center gap-1">
            <span>👤</span>Host: {collab.host_name}
          </p>
          <p className="text-slate text-xs flex items-center gap-1">
            <span>📅</span>{collab.dates}
          </p>
        </div>
      </div>
      {/* Status row */}
      <div className="px-3 py-2.5 border-t border-stone/30 flex items-center justify-between">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${style.bg} ${style.text}`}>
          {style.icon} {collab.status_text}
        </span>
        <svg viewBox="0 0 256 256" fill="none" stroke="#959D90" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <polyline points="96 48 176 128 96 208"/>
        </svg>
      </div>
      {/* Deliverables + due */}
      <div className="px-3 pb-3 flex justify-between">
        <div>
          <p className="text-sage text-[10px] uppercase tracking-wider mb-0.5">Deliverables</p>
          <p className="text-ink text-sm font-semibold">{collab.deliverables}</p>
        </div>
        {collab.days_left && (
          <div className="text-right">
            <p className="text-sage text-[10px] uppercase tracking-wider mb-0.5">Due in</p>
            <p className="text-slate text-sm font-semibold">{collab.days_left} days</p>
          </div>
        )}
        {collab.payment && (
          <div className="text-right">
            <p className="text-sage text-[10px] uppercase tracking-wider mb-0.5">Payment</p>
            <p className="text-slate text-sm font-semibold">{collab.payment}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Collabs() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('active');

  const active   = SAMPLE_COLLABORATIONS.filter((c) =>  c.is_active);
  const archived = SAMPLE_COLLABORATIONS.filter((c) => !c.is_active);
  const shown    = filter === 'active' ? active : archived;

  return (
    <div className="min-h-dvh bg-bone">
      {/* Header */}
      <div className="bg-white/70 backdrop-blur-md border-b border-stone/50 px-4 pt-6 pb-4 lg:px-8">
        <h1 className="font-display font-bold text-ink text-2xl mb-4">Collaborations</h1>
        {/* Filter toggle */}
        <div className="flex bg-bone rounded-xl p-1 gap-1 max-w-xs">
          {['active', 'archived'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-colors capitalize ${
                filter === f ? 'bg-white text-ink shadow-sm' : 'text-slate hover:text-ink'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {shown.length === 0 ? (
          <div className="text-center pt-16">
            <p className="text-4xl mb-4">✦</p>
            <h3 className="font-display font-bold text-ink text-lg mb-2">No collabs yet</h3>
            <p className="text-sage text-sm mb-6">Apply to a stay to get started</p>
            <button
              onClick={() => navigate('/explore')}
              className="btn-ink"
            >
              Discover Stays
            </button>
          </div>
        ) : (
          shown.map((c) => <CollabCard key={c.id} collab={c} />)
        )}
      </div>
    </div>
  );
}
