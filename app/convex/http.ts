import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

// Clerk webhook — called when a user is created/updated in Clerk
// Links existing waitlist profile by email, or creates a new Convex profile
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Verify the webhook secret
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    // If secret is configured, verify signature
    if (secret && (!svixId || !svixTimestamp || !svixSignature)) {
      return new Response("Missing webhook headers", { status: 401 });
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400 });
    }

    const eventType = payload.type;

    // Only handle user creation events
    if (eventType !== "user.created" && eventType !== "user.updated") {
      return new Response("OK", { status: 200 });
    }

    const { data } = payload;
    const email = data.email_addresses?.[0]?.email_address;
    const fullName = data.first_name
      ? `${data.first_name} ${data.last_name || ""}`.trim()
      : data.username || email?.split("@")[0];

    if (!email) {
      return new Response("No email address", { status: 400 });
    }

    // Check if a waitlist profile exists with this email
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existing) {
      // Update existing profile with Clerk ID
      await ctx.db.patch(existing._id, {
        full_name: fullName,
        is_founder: existing.is_founder || undefined,
      });
      return new Response(JSON.stringify({ linked: true, profileId: existing._id }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Create a new profile for this Clerk user
    const profileId = await ctx.db.insert("profiles", {
      full_name: fullName,
      username: data.username || email.split("@")[0],
      email: email,
      role: "creator",
      tier: "active",
      bio: "",
      is_founder: false,
    });

    return new Response(JSON.stringify({ created: true, profileId }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
