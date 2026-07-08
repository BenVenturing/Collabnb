import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  profiles: defineTable({
    full_name: v.string(),
    username: v.string(),
    email: v.string(),
    role: v.string(),
    tier: v.optional(v.string()),
    bio: v.optional(v.string()),
    avatar_url: v.optional(v.string()),
    banner_url: v.optional(v.string()),
    follower_count: v.optional(v.number()),
    engagement_rate: v.optional(v.number()),
    collab_count: v.optional(v.number()),
    instagram_handle: v.optional(v.string()),
    tiktok_handle: v.optional(v.string()),
    youtube_handle: v.optional(v.string()),
    portfolio: v.optional(v.string()),
    is_founder: v.optional(v.boolean()),
    beta: v.optional(v.boolean()),
    city: v.optional(v.string()),
    region: v.optional(v.string()),
    country: v.optional(v.string()),
    is_verified: v.optional(v.boolean()),
    is_rejected: v.optional(v.boolean()),
    rejection_reason: v.optional(v.string()),
    first_collab_completed: v.optional(v.boolean()),
    subscription_status: v.optional(v.string()),
    subscription_tier: v.optional(v.string()),
    subscription_expires_at: v.optional(v.number()),
    stripe_customer_id: v.optional(v.string()),
    referral_code: v.optional(v.string()),
    referred_by: v.optional(v.string()),
    free_months_balance: v.optional(v.number()),
    referral_bonus_pending: v.optional(v.boolean()),
    clerk_registered: v.optional(v.boolean()),
    is_admin: v.optional(v.boolean()),
    is_lifetime: v.optional(v.boolean()),
    lifetime_tier: v.optional(v.string()),
    saved_creator_ids: v.optional(v.array(v.string())),
    metrics_instagram_followers: v.optional(v.number()),
    metrics_tiktok_followers: v.optional(v.number()),
    metrics_youtube_subscribers: v.optional(v.number()),
    metrics_avg_views: v.optional(v.number()),
    metrics_avg_likes: v.optional(v.number()),
    metrics_avg_comments: v.optional(v.number()),
    metrics_updated_at: v.optional(v.number()),
    pending_tier: v.optional(v.string()),
    tier_change_requested_at: v.optional(v.number()),
    niches: v.optional(v.array(v.string())),
    creator_track: v.optional(v.union(v.literal("ugc"), v.literal("influencer"))),
    access_state: v.optional(v.union(v.literal("pending"), v.literal("trial"), v.literal("active"), v.literal("limited"))),
    trial_starts_at: v.optional(v.number()),
    trial_ends_at: v.optional(v.number()),
    interview_requested: v.optional(v.boolean()),
    admin_verification_note: v.optional(v.string()),
  }).index("by_email", ["email"]).index("by_stripe_customer", ["stripe_customer_id"]),

  listings: defineTable({
    title: v.string(),
    subtitle: v.optional(v.string()),
    location: v.string(),
    property_type: v.optional(v.string()),
    is_featured: v.optional(v.boolean()),
    rating: v.optional(v.number()),
    review_count: v.optional(v.number()),
    compensation: v.optional(v.string()),
    // 'paid' | 'hybrid' — legacy string values are normalized by migrateLegacyCompensation
    compensation_type: v.optional(v.string()),
    cash_amount: v.optional(v.number()),
    needs_compensation_review: v.optional(v.boolean()),
    currency: v.optional(v.string()),
    max_offers: v.optional(v.number()),
    collab_type: v.optional(v.string()),
    creator_tier: v.optional(v.string()),
    creator_track: v.optional(v.union(v.literal("ugc"), v.literal("influencer"), v.literal("both"))),
    // legacy display string, or the new points-based array
    deliverables: v.optional(v.union(
      v.string(),
      v.array(v.object({
        type: v.union(
          v.literal("photo"),
          v.literal("storyFrame"),
          v.literal("carousel"),
          v.literal("ugcReel"),
          v.literal("influencerReel"),
          v.literal("youtubeVideo")
        ),
        quantity: v.number(),
      }))
    )),
    deliverable_count: v.optional(v.number()),
    // 'light' | 'moderate' | 'heavy' | 'custom' — always derived from points, never picked
    deliverable_load: v.optional(v.string()),
    // 'standard' | 'complex' (shot lists, drone, multi-location, exclusivity/usage rights)
    complexity: v.optional(v.string()),
    // Declared $ value of the stay, used to compute the Hybrid stay offset
    stay_value: v.optional(v.number()),
    // Set by the three-zone floor check when cash comp is below the recommended
    // range (but at/above the hard floor) — for analytics/moderation
    below_recommended_comp: v.optional(v.boolean()),
    dates_available: v.optional(v.string()),
    due_days: v.optional(v.number()),
    image: v.optional(v.string()),
    gallery_images: v.optional(v.array(v.string())),
    about: v.optional(v.string()),
    amenities: v.optional(v.array(v.object({ icon: v.string(), label: v.string() }))),
    what_you_get: v.optional(v.array(v.string())),
    what_you_deliver: v.optional(v.string()),
    requirements: v.optional(v.array(v.string())),
    location_full: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    host_name: v.optional(v.string()),
    host_id: v.optional(v.string()),
    status: v.optional(v.string()),
    location_city: v.optional(v.string()),
    location_country: v.optional(v.string()),
    property_url: v.optional(v.string()),
    collaboration_brief: v.optional(v.string()),
    nights: v.optional(v.number()),
    perks: v.optional(v.array(v.string())),
    vibe_tags: v.optional(v.array(v.string())),
    affiliate_code: v.optional(v.string()),
    revision_policy: v.optional(v.string()),
    usage_rights: v.optional(v.string()),
    turnaround_days: v.optional(v.number()),
    collab_start: v.optional(v.string()),
    collab_end: v.optional(v.string()),
    // up to 3 availability windows (ISO dates), validated in create/update
    date_ranges: v.optional(v.array(v.object({
      startDate: v.string(),
      endDate: v.string(),
    }))),
    deliverables_list: v.optional(v.array(v.object({
      type: v.string(),
      quantity: v.number(),
      description: v.string(),
      usage_rights: v.optional(v.string()),
    }))),
    is_sample: v.optional(v.boolean()),
  }).index("by_location", ["location"]).index("by_host", ["host_id"]),

  collaborations: defineTable({
    listing_id: v.string(),
    property_name: v.optional(v.string()),
    location: v.optional(v.string()),
    host_name: v.optional(v.string()),
    image: v.optional(v.string()),
    status: v.string(),
    status_text: v.optional(v.string()),
    dates: v.optional(v.string()),
    deliverables: v.optional(v.string()),
    days_left: v.optional(v.number()),
    payment: v.optional(v.string()),
    is_active: v.boolean(),
    current_stage: v.string(),
    stages: v.optional(v.string()),
    drive_url: v.optional(v.string()),
    contract_id: v.optional(v.string()),
    listing_description: v.optional(v.string()),
    creator_id: v.optional(v.string()),
    creator_name: v.optional(v.string()),
    is_sample: v.optional(v.boolean()),
  }).index("by_creator", ["creator_id"]),

  threads: defineTable({
    listing_title: v.string(),
    host_name: v.string(),
    host_avatar: v.optional(v.string()),
    tag: v.string(),
    last_message: v.string(),
    timestamp: v.optional(v.string()),
    unread: v.optional(v.number()),
    is_founder: v.optional(v.boolean()),
    collab_id: v.optional(v.string()),
  }).index("by_collab", ["collab_id"]),

  contracts: defineTable({
    owner_id: v.optional(v.string()),
    host_id: v.optional(v.string()),
    creator_id: v.optional(v.string()),
    creator_name: v.string(),
    host_name: v.string(),
    property_name: v.optional(v.string()),
    location: v.optional(v.string()),
    dates: v.optional(v.string()),
    deliverables: v.optional(v.string()),
    currency: v.optional(v.string()),
    payment: v.optional(v.string()),
    usage_rights: v.optional(v.string()),
    status: v.string(),
    creator_signed: v.optional(v.boolean()),
    host_signed: v.optional(v.boolean()),
    creator_signed_at: v.optional(v.string()),
    host_signed_at: v.optional(v.string()),
    summary_note: v.optional(v.string()),
    paid: v.optional(v.boolean()),
    payment_amount: v.optional(v.number()),
    stripe_session_id: v.optional(v.string()),
    // Saved-card + deferred-fee fields: card is saved at signing, fee charged on completion.
    host_stripe_customer_id: v.optional(v.string()),
    host_payment_method_id: v.optional(v.string()),
    fee_amount: v.optional(v.number()),
    payment_intent_id: v.optional(v.string()),
    fee_charge_failed: v.optional(v.boolean()),
    sent_at: v.optional(v.number()),
    last_reminder_at: v.optional(v.number()),
  })
    .index("by_owner", ["owner_id"])
    .index("by_host", ["host_id"])
    .index("by_creator", ["creator_id"]),

  collections: defineTable({
    name: v.string(),
    listing_ids: v.array(v.string()),
    creator_id: v.optional(v.string()),
  }).index("by_creator", ["creator_id"]),

  pitch_counts: defineTable({
    user_id: v.string(),
    month_key: v.string(), // "YYYY-MM"
    count: v.number(),
  }).index("by_user", ["user_id"]),

  suggestions: defineTable({
    text: v.string(),
    submitted_by: v.optional(v.string()),
    status: v.optional(v.string()), // 'pending' | 'approved' | 'implemented' | 'rejected'
  }),

  messages: defineTable({
    name: v.string(),
    email: v.string(),
    category: v.optional(v.string()),
    message: v.string(),
    is_read: v.optional(v.boolean()),
    is_archived: v.optional(v.boolean()),
    admin_reply: v.optional(v.string()),
    admin_reply_at: v.optional(v.number()),
  }),

  admin_settings: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),

  suggestion_votes: defineTable({
    suggestion_id: v.id("suggestions"),
    user_id: v.string(),
    vote: v.union(v.literal("up"), v.literal("down")),
  })
    .index("by_suggestion", ["suggestion_id"])
    .index("by_user_suggestion", ["user_id", "suggestion_id"]),

  referral_codes: defineTable({
    owner_id: v.string(),
    code: v.string(),
    use_count: v.number(),
    max_uses: v.number(),
  })
    .index("by_owner", ["owner_id"])
    .index("by_code", ["code"]),

  referral_uses: defineTable({
    code: v.string(),
    used_by_id: v.string(),
    referrer_id: v.string(),
    signup_bonus_awarded: v.boolean(),
    collab_bonus_awarded: v.boolean(),
  })
    .index("by_code", ["code"])
    .index("by_user", ["used_by_id"]),

  pitches: defineTable({
    listing_id: v.string(),
    listing_title: v.optional(v.string()),
    host_id: v.optional(v.string()),
    creator_id: v.string(),
    creator_name: v.string(),
    creator_username: v.optional(v.string()),
    creator_avatar: v.optional(v.string()),
    creator_tier: v.optional(v.string()),
    creator_followers: v.optional(v.number()),
    creator_engagement: v.optional(v.number()),
    creator_platforms: v.optional(v.array(v.string())),
    message: v.string(),
    status: v.string(), // 'pending' | 'under_review' | 'approved' | 'declined'
    type: v.string(),   // 'application' | 'pitch'
    created_at: v.number(),
    host_note: v.optional(v.string()),
    thread_key: v.optional(v.string()),
    contract_id: v.optional(v.string()),
    contract_history: v.optional(v.string()), // JSON: [{version, fields, modifiedBy, timestamp, note}]
    signatures: v.optional(v.string()),       // JSON: {hostSignature, hostSignedAt, hostSignedVersion, creatorSignature, ...}
    counter_pending: v.optional(v.string()),  // 'host' | 'creator' | null
    contract_locked: v.optional(v.boolean()),
  })
    .index("by_listing", ["listing_id"])
    .index("by_creator", ["creator_id"])
    .index("by_host", ["host_id"]),

  thread_messages: defineTable({
    thread_key: v.string(),
    sender_id: v.string(),
    sender_name: v.string(),
    sender_avatar: v.optional(v.string()),
    sender_role: v.string(), // 'creator' | 'host'
    text: v.string(),
    created_at: v.number(),
  }).index("by_thread", ["thread_key"]),

  admin_audit_log: defineTable({
    action: v.string(),
    target_type: v.string(),
    target_id: v.string(),
    details: v.optional(v.string()),
    created_at: v.number(),
  }).index("by_action", ["action"]),

  broadcasts: defineTable({
    audience: v.string(),
    subject: v.string(),
    recipient_count: v.number(),
    sent_at: v.number(),
  }).index("by_sent", ["sent_at"]),

  notifications: defineTable({
    user_id: v.string(),
    type: v.string(), // 'pitch_approved' | 'pitch_declined' | 'new_message' | 'host_reply'
    title: v.string(),
    body: v.optional(v.string()),
    link: v.optional(v.string()),
    read: v.boolean(),
    created_at: v.number(),
  }).index("by_user", ["user_id"]),

  // Outreach prospects for the Discovery tab — pre-scraped/imported Instagram
  // accounts split into creators (left panel) and hosts (right panel).
  prospects: defineTable({
    kind: v.string(),                    // 'creator' | 'host'
    instagram_handle: v.string(),
    display_name: v.optional(v.string()),
    avatar_url: v.optional(v.string()),
    follower_count: v.optional(v.number()),
    engagement_rate: v.optional(v.number()),
    tier: v.optional(v.string()),        // 'nano' | 'micro' | 'mid' | 'macro'
    location: v.optional(v.string()),
    country: v.optional(v.string()),
    niche: v.optional(v.string()),       // travel, lifestyle, boutique hotel, etc.
    email: v.optional(v.string()),       // from bio, for ToS-safe email outreach
    bio: v.optional(v.string()),
    website: v.optional(v.string()),
    source: v.string(),                  // 'manual' | 'apify' | 'csv' | 'referral'
    status: v.string(),                  // 'new' | 'queued' | 'contacted' | 'replied' | 'signed' | 'declined'
    dm_draft: v.optional(v.string()),
    notes: v.optional(v.string()),
    score: v.optional(v.number()),       // 0-100 fit score
    queued_for: v.optional(v.string()),  // 'YYYY-MM-DD' daily outreach date
    contacted_at: v.optional(v.number()),
    replied_at: v.optional(v.number()),
    created_at: v.number(),
  })
    .index("by_kind_status", ["kind", "status"])
    .index("by_handle", ["instagram_handle"])
    .index("by_queued", ["queued_for"]),

  // Connected social accounts (Collabnb's own IG / TikTok) for the Social tab.
  social_accounts: defineTable({
    platform: v.string(),                // 'instagram' | 'tiktok'
    handle: v.string(),
    account_id: v.optional(v.string()),  // IG Business account id / TikTok open_id
    connected: v.boolean(),
    follower_count: v.optional(v.number()),
    following_count: v.optional(v.number()),
    media_count: v.optional(v.number()),
    profile_pic_url: v.optional(v.string()),
    last_synced_at: v.optional(v.number()),
    sync_error: v.optional(v.string()),
  }).index("by_platform", ["platform"]),

  // Synced posts + metrics powering the Social analytics dashboard.
  social_posts: defineTable({
    platform: v.string(),                // 'instagram' | 'tiktok'
    external_id: v.string(),
    caption: v.optional(v.string()),
    media_type: v.optional(v.string()),  // IMAGE | VIDEO | CAROUSEL | REEL
    media_url: v.optional(v.string()),
    thumbnail_url: v.optional(v.string()),
    permalink: v.optional(v.string()),
    posted_at: v.optional(v.number()),
    likes: v.optional(v.number()),
    comments: v.optional(v.number()),
    shares: v.optional(v.number()),
    saves: v.optional(v.number()),
    views: v.optional(v.number()),
    reach: v.optional(v.number()),
    synced_at: v.number(),
  })
    .index("by_platform", ["platform"])
    .index("by_external", ["external_id"]),

  // Ambassador program (beta) — regional partners earning a share of the
  // platform fee on collabs completed in their region.
  ambassador_regions: defineTable({
    slug: v.string(),
    name: v.string(),
    countries: v.array(v.string()),
    status: v.string(),                       // 'open' | 'taken' | 'coming_soon'
    ambassador_name: v.optional(v.string()),
    ambassador_email: v.optional(v.string()),
    application_id: v.optional(v.string()),
    tier1_pct: v.optional(v.number()),        // % of platform fee, default 25
    tier2_pct: v.optional(v.number()),        // % after monthly threshold, default 50
    tier2_threshold: v.optional(v.number()),  // completed collabs/month to unlock tier 2, default 5
  }).index("by_slug", ["slug"]),

  ambassador_applications: defineTable({
    region_slug: v.string(),
    region_name: v.string(),
    full_name: v.string(),
    email: v.string(),
    based_in: v.optional(v.string()),
    instagram_handle: v.optional(v.string()),
    tiktok_handle: v.optional(v.string()),
    youtube_handle: v.optional(v.string()),
    audience_size: v.optional(v.string()),
    content_plan: v.string(),
    connections: v.string(),
    extra: v.optional(v.string()),
    agreed_terms: v.boolean(),
    status: v.string(),                       // 'pending' | 'approved' | 'declined'
    admin_note: v.optional(v.string()),
    created_at: v.number(),
    reviewed_at: v.optional(v.number()),
  })
    .index("by_status", ["status"])
    .index("by_region", ["region_slug"])
    .index("by_email", ["email"]),

  ambassador_earnings: defineTable({
    region_slug: v.string(),
    region_name: v.string(),
    ambassador_name: v.optional(v.string()),
    ambassador_email: v.optional(v.string()),
    contract_id: v.string(),
    property_name: v.optional(v.string()),
    fee_amount: v.number(),
    share_pct: v.number(),
    amount: v.number(),
    status: v.string(),                       // 'pending' | 'paid' | 'reversed'
    clawback_until: v.number(),
    month_key: v.string(),                    // 'YYYY-MM', used for tier counting
    created_at: v.number(),
    paid_at: v.optional(v.number()),
    payout_note: v.optional(v.string()),
  })
    .index("by_region_month", ["region_slug", "month_key"])
    .index("by_status", ["status"])
    .index("by_contract", ["contract_id"]),

  blog_posts: defineTable({
    title: v.string(),
    slug: v.string(),
    excerpt: v.string(),
    content: v.string(),            // HTML string
    status: v.string(),             // 'draft' | 'published' | 'rejected'
    category: v.string(),           // 'creators' | 'hosts' | 'industry' | 'stats'
    tags: v.optional(v.array(v.string())),
    hero_image_url: v.optional(v.string()),
    hero_image_alt: v.optional(v.string()),
    hero_image_credit: v.optional(v.string()),
    hero_image_credit_url: v.optional(v.string()),
    inline_image_1_url: v.optional(v.string()),
    inline_image_1_alt: v.optional(v.string()),
    inline_image_1_credit: v.optional(v.string()),
    inline_image_2_url: v.optional(v.string()),
    inline_image_2_alt: v.optional(v.string()),
    inline_image_2_credit: v.optional(v.string()),
    inline_image_3_url: v.optional(v.string()),
    inline_image_3_alt: v.optional(v.string()),
    inline_image_3_credit: v.optional(v.string()),
    pull_quote: v.optional(v.string()),
    author: v.optional(v.string()),
    instagram_embed_url: v.optional(v.string()),
    sources: v.optional(v.array(v.string())),
    seo_description: v.optional(v.string()),
    reading_time: v.optional(v.number()),
    generated_at: v.number(),
    published_at: v.optional(v.number()),
    is_stats_post: v.optional(v.boolean()),
  })
    .index("by_status", ["status"])
    .index("by_slug", ["slug"])
    .index("by_generated", ["generated_at"]),

  reports: defineTable({
    reported_user_id: v.string(),
    reporter_id: v.string(),
    reason: v.union(
      v.literal("inaccurate_information"),
      v.literal("poor_communication"),
      v.literal("failed_collaboration"),
      v.literal("unprofessional_behavior"),
      v.literal("other")
    ),
    details: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("dismissed"), v.literal("actioned")),
    admin_note: v.optional(v.string()),
    created_at: v.number(),
  }).index("by_reported", ["reported_user_id"]),

  fee_records: defineTable({
    collaboration_id: v.string(),
    contract_id: v.optional(v.string()),
    amount: v.number(),
    basis: v.number(),
    method: v.string(),
    contract_value: v.number(),
    status: v.string(),
    payment_intent_id: v.optional(v.string()),
    amount_paid: v.optional(v.number()),
    paid_at: v.optional(v.number()),
    created_at: v.number(),
  }).index("by_collaboration", ["collaboration_id"]),
});
