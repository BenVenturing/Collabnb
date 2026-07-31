import { action, internalAction } from './_generated/server';
import { api, internal } from './_generated/api';
import { v } from 'convex/values';
import Stripe from 'stripe';
import { computeFee } from './fees';

// Tiered lifetime pricing — price rises as more spots are purchased.
// First 50 buyers: $100, next 50: $125, next 50: $150, final 50: $200.
// After 200 lifetime purchases, redirect users to monthly/annual instead.
function getLifetimeTier(count) {
  if (count < 50)  return { price: 100, label: 'Early Adopter' };
  if (count < 100) return { price: 125, label: 'Community' };
  if (count < 150) return { price: 150, label: 'Community' };
  if (count < 200) return { price: 200, label: 'Standard Lifetime' };
  return null; // sold out — use monthly/annual
}

// Single source of truth for the platform fee. Always derived from the stored
// contract — client-supplied amounts are never trusted. Delegates the actual
// math to fees.ts's computeFee so there's exactly one place fee rules live.
// Prefers the structured cash_value field; falls back to parsing the legacy
// free-text `payment` string for contracts created before cash_value existed.
function computeContractFee(contract) {
  const isFreeStay = contract.payment === 'Free Stay' || contract.currency === 'free_stay';
  const cash = typeof contract.cash_value === 'number'
    ? contract.cash_value
    : (parseFloat(String(contract.payment ?? '').replace(/[^0-9.]/g, '')) || 0);
  const { fee, basis } = computeFee({ cashValue: isFreeStay ? 0 : cash });
  return { cash: basis, fee, isFreeStay };
}

// One-time Checkout for host platform fee.
// Requires: npx convex env set STRIPE_SECRET_KEY sk_test_...
export const createCheckoutSession = action({
  args: {
    contractId: v.string(),
    isFreeStay: v.optional(v.boolean()),
    cashAmount: v.optional(v.number()),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not set in Convex environment variables');

    const contract = await ctx.runQuery(internal.contracts.getByIdInternal, { id: args.contractId });
    if (!contract) throw new Error('Contract not found');
    if (contract.paid) throw new Error('This contract fee has already been paid');

    const stripe = new Stripe(secretKey);
    const { isFreeStay, cash, fee } = computeContractFee(contract);
    const amountInCents = Math.round(fee * 100);
    const description = isFreeStay
      ? 'Flat platform fee for free-stay collaboration'
      : `5% of $${cash.toFixed(0)} collaboration value (min. $20)`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: 'Collabnb Platform Fee', description },
          unit_amount: amountInCents,
        },
        quantity: 1,
      }],
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: { contractId: args.contractId },
    });

    return { url: session.url, sessionId: session.id };
  },
});

