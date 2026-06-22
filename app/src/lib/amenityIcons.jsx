import {
  Waves, Flame, Wifi, Utensils, Mountain, Snowflake,
  PawPrint, Car, Anchor, Leaf, ChefHat, Compass,
  Wine, Star, Droplets, Sun, Eye, MapPin,
  Tv, Wind, Thermometer, Dumbbell, Bath, Coffee, Bike, Music,
  BookOpen, Umbrella, Laptop, Trees, Tent, Sailboat, Bed,
  Camera, Key, Flower2, Sunrise, Moon, Plane, Dog, Baby,
  Gift, Heart, Sparkles, Bell, Briefcase,
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
  { key: 'tv',          label: 'TV / Streaming',     Icon: Tv         },
  { key: 'ac',          label: 'Air Conditioning',   Icon: Wind       },
  { key: 'heating',     label: 'Heating',            Icon: Thermometer},
  { key: 'gym',         label: 'Gym / Fitness',      Icon: Dumbbell   },
  { key: 'bath',        label: 'Bathtub',            Icon: Bath       },
  { key: 'coffee',      label: 'Coffee Maker',       Icon: Coffee     },
  { key: 'bikes',       label: 'Bikes',              Icon: Bike       },
  { key: 'sound',       label: 'Sound System',       Icon: Music      },
  { key: 'books',       label: 'Books / Library',    Icon: BookOpen   },
  { key: 'beach',       label: 'Beach Access',       Icon: Umbrella   },
  { key: 'workspace',   label: 'Workspace',          Icon: Laptop     },
];

// Extra graphics — only offered in the "create your own amenity" picker, not the default grid.
export const EXTRA_ICONS = [
  { key: 'trees',     label: 'Forest',       Icon: Trees    },
  { key: 'tent',      label: 'Camping',      Icon: Tent     },
  { key: 'boat',      label: 'Boat',         Icon: Sailboat },
  { key: 'bed',       label: 'Extra Beds',   Icon: Bed      },
  { key: 'camera',    label: 'Photo Spot',   Icon: Camera   },
  { key: 'key',       label: 'Self Check-in',Icon: Key      },
  { key: 'flower',    label: 'Florals',      Icon: Flower2  },
  { key: 'sunrise',   label: 'Sunrise View', Icon: Sunrise  },
  { key: 'moon',      label: 'Nightlife',    Icon: Moon     },
  { key: 'plane',     label: 'Near Airport', Icon: Plane    },
  { key: 'dog',       label: 'Dogs Welcome', Icon: Dog      },
  { key: 'baby',      label: 'Family Friendly', Icon: Baby  },
  { key: 'gift',      label: 'Welcome Gift', Icon: Gift     },
  { key: 'heart',     label: 'Romantic',     Icon: Heart    },
  { key: 'sparkles',  label: 'Special Touch',Icon: Sparkles },
  { key: 'bell',      label: 'Concierge',    Icon: Bell     },
  { key: 'work',      label: 'Business',     Icon: Briefcase},
];

// Full palette offered when creating a custom amenity.
export const ICON_PALETTE = [...AMENITY_ICONS, ...EXTRA_ICONS];

const ICON_MAP = Object.fromEntries(ICON_PALETTE.map(({ key, Icon }) => [key, Icon]));

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
