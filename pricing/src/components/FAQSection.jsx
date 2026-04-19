import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const FAQS = [
  {
    q: 'What does lifetime access include?',
    a: 'Lifetime access covers all core platform features available at launch — applying to stays, messaging hosts, managing collaborations, and your creator profile. Ongoing improvements to these core features are included. Future premium or advanced features (e.g. analytics dashboards, priority placement, advanced filtering tools) may be offered separately and are not guaranteed under lifetime access.',
  },
  {
    q: 'Do creators pay any commission?',
    a: 'No. Creators keep 100% of what they earn through Collabnb collaborations. Collabnb does not take a cut of any collaboration value on the creator side. Platform fees apply only to hosts — a $20 flat fee on free-stay collabs and a 5% fee on paid collaborations.',
  },
  {
    q: 'When do I have to pay?',
    a: 'Creators can join and apply to their first collaboration completely free. After your first successful collaboration, applying to new stays and messaging hosts requires either a monthly plan ($10/month), an annual plan ($60/year), or lifetime access. Browsing listings is always free, with or without a plan.',
  },
  {
    q: 'What is a Founding Partner?',
    a: 'Founding Partners are the first 100 creators to join Collabnb and secure lifetime access — before public pricing goes live. They pay nothing for core platform access, ever. They also receive a Founding Partner badge on their creator profile and early access to new features before the broader community.',
  },
  {
    q: 'What happens when the free spots are gone?',
    a: 'Once the first 100 founding spots are claimed, lifetime access becomes a paid option using a tiered price ladder: the next 50 at $100, then $125, then $150, then $200. After 300 total lifetime purchases, lifetime access will no longer be offered and only the monthly ($10/mo) and annual ($60/yr) subscriptions will remain.',
  },
  {
    q: 'Can I still use the platform without paying?',
    a: 'Yes. You can always browse collab listings without any payment. After your first successful collaboration, you\'ll need an active plan to send new messages and apply to additional stays. Think of it as a "see it work first, then decide" model — we earn your subscription, not the other way around.',
  },
];

export default function FAQSection() {
  const [openIdx, setOpenIdx] = useState(null);
  const toggle = i => setOpenIdx(openIdx === i ? null : i);

  return (
    <section className="max-w-2xl mx-auto px-4 md:px-8 pb-24">
      <div className="mb-12">
        <span className="eyebrow mb-4 inline-flex">Things people ask.</span>
        <h2 className="font-display text-[clamp(2.25rem,4vw,3.25rem)] font-bold text-ink mt-3">
          Good questions.
        </h2>
      </div>

      <div>
        {FAQS.map((faq, i) => (
          <div key={i} className="border-b border-black/[0.07] last:border-b-0">
            <button
              onClick={() => toggle(i)}
              className="flex items-center justify-between w-full py-5 text-left
                         text-ink font-medium text-base hover:opacity-60 transition-opacity
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink
                         focus-visible:ring-offset-2 rounded"
              aria-expanded={openIdx === i}
              aria-controls={`faq-answer-${i}`}
              id={`faq-question-${i}`}
            >
              <span className="pr-8 leading-snug">{faq.q}</span>
              <span
                className="flex-shrink-0 text-sage text-xl font-light transition-transform duration-200"
                style={{ display: 'inline-block', transform: openIdx === i ? 'rotate(45deg)' : 'none' }}
                aria-hidden="true"
              >
                +
              </span>
            </button>

            <AnimatePresence initial={false}>
              {openIdx === i && (
                <motion.div
                  key={`answer-${i}`}
                  id={`faq-answer-${i}`}
                  role="region"
                  aria-labelledby={`faq-question-${i}`}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <p className="text-slate text-sm leading-relaxed pb-6 pr-8 max-w-prose">
                    {faq.a}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      {/* Contact block */}
      <div className="text-center mt-14">
        <p className="text-sage text-sm mb-3">Still have a question?</p>
        <a
          href="mailto:hellocollabnb@gmail.com"
          className="btn-glass text-sm px-5 py-3"
        >
          hellocollabnb@gmail.com
        </a>
      </div>
    </section>
  );
}
