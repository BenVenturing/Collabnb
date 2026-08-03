import { action, internalAction } from './_generated/server';
import { api, internal } from './_generated/api';
import { v } from 'convex/values';
import Stripe from 'stripe';
import { computeFee } from './fees';
import { requireAdminAction, requireOwnerOrAdminAction } from './lib/auth';

// Tiered lifetime pricing — price rises as more spots are purchased.
// First 50 buyers: $100, next 50: $125, next 50: $150, final 50: $200.
// After 200 lifetime purchases, redirect users to monthly/annual instead.
// Dispute-resolution hold: how long between the host's charge succeeding and
// the creator's payout actually being forwarded (mirrors Airbnb-style holds).
const PAYOUT_HOLD_MS = 48 * 60 * 60 * 1000;

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
// tier: "monthly" ($10/mo) or "yearly" ($60/yr, save 50%). Uses the persistent
// Creator Plus Prices (see STRIPE_PRICE_MONTHLY_ID/STRIPE_PRICE_YEARLY_ID) so
// the billing portal can offer switching between them.
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
    const priceId = isYearly ? process.env.STRIPE_PRICE_YEARLY_ID : process.env.STRIPE_PRICE_MONTHLY_ID;
    if (!priceId) throw new Error('STRIPE_PRICE_MONTHLY_ID/STRIPE_PRICE_YEARLY_ID are not set in Convex environment variables');

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
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

    await ctx.runMutation(internal.profiles.updateSubscription, {
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
// Collect & forward: the host is charged fee + cash value in one PaymentIntent
// (Collabnb collects), then the cash value is forwarded to the creator's
// connected payout account (Collabnb forwards). Free-stay collabs have no
// cash to forward, so they behave exactly as before — fee only.
export const chargeContractFee = internalAction({
  args: { contractId: v.string() },
  handler: async (ctx, args) => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) return { skipped: 'no_stripe_key' };

    const contract = await ctx.runQuery(internal.contracts.getByIdInternal, { id: args.contractId });
    if (!contract) return { skipped: 'no_contract' };
    if (contract.paid) return { skipped: 'already_paid' };

    // Founding / lifetime hosts pay no platform fee — but they still owe the
    // creator their agreed cash payout, since that's not Collabnb's money.
    const host = contract.host_id
      ? await ctx.runQuery(api.profiles.getById, { id: String(contract.host_id) })
      : null;
    const hostFeeWaived = host?.is_founder === true || host?.is_lifetime === true;

    const customerId = contract.host_stripe_customer_id;
    const paymentMethodId = contract.host_payment_method_id;
    // No saved card → can't auto-charge; the manual "Pay Platform Fee" remains.
    if (!customerId || !paymentMethodId) return { skipped: 'no_saved_card' };

    // Prefer the fee captured at signing; otherwise recompute from the contract.
    let fee = hostFeeWaived ? 0 : contract.fee_amount;
    const { cash, isFreeStay } = computeContractFee(contract);
    if (!hostFeeWaived && (!fee || fee <= 0)) fee = computeContractFee(contract).fee;
    const creatorPayout = isFreeStay ? 0 : cash;
    const grossCharge = fee + creatorPayout;
    if (grossCharge <= 0) return { skipped: 'nothing_to_charge' };
    const amountInCents = Math.round(grossCharge * 100);

    const stripe = new Stripe(secretKey);
    try {
      const intent = await stripe.paymentIntents.create({
        amount: amountInCents,
        currency: 'usd',
        customer: customerId,
        payment_method: paymentMethodId,
        off_session: true,
        confirm: true,
        description: creatorPayout > 0
          ? 'Collabnb collaboration payment (platform fee + creator payout)'
          : 'Collabnb platform fee — completed collaboration',
        metadata: { contractId: args.contractId, type: 'collab_payment', feeAmount: String(fee), creatorPayout: String(creatorPayout) },
      });

      if (intent.status === 'succeeded') {
        await ctx.runMutation(internal.contracts.recordPaymentInternal, {
          id: args.contractId,
          paymentAmount: grossCharge,
          paymentIntentId: intent.id,
        });
        await ctx.runMutation(internal.contracts.setGrossCharge, {
          id: args.contractId,
          grossChargeAmount: grossCharge,
          creatorPayoutAmount: creatorPayout,
        });

        if (host?.email) {
          await ctx.runAction(internal.email.sendPayoutReceiptEmail, {
            to: host.email,
            name: host.full_name || contract.host_name || 'there',
            role: 'host',
            amount: grossCharge,
            counterpartyName: contract.creator_name || 'your creator',
            propertyName: contract.property_name,
          });
          await ctx.runMutation(internal.contracts.markHostReceiptSent, { id: args.contractId });
        }

        if (creatorPayout > 0) {
          const chargeId = typeof intent.latest_charge === 'string' ? intent.latest_charge : intent.latest_charge?.id;
          // Dispute-resolution hold: don't forward immediately — schedule it
          // for PAYOUT_HOLD_HOURS from now so admin has a window to pause it.
          const releaseAt = Date.now() + PAYOUT_HOLD_MS;
          await ctx.runMutation(internal.contracts.schedulePayoutHold, { id: args.contractId, releaseAt });
          await ctx.scheduler.runAfter(PAYOUT_HOLD_MS, internal.stripe.forwardCreatorPayout, {
            contractId: args.contractId,
            amount: creatorPayout,
            chargeId,
          });
        }
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

// 4) Forward the creator's net payout after the host's charge has succeeded.
// Stripe Connect: instant transfer, tied to the originating charge. Wise:
// not instant (Stripe has to settle to Collabnb's bank first) — flagged
// "pending" for an admin to send manually via sendWisePayout once funds land.
export const forwardCreatorPayout = internalAction({
  args: { contractId: v.string(), amount: v.number(), chargeId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const contract = await ctx.runQuery(internal.contracts.getByIdInternal, { id: args.contractId });
    if (contract?.creator_payout_held) return { held: true };
    const creatorId = contract?.creator_id;
    if (!creatorId) {
      await ctx.runMutation(internal.contracts.setPayoutStatus, { id: args.contractId, status: 'pending' });
      return { skipped: 'no_creator' };
    }
    const creator = await ctx.runQuery(api.profiles.getById, { id: String(creatorId) });
    if (!creator) {
      await ctx.runMutation(internal.contracts.setPayoutStatus, { id: args.contractId, status: 'pending' });
      return { skipped: 'creator_not_found' };
    }

    if (creator.payout_method === 'stripe_connect' && creator.stripe_connect_account_id) {
      const secretKey = process.env.STRIPE_SECRET_KEY;
      const stripe = new Stripe(secretKey);
      try {
        const transfer = await stripe.transfers.create({
          amount: Math.round(args.amount * 100),
          currency: 'usd',
          destination: creator.stripe_connect_account_id,
          source_transaction: args.chargeId,
          metadata: { contractId: args.contractId },
        });
        await ctx.runMutation(internal.contracts.setPayoutStatus, {
          id: args.contractId, status: 'paid', method: 'stripe_connect', reference: transfer.id,
        });
        if (creator.email) {
          await ctx.runAction(internal.email.sendPayoutReceiptEmail, {
            to: creator.email,
            name: creator.full_name || contract.creator_name || 'there',
            role: 'creator',
            amount: args.amount,
            counterpartyName: contract.host_name || 'your host',
            propertyName: contract.property_name,
          });
          await ctx.runMutation(internal.contracts.markCreatorReceiptSent, { id: args.contractId });
        }
        return { success: true, transferId: transfer.id };
      } catch (err) {
        await ctx.runMutation(internal.contracts.setPayoutStatus, {
          id: args.contractId, status: 'failed', method: 'stripe_connect',
        });
        return { error: String(err?.message || err) };
      }
    }

    if (creator.payout_method === 'wise' && creator.wise_recipient_id) {
      await ctx.runMutation(internal.contracts.setPayoutStatus, { id: args.contractId, status: 'pending', method: 'wise' });
      return { pending: 'awaiting_manual_wise_payout' };
    }

    // Creator hasn't connected a payout method yet.
    await ctx.runMutation(internal.contracts.setPayoutStatus, { id: args.contractId, status: 'pending' });
    return { pending: 'no_payout_method' };
  },
});

// Admin override: clears any dispute hold and forwards the creator's payout
// immediately instead of waiting out the rest of the PAYOUT_HOLD_MS window.
// Only meaningful for Stripe Connect — Wise payouts are already admin-manual.
export const releasePayoutNow = action({
  args: { contractId: v.string() },
  handler: async (ctx, args) => {
    await requireAdminAction(ctx, api.profiles.getByEmail);
    const contract = await ctx.runQuery(internal.contracts.getByIdInternal, { id: args.contractId });
    if (!contract) throw new Error('Contract not found');
    if (contract.creator_payout_status === 'paid') throw new Error('This contract has already been paid out');
    if (!contract.creator_payout_amount) throw new Error('No payout amount recorded on this contract');

    await ctx.runMutation(internal.contracts.setPayoutHold, { contractId: args.contractId, held: false });

    const secretKey = process.env.STRIPE_SECRET_KEY;
    const stripe = new Stripe(secretKey);
    let chargeId;
    if (contract.payment_intent_id) {
      const intent = await stripe.paymentIntents.retrieve(contract.payment_intent_id);
      chargeId = typeof intent.latest_charge === 'string' ? intent.latest_charge : intent.latest_charge?.id;
    }

    return await ctx.runAction(internal.stripe.forwardCreatorPayout, {
      contractId: args.contractId,
      amount: contract.creator_payout_amount,
      chargeId,
    });
  },
});

// Creator payout onboarding — creates (or reuses) a Stripe Express connected
// account and returns a hosted onboarding link. Stripe handles KYC/AML,
// identity verification, and bank account linking; we just store the account id.
export const createConnectOnboardingLink = action({
  args: { profileId: v.string(), refreshUrl: v.string(), returnUrl: v.string() },
  handler: async (ctx, args) => {
    await requireOwnerOrAdminAction(ctx, args.profileId, api.profiles.getByEmail);
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) throw new Error('STRIPE_SECRET_KEY is not set in Convex environment variables');
    const stripe = new Stripe(secretKey);

    const profile = await ctx.runQuery(api.profiles.getById, { id: args.profileId });
    if (!profile) throw new Error('Profile not found');

    let accountId = profile.stripe_connect_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: profile.email,
        metadata: { profileId: args.profileId },
      });
      accountId = account.id;
      await ctx.runMutation(internal.profiles.setStripeConnectAccount, { profileId: args.profileId, accountId });
    }

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: args.refreshUrl,
      return_url: args.returnUrl,
      type: 'account_onboarding',
    });

    return { url: link.url };
  },
});

