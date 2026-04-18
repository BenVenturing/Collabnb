import FoundingCard from './FoundingCard';
import LockedCard   from './LockedCard';

const LOCKED_PLANS = [
  {
    label:    'Monthly',
    price:    '$10',
    period:   '/mo',
    desc:     'After your first successful collaboration',
    features: ['Core platform access', 'Apply to stays', 'Message hosts'],
  },
  {
    label:    'Annual',
    price:    '$60',
    period:   '/yr',
    desc:     'Save $60 vs monthly — best value after founding round',
    features: ['Everything in Monthly', 'Priority support', '2 months free'],
  },
];

export default function PricingCards({ isFoundingFull, spotsRemaining, onClaim }) {
  return (
    <section
      className="max-w-5xl mx-auto px-4 md:px-8 pb-4"
      aria-label="Pricing options"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
        <LockedCard plan={LOCKED_PLANS[0]} />
        <FoundingCard
          isFull={isFoundingFull}
          spotsRemaining={spotsRemaining}
          onClaim={onClaim}
        />
        <LockedCard plan={LOCKED_PLANS[1]} />
      </div>
    </section>
  );
}
