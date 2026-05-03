import { NavLink } from 'react-router-dom';

const TABS = [
  {
    to: '/explore',
    label: 'Explore',
    icon: (active) => (
      <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth={active ? 16 : 13} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <circle cx="128" cy="128" r="96"/>
        <polygon points="105.36,105.36 150.64,74.59 179.41,119.87 134.13,150.64"/>
      </svg>
    ),
  },
  {
    to: '/collabs',
    label: 'Collabs',
    icon: (active) => (
      <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth={active ? 16 : 13} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <rect x="32" y="80" width="192" height="144" rx="12"/>
        <path d="M88,80V64a40,40,0,0,1,80,0V80"/>
      </svg>
    ),
  },
  {
    to: '/saved',
    label: 'Saved',
    icon: (active) => (
      <svg viewBox="0 0 256 256" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 16 : 13} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M128,216S28,160,28,92A52,52,0,0,1,128,72h0A52,52,0,0,1,228,92C228,160,128,216,128,216Z"/>
      </svg>
    ),
  },
  {
    to: '/inbox',
    label: 'Inbox',
    icon: (active) => (
      <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth={active ? 16 : 13} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M45.15,230.11A8,8,0,0,1,36,222V104a8,8,0,0,1,8-8H212a8,8,0,0,1,8,8V192a16,16,0,0,1-16,16H75.13A8,8,0,0,0,70,209.65Z"/>
        <line x1="96" y1="152" x2="160" y2="152"/>
        <line x1="96" y1="120" x2="160" y2="120"/>
      </svg>
    ),
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: (active) => (
      <svg viewBox="0 0 256 256" fill="none" stroke="currentColor" strokeWidth={active ? 16 : 13} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <circle cx="128" cy="96" r="64"/>
        <path d="M16,216a112,112,0,0,1,224,0"/>
      </svg>
    ),
  },
];

export default function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/85 backdrop-blur-xl border-t border-stone/60 safe-area-bottom">
      <div className="flex items-stretch h-16">
        {TABS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                isActive ? 'text-ink' : 'text-sage'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {icon(isActive)}
                <span className="text-[10px] font-medium tracking-wide">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
      {/* iOS safe area spacer */}
      <div className="h-safe-bottom" />
    </nav>
  );
}
