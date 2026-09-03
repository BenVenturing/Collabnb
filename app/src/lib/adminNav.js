// Shared admin sidebar nav structure — used by AdminDashboard (renders it)
// and AdminSettings (lets Ben drag-reorder the top-level order). Kept in its
// own module so neither file has to import the other.

// Flat items shown above the collapsible groups — no sub-tabs of their own.
export const TOP_SECTIONS = [
  { id: 'overview',    label: 'Overview' },
  { id: 'admin-inbox', label: 'Inbox'    },
  { id: 'crashes',     label: 'Crash Reports' },
];

// Pinned to the footer — always visible, not part of the reorderable set.
export const SETTINGS_SECTION = { id: 'settings', label: 'Settings' };

// Collapsible groups. `icon` keys into ICONS (defined in AdminDashboard); each
// group opens its first tab when clicked.
export const GROUPS = [
  { id: 'users', label: 'Users', icon: 'users', tabs: [
    { id: 'users',          label: 'All Users'           },
    { id: 'messages',       label: 'User Messages'       },
    { id: 'founders',       label: 'Founder Tracker'     },
    { id: 'algo-simulator', label: 'Listing Feed Algorithm Simulator', children: [
      { id: 'algo-reference', label: 'How It Works' },
    ] },
    { id: 'creator-algo-simulator', label: 'Creator Ranking Algorithm Simulator', children: [
      { id: 'creator-algo-reference', label: 'How It Works' },
    ] },
  ] },
  { id: 'collabs', label: 'Collab Oversight', icon: 'collabs', tabs: [
    { id: 'collabs',   label: 'Oversight'          },
    { id: 'listings',  label: 'Listing Management' },
    { id: 'contracts', label: 'Contracts'          },
  ] },
  { id: 'money', label: 'Money', icon: 'money', tabs: [
    { id: 'money-overview',  label: 'Overview'   },
    { id: 'payouts',         label: 'Payouts'    },
    { id: 'ambassadors',     label: 'Affiliates' },
    { id: 'money-resources', label: 'Resources'  },
  ] },
  { id: 'marketing', label: 'Marketing', icon: 'marketing', tabs: [
    { id: 'discovery', label: 'Discovery' },
    { id: 'blog',      label: 'Blog'      },
    { id: 'broadcast', label: 'Emails'    },
    { id: 'social',    label: 'Social'    },
  ] },
  { id: 'suggestions', label: 'Suggestions / Beta', icon: 'suggestions', tabs: [
    { id: 'suggestions', label: 'Suggestions'        },
    { id: 'moderation',  label: 'Moderation'         },
    { id: 'audit',       label: 'Audit Log'          },
  ] },
];

// Panels reachable outside the sidebar (e.g. Overview widgets) — kept here so
// the breadcrumb can still resolve their label.
export const HIDDEN_SECTIONS = [
  { id: 'analytics', label: 'Platform Analytics' },
];

// A group's tabs, flattened to include any nested children.
export const flatTabs = (group) => group.tabs.flatMap(t => [t, ...(t.children || [])]);
export const groupContains = (group, id) => flatTabs(group).some(t => t.id === id);

export const ALL_LABELS = [
  ...TOP_SECTIONS, SETTINGS_SECTION, ...HIDDEN_SECTIONS,
  ...GROUPS.flatMap(flatTabs),
];

// Flat, searchable index of every navigable destination in the admin panel.
export const NAV_INDEX = [
  ...TOP_SECTIONS.map(s => ({ id: s.id, label: s.label })),
  ...GROUPS.flatMap(g => flatTabs(g).map(t => ({ id: t.id, label: t.label, group: g.label }))),
  { id: SETTINGS_SECTION.id, label: SETTINGS_SECTION.label },
  ...HIDDEN_SECTIONS.map(s => ({ id: s.id, label: s.label })),
];

// ─── Reorderable top level ──────────────────────────────────────────────────
// Every TOP_SECTIONS item + every GROUPS item, looked up by id — this is the
// full set Ben can drag into a custom order from Settings. Crash Reports
// defaults to last (below Suggestions / Beta) per his request.
export const NAV_ITEMS_BY_ID = {};
for (const s of TOP_SECTIONS) NAV_ITEMS_BY_ID[s.id] = { ...s, type: 'flat' };
for (const g of GROUPS) NAV_ITEMS_BY_ID[g.id] = { ...g, type: 'group' };

export const NAV_ORDER_DEFAULT = ['overview', 'admin-inbox', 'users', 'collabs', 'money', 'marketing', 'suggestions', 'crashes'];

// Parses the saved `nav_order` setting (JSON array of ids) into a full,
// valid order — unknown ids are dropped, missing ones (e.g. a newly added
// section) are appended so nothing silently disappears from the sidebar.
export function resolveNavOrder(rawSetting) {
  let saved = null;
  if (rawSetting) {
    try {
      const parsed = JSON.parse(rawSetting);
      if (Array.isArray(parsed)) saved = parsed;
    } catch { /* fall through to default */ }
  }
  const base = saved || NAV_ORDER_DEFAULT;
  const known = base.filter((id) => NAV_ITEMS_BY_ID[id]);
  const missing = NAV_ORDER_DEFAULT.filter((id) => !known.includes(id));
  return [...known, ...missing];
}
