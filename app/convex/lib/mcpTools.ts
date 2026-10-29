// Tool catalog advertised by POST /mcp (tools/list). `kind` decides whether
// http.ts dispatches to internal.mcp.runRead (query), runWrite (mutation) or
// runAction (action — anything that calls out, like an LLM).
// Implementations live in mcp.ts — keep names in sync.

type Tool = {
  name: string;
  description: string;
  kind: "read" | "write" | "action";
  inputSchema: { type: "object"; properties: Record<string, unknown>; required?: string[] };
};

const s = (description: string) => ({ type: "string", description });
const n = (description: string) => ({ type: "number", description });
const none = { type: "object" as const, properties: {} };

export const MCP_TOOLS: Tool[] = [
  {
    name: "whoami",
    description: "The Collabnb account this key belongs to: name, role (host or creator), verification status, tier.",
    kind: "read",
    inputSchema: none,
  },
  {
    name: "search_listings",
    description: "Search published Collabnb stays open to creator collaborations. All filters are optional, case-insensitive substring matches.",
    kind: "read",
    inputSchema: {
      type: "object",
      properties: {
        location: s("City, region or country, e.g. 'Bali' or 'Portugal'"),
        property_type: s("e.g. 'villa', 'cabin', 'hotel'"),
        collab_type: s("e.g. 'paid', 'hybrid'"),
        creator_tier: s("Required creator tier id"),
        min_cash: n("Minimum cash compensation"),
        max_cash: n("Maximum cash compensation"),
        limit: n("Max results, 1-50 (default 20)"),
      },
    },
  },
  {
    name: "get_listing",
    description: "Full details of one listing: brief, deliverables, compensation, dates, amenities, requirements.",
    kind: "read",
    inputSchema: { type: "object", properties: { listing_id: s("Listing id") }, required: ["listing_id"] },
  },
  {
    name: "get_listing_reviews",
    description: "Creator reviews left on a listing after completed collaborations.",
    kind: "read",
    inputSchema: { type: "object", properties: { listing_id: s("Listing id") }, required: ["listing_id"] },
  },
  {
    name: "list_my_listings",
    description: "Hosts only: every listing I own, with status (draft/published).",
    kind: "read",
    inputSchema: none,
  },
  {
    name: "list_inbox",
    description: "My inbox conversations with the other party, listing, last message and unread flag. Use thread_key with read_thread / send_message.",
    kind: "read",
    inputSchema: { type: "object", properties: { unread_only: { type: "boolean", description: "Only unread threads" } } },
  },
  {
    name: "read_thread",
    description: "Messages in one inbox conversation, oldest first.",
    kind: "read",
    inputSchema: {
      type: "object",
      properties: { thread_key: s("From list_inbox"), limit: n("Most recent N messages, 1-200 (default 50)") },
      required: ["thread_key"],
    },
  },
  {
    name: "list_saved",
    description: "My saved collections and the listings in each.",
    kind: "read",
    inputSchema: none,
  },
  {
    name: "list_applications",
    description: "Creators: applications I've sent. Hosts: applications received on my listings, with each creator's tier, followers, engagement and platforms for comparing applicants.",
    kind: "read",
    inputSchema: {
      type: "object",
      properties: { status: s("Filter: pending | under_review | approved | declined") },
    },
  },
  {
    name: "list_collaborations",
    description: "My collaborations with stage, dates, payment and the other party.",
    kind: "read",
    inputSchema: none,
  },
  {
    name: "list_notifications",
    description: "My latest 30 notifications: new applications, approvals, messages, collab updates.",
    kind: "read",
    inputSchema: { type: "object", properties: { unread_only: { type: "boolean", description: "Only unread" } } },
  },
  {
    name: "get_my_stats",
    description: "Analytics for my account: applications by status, collaborations by stage, average rating received, inbox unread, and (hosts) applications per listing.",
    kind: "read",
    inputSchema: none,
  },
  {
    name: "send_message",
    description: "Send a message in an existing inbox conversation as me. The other party is notified. Confirm wording with the user before sending.",
    kind: "write",
    inputSchema: {
      type: "object",
      properties: { thread_key: s("From list_inbox"), text: s("Message text, max 3000 chars") },
      required: ["thread_key", "text"],
    },
  },
  {
    name: "mark_thread_read",
    description: "Mark an inbox conversation as read.",
    kind: "write",
    inputSchema: { type: "object", properties: { thread_key: s("From list_inbox") }, required: ["thread_key"] },
  },
  {
    name: "draft_reply",
    description: "Draft (never send) the next reply in a conversation using Collabnb's AI, or the user's own connected AI key. Use send_message after the user approves it.",
    kind: "action",
    inputSchema: {
      type: "object",
      properties: { thread_key: s("From list_inbox"), instruction: s("Optional: what to say or the tone, e.g. 'politely ask for their media kit'") },
      required: ["thread_key"],
    },
  },
  {
    name: "mark_notifications_read",
    description: "Mark one notification read, or all of them when notification_id is omitted.",
    kind: "write",
    inputSchema: { type: "object", properties: { notification_id: s("Optional; omit to mark all read") } },
  },
  {
    name: "apply_to_listing",
    description: "Creators only: apply to a published listing with a pitch message. Uses 1 of the creator's 10 monthly applications. Confirm the pitch with the user before calling.",
    kind: "write",
    inputSchema: {
      type: "object",
      properties: { listing_id: s("Listing id"), message: s("Pitch to the host, 20-3000 chars") },
      required: ["listing_id", "message"],
    },
  },
  {
    name: "review_application",
    description: "Hosts only: approve, decline or mark under review an application on my listing. The creator is notified and emailed. Confirm with the user before approving or declining.",
    kind: "write",
    inputSchema: {
      type: "object",
      properties: {
        application_id: s("From list_applications"),
        decision: { type: "string", enum: ["approved", "declined", "under_review"] },
        note: s("Optional note to the creator (shown on a decline)"),
      },
      required: ["application_id", "decision"],
    },
  },
  {
    name: "update_listing",
    description: "Hosts only: edit fields on one of my listings (draft or live). Only pass fields to change. Can't publish, unpublish or change photos.",
    kind: "write",
    inputSchema: {
      type: "object",
      properties: {
        listing_id: s("Listing id"),
        title: s("Title"),
        location: s("Display location"),
        location_city: s("City"),
        location_country: s("Country"),
        property_url: s("Property website"),
        collaboration_brief: s("Brief for creators"),
        compensation_type: { type: "string", enum: ["paid", "hybrid"] },
        cash_amount: n("Cash compensation, > 0"),
        currency: s("ISO currency"),
        nights: n("Nights included"),
        stay_value: n("Declared stay value"),
        max_offers: n("Max creators to accept"),
        turnaround_days: n("Days to deliver content after the stay"),
        creator_tier: s("Target creator tier id"),
        date_ranges: {
          type: "array",
          maxItems: 3,
          items: { type: "object", properties: { startDate: s("YYYY-MM-DD"), endDate: s("YYYY-MM-DD") }, required: ["startDate", "endDate"] },
        },
      },
      required: ["listing_id"],
    },
  },
  {
    name: "save_listing",
    description: "Save a listing to a collection (created if it doesn't exist; defaults to my first collection).",
    kind: "write",
    inputSchema: {
      type: "object",
      properties: { listing_id: s("Listing id"), collection_name: s("Optional collection name") },
      required: ["listing_id"],
    },
  },
  {
    name: "unsave_listing",
    description: "Remove a listing from all my saved collections.",
    kind: "write",
    inputSchema: { type: "object", properties: { listing_id: s("Listing id") }, required: ["listing_id"] },
  },
  {
    name: "create_listing_draft",
    description: "Hosts only: create a listing as a DRAFT. The host adds photos and publishes it in the app; agents can't publish.",
    kind: "write",
    inputSchema: {
      type: "object",
      properties: {
        title: s("Property name / listing title"),
        location: s("Display location, e.g. 'Ubud, Bali'"),
        location_city: s("City"),
        location_country: s("Country"),
        property_url: s("Property website or booking URL"),
        collaboration_brief: s("What the host wants from the creator"),
        compensation_type: { type: "string", enum: ["paid", "hybrid"], description: "paid = cash, hybrid = stay + cash" },
        cash_amount: n("Cash compensation, > 0"),
        currency: s("ISO currency, default USD"),
        nights: n("Nights included"),
        stay_value: n("Declared value of the stay (hybrid)"),
        creator_tier: s("Target creator tier id"),
        date_ranges: {
          type: "array",
          maxItems: 3,
          items: {
            type: "object",
            properties: { startDate: s("YYYY-MM-DD"), endDate: s("YYYY-MM-DD") },
            required: ["startDate", "endDate"],
          },
        },
      },
      required: ["title", "location", "compensation_type", "cash_amount"],
    },
  },
];

export const MCP_INSTRUCTIONS =
  "Collabnb connects boutique stays (hosts) with content creators. This server acts as the signed-in user. " +
  "Call whoami first to learn whether they're a host or a creator. Always show the user a message before send_message. " +
  "Always confirm with the user before apply_to_listing or review_application. " +
  "Payments, contracts, publishing and completing collabs are only possible in the Collabnb app.";
