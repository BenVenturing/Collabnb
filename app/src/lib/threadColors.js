// Narrow palette used to tell apart multiple listing conversations with the
// same counterpart. 'grey' means "general / not listing-specific" — it's the
// default and is never auto-assigned.
export const THEME_COLORS = {
  grey:     { label: 'General',  dot: '#9CA3AF', panelBg: 'rgba(148,163,184,0.10)', composerBg: 'rgba(148,163,184,0.16)' },
  mint:     { label: 'Mint',     dot: '#5FBE93', panelBg: 'rgba(209,235,219,0.35)', composerBg: 'rgba(209,235,219,0.55)' },
  sky:      { label: 'Sky',      dot: '#5B9BD5', panelBg: 'rgba(219,234,254,0.35)', composerBg: 'rgba(219,234,254,0.55)' },
  amber:    { label: 'Amber',    dot: '#D4A843', panelBg: 'rgba(250,230,180,0.35)', composerBg: 'rgba(250,230,180,0.55)' },
  rose:     { label: 'Rose',     dot: '#D98A97', panelBg: 'rgba(250,220,224,0.35)', composerBg: 'rgba(250,220,224,0.55)' },
  lavender: { label: 'Lavender', dot: '#A78BC9', panelBg: 'rgba(230,222,245,0.35)', composerBg: 'rgba(230,222,245,0.55)' },
};

export const THEME_COLOR_IDS = Object.keys(THEME_COLORS);
export const AUTO_COLOR_IDS = THEME_COLOR_IDS.filter((id) => id !== 'grey');

export function threadTheme(thread) {
  return THEME_COLORS[thread?.theme_color] || THEME_COLORS.grey;
}

// Colors are keyed by thread_key so they survive for threads that come from
// Convex rather than local state (those have no stable local row to write to).
export function threadColorKey(thread) {
  return thread?.thread_key || thread?.id;
}

// Who a conversation is with — the grouping unit for "several listings with
// the same person".
export function counterpartKey(thread) {
  return thread?.host_name || '';
}
