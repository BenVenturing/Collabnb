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

export default function PricingCards({ isFoundingFull, creatorSpotsRemaining, hostSpotsRemaining, onClaim, isUnlocked, onSubscribe }) {
  const spotsRemaining = Math.min(creatorSpotsRemaining, hostSpotsRemaining);
  return (
    <section
      className="max-w-5xl mx-auto px-4 md:px-8 pb-4"
      aria-label="Pricing options"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
        <LockedCard plan={LOCKED_PLANS[0]} isUnlocked={isUnlocked} onSubscribe={onSubscribe} />
        <FoundingCard
          isFull={isFoundingFull}
          creatorSpotsRemaining={creatorSpotsRemaining}
          hostSpotsRemaining={hostSpotsRemaining}
          spotsRemaining={spotsRemaining}
          onClaim={onClaim}
        />
        <LockedCard plan={LOCKED_PLANS[1]} isUnlocked={isUnlocked} onSubscribe={onSubscribe} />
      </div>
    </section>
  );
}