// Recurring Subscription Checkout for creator Pro access.
// tier: "monthly" ($10/mo) or "yearly" ($60/yr, save 50%).
export const createSubscriptionSession = action({
  args: {
    profileId: v.string(),
    tier: v.string(),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (_ctx, args) => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not set in Convex environment variables');

    const stripe = new Stripe(secretKey);
    const isYearly = args.tier === 'yearly';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Creator Plus — ${isYearly ? 'Annual' : 'Monthly'}`,
            description: isYearly ? '$60/year — save 50% vs monthly' : '$10/month — cancel anytime',
          },
          unit_amount: isYearly ? 6000 : 1000,
          recurring: { interval: isYearly ? 'year' : 'month' },
        },
        quantity: 1,
      }],
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: { profileId: args.profileId, tier: args.tier },
      custom_text: {
        submit: { message: 'You can cancel anytime from your profile settings.' },
      },
    });

    return { url: session.url, sessionId: session.id };
  },
});

// Verifies a completed subscription Checkout session, activates the creator's
// subscription, and stores the Stripe customer ID for future portal access.
export const verifySubscriptionSession = action({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not set in Convex environment variables');

    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.retrieve(args.sessionId, {
      expand: ['subscription'],
    });

    if (session.status !== 'complete') throw new Error('Checkout session is not complete');

    const profileId = session.metadata?.profileId;
    if (!profileId) throw new Error('No profileId in session metadata');

    const tier = session.metadata?.tier || 'monthly';
    const sub = session.subscription;
    // current_period_end moved onto subscription items in recent Stripe API
    // versions; read the item value and fall back to the legacy root field.
    const periodEnd = sub?.items?.data?.[0]?.current_period_end ?? sub?.current_period_end;
    const expiresAt = periodEnd ? periodEnd * 1000 : undefined;
    const stripeCustomerId = typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id ?? null;

    await ctx.runMutation(api.profiles.updateSubscription, {
      profileId,
      subscriptionStatus: 'active',
      subscriptionTier: tier,
      subscriptionExpiresAt: expiresAt,
      stripeCustomerId: stripeCustomerId ?? undefined,
    });

    return { success: true, tier, expiresAt };
  },
});

// Opens the Stripe Customer Portal for an active subscriber to manage their plan.
// The customer ID is resolved server-side from the signed-in user's own profile —
// never accepted from the client — so a caller can only ever open the portal for
// their own billing account, not for any cus_… id they happen to obtain.
export const createBillingPortalSession = action({
  args: {
    profileId: v.optional(v.string()),
    returnUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not set in Convex environment variables');

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error('You must be signed in to manage billing');

    // Prefer resolving the customer from the authenticated email (fully closes
    // the IDOR). Fall back to the caller's own profileId when the Clerk JWT
    // doesn't carry an email claim, so the portal still works today.
    let profile = identity.email
      ? await ctx.runQuery(api.profiles.getByEmail, { email: identity.email })
      : null;
    if (!profile && args.profileId) {
      profile = await ctx.runQuery(api.profiles.getById, { id: args.profileId });
    }
    const customerId = profile?.stripe_customer_id;
    if (!customerId) throw new Error('No billing account found for your profile');

    const stripe = new Stripe(secretKey);
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: args.returnUrl,
    });

    return { url: session.url };
  },
});

// One-time lifetime access checkout.
// Looks up the current tier price based on how many lifetime seats have been sold.
export const createLifetimeSession = action({
  args: {
    profileId: v.string(),
    role: v.string(),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not set in Convex environment variables');

    const lifetimeCount = await ctx.runQuery(api.profiles.countLifetimeMembers);
    const tier = getLifetimeTier(lifetimeCount);
    if (!tier) throw new Error('All lifetime spots are sold out. Please choose a monthly or annual plan.');

    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Collabnb Lifetime Access — ${tier.label}`,
            description: `One-time payment for permanent platform access as a ${args.role}`,
          },
          unit_amount: tier.price * 100,
        },
        quantity: 1,
      }],
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: {
        profileId: args.profileId,
        role: args.role,
        type: 'lifetime',
        lifetimeTier: tier.label,
        lifetimePrice: String(tier.price),
      },
      custom_text: {
        submit: { message: 'One-time payment — no recurring charges, ever.' },
      },
    });

    return { url: session.url, sessionId: session.id, price: tier.price, tierLabel: tier.label };
  },
});

// Verifies a completed lifetime checkout session and grants permanent access.
export const verifyLifetimeSession = action({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not set in Convex environment variables');

    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.retrieve(args.sessionId);

    if (session.status !== 'complete' || session.payment_status !== 'paid') {
      throw new Error('Payment not complete');
    }
    if (session.metadata?.type !== 'lifetime') throw new Error('Not a lifetime session');

    const profileId = session.metadata.profileId;
    const lifetimeTier = session.metadata.lifetimeTier || 'Lifetime';
    const stripeCustomerId = typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id ?? undefined;

    await ctx.runMutation(internal.profiles.grantLifetimeAccess, {
      profileId,
      lifetimeTier,
      stripeCustomerId,
    });

    return { success: true, lifetimeTier };
  },
});

// ─── Deferred platform fee: save card at signing, charge on completion ────────
// The host saves a card via a Stripe Checkout SetupIntent when the contract is
// signed. No money moves yet. When the collab is marked complete, the saved card
// is charged off-session for the platform fee (5% of cash / min $20, or flat $20
// for hosted stays) — released to the platform account.

