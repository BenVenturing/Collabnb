export default function Saved() {
  return (
    <div className="min-h-dvh bg-bone">
      <div className="px-4 pt-8 pb-4 lg:px-8">
        <h1 className="font-display font-bold text-ink text-2xl">Wishlists</h1>
        <p className="text-sage text-sm mt-1">0 saved collaborations</p>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {/* Create wishlist */}
        <button className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-dashed border-stone text-slate text-sm font-medium hover:border-sage hover:text-ink transition-colors mb-6">
          <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <line x1="128" y1="40" x2="128" y2="216"/><line x1="40" y1="128" x2="216" y2="128"/>
          </svg>
          Create wishlist
        </button>

        {/* Empty placeholder collection */}
        <div className="w-40">
          <div className="aspect-square rounded-2xl bg-stone/50 flex items-center justify-center mb-2">
            <svg viewBox="0 0 256 256" fill="none" stroke="#D0D5CE" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
              <path d="M128,216S28,160,28,92A52,52,0,0,1,128,72h0A52,52,0,0,1,228,92C228,160,128,216,128,216Z"/>
            </svg>
          </div>
          <p className="font-semibold text-ink text-sm">Saved</p>
          <p className="text-sage text-xs">0 saved</p>
        </div>
      </div>
    </div>
  );
}
