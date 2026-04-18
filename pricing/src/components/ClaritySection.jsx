const CREATOR_POINTS = [
  {
    label:  'Join the waitlist',
    detail: 'Free. Always.',
  },
  {
    label:  'Your first collaboration',
    detail: 'Completely free — no fee until you\'ve seen it work.',
  },
  {
    label:  'After your first collab',
    detail: '$10/month or $60/year to continue applying and messaging. Browsing stays free.',
  },
  {
    label:  'Founding lifetime access',
    detail: 'First 100 only — free forever, core platform. Claim it now.',
  },
];

const HOST_POINTS = [
  {
    label:  'Join and create listings',
    detail: 'Always free.',
  },
  {
    label:  'Free-stay collaborations',
    detail: '$20 flat fee per successful collab where no money changes hands.',
  },
  {
    label:  'Paid collaborations',
    detail: '5% platform fee on the total agreed collaboration value.',
  },
];

function PointList({ items }) {
  return (
    <ul className="space-y-5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-4">
          <span className="w-2 h-2 rounded-full bg-mint ring-2 ring-sage/25 mt-1.5 flex-shrink-0" />
          <div>
            <p className="text-ink font-medium text-sm">{item.label}</p>
            <p className="text-sage text-sm mt-0.5 leading-snug">{item.detail}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default function ClaritySection() {
  return (
    <section className="max-w-5xl mx-auto px-4 md:px-8 pb-24">
      <div className="mb-12">
        <span className="eyebrow mb-4 inline-flex">No surprises</span>
        <h2 className="font-display text-[clamp(2.25rem,4vw,3.25rem)] font-bold text-ink mt-3">
          Simple, transparent pricing.
        </h2>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Creator card */}
        <div className="glass bg-white/50 rounded-glass p-8">
          <div className="flex items-center gap-3 mb-7">
            <div className="w-9 h-9 rounded-full bg-mint flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#192524"
                strokeWidth="1.8" strokeLinecap="round">
                <circle cx="12" cy="8" r="4"/>
                <path d="M6 20v-2a6 6 0 0112 0v2"/>
              </svg>
            </div>
            <h3 className="font-display text-xl font-bold text-ink">For Creators</h3>
          </div>
          <PointList items={CREATOR_POINTS} />
        </div>

        {/* Host card */}
        <div className="glass bg-white/50 rounded-glass p-8">
          <div className="flex items-center gap-3 mb-7">
            <div className="w-9 h-9 rounded-full bg-mint flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#192524"
                strokeWidth="1.8" strokeLinecap="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
            </div>
            <h3 className="font-display text-xl font-bold text-ink">For Hosts</h3>
          </div>
          <PointList items={HOST_POINTS} />
        </div>
      </div>
    </section>
  );
}
