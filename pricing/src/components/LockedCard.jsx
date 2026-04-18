export default function LockedCard({ plan }) {
  return (
    <div
      className="glass rounded-glass p-8 text-center opacity-40 blur-[1.5px]
                 pointer-events-none select-none flex flex-col"
      aria-hidden="true"
    >
      <p className="text-xs font-medium text-sage uppercase tracking-widest mb-2">
        {plan.label}
      </p>
      <div className="font-display font-extrabold text-ink tracking-tight leading-none mt-1">
        <span className="text-5xl">{plan.price}</span>
        <span className="text-lg font-normal text-sage">{plan.period}</span>
      </div>
      <p className="text-xs text-sage mt-2 mb-6 leading-relaxed">{plan.desc}</p>

      <div className="border-t border-black/[0.06] mb-6" />

      {/* Features preview */}
      <ul className="text-left space-y-3 flex-1 mb-6 text-sm text-sage">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full bg-stone/60 flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>

      {/* Lock icon + label */}
      <div className="rounded-full bg-stone/40 text-sage py-3 px-6 text-sm flex items-center justify-center gap-2">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.8" strokeLinecap="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
        Available after founding round
      </div>
    </div>
  );
}
