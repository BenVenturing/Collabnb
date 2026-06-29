import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import Stripe from "stripe";
import { api, internal } from "./_generated/api";

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

// Stripe webhook — handles subscription lifecycle events so the DB stays in sync
// when users renew or cancel via the Stripe billing portal.
// Requires: npx convex env set STRIPE_WEBHOOK_SECRET whsec_...
http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const body = await request.text();
    const sig = request.headers.get("stripe-signature");

    let event: Stripe.Event;
    if (webhookSecret && sig) {
      try {
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
      } catch {
        return new Response("Webhook signature verification failed", { status: 400 });
      }
    } else {
      try {
        event = JSON.parse(body) as Stripe.Event;
      } catch {
        return new Response("Invalid JSON", { status: 400 });
      }
    }

    // Lifetime purchase completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Contract payment completed — persist it (this also notifies both parties).
      if (session.metadata?.contractId && session.payment_status === "paid") {
        await ctx.runMutation(api.contracts.recordPayment, {
          id: session.metadata.contractId,
          paid: true,
          paymentAmount: (session.amount_total ?? 0) / 100,
          stripeSessionId: session.id,
        });
      }

      if (session.metadata?.type === "lifetime" && session.payment_status === "paid") {
        const profileId = session.metadata.profileId;
        const lifetimeTier = session.metadata.lifetimeTier ?? "Lifetime";
        const stripeCustomerId = typeof session.customer === "string"
          ? session.customer
          : (session.customer as any)?.id ?? undefined;
        if (profileId) {
          await ctx.runMutation(internal.profiles.grantLifetimeAccess, {
            profileId,
            lifetimeTier,
            stripeCustomerId,
          });
        }
      }

      // Host saved a card at signing (SetupIntent) — persist it for the deferred,
      // off-session fee charge that runs when the collaboration completes.
      if (session.metadata?.type === "fee_setup" && session.metadata?.contractId) {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        const customerId = typeof session.customer === "string"
          ? session.customer
          : (session.customer as any)?.id ?? undefined;
        let paymentMethodId: string | undefined;
        const setupIntentField = (session as any).setup_intent;
        if (secretKey && setupIntentField) {
          try {
            const stripeClient = new Stripe(secretKey);
            const setupIntentId = typeof setupIntentField === "string" ? setupIntentField : setupIntentField.id;
            const si = await stripeClient.setupIntents.retrieve(setupIntentId);
            paymentMethodId = typeof si.payment_method === "string"
              ? si.payment_method
              : (si.payment_method as any)?.id;
          } catch {
            // Ignore — the frontend verify path also persists the saved card.
          }
        }
        if (customerId && paymentMethodId) {
          await ctx.runMutation(api.contracts.setHostPayment, {
            contractId: session.metadata.contractId,
            customerId,
            paymentMethodId,
            feeAmount: Number(session.metadata.feeAmount ?? 0),
          });
        }
      }
    }

    // Off-session platform-fee charge succeeded — backstop for chargeContractFee.
    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object as Stripe.PaymentIntent;
      if (intent.metadata?.type === "platform_fee" && intent.metadata?.contractId) {
        await ctx.runMutation(internal.contracts.recordPaymentInternal, {
          id: intent.metadata.contractId,
          paymentAmount: (intent.amount_received ?? intent.amount ?? 0) / 100,
          paymentIntentId: intent.id,
        });
      }
    }

    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const expiresAt = sub.current_period_end * 1000;
      const status = sub.status === "active" || sub.status === "trialing" ? "active" : "cancelled";
      await ctx.runMutation(internal.profiles.updateSubscriptionByCustomerId, {
        stripeCustomerId: customerId,
        subscriptionStatus: status,
        subscriptionExpiresAt: expiresAt,
      });
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      // Keep status "active" but pin expiresAt to the end of the last paid period,
      // so the user keeps access until that date rather than being cut off immediately.
      await ctx.runMutation(internal.profiles.updateSubscriptionByCustomerId, {
        stripeCustomerId: customerId,
        subscriptionStatus: "active",
        subscriptionExpiresAt: sub.current_period_end * 1000,
      });
    }

    return new Response("OK", { status: 200 });
  }),
});

export default http;
