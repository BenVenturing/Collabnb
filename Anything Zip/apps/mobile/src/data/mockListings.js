export const MOCK_LISTINGS = [
  {
    id: "1",
    title: "Glacier Prime Cabin",
    location_city: "Lake Tahoe",
    location_country: "CA",
    bargaining_mode_enabled: true,
    images: [
      "https://images.unsplash.com/photo-1587061949409-02df41d5e562?w=800",
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800",
    ],
    compensation_type: "paid",
    stay_nights: null,
    cash_payout: 450,
    perks: ["Hot tub access", "Ski equipment storage", "Mountain bike rental"],
    value_estimate: 450,
    creator_tier_required: "ugc_pro",
    deliverable_load: "moderate",
    collaboration_window: {
      startDate: "2026-03-15",
      endDate: "2026-04-15",
    },
    deliverables_due_date: "2026-04-30",
    turnaround_time_days: 14,
    deliverables: [
      {
        type: "Instagram Reels",
        quantity: 3,
        description: "Showcase the cabin's hot tub with mountain views",
        specs: {
          durationSec: 30,
          orientation: "9:16",
          resolution: "1080x1920",
        },
        example_url: "https://instagram.com/example",
      },
      {
        type: "Instagram Story",
        quantity: 5,
        description: "Daily moments: coffee on deck, sunset views, cozy nights",
      },
      {
        type: "TikTok Video",
        quantity: 2,
        description: "Day in the life at the cabin",
        specs: { durationSec: 60 },
      },
      {
        type: "Photo Set",
        quantity: 10,
        description: "High-res property photos for marketing",
      },
    ],
    brand_guidelines: {
      vibe_tags: ["Cozy", "Adventure", "Luxury", "Nature"],
      dos: [
        "Show authentic moments",
        "Highlight the hot tub and mountain views",
        "Include local activities (skiing, hiking)",
      ],
      donts: [
        "No staged or overly edited content",
        "Avoid showing other guests without permission",
      ],
      required_tags: ["#GlacierPrimeCabin", "#LakeTahoeGetaway"],
      required_mentions: ["@glacierprimecabin"],
    },
    ideal_creator: {
      platforms: ["Instagram", "TikTok"],
      niche_tags: ["Travel", "Outdoor", "Lifestyle"],
      notes: [
        "Active outdoor enthusiasts preferred",
        "Experience with luxury travel content",
        "Strong engagement rate (3%+)",
      ],
    },
    host: {
      name: "Sarah Mitchell",
      brand_name: "Glacier Prime Cabins",
      instagram_url: "https://instagram.com/glacierprimecabin",
      website_url: "https://glacierprime.com",
      verified: true,
    },
    things_to_know: {
      revision_policy:
        "1 round of minor revisions included. Major changes require mutual agreement.",
      usage_rights:
        "Host receives perpetual, worldwide license for marketing use. Creator retains ownership and portfolio rights.",
      dispute_note:
        "Disputes handled via Collabnb mediation. Payment held in escrow until deliverables approved.",
    },
  },
  {
    id: "2",
    title: "Mountain View Lodge",
    location_city: "Aspen",
    location_country: "CO",
    bargaining_mode_enabled: false,
    images: [
      "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800",
    ],
    compensation_type: "free_stay",
    stay_nights: 3,
    cash_payout: null,
    perks: ["Breakfast included", "Ski lift tickets", "Spa access"],
    value_estimate: 1200,
    creator_tier_required: "micro",
    deliverable_load: "heavy",
    collaboration_window: {
      startDate: "2026-02-01",
      endDate: "2026-03-31",
    },
    deliverables_due_date: "2026-04-15",
    turnaround_time_days: 7,
    deliverables: [
      {
        type: "Instagram Reels",
        quantity: 5,
        description: "Ski resort content, lodge amenities, après-ski vibes",
        specs: { durationSec: 45 },
      },
      {
        type: "Blog Post",
        quantity: 1,
        description: "1500-word feature on the property and local area",
      },
    ],
    brand_guidelines: {
      vibe_tags: ["Luxury", "Adventure", "Family-friendly"],
      dos: ["Show ski-in/ski-out access", "Highlight spa and dining"],
      donts: ["No competitor mentions"],
      required_tags: ["#MountainViewLodge", "#AspenGetaway"],
      required_mentions: ["@mountainviewlodge"],
    },
    ideal_creator: {
      platforms: ["Instagram", "YouTube"],
      niche_tags: ["Travel", "Skiing", "Luxury"],
      notes: ["Family content creators welcome", "Skiing experience required"],
    },
    host: {
      name: "Mountain View Hospitality",
      brand_name: "Mountain View Lodge",
      verified: true,
    },
    things_to_know: {
      revision_policy: "Up to 2 rounds of revisions included.",
      usage_rights:
        "Full commercial rights granted to host. Creator may use in portfolio.",
      dispute_note: "All disputes resolved through Collabnb arbitration.",
    },
  },
];
