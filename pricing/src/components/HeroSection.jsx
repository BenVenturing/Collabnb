export default function HeroSection({ spotsRemaining, isFoundingFull, founderCreatorCount, founderHostCount }) {
  return (
    <section className="text-left max-w-7xl mx-auto px-4 md:px-8 pt-28 pb-12">
      <span className="eyebrow mb-6 inline-flex">
        {isFoundingFull
          ? 'Founding spots filled — standard pricing now applies'
          : `Founding Access · ${spotsRemaining} joint founding spots remain`}
      </span>

      <h1 className="font-display text-[clamp(2.75rem,6vw,5rem)] font-extrabold text-ink
                     leading-[0.96] tracking-tight mt-4 mb-5 max-w-3xl">
        Founding Members<br/>
        Never Pay a Fee.
      </h1>

      <p className="text-slate text-[clamp(1.1rem,1.4vw,1.3rem)] leading-relaxed max-w-[52ch]">
        First 100 creators and 100 hosts to join get lifetime access —{' '}
        <strong className="text-ink">no platform fees, no subscription, ever.</strong>
      </p>

      {/* Live founder counters */}
      {!isFoundingFull && (
        <div className="flex items-center gap-6 mt-8">
          <div className="glass rounded-full px-5 py-2.5 text-sm font-semibold text-ink font-display">
            <span className="text-lg">{founderCreatorCount}</span><span className="text-sage font-normal"> / 100 creators</span>
          </div>
          <div className="glass rounded-full px-5 py-2.5 text-sm font-semibold text-ink font-display">
            <span className="text-lg">{founderHostCount}</span><span className="text-sage font-normal"> / 100 hosts</span>
          </div>
        </div>
      )}

      {isFoundingFull && (
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-900 max-w-lg">
          Founding spots are full. Host pricing applies per collaboration posted.
          Creators can subscribe to Creator Plus or purchase Lifetime Access.
        </div>
      )}
    </section>
  );
}