// 1) Save the host's card at signing (no charge). Returns a hosted Checkout URL.
export const createFeeSetupSession = action({
  args: {
    contractId: v.string(),
    feeAmount: v.optional(v.number()), // ignored — fee is always computed server-side
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not set in Convex environment variables');

    const contract = await ctx.runQuery(internal.contracts.getByIdInternal, { id: args.contractId });
    if (!contract) throw new Error('Contract not found');
    const { fee } = computeContractFee(contract);

    const stripe = new Stripe(secretKey);
    const customer = await stripe.customers.create({ metadata: { contractId: args.contractId } });

    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      payment_method_types: ['card'],
      customer: customer.id,
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      metadata: { contractId: args.contractId, feeAmount: String(fee), type: 'fee_setup' },
      custom_text: {
        submit: { message: "You won't be charged now — the platform fee is only charged once the collaboration is completed." },
      },
    });

    return { url: session.url, sessionId: session.id };
  },
});

// 2) After the SetupIntent redirect, store the saved card + fee on the contract.
export const verifyFeeSetupSession = action({
  args: { sessionId: v.string() },
  handler: async (ctx, args) => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not set in Convex environment variables');

    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.retrieve(args.sessionId, { expand: ['setup_intent'] });

    if (session.status !== 'complete') throw new Error('Setup session is not complete');
    const contractId = session.metadata?.contractId;
    if (!contractId) throw new Error('No contractId in setup session metadata');

    const feeAmount = Number(session.metadata?.feeAmount ?? 0);
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    const setupIntent = session.setup_intent;
    const paymentMethodId =
      setupIntent && typeof setupIntent === 'object'
        ? (typeof setupIntent.payment_method === 'string'
            ? setupIntent.payment_method
            : setupIntent.payment_method?.id ?? null)
        : null;

    if (!customerId || !paymentMethodId) throw new Error('Card was not saved');

    // Set as the default payment method so the off-session charge uses it.
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    await ctx.runMutation(internal.contracts.setHostPayment, {
      contractId,
      customerId,
      paymentMethodId,
      feeAmount,
    });

    return { success: true };
  },
});

// 3) Charge the saved card off-session when the collab completes. Called by the
// scheduler from collaborations.markCompleted, and backstopped by the webhook.
export const chargeContractFee = internalAction({
  args: { contractId: v.string() },
  handler: async (ctx, args) => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return { skipped: 'no_stripe_key' };

    const contract = await ctx.runQuery(internal.contracts.getByIdInternal, { id: args.contractId });
    if (!contract) return { skipped: 'no_contract' };
    if (contract.paid) return { skipped: 'already_paid' };

    // Founding / lifetime hosts pay no platform fee.
    if (contract.host_id) {
      const host = await ctx.runQuery(api.profiles.getById, { id: String(contract.host_id) });
      if (host?.is_founder || host?.is_lifetime) return { skipped: 'host_free' };
    }

    const customerId = contract.host_stripe_customer_id;
    const paymentMethodId = contract.host_payment_method_id;
    // No saved card → can't auto-charge; the manual "Pay Platform Fee" remains.
    if (!customerId || !paymentMethodId) return { skipped: 'no_saved_card' };

    // Prefer the fee captured at signing; otherwise recompute from the contract.
    let fee = contract.fee_amount;
    if (!fee || fee <= 0) {
      fee = computeContractFee(contract).fee;
    }
    const amountInCents = Math.round(fee * 100);

    const stripe = new Stripe(secretKey);
    try {
      const intent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        description: 'Collabnb platform fee — completed collaboration',
        metadata: { contractId: args.contractId, type: 'platform_fee' },
      });

      if (intent.status === 'succeeded') {
        await ctx.runMutation(internal.contracts.recordPaymentInternal, {
          id: args.contractId,
          paymentAmount: fee,
          paymentIntentId: intent.id,
        });
        return { success: true };
      }

      // requires_action / processing — flag for manual completion.
      await ctx.runMutation(internal.contracts.markFeeChargeFailed, { id: args.contractId });
	    await ctx.runMutation(internal.fees.markFeeFailed, { collaborationId: args.contractId });
      return { needsAction: true, status: intent.status };
    } catch (err) {
      await ctx.runMutation(internal.contracts.markFeeChargeFailed, { id: args.contractId });
	    await ctx.runMutation(internal.fees.markFeeFailed, { collaborationId: args.contractId });
      return { error: String(err?.message || err) };
    }
  },
});
