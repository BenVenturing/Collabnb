import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const FAQS = [
  {
    q: 'What does lifetime access include?',
    a: 'Lifetime access covers all core platform features available at launch — applying to stays, messaging hosts, managing collaborations, and your creator profile. Ongoing improvements to these core features are included. Future premium or advanced features (e.g. analytics dashboards, priority placement, advanced filtering tools) may be offered separately and are not guaranteed under lifetime access.',
  },
  {
    q: 'Do creators pay any commission?',
    a: 'No. Creators keep 100% of what they earn through Collabnb collaborations. Collabnb does not take a cut of any collaboration value on the creator side. Platform fees apply only to hosts — a $20 flat fee on completed collaborations under $500 cash value, and 5% on collaborations $500 and above. Hybrid Collaborations are billed cash-only — stay value is excluded.',
  },
  {
    q: 'When do I have to pay?',
    a: 'Creators get a free 30-day trial with full access from the moment they\'re approved. After the trial ends, continuing to apply to stays and message hosts requires either a monthly plan ($10/month), an annual plan ($60/year), or lifetime access. Browsing listings is always free, with or without a plan.',
  },
  {
    q: 'What is a Founding Member?',
    a: 'Founding Members are the first 100 creators to join Collabnb and secure lifetime access — before public pricing goes live. They pay nothing for core platform access, ever. They also receive a Founding Member badge on their creator profile and early access to new features before the broader community.',
  },
  {
    q: 'What happens when the free spots are gone?',
    a: 'Once the first 100 founding spots are claimed, lifetime access becomes a paid option using a tiered price ladder: the next 50 at $100, then $125, then $150, then $200. After 300 total lifetime purchases, lifetime access will no longer be offered and only the monthly ($10/mo) and annual ($60/yr) subscriptions will remain.',
  },
  {
    q: 'Can I still use the platform without paying?',
    a: 'Yes. You can always browse collab listings without any payment. Your first 30 days include full access to apply and message at no charge. After the trial ends, you\'ll need an active plan to send new messages and apply to additional stays.',
  },
  {
    q: 'When does the host pay Collabnb’s fee?',
    a: 'Never up front. The host’s platform fee — a $20 flat fee on collaborations under $500 cash value, or 5% on collaborations $500 and above — is charged automatically only after the collaboration is marked complete. Hybrid Collaborations are billed on the cash-only basis. Once the contract finishes, the fee is released to Collabnb with no manual step. Creators are never charged this fee and keep 100% of their collaboration value.',
  },
  {
    q: 'How do referral codes and free months work?',
    a: 'Every member has a personal referral code. When a friend signs up with your code, you both get 1 free month immediately. After that friend completes their first collaboration, you both get a second free month — so each successful referral earns you and your friend 2 free months each. A free month is a month of full access at no charge, applied automatically before you’re billed.',
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
