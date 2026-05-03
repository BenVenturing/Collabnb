const BENEFITS = [
  'Lifetime access — core platform',
  'Unlimited collab applications',
  'Unlimited messaging',
  'Keep 100% of every deal',
  'Founding Partner badge',
  'Early access to new features',
  'No commissions. Ever.',
];

function CheckItem({ text }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 w-5 h-5 rounded-full bg-mint flex items-center justify-center flex-shrink-0">
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
          stroke="#192524" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      </span>
      <span className="text-slate text-sm leading-snug">{text}</span>
    </li>
  );
}

export default function FoundingCard({ isFull, spotsRemaining, onClaim }) {
  const urgency = spotsRemaining <= 10
    ? 'text-ink font-bold'
    : 'text-sage';

  return (
    <div
      className="relative glass-feature p-8 md:p-10 text-center flex flex-col
                 ring-2 ring-ink/10 scale-[1.035] z-10"
      role="region"
      aria-label="Founding Access — Featured pricing card"
    >
      {/* Top badge */}
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 bg-ink text-bone text-[0.62rem]
                         font-medium uppercase tracking-widest px-3.5 py-1.5 rounded-full">
          <span>★</span> Most popular
        </span>
      </div>

      {/* Label & price */}
      <div className="mt-3 mb-1">
        <p className="text-xs font-medium text-sage uppercase tracking-widest mb-2">
          Founding Access
        </p>
        <div className="font-display text-7xl font-extrabold text-ink tracking-tight leading-none">
          FREE
        </div>
        <p className="text-sm text-slate mt-2">
          {isFull
            ? 'All founding spots have been claimed'
            : 'For the first 200 founders — forever'}
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-black/[0.06] my-7" />

      {/* Benefits list */}
      <ul className="text-left space-y-3.5 flex-1 mb-8">
        {BENEFITS.map((b, i) => <CheckItem key={i} text={b} />)}
      </ul>

      {/* CTA */}
      {isFull ? (
        <button className="btn-ink w-full text-[0.95rem] opacity-50 cursor-not-allowed" disabled>
          Founding spots are full
        </button>
      ) : (
        <button
          onClick={onClaim}
          className="btn-ink w-full text-[1rem] py-4"
          aria-label={`Claim founding access — ${spotsRemaining} spots remaining`}
        >
          Claim Your Spot
        </button>
      )}

      {/* Scarcity text */}
      {!isFull && (
        <p className={`text-xs mt-3 tabular-nums ${urgency}`}>
          Only{' '}
          <span className="font-semibold">{spotsRemaining}</span>
          {' '}of 200 total founding spots remaining
          {spotsRemaining <= 20 && ' — almost gone'}
        </p>
      )}
    </div>
  );
}
