export default function HeroSection({ spotsRemaining, isFoundingFull }) {
  return (
    <section className="text-left max-w-7xl mx-auto px-4 md:px-8 pt-28 pb-12">
      <span className="eyebrow mb-6 inline-flex">
        {isFoundingFull
          ? 'Founding spots are now closed'
          : `Founding Access · ${spotsRemaining} of 100 spots remaining`}
      </span>

      <h1 className="font-display text-[clamp(2.75rem,6vw,5rem)] font-extrabold text-ink
                     leading-[0.96] tracking-tight mt-4 mb-5 max-w-3xl">
        Get Lifetime Access.<br/>
        Pay Once. Keep 100%<br/>
        of Your Collaborations.
      </h1>

      <p className="text-slate text-[clamp(1.1rem,1.4vw,1.3rem)] leading-relaxed max-w-[52ch]">
        Join a curated network of creators and boutique stays. No commissions.
        No ongoing fees. First 100 creators get in for life — free.
      </p>
    </section>
  );
}
