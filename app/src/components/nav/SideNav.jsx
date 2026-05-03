import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  {
    to: '/explore',
    label: 'Explore',
    icon: (
      <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="128" cy="128" r="96"/>
        <polygon points="105.36,105.36 150.64,74.59 179.41,119.87 134.13,150.64 105.36,105.36" fill="currentColor" stroke="none" opacity="0.3"/>
        <polygon points="105.36,105.36 150.64,74.59 179.41,119.87 134.13,150.64"/>
        <line x1="128" y1="224" x2="128" y2="192"/>
        <line x1="128" y1="64" x2="128" y2="32"/>
        <line x1="224" y1="128" x2="192" y2="128"/>
        <line x1="64" y1="128" x2="32" y2="128"/>
      </svg>
    ),
  },
  {
    to: '/collabs',
    label: 'Collabs',
    icon: (
      <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <rect x="32" y="80" width="192" height="144" rx="12"/>
        <path d="M88,80V64a40,40,0,0,1,80,0V80"/>
        <line x1="128" y1="136" x2="128" y2="168"/>
        <line x1="112" y1="152" x2="144" y2="152"/>
      </svg>
    ),
  },
  {
    to: '/saved',
    label: 'Saved',
    icon: (
      <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M128,216S28,160,28,92A52,52,0,0,1,128,72h0A52,52,0,0,1,228,92C228,160,128,216,128,216Z"/>
      </svg>
    ),
  },
  {
    to: '/inbox',
    label: 'Inbox',
    icon: (
      <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M45.15,230.11A8,8,0,0,1,36,222V104a8,8,0,0,1,8-8H212a8,8,0,0,1,8,8V192a16,16,0,0,1-16,16H75.13A8,8,0,0,0,70,209.65Z"/>
        <line x1="96" y1="152" x2="160" y2="152"/>
        <line x1="96" y1="120" x2="160" y2="120"/>
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: (
      <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <circle cx="128" cy="96" r="64"/>
        <path d="M16,216a112,112,0,0,1,224,0"/>
      </svg>
    ),
  },
];

export default function SideNav() {
  return (
    <aside className="hidden lg:flex flex-col w-60 min-h-dvh bg-white/70 backdrop-blur-xl border-r border-stone/60 fixed left-0 top-0 z-30">
      {/* Logo */}
      <div className="px-6 pt-8 pb-6">
        <a href="../index.html" className="flex items-center gap-2.5 group">
          <img
            src="/assets/collabnb-logo.webp"
            alt="Collabnb"
            className="h-7"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <span className="font-display font-bold text-ink text-xl tracking-tight group-hover:text-slate transition-colors">
            collabnb
          </span>
        </a>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-1">
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-ink text-bone'
                  : 'text-slate hover:bg-stone/40 hover:text-ink'
              }`
            }
          >
            {icon}
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 pb-8 pt-4 border-t border-stone/50">
        <a
          href="../index.html"
          className="flex items-center gap-2 text-sage text-xs hover:text-slate transition-colors"
        >
          <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <line x1="224" y1="128" x2="32" y2="128"/>
            <polyline points="104 56 32 128 104 200"/>
          </svg>
          Back to site
        </a>
      </div>
    </aside>
  );
}
