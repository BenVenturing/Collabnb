// Shared server-side auth helpers. Convex mutations must never trust a
// client-passed profileId/ownerId/is_admin as the caller's identity — the
// Convex client SDK can be called directly with arbitrary arguments, bypassing
// any UI-level checks. These helpers resolve the real caller from the Clerk
// identity Convex verifies on every request (see auth.config.ts) and match it
// to a profiles row by email (profiles has no stored Clerk user id).
//
// Errors here are thrown as ConvexError, not plain Error — Convex redacts
// plain Error messages on the client (generic "Server Error") in production,
// so a plain throw would silently swallow the real reason for a rejection.

import { ConvexError } from "convex/values";

type AuthCtx = {
  auth: { getUserIdentity: () => Promise<{ email?: string } | null> };
  db: any;
};

export async function getAuthedProfile(ctx: AuthCtx) {
  const identity = await ctx.auth.getUserIdentity();
  // Clerk's JWT email claim isn't guaranteed to match the stored profile
  // email byte-for-byte (casing/whitespace) — normalize before the lookup so
  // a real signed-in session never bounces as "Sign in required" over a
  // casing mismatch. Stored profile emails are lowercased at write time too
  // (see profiles.getOrCreate).
  const email = identity?.email?.toLowerCase().trim();
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
export async function requireSelfEmailOrAdmin(ctx: AuthCtx, email: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity?.email?.toLowerCase().trim() === email.toLowerCase().trim()) return;
  const profile = await getAuthedProfile(ctx);
  if (profile?.is_admin === true) return;
  throw new ConvexError("You don't have permission to do that.");
}

// Convex actions have no ctx.db, so requireAdmin (which reads the profiles
// table directly) doesn't work inside one — resolve the caller via a query
// instead. Use this in any `action` handler that needs an admin-only gate.
// The caller passes its own imported `api.profiles.getByEmail` reference to
// avoid a circular import between lib/auth.ts and _generated/api.ts.
export async function requireAdminAction(
  ctx: {
    auth: { getUserIdentity: () => Promise<{ email?: string } | null> };
    runQuery: (ref: any, args: any) => Promise<any>;
  },
  getByEmailRef: any
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.email) throw new ConvexError("Sign in required.");
  const caller: any = await ctx.runQuery(getByEmailRef, { email: identity.email });
  if (!caller || caller.is_admin !== true) throw new ConvexError("Admin access required.");
}

// Action-context counterpart to requireOwnerOrAdmin — for actions (no ctx.db),
// resolving the caller via a query the same way requireAdminAction does.
export async function requireOwnerOrAdminAction(
  ctx: {
    auth: { getUserIdentity: () => Promise<{ email?: string } | null> };
    runQuery: (ref: any, args: any) => Promise<any>;
  },
  ownerId: unknown,
  getByEmailRef: any
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity?.email) throw new ConvexError("Sign in required.");
  const caller: any = await ctx.runQuery(getByEmailRef, { email: identity.email });
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
  const identity = await ctx.auth.getUserIdentity();
  if (identity?.email?.toLowerCase().trim() === email.toLowerCase().trim()) return true;
  const profile = await getAuthedProfile(ctx);
  return profile?.is_admin === true;
}

// Used only by profiles.getOrCreate to bootstrap/refresh the one admin
// account — compares the *verified* Clerk identity email against a
// server-only env var, never a client-supplied boolean.
export function isServerAdminEmail(email: string | undefined | null): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail || !email) return false;
  return email.toLowerCase() === adminEmail.toLowerCase();
}
