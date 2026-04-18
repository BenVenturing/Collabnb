const VALUES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#192524"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
    title: 'Keep Everything',
    body:  'No commissions taken from creators. Every deal you close is 100% yours. Collabnb earns from hosts — not from you.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#192524"
        strokeWidth="1.8" strokeLinecap="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
    title: 'Pay After Value',
    body:  'Your first collaboration is completely free. Only after you\'ve seen the platform deliver for you do you choose whether to stay.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#192524"
        strokeWidth="1.8" strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    title: 'Curated Network',
    body:  'Limited spots on both sides keep the quality high. Fewer creators means more stays competing for your attention — not the other way around.',
  },
];

export default function ValueSection() {
  return (
    <section className="max-w-5xl mx-auto px-4 md:px-8 py-24">
      <div className="mb-12">
        <span className="eyebrow mb-4 inline-flex">Why creators choose Collabnb</span>
        <h2 className="font-display text-[clamp(2.25rem,4vw,3.25rem)] font-bold text-ink mt-3 max-w-xl">
          Built differently from the start.
        </h2>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {VALUES.map((v, i) => (
          <div key={i} className="glass bg-white/50 rounded-glass p-8">
            <div className="w-11 h-11 rounded-full bg-mint flex items-center justify-center mb-5">
              {v.icon}
            </div>
            <h3 className="font-display text-xl font-bold text-ink mb-3">{v.title}</h3>
            <p className="text-slate text-sm leading-relaxed">{v.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
