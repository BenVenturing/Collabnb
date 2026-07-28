import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import Stripe from "stripe";
import { internal } from "./_generated/api";

const http = httpRouter();

// Verifies a Svix (Clerk) webhook signature: HMAC-SHA256 over "id.timestamp.body"
// keyed with the base64 payload of the whsec_ secret.
async function verifySvixSignature(
  secret: string,
  id: string,
  timestamp: string,
  signatureHeader: string,
  body: string
): Promise<boolean> {
  try {
    const secretB64 = secret.startsWith("whsec_") ? secret.slice(6) : secret;
    const secretBytes = Uint8Array.from(atob(secretB64), (c) => c.charCodeAt(0));
    const key = await crypto.subtle.importKey(
      "raw",
      secretBytes,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const data = new TextEncoder().encode(`${id}.${timestamp}.${body}`);
    const sigBytes = new Uint8Array(await crypto.subtle.sign("HMAC", key, data));
    let expected = "";
    for (const b of sigBytes) expected += String.fromCharCode(b);
    expected = btoa(expected);
    // Header format: "v1,<base64sig> v1,<base64sig> ..."
    return signatureHeader.split(" ").some((part) => part.split(",")[1] === expected);
  } catch {
    return false;
  }
}

// Clerk webhook — called when a user is created/updated in Clerk
// Links existing waitlist profile by email, or creates a new Convex profile
http.route({
  path: "/clerk-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");

    const rawBody = await request.text();

    // If secret is configured, require a valid signature.
    if (secret) {
      if (!svixId || !svixTimestamp || !svixSignature) {
        return new Response("Missing webhook headers", { status: 401 });
      }
      const valid = await verifySvixSignature(secret, svixId, svixTimestamp, svixSignature, rawBody);
      if (!valid) {
        return new Response("Invalid webhook signature", { status: 401 });
      }
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
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

    // httpActions have no ctx.db — link/create must go through a mutation.
    const result = await ctx.runMutation(internal.profiles.linkOrCreateFromClerk, {
      email,
      fullName: fullName || email.split("@")[0],
      username: data.username || email.split("@")[0],
    });

    return new Response(JSON.stringify(result), {
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

    // Never process unverified events — a forged payload could mark contracts
    // paid or grant lifetime access. Requires:
    //   npx convex env set STRIPE_WEBHOOK_SECRET whsec_...
    if (!webhookSecret) {
      return new Response("Stripe webhook secret not configured", { status: 503 });
    }
    if (!sig) {
      return new Response("Missing stripe-signature header", { status: 400 });
    }

    let event: Stripe.Event;
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } catch {
      return new Response("Webhook signature verification failed", { status: 400 });
    }

    // Lifetime purchase completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      // Contract payment completed — persist it (this also notifies both parties).
      if (session.metadata?.contractId && session.payment_status === "paid") {
        await ctx.runMutation(internal.contracts.recordPaymentInternal, {
          id: session.metadata.contractId,
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
          await ctx.runMutation(internal.contracts.setHostPayment, {
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
        const collabId = intent.metadata.contractId; // contractId doubles as collab lookup
        await ctx.runMutation(internal.contracts.recordPaymentInternal, {
          id: collabId,
          paymentAmount: (intent.amount_received ?? intent.amount ?? 0) / 100,
          paymentIntentId: intent.id,
        });
        // Backstop: also mark the fee_records as paid
        await ctx.runMutation(internal.fees.markFeePaid, {
          collaborationId: collabId,
          paymentIntentId: intent.id,
          amountPaid: (intent.amount_received ?? intent.amount ?? 0) / 100,
        });
      }
    }

    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const expiresAt = sub.current_period_end * 1000;
      let status: string;
      if (sub.status === "active" || sub.status === "trialing") {
        status = "active";
      } else if (sub.status === "past_due") {
        status = "past_due";
      } else {
        status = "cancelled";
      }
      await ctx.runMutation(internal.profiles.updateSubscriptionByCustomerId, {
        stripeCustomerId: customerId,
        subscriptionStatus: status,
        subscriptionExpiresAt: expiresAt,
      });
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const endOfPaidPeriod = sub.current_period_end * 1000;
      if (sub.status === "past_due" || sub.status === "incomplete_expired") {
        const profile = await ctx.db
          .query("profiles")
          .withIndex("by_stripe_customer", (q) => q.eq("stripe_customer_id", customerId))
          .unique();
        if (profile) {
          await ctx.db.patch(profile._id, {
            subscription_status: "cancelled",
            subscription_expires_at: endOfPaidPeriod,
            access_state: "limited",
          });
        }
      } else {
        await ctx.runMutation(internal.profiles.updateSubscriptionByCustomerId, {
          stripeCustomerId: customerId,
          subscriptionStatus: "cancelled",
          subscriptionExpiresAt: endOfPaidPeriod,
        });
      }
    }

    if (event.type === "invoice.payment_failed") {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.billing_reason === "subscription_cycle") {
        const customerId = typeof invoice.customer === "string"
          ? invoice.customer
          : (invoice.customer as Stripe.Customer)?.id;
        if (customerId) {
          await ctx.runMutation(internal.profiles.updateSubscriptionByCustomerId, {
            stripeCustomerId: customerId,
            subscriptionStatus: "past_due",
            subscriptionExpiresAt: undefined,
          });
        }
      }
    }

    return new Response("OK", { status: 200 });
  }),
});

// Analytics ingestion — the marketing site (static HTML) and the app both POST
// batched events here. Public + permissive CORS: this is fire-and-forget
// first-party telemetry, no auth, served from *.convex.site (cross-origin to
// collabnb.com), so a preflight/allow-origin header is required.
const analyticsCors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

http.route({
  path: "/track",
  method: "OPTIONS",
  handler: httpAction(async () => new Response(null, { status: 204, headers: analyticsCors })),
});

http.route({
  path: "/track",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const payload = JSON.parse(await request.text());
      if (payload?.sessionId && Array.isArray(payload?.events)) {
        await ctx.runMutation(internal.analytics.ingest, {
          sessionId: String(payload.sessionId),
          surface: payload.surface,
          userId: payload.userId,
          userEmail: payload.userEmail,
          meta: payload.meta,
          events: payload.events.slice(0, 50),
        });
      }
    } catch {
      // Never fail a beacon — telemetry must not surface errors to the client.
    }
    return new Response(null, { status: 204, headers: analyticsCors });
  }),
});

export default http;
