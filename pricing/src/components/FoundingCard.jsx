const BENEFITS = [
  'Lifetime access — core platform',
  'Unlimited collab applications',
  'Unlimited messaging',
  'Keep 100% of every deal',
  'Founding Partner badge',
  'Early access to new features',
  'No commissions. Ever.',
];

// Must mirror getLifetimeTier() in stripe.js
const LIFETIME_TIERS = [
  { range: 'First 200', label: 'Founding Access',   price: 'Free', cap: 0,   isFounding: true },
  { range: 'Next 50',   label: 'Early Adopter',     price: '$100', cap: 50  },
  { range: 'Next 50',   label: 'Community',          price: '$125', cap: 100 },
  { range: 'Next 50',   label: 'Community',          price: '$150', cap: 150 },
  { range: 'Final 50',  label: 'Standard Lifetime',  price: '$200', cap: 200 },
];

function getActiveTier(lifetimeCount) {
  if (lifetimeCount < 50)  return { price: 100, label: 'Early Adopter',    idx: 1 };
  if (lifetimeCount < 100) return { price: 125, label: 'Community',         idx: 2 };
  if (lifetimeCount < 150) return { price: 150, label: 'Community',         idx: 3 };
  if (lifetimeCount < 200) return { price: 200, label: 'Standard Lifetime', idx: 4 };
  return null;
}

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

export default function FoundingCard({
  isFull,
  spotsRemaining,
  creatorSpotsRemaining,
  hostSpotsRemaining,
  lifetimeCount,
  onClaim,
  onClaimLifetime,
}) {
  const urgency      = spotsRemaining <= 10 ? 'text-ink font-bold' : 'text-sage';
  const creatorsFull = creatorSpotsRemaining <= 0;
  const hostsFull    = hostSpotsRemaining <= 0;
  const activeTier   = getActiveTier(lifetimeCount ?? 0);

  // ── Lifetime pricing ladder — shown after founding cap is hit ────────
  if (isFull) {
    return (
      <div
        className="relative glass-feature p-8 md:p-10 flex flex-col
                   ring-2 ring-ink/10 scale-[1.035] z-10"
        role="region"
        aria-label="Lifetime Access pricing"
      >
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="inline-flex items-center gap-1.5 bg-ink text-bone text-[0.62rem]
                           font-medium uppercase tracking-widest px-3.5 py-1.5 rounded-full">
            <span>★</span> Lifetime Access
          </span>
        </div>

        <p className="mt-3 text-[0.6rem] font-medium text-sage uppercase tracking-widest mb-5 text-center">
          Lifetime Access — Price Ladder
        </p>

        <div className="space-y-2.5 mb-5">
          {LIFETIME_TIERS.map((t, i) => {
            const isClaimed = t.isFounding;
            const isActive  = activeTier && activeTier.idx === i;
            const isPast    = !t.isFounding && activeTier && i < activeTier.idx;

            let rowClass = 'flex items-center justify-between px-4 py-2.5 rounded-xl transition-all ';
            if (isClaimed)    rowClass += 'bg-mint/50 ring-1 ring-mint/60';
            else if (isActive) rowClass += 'bg-ink ring-1 ring-ink';
            else if (isPast)   rowClass += 'bg-stone/10 opacity-40';
            else               rowClass += 'bg-stone/20';

            return (
              <div key={i} className={rowClass}>
                <div>
                  <span className={`text-sm font-medium ${isActive ? 'text-bone' : isClaimed ? 'text-ink' : 'text-slate'}`}>
                    {t.range}
                  </span>
                  <span className={`text-xs ml-2 ${isActive ? 'text-bone/70' : 'text-sage'}`}>
                    ({t.label})
                  </span>
                  {isClaimed && (
                    <span className="text-[0.58rem] font-semibold text-sage/70 uppercase tracking-wider ml-2">
                      Full
                    </span>
                  )}
                </div>
                <span className={`font-display font-bold text-sm tabular-nums ${isActive ? 'text-bone' : isClaimed ? 'text-sage' : 'text-slate'}`}>
                  {t.price}
                </span>
              </div>
            );
          })}
        </div>

        <p className="text-[0.68rem] text-sage text-center leading-relaxed mb-5">
          Pricing increases as the network grows. After 200 lifetime
          purchases, only monthly and annual plans will be available.
        </p>

        {activeTier ? (
          <>
            <button
              onClick={onClaimLifetime}
              className="btn-ink w-full text-[0.95rem] py-3.5"
            >
              Claim Lifetime Access — ${activeTier.price}
            </button>
            <p className="text-[0.68rem] text-sage text-center mt-2.5">
              One-time payment · No monthly fees · Access forever
            </p>
          </>
        ) : (
          <button className="btn-ink w-full text-[0.95rem] opacity-50 cursor-not-allowed" disabled>
            Lifetime spots are sold out
          </button>
        )}
      </div>
    );
  }

  // ── Founding (free) card — shown while spots remain ─────────────────
  return (
    <div
      className="relative glass-feature p-8 md:p-10 text-center flex flex-col
                 ring-2 ring-ink/10 scale-[1.035] z-10"
      role="region"
      aria-label="Founding Access — Featured pricing card"
    >
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 bg-ink text-bone text-[0.62rem]
                         font-medium uppercase tracking-widest px-3.5 py-1.5 rounded-full">
          <span>★</span> Most popular
        </span>
      </div>

      <div className="mt-3 mb-1">
        <p className="text-xs font-medium text-sage uppercase tracking-widest mb-2">
          Founding Access
        </p>
        <div className="font-display text-7xl font-extrabold text-ink tracking-tight leading-none">
          FREE
        </div>
        <p className="text-sm text-slate mt-2">
          First 100 creators &amp; 100 hosts — forever
        </p>
      </div>

      <div className="border-t border-black/[0.06] my-7" />

      <ul className="text-left space-y-3.5 flex-1 mb-6">
        {BENEFITS.map((b, i) => <CheckItem key={i} text={b} />)}
      </ul>

      <div className="flex gap-3 mb-6">
        <div className={`flex-1 rounded-xl px-3 py-2 text-center text-xs ${creatorsFull ? 'bg-red-50 text-red-600' : 'bg-stone/20 text-sage'}`}>
          <span className="font-semibold tabular-nums">{creatorSpotsRemaining}</span> creator spots left
        </div>
        <div className={`flex-1 rounded-xl px-3 py-2 text-center text-xs ${hostsFull ? 'bg-red-50 text-red-600' : 'bg-stone/20 text-sage'}`}>
          <span className="font-semibold tabular-nums">{hostSpotsRemaining}</span> host spots left
        </div>
      </div>

      <button
        onClick={onClaim}
        className="btn-ink w-full text-[1rem] py-4"
        aria-label={`Claim founding access — ${spotsRemaining} spots remaining`}
      >
        Claim Your Spot
      </button>

    </div>
  );
}
