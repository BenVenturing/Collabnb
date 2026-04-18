export default function TermsNote() {
  return (
    <section className="max-w-2xl mx-auto px-4 md:px-8 pb-20">
      <div className="glass bg-white/30 rounded-2xl p-6 text-xs text-sage leading-relaxed">
        <p className="font-medium text-slate mb-2.5 text-sm">A few things worth knowing</p>
        <p className="mb-3">
          <strong className="text-ink font-medium">Lifetime access scope.</strong>{' '}
          "Lifetime access" applies only to core platform features as defined at the time of
          launch. It does not guarantee access to future premium features, which may be offered
          under separate pricing. Core features include: collab applications, creator–host
          messaging, listing browsing, collab management, and creator profile.
        </p>
        <p>
          <strong className="text-ink font-medium">Non-circumvention.</strong>{' '}
          When a host and creator connect through Collabnb, both parties agree not to conduct
          paid or in-kind collaborations introduced through the platform outside of it for a
          period of 12–24 months from the date of introduction. This clause protects the
          integrity of the marketplace and ensures the platform can continue to grow and
          serve its community. Full terms will be provided at account creation.
        </p>
      </div>
    </section>
  );
}
