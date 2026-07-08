import FoundingCard from './FoundingCard';
import LockedCard   from './LockedCard';

const LOCKED_PLANS = [
  {
    tier:     'monthly',
    label:    'Monthly',
    price:    '$10',
    period:   '/mo',
    desc:     'After your first successful collaboration',
    features: ['Full marketplace access', 'Explore & apply to stays', 'Message hosts', 'Manage collaborations'],
  },
  {
    tier:     'yearly',
    label:    'Annual',
    price:    '$60',
    period:   '/yr',
    desc:     'Save $60 vs monthly — best value',
    features: ['Everything in Monthly', 'Priority support', 'Save $60/year', 'Cancel anytime'],
  },
];

export default function PricingCards({ isFoundingFull, creatorSpotsRemaining, hostSpotsRemaining, lifetimeCount, onClaim, onClaimLifetime, isUnlocked, onSubscribe }) {
  const spotsRemaining = Math.min(creatorSpotsRemaining, hostSpotsRemaining);

  return (
    <section
      className="max-w-5xl mx-auto px-0 md:px-8 pb-10 md:pb-16"
      aria-label="Pricing options"
    >
      {/* Horizontal scroll on mobile, grid on desktop */}
      <div
        className="flex md:grid md:grid-cols-3 gap-6 md:gap-0 items-center overflow-x-auto md:overflow-visible snap-x md:snap-none snap-mandatory px-4 md:px-0 pb-2 md:pb-0"
        style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="relative z-0 min-w-[85vw] md:min-w-0 snap-center shrink-0 md:shrink">
          <LockedCard plan={LOCKED_PLANS[0]} isUnlocked={isUnlocked} onSubscribe={onSubscribe} />
        </div>
        <div className="relative z-10 md:-mx-8 min-w-[85vw] md:min-w-0 snap-center shrink-0 md:shrink">
          <FoundingCard
            isFull={isFoundingFull}
            creatorSpotsRemaining={creatorSpotsRemaining}
            hostSpotsRemaining={hostSpotsRemaining}
            lifetimeCount={lifetimeCount}
            spotsRemaining={spotsRemaining}
            onClaim={onClaim}
            onClaimLifetime={onClaimLifetime}
          />
        </div>
        <div className="relative z-0 min-w-[85vw] md:min-w-0 snap-center shrink-0 md:shrink">
          <LockedCard plan={LOCKED_PLANS[1]} isUnlocked={isUnlocked} onSubscribe={onSubscribe} />
        </div>
      </div>
      
      {/* ── Founders first overprint — host pricing ── */}
      <div className="max-w-lg mx-auto text-center mt-10 mb-4">
        <div className="relative">
          <div className={`rounded-glass p-5 sm:p-6 ${!isFoundingFull ? "opacity-40 blur-[1px] pointer-events-none select-none" : "glass"}`}
               aria-hidden={!isFoundingFull ? 'true' : undefined}>
            <p className="text-xs font-medium text-sage uppercase tracking-widest mb-2">Host Platform Fee</p>
            <div className="font-display font-extrabold text-ink tracking-tight leading-none mt-1">
              <span className="text-3xl">$20</span>
              <span className="text-base font-normal text-sage"> flat</span>
            </div>
            <p className="text-xs text-sage mt-1 mb-3 leading-relaxed">Per completed collaboration under $500</p>
            <div className="border-t border-black/[0.06] mb-3" />
            <ul className="text-left space-y-2 mx-auto max-w-xs text-sm text-sage">
              <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-mint/70 flex-shrink-0" />No fee to list, message, or browse</li>
              <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-mint/70 flex-shrink-0" />$20 flat for collabs under $500</li>
              <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-mint/70 flex-shrink-0" />5% for collabs $500+</li>
              <li className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-mint/70 flex-shrink-0" />Billed only after you complete</li>
            </ul>
          </div>
          {!isFoundingFull && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: '1rem', zIndex: 5,
            }}>
              <div className="glass rounded-glass px-5 py-3 text-center shadow-lg">
                <p className="text-sm font-bold text-ink font-display">Founding Members skip fees</p>
                <p className="text-xs text-sage mt-1">{Math.min(creatorSpotsRemaining, hostSpotsRemaining)} joint founding spots remain</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile hint */}
      <p className="text-center text-xs text-sage mt-3 md:hidden">← Swipe to compare plans →</p>
    </section>
  );
}
