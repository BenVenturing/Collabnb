import { motion, AnimatePresence } from 'framer-motion';

const CHECKLIST = [
  'Lifetime access to core platform',
  'No commissions — keep 100%',
  'Unlimited messaging',
  'Founding Partner badge on your profile',
  'Early access to new features',
];

function CheckItem({ text }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 w-5 h-5 rounded-full bg-mint flex items-center justify-center flex-shrink-0">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
          stroke="#192524" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
      </span>
      <span className="text-slate text-sm leading-snug">{text}</span>
    </li>
  );
}

export default function SuccessModal({ open, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="overlay"
          className="fixed inset-0 z-40 flex items-center justify-center p-4"
          style={{ background: 'rgba(25,37,36,0.45)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            key="card"
            className="glass-feature w-full max-w-md p-10 text-center relative"
            initial={{ scale: 0.86, opacity: 0, y: 24 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center
                         text-sage hover:bg-black/5 transition-colors"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="1.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>

            {/* Check circle */}
            <div className="w-20 h-20 rounded-full bg-mint flex items-center justify-center mx-auto mb-6">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
                stroke="#192524" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>

            <h2 className="font-display text-4xl font-extrabold text-ink mb-2 tracking-tight">
              You're in.
            </h2>
            <p className="text-slate text-base mb-6">
              You've secured Founding Partner status.
            </p>

            <ul className="text-left space-y-3 mb-8">
              {CHECKLIST.map((item, i) => <CheckItem key={i} text={item} />)}
            </ul>

            <a href="../join.html" className="btn-ink w-full text-base block text-center">
              Complete Your Profile
            </a>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
