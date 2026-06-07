import FoundingCard from './FoundingCard';
import LockedCard   from './LockedCard';

const LOCKED_PLANS = [
  {
    tier:     'monthly',
    label:    'Monthly',
    price:    '$10',
    period:   '/mo',
    desc:     'After your first successful collaboration',
    features: ['Core platform access', 'Apply to stays', 'Message hosts'],
  },
  {
    tier:     'yearly',
    label:    'Annual',
    price:    '$60',
    period:   '/yr',
    desc:     'Save $60 vs monthly — best value',
    features: ['Everything in Monthly', 'Priority support', '2 months free'],
  },
];

export default function PricingCards({ isFoundingFull, creatorSpotsRemaining, hostSpotsRemaining, lifetimeCount, onClaim, onClaimLifetime, isUnlocked, onSubscribe }) {
  const spotsRemaining = Math.min(creatorSpotsRemaining, hostSpotsRemaining);

  if (!isUnlocked) {
    return (
      <section
        className="max-w-xl mx-auto px-4 md:px-8 pb-4"
        aria-label="Pricing options"
      >
        <FoundingCard
          isFull={isFoundingFull}
          creatorSpotsRemaining={creatorSpotsRemaining}
          hostSpotsRemaining={hostSpotsRemaining}
          lifetimeCount={lifetimeCount}
          spotsRemaining={spotsRemaining}
          onClaim={onClaim}
          onClaimLifetime={onClaimLifetime}
        />
      </section>
    );
  }

  return (
    <section
      className="max-w-5xl mx-auto px-0 md:px-8 pb-4"
      aria-label="Pricing options"
    >
      {/* Horizontal scroll on mobile, grid on desktop */}
      <div
        className="flex md:grid md:grid-cols-3 gap-6 md:gap-0 items-center overflow-x-auto snap-x snap-mandatory px-4 md:px-0 pb-2 md:pb-0"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
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
      {/* Mobile hint */}
      <p className="text-center text-xs text-sage mt-3 md:hidden">← Swipe to compare plans →</p>
    </section>
  );
}
