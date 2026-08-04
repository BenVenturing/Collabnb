// Shared server-side auth helpers. Convex mutations must never trust a
// client-passed profileId/ownerId/is_admin as the caller's identity — the
// Convex client SDK can be called directly with arbitrary arguments, bypassing
// any UI-level checks. These helpers resolve the real caller from the Clerk
// identity Convex verifies on every request (see auth.config.ts) and match it
// to a profiles row by Clerk's stable per-user `subject` (profiles.clerk_user_id).
//
// IMPORTANT: the deployed Clerk JWT template for this project ("convex")
// currently does NOT include an `email` claim — confirmed live via prod logs
// (identity keys are only tokenIdentifier/issuer/subject/sid/sts/v). Email
// therefore can't be used as the verified identity anchor; `subject` always
// is. If/when the Clerk dashboard's "convex" JWT template is fixed to add
// `"email": "{{user.primary_email_address}}"`, this file keeps working as-is
// (email-based fallbacks below simply stop being needed).
//
// Errors here are thrown as ConvexError, not plain Error — Convex redacts
// plain Error messages on the client (generic "Server Error") in production,
// so a plain throw would silently swallow the real reason for a rejection.

import { ConvexError } from "convex/values";

type AuthCtx = {
  auth: { getUserIdentity: () => Promise<{ subject?: string; email?: string } | null> };
  db: any;
};

export async function getAuthedProfile(ctx: AuthCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.subject) return null;
  const byClerkId = await ctx.db
    .query("profiles")
    .withIndex("by_clerk_user_id", (q: any) => q.eq("clerk_user_id", identity.subject))
    .unique();
  if (byClerkId) return byClerkId;
  // Falls back to email only for a session whose row hasn't been linked by
  // clerk_user_id yet this deploy — normally profiles.getOrCreate links it
  // on every app load, so this is a narrow transitional gap, not the primary
  // path (see file-level note on the missing email claim).
  const email = identity.email?.toLowerCase().trim();
  if (!email) return null;
  return await ctx.db
    .query("profiles")
    .withIndex("by_email", (q: any) => q.eq("email", email))
    .unique();
}

export async function requireAuthedProfile(ctx: AuthCtx) {
  const profile = await getAuthedProfile(ctx);
  if (!profile) throw new ConvexError("Sign in required.");
  return profile;
}

export async function requireOwnerOrAdmin(ctx: AuthCtx, ownerId: unknown) {
  const profile = await requireAuthedProfile(ctx);
  if (profile.is_admin === true) return profile;
  if (!ownerId || String(profile._id) !== String(ownerId)) {
    throw new ConvexError("You don't have permission to do that.");
  }
  return profile;
}

export async function requireAdmin(ctx: AuthCtx) {
  const profile = await requireAuthedProfile(ctx);
  if (profile.is_admin !== true) throw new ConvexError("Admin access required.");
  return profile;
}

// For endpoints keyed by email rather than profileId (e.g. looking up a
// contact-form thread) — caller must be that verified email, or admin.
// Resolves the caller via their own profile (subject-based) rather than
// trusting the JWT email claim directly, since it's currently absent.
export async function requireSelfEmailOrAdmin(ctx: AuthCtx, email: string) {
  const profile = await getAuthedProfile(ctx);
  if (profile?.is_admin === true) return;
  if (profile && (profile.email || "").toLowerCase().trim() === email.toLowerCase().trim()) return;
  throw new ConvexError("You don't have permission to do that.");
}

// Convex actions have no ctx.db, so requireAdmin (which reads the profiles
// table directly) doesn't work inside one — resolve the caller via a query
// instead. Use this in any `action` handler that needs an admin-only gate.
// The caller passes its own imported `api.profiles.getByClerkUserId`
// reference to avoid a circular import between lib/auth.ts and
// _generated/api.ts.
export async function requireAdminAction(
  ctx: {
    auth: { getUserIdentity: () => Promise<{ subject?: string; email?: string } | null> };
    runQuery: (ref: any, args: any) => Promise<any>;
  },
  getByClerkUserIdRef: any
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.subject) throw new ConvexError("Sign in required.");
  const caller: any = await ctx.runQuery(getByClerkUserIdRef, { clerk_user_id: identity.subject });
  if (!caller || caller.is_admin !== true) throw new ConvexError("Admin access required.");
  return caller;
}

// Action-context counterpart to requireAuthedProfile — for actions (no
// ctx.db) that need any signed-in caller (not admin-only, not owner-scoped).
// Resolves the caller via a query the same way requireAdminAction does.
export async function requireAuthedProfileAction(
  ctx: {
    auth: { getUserIdentity: () => Promise<{ subject?: string; email?: string } | null> };
    runQuery: (ref: any, args: any) => Promise<any>;
  },
  getByClerkUserIdRef: any
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.subject) throw new ConvexError("Sign in required.");
  const caller: any = await ctx.runQuery(getByClerkUserIdRef, { clerk_user_id: identity.subject });
  if (!caller) throw new ConvexError("Sign in required.");
  return caller;
}

// Action-context counterpart to requireOwnerOrAdmin — for actions (no ctx.db),
// resolving the caller via a query the same way requireAdminAction does.
export async function requireOwnerOrAdminAction(
  ctx: {
    auth: { getUserIdentity: () => Promise<{ subject?: string; email?: string } | null> };
    runQuery: (ref: any, args: any) => Promise<any>;
  },
  ownerId: unknown,
  getByClerkUserIdRef: any
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.subject) throw new ConvexError("Sign in required.");
  const caller: any = await ctx.runQuery(getByClerkUserIdRef, { clerk_user_id: identity.subject });
  if (!caller) throw new ConvexError("Sign in required.");
  if (caller.is_admin === true) return caller;
  if (!ownerId || String(caller._id) !== String(ownerId)) {
    throw new ConvexError("You don't have permission to do that.");
  }
  return caller;
}

// Query-safe checks: a `query` handler that throws crashes the whole
// component tree wherever it's rendered (React has no way to locally catch a
// Convex query error) — including the harmless case of a signed-out visitor
// (or the local mock-session preview) simply not having a real identity yet.
// Queries should fail soft (return an empty/default result) instead; only
// mutations/actions should throw, since a failed write SHOULD surface an
// error to the user. Use these in every `query` handler instead of
// requireOwnerOrAdmin/requireAdmin, and `return <empty shape>` when false.
export async function canAccessOwner(ctx: AuthCtx, ownerId: unknown): Promise<boolean> {
  const profile = await getAuthedProfile(ctx);
  if (!profile) return false;
  if (profile.is_admin === true) return true;
  return !!ownerId && String(profile._id) === String(ownerId);
}

export async function canAccessAdmin(ctx: AuthCtx): Promise<boolean> {
  const profile = await getAuthedProfile(ctx);
  return profile?.is_admin === true;
}

export async function isSelfEmailOrAdmin(ctx: AuthCtx, email: string): Promise<boolean> {
  const profile = await getAuthedProfile(ctx);
  if (!profile) return false;
  if (profile.is_admin === true) return true;
  return (profile.email || "").toLowerCase().trim() === email.toLowerCase().trim();
}

// Used only by profiles.getOrCreate to bootstrap/refresh the one admin
// account — compares the *verified* Clerk identity email against a
// server-only env var, never a client-supplied boolean.
export function isServerAdminEmail(email: string | undefined | null): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || !email) return false;
  return email.toLowerCase() === adminEmail.toLowerCase();
}
