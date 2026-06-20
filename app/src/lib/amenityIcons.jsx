import {
  Waves, Flame, Wifi, Utensils, Mountain, Snowflake,
  PawPrint, Car, Anchor, Leaf, ChefHat, Compass,
  Wine, Star, Droplets, Sun, Eye, MapPin,
} from 'lucide-react';

// Canonical list — used for both the icon picker in the builder and rendering on the detail page.
export const AMENITY_ICONS = [
  { key: 'pool',        label: 'Pool',              Icon: Waves     },
  { key: 'hot_tub',    label: 'Hot Tub',           Icon: Waves     },
  { key: 'fire',       label: 'Fire Pit',           Icon: Flame     },
  { key: 'grill',      label: 'BBQ / Grill',        Icon: Flame     },
  { key: 'wifi',       label: 'High-speed WiFi',    Icon: Wifi      },
  { key: 'kitchen',    label: 'Full Kitchen',       Icon: Utensils  },
  { key: 'chef',       label: 'Private Chef',       Icon: ChefHat   },
  { key: 'mountain',   label: 'Mountain Views',     Icon: Mountain  },
  { key: 'views',      label: 'Scenic Views',       Icon: Eye       },
  { key: 'ski',        label: 'Ski Access',         Icon: Snowflake },
  { key: 'pet',        label: 'Pet Friendly',       Icon: PawPrint  },
  { key: 'parking',    label: 'Free Parking',       Icon: Car       },
  { key: 'dock',       label: 'Private Dock',       Icon: Anchor    },
  { key: 'garden',     label: 'Garden / Nature',    Icon: Leaf      },
  { key: 'yoga',       label: 'Yoga / Wellness',    Icon: Leaf      },
  { key: 'hiking',     label: 'Hiking Trails',      Icon: Compass   },
  { key: 'wine',       label: 'Wine / Cellar',      Icon: Wine      },
  { key: 'stargazing', label: 'Stargazing',         Icon: Star      },
  { key: 'shower',     label: 'Outdoor Shower',     Icon: Droplets  },
  { key: 'solar',      label: 'Solar / Eco',        Icon: Sun       },
  { key: 'landmark',   label: 'Local Landmarks',    Icon: MapPin    },
];

const ICON_MAP = Object.fromEntries(AMENITY_ICONS.map(({ key, Icon }) => [key, Icon]));

// Legacy emoji → key for any old data that still stores emoji strings
const EMOJI_MAP = {
  '♨️': 'hot_tub', '🏊': 'pool',   '🌊': 'views',  '🔥': 'fire',
  '⛷️': 'ski',     '🏔️': 'mountain','🍳': 'kitchen','👨‍🍳': 'chef',
  '🐕': 'pet',     '📶': 'wifi',    '🅿️': 'parking','🚗': 'parking',
  '🛶': 'dock',    '🚣': 'dock',    '🍽️': 'grill',  '🌿': 'garden',
  '🌲': 'garden',  '🫒': 'garden',  '🧘': 'yoga',   '🥾': 'hiking',
  '🛤️': 'hiking',  '🍷': 'wine',   '🧀': 'wine',   '🛋️': 'wine',
  '🌌': 'stargazing','🚿': 'shower','🍜': 'kitchen','☀️': 'solar',
  '⚡': 'solar',   '🌄': 'views',  '🏛️': 'landmark','📵': 'landmark',
};

export function AmenityIcon({ icon, size = 18, color = 'var(--slate)' }) {
  const key = ICON_MAP[icon] ? icon : EMOJI_MAP[icon];
  const IconComponent = key ? ICON_MAP[key] : null;
  if (!IconComponent) {
    return <span style={{ fontSize: size * 0.85, lineHeight: 1 }}>{icon}</span>;
  }
  return <IconComponent size={size} strokeWidth={1.75} color={color} />;
}