const wiseBaseUrl = () =>
  process.env.WISE_ENV === 'sandbox' ? 'https://api.sandbox.transferwise.tech' : 'https://api.wise.com';

// One-off lookup: run via `npx convex run stripe:listWiseProfiles --prod`
// once WISE_API_TOKEN is set, to find your WISE_PROFILE_ID (the business
// profile id, distinct from the API token) without hunting through Wise's UI.
export const listWiseProfiles = action({
  args: {},
  handler: async (ctx) => {
    await requireAdminAction(ctx, api.profiles.getByEmail);
    const token = process.env.WISE_API_TOKEN;
    if (!token) throw new Error('WISE_API_TOKEN is not set in Convex environment variables');
    const res = await fetch(`${wiseBaseUrl()}/v2/profiles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Wise profiles lookup failed: ${res.status} ${await res.text()}`);
    return await res.json();
  },
});

// Creator connects Wise — creates a recipient account to receive payouts.
// `type`/`details` shape depends on currency/country per Wise's API; passed
// through from the client form as-is. NOTE: verify the exact required fields
// against Wise's own dashboard/API docs before the first real payout for a
// new currency — https://docs.wise.com/api-docs/api-reference/recipient.
export const createWiseRecipient = action({
  args: {
    profileId: v.string(),
    currency: v.string(),
    accountHolderName: v.string(),
    type: v.string(),
    details: v.any(),
  },
  handler: async (ctx, args) => {
    await requireOwnerOrAdminAction(ctx, args.profileId, api.profiles.getByEmail);
    const token = process.env.WISE_API_TOKEN;
    const wiseProfileId = process.env.WISE_PROFILE_ID;
    if (!token || !wiseProfileId) throw new Error('WISE_API_TOKEN/WISE_PROFILE_ID are not set in Convex environment variables');

    const res = await fetch(`${wiseBaseUrl()}/v1/accounts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: wiseProfileId,
        accountHolderName: args.accountHolderName,
        currency: args.currency,
        type: args.type,
        details: args.details,
      }),
    });
    if (!res.ok) throw new Error(`Wise recipient creation failed: ${res.status} ${await res.text()}`);
    const recipient = await res.json();

    await ctx.runMutation(internal.profiles.setWiseRecipient, {
      profileId: args.profileId,
      recipientId: String(recipient.id),
      currency: args.currency,
    });

    return { recipientId: recipient.id };
  },
});

// Admin-triggered Wise payout — for creators who chose Wise, since Stripe has
// to settle funds to Collabnb's own bank before there's real cash to forward
// (see forwardCreatorPayout). Flow: quote → transfer → fund from Wise balance.
export const sendWisePayout = action({
  args: { contractId: v.string() },
  handler: async (ctx, args) => {
    await requireAdminAction(ctx, api.profiles.getByEmail);
    const token = process.env.WISE_API_TOKEN;
    const wiseProfileId = process.env.WISE_PROFILE_ID;
    if (!token || !wiseProfileId) throw new Error('WISE_API_TOKEN/WISE_PROFILE_ID are not set in Convex environment variables');

    const contract = await ctx.runQuery(internal.contracts.getByIdInternal, { id: args.contractId });
    if (!contract) throw new Error('Contract not found');
    if (contract.creator_payout_status === 'paid') throw new Error('This contract has already been paid out');
    if (!contract.creator_id) throw new Error('Contract has no linked creator');

    const creator = await ctx.runQuery(api.profiles.getById, { id: String(contract.creator_id) });
    if (!creator?.wise_recipient_id) throw new Error('Creator has no connected Wise recipient');

    const amount = contract.creator_payout_amount;
    if (!amount || amount <= 0) throw new Error('No payout amount recorded on this contract');

    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const base = wiseBaseUrl();

    await ctx.runMutation(internal.contracts.setPayoutStatus, { id: args.contractId, status: 'processing', method: 'wise' });

    try {
      const quoteRes = await fetch(`${base}/v3/profiles/${wiseProfileId}/quotes`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sourceCurrency: 'USD',
          targetCurrency: creator.wise_recipient_currency || 'USD',
          sourceAmount: amount,
          payOut: 'BANK_TRANSFER',
        }),
      });
      if (!quoteRes.ok) throw new Error(`Wise quote failed: ${quoteRes.status} ${await quoteRes.text()}`);
      const quote = await quoteRes.json();

      const transferRes = await fetch(`${base}/v1/transfers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          targetAccount: creator.wise_recipient_id,
          quoteUuid: quote.id,
          customerTransactionId: `${args.contractId}-${Date.now()}`,
          details: { reference: 'Collabnb payout' },
        }),
      });
      if (!transferRes.ok) throw new Error(`Wise transfer failed: ${transferRes.status} ${await transferRes.text()}`);
      const transfer = await transferRes.json();

      const fundRes = await fetch(`${base}/v3/profiles/${wiseProfileId}/transfers/${transfer.id}/payments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ type: 'BALANCE' }),
      });
      if (!fundRes.ok) throw new Error(`Wise funding failed: ${fundRes.status} ${await fundRes.text()}`);

      await ctx.runMutation(internal.contracts.setPayoutStatus, {
        id: args.contractId, status: 'paid', method: 'wise', reference: String(transfer.id),
      });
      if (creator.email) {
        await ctx.runAction(internal.email.sendPayoutReceiptEmail, {
          to: creator.email,
          name: creator.full_name || contract.creator_name || 'there',
          role: 'creator',
          amount,
          counterpartyName: contract.host_name || 'your host',
          propertyName: contract.property_name,
        });
        await ctx.runMutation(internal.contracts.markCreatorReceiptSent, { id: args.contractId });
      }
      return { success: true, transferId: transfer.id };
    } catch (err) {
      await ctx.runMutation(internal.contracts.setPayoutStatus, { id: args.contractId, status: 'failed', method: 'wise' });
      throw err;
    }
  },
});
