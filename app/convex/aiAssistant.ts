// AI reply drafting for Inbox — draft-only, never sends (the host/creator
// always has to hit Send). Default path uses Collabnb's own NVIDIA key (the
// same llmChat chain that already powers admin-inbox drafting in
// adminThreads.ts), so every user gets this with no setup. A user can
// optionally connect their own OpenAI or Anthropic key to override the
// platform default with their own model/budget — that key is encrypted at
// rest (see lib/crypto.ts) and only ever decrypted here, in memory,
// immediately before the provider call.

import { v, ConvexError } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { requireAuthedProfile, requireAuthedProfileAction, getAuthedProfile } from "./lib/auth";
import { encryptSecret, decryptSecret } from "./lib/crypto";
import { enforceRateLimit, RATE_LIMITS } from "./lib/rateLimit";
import { llmChat } from "./blog";

const PROVIDER = v.union(v.literal("openai"), v.literal("anthropic"));
type Provider = "openai" | "anthropic";

const DEFAULT_MODEL: Record<Provider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-5",
};

// ─── Connect / disconnect a personal override key ──────────────────────────

export const saveApiKey = action({
  args: { provider: PROVIDER, apiKey: v.string() },
  handler: async (ctx, { provider, apiKey }) => {
    const caller = await requireAuthedProfileAction(ctx, api.profiles.getByClerkUserId);
    const trimmed = apiKey.trim();
    if (!trimmed) throw new ConvexError("API key is required.");
    const { ciphertext, iv } = await encryptSecret(trimmed);
    await ctx.runMutation(internal.aiAssistant.upsertKey, {
      ownerId: String(caller._id),
      provider,
      encryptedKey: ciphertext,
      iv,
    });
  },
});

export const upsertKey = internalMutation({
  args: { ownerId: v.string(), provider: PROVIDER, encryptedKey: v.string(), iv: v.string() },
  handler: async (ctx, { ownerId, provider, encryptedKey, iv }) => {
    const existing = await ctx.db
      .query("ai_assistant_keys")
      .withIndex("by_owner", (q) => q.eq("owner_id", ownerId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { provider, encrypted_key: encryptedKey, iv });
    } else {
      await ctx.db.insert("ai_assistant_keys", {
        owner_id: ownerId,
        provider,
        encrypted_key: encryptedKey,
        iv,
        created_at: Date.now(),
      });
    }
  },
});

export const disconnectApiKey = mutation({
  args: {},
  handler: async (ctx) => {
    const profile = await requireAuthedProfile(ctx);
    const existing = await ctx.db
      .query("ai_assistant_keys")
      .withIndex("by_owner", (q) => q.eq("owner_id", String(profile._id)))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});

export const getConnectionStatus = query({
  args: {},
  handler: async (ctx): Promise<{ connected: boolean; provider: Provider | null }> => {
    const profile = await getAuthedProfile(ctx);
    if (!profile) return { connected: false, provider: null };
    const existing = await ctx.db
      .query("ai_assistant_keys")
      .withIndex("by_owner", (q) => q.eq("owner_id", String(profile._id)))
      .unique();
    return { connected: !!existing, provider: (existing?.provider as Provider) ?? null };
  },
});

// ─── Internal lookups used from the action (actions have no ctx.db) ───────

export const getKeyForOwner = internalQuery({
  args: { ownerId: v.string() },
  handler: async (ctx, { ownerId }) => {
    return await ctx.db
      .query("ai_assistant_keys")
      .withIndex("by_owner", (q) => q.eq("owner_id", ownerId))
      .unique();
  },
});

export const touchLastUsed = internalMutation({
  args: { id: v.id("ai_assistant_keys") },
  handler: async (ctx, { id }) => {
    await ctx.db.patch(id, { last_used_at: Date.now() });
  },
});

export const checkDraftRateLimit = internalMutation({
  args: { key: v.string() },
  handler: async (ctx, { key }) => {
    await enforceRateLimit(ctx, key, RATE_LIMITS.AI_DRAFT);
  },
});

// ─── Draft a reply (never sends — the user still has to hit Send) ─────────

const DRAFT_SYSTEM_PROMPT =
  "You write short, warm reply drafts for a user on Collabnb, a creator/host " +
  "collaboration platform. Read the conversation and draft the next reply — " +
  "natural, specific, zero marketing-speak. Output ONLY the message body text: " +
  "no preamble, no quotes, no signature.";

function formatThreadForPrompt(messages: Array<{ sender_role: string; text: string }>): string {
  return messages
    .map((m) => `${m.sender_role === "host" ? "Host" : "Creator"}: ${m.text}`)
    .join("\n");
}

function cleanDraftText(raw: string): string {
  let out = raw.trim();
  const lines = out.split("\n");
  if (lines.length > 1 && /^(here('s| is)|sure|below is)/i.test(lines[0]) && lines[0].length < 90) {
    out = lines.slice(1).join("\n").trim();
  }
  return out.replace(/^["'“”]+|["'“”]+$/g, "").trim();
}

async function draftWithAnthropic(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL.anthropic,
      max_tokens: 1024,
      thinking: { type: "disabled" },
      system: DRAFT_SYSTEM_PROMPT,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) {
    throw new ConvexError(`Anthropic request failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
  const data: any = await res.json();
  if (data.stop_reason === "refusal") throw new ConvexError("The AI declined to draft this reply.");
  const textBlock = (data.content ?? []).find((b: any) => b.type === "text");
  if (!textBlock?.text) throw new ConvexError("AI response contained no text.");
  return cleanDraftText(textBlock.text);
}

async function draftWithOpenAI(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: DEFAULT_MODEL.openai,
      max_tokens: 1024,
      messages: [
        { role: "system", content: DRAFT_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    throw new ConvexError(`OpenAI request failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
  const data: any = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new ConvexError("AI response contained no text.");
  return cleanDraftText(text);
}

export const draftReply = action({
  args: { threadKey: v.string() },
  handler: async (ctx, { threadKey }): Promise<{ draft: string; provider: Provider | "collabnb" }> => {
    const caller = await requireAuthedProfileAction(ctx, api.profiles.getByClerkUserId);
    if (caller.is_verified !== true && caller.is_admin !== true) {
      throw new ConvexError("Your account is pending verification. AI drafting unlocks once you're approved.");
    }
    const ownerId = String(caller._id);
    await ctx.runMutation(internal.aiAssistant.checkDraftRateLimit, { key: `ai_draft:${ownerId}` });

    const messages: any[] = await ctx.runQuery(api.threadMessages.getByThread, { threadKey });
    if (messages.length === 0) throw new ConvexError("No messages in this thread yet.");
    const prompt = `Conversation so far:\n\n${formatThreadForPrompt(messages.slice(-20))}\n\nDraft the next reply.`;

    const keyRow: any = await ctx.runQuery(internal.aiAssistant.getKeyForOwner, { ownerId });
    if (keyRow) {
      const apiKey = await decryptSecret(keyRow.encrypted_key, keyRow.iv);
      const provider: Provider = keyRow.provider;
      const draft = provider === "anthropic" ? await draftWithAnthropic(apiKey, prompt) : await draftWithOpenAI(apiKey, prompt);
      await ctx.runMutation(internal.aiAssistant.touchLastUsed, { id: keyRow._id });
      return { draft, provider };
    }

    // No personal key connected — draft with Collabnb's own NVIDIA key.
    const raw = await llmChat([
      { role: "system", content: DRAFT_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ], 400);
    return { draft: cleanDraftText(raw), provider: "collabnb" };
  },
});
