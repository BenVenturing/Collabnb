import { action } from './_generated/server';
import { api, internal } from './_generated/api';
import { v } from 'convex/values';
import Stripe from 'stripe';

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

// One-time Checkout for host platform fee.
// Requires: npx convex env set STRIPE_SECRET_KEY sk_test_...
export const createCheckoutSession = action({
  args: {
    contractId: v.string(),
    isFreeStay: v.boolean(),
    cashAmount: v.optional(v.number()),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (_ctx, args) => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not set in Convex environment variables');

    const stripe = new Stripe(secretKey);
    const fee = args.isFreeStay ? 20 : Math.max((args.cashAmount ?? 0) * 0.05, 20);
    const amountInCents = Math.round(fee * 100);
    const description = args.isFreeStay
      ? 'Flat platform fee for free-stay collaboration'
      : `5% of $${(args.cashAmount ?? 0).toFixed(0)} collaboration value (min. $20)`;

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
            name: `Collabnb Pro — ${isYearly ? 'Annual' : 'Monthly'}`,
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
    const expiresAt = sub?.current_period_end ? sub.current_period_end * 1000 : null;
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
// Requires the stripe_customer_id stored on the profile after subscription checkout.
export const createBillingPortalSession = action({
  args: {
    customerId: v.string(),
    returnUrl: v.string(),
  },
  handler: async (_ctx, args) => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not set in Convex environment variables');

    const stripe = new Stripe(secretKey);
    const session = await stripe.billingPortal.sessions.create({
      customer: args.customerId,
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
