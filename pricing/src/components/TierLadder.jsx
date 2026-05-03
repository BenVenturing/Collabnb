import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const TIERS = [
  { range: 'First 200',  price: 'Free',  label: 'Founding Access',    active: true  },
  { range: 'Next 50',   price: '$100',  label: 'Early Adopter',       active: false },
  { range: 'Next 50',   price: '$125',  label: 'Community',           active: false },
  { range: 'Next 50',   price: '$150',  label: 'Community',           active: false },
  { range: 'Final 50',  price: '$200',  label: 'Standard Lifetime',   active: false },
];

export default function TierLadder() {
  const [open, setOpen] = useState(false);

  return (
    <div className="text-center mt-10 mb-2 px-4">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-sm text-sage hover:text-slate transition-colors
                   underline underline-offset-4 decoration-sage/40 focus-visible:outline-none
                   focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 rounded"
        aria-expanded={open}
      >
        {open ? 'Hide pricing ladder ↑' : 'What happens when spots fill? →'}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="ladder"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="glass bg-white/55 rounded-2xl p-6 mt-5 max-w-sm mx-auto text-left">
              <p className="text-[0.65rem] text-sage uppercase tracking-widest font-medium mb-4">
                Lifetime access — price ladder
              </p>

              <div className="space-y-2.5">
                {TIERS.map((t, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-xl transition-all
                      ${t.active
                        ? 'bg-mint/50 ring-1 ring-mint/60'
                        : 'bg-stone/20'
                      }`}
                  >
                    <div>
                      <span className={`text-sm font-medium ${t.active ? 'text-ink' : 'text-slate'}`}>
                        {t.range}
                      </span>
                      <span className="text-xs text-sage ml-2">({t.label})</span>
                    </div>
                    <span className={`font-display font-bold tabular-nums text-sm
                      ${t.active ? 'text-ink' : 'text-slate'}`}>
                      {t.price}
                    </span>
                  </div>
                ))}
              </div>

              <p className="text-xs text-sage mt-4 text-center">
                Pricing increases as the network grows. After 300 lifetime purchases,
                only monthly and annual plans will be available.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
