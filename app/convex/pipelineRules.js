// Server-side rules for the shared contract and deliverables records. Pure
// functions (no Convex imports) so they're unit-tested in the app repo
// (tests/rules.test.mjs) and copied into the Convex project alongside
// hostCollaborations.js. The client never trusts these — they exist because a
// mutation receives the WHOLE next state from a possibly-tampered client, and
// each party may only change their own part of it.

const FIELD_KEYS = ["nights", "compensation", "deliverables", "turnaround", "affiliate", "extra_terms"];
const MAX_FIELD = 1000;
const MAX_NOTE = 500;
const other = (role) => (role === "host" ? "creator" : "host");
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fail = (msg) => { throw new Error(msg); };

function parse(raw, fallback) {
  if (raw && typeof raw === "object") return raw;
  try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}

export function isHttpUrl(url) {
  try {
    const u = new URL(String(url).trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// ── Contract ──────────────────────────────────────────────────────────────
// A party may: append rounds authored by themselves (which wipes all
// signatures), or add their own signature. Nothing else may change.
export function validateContractTransition(prevRaw, nextRaw, role) {
  if (role !== "host" && role !== "creator") fail("Unknown party");
  const prev = { history: [], signatures: {}, locked: false, ...parse(prevRaw, {}) };
  const next = parse(nextRaw, null);
  if (!next || !Array.isArray(next.history) || typeof next.signatures !== "object" || !next.signatures) fail("Invalid contract");
  if (prev.locked) fail("Contract is locked");

  if (next.history.length < prev.history.length) fail("Can't remove earlier rounds");
  prev.history.forEach((h, i) => { if (!same(h, next.history[i])) fail("Can't edit earlier rounds"); });

  const added = next.history.slice(prev.history.length);
  added.forEach((h, i) => {
    if (h.modifiedBy !== role) fail("A round must be written by the party sending it");
    if (h.version !== prev.history.length + i + 1) fail("Round version out of order");
    if (!h.fields || typeof h.fields !== "object") fail("Round is missing its terms");
    for (const [k, v] of Object.entries(h.fields)) {
      if (!FIELD_KEYS.includes(k)) fail(`Unknown term: ${k}`);
      if (typeof v !== "string" || v.length > MAX_FIELD) fail(`Term "${k}" is invalid or too long`);
    }
    if (h.note !== undefined && (typeof h.note !== "string" || h.note.length > MAX_NOTE)) fail("Note is too long");
  });

  const sigs = next.signatures;
  if (added.length) {
    if (Object.keys(sigs).length) fail("New terms must clear all signatures");
  } else {
    const theirs = other(role);
    for (const k of [`${theirs}Signature`, `${theirs}SignedAt`]) {
      if (sigs[k] !== prev.signatures[k]) fail("You can't change the other party's signature");
    }
    const mineName = sigs[`${role}Signature`];
    const mineAt = sigs[`${role}SignedAt`];
    const prevName = prev.signatures[`${role}Signature`];
    if (mineName !== prevName) {
      if (!next.history.length) fail("Nothing to sign yet");
      if (typeof mineName !== "string" || mineName.trim().length < 2) fail("Type your full name to sign");
      if (!mineAt || Number.isNaN(Date.parse(mineAt))) fail("Missing signing time");
    }
    const allowed = new Set([`${role}Signature`, `${role}SignedAt`, `${other(role)}Signature`, `${other(role)}SignedAt`]);
    if (Object.keys(sigs).some((k) => !allowed.has(k))) fail("Unknown signature field");
  }

  const bothSigned = !!(sigs.hostSignature && sigs.creatorSignature);
  if (!!next.locked !== bothSigned) fail("Lock must match signatures");
  return next;
}

// ── Deliverable submissions ──────────────────────────────────────────────
// Creator: todo/changes_requested/submitted -> submitted, with a real link.
// Host: submitted -> approved, or -> changes_requested with a note.
// Labels, and any item neither party touched, can't change.
export function validateSubmissionsTransition(prevRaw, nextRaw, role) {
  if (role !== "host" && role !== "creator") fail("Unknown party");
  const prev = parse(prevRaw, { order: [], items: {} });
  const next = parse(nextRaw, null);
  if (!next || !Array.isArray(next.order) || !next.items || typeof next.items !== "object") fail("Invalid submissions");
  if (prev.order?.length && !same(prev.order, next.order)) fail("Can't change the list of deliverables");
  if (next.order.length > 60) fail("Too many deliverables");

  const blank = { status: "todo", url: "", note: "" };
  for (const id of next.order) {
    const was = { ...blank, ...(prev.items?.[id] || {}) };
    const now = next.items[id];
    if (!now) fail(`Missing item ${id}`);
    if (prev.items?.[id] && was.label !== now.label) fail("Can't rename a deliverable");

    const touched = now.status !== was.status || now.url !== was.url || (now.note || "") !== (was.note || "");
    if (!touched) continue;

    if (role === "creator") {
      const fromOk = ["todo", "changes_requested", "submitted"].includes(was.status);
      if (!fromOk || now.status !== "submitted") fail(`creator can't move ${id} from ${was.status} to ${now.status}`);
      if (!isHttpUrl(now.url)) fail("Submit a full link starting with https://");
      if (now.note) fail("Creators can't write review notes");
    } else {
      if (was.status !== "submitted") fail(`host can't review ${id} while it is ${was.status}`);
      if (now.url !== was.url) fail("The host can't change the submitted link");
      if (now.status === "approved") {
        if (now.note) fail("Approvals carry no note");
      } else if (now.status === "changes_requested") {
        if (!String(now.note || "").trim() || now.note.length > MAX_NOTE) fail("Tell the creator what to change");
      } else {
        fail(`host can't move ${id} to ${now.status}`);
      }
    }
  }
  return next;
}
