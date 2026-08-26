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

const PROVIDER = v.union(v.literal("openai"), v.literal("anthropic"), v.literal("openrouter"));
type Provider = "openai" | "anthropic" | "openrouter";

const DEFAULT_MODEL: Record<Provider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-sonnet-5",
  // Matches the OpenRouter fallback model already used in blog.ts's llmChat.
  openrouter: "meta-llama/llama-3.3-70b-instruct",
};

// Convex redacts plain (non-ConvexError) thrown errors on the client down to
// a generic "Server Error" in production, which hid the real cause of a
// saveApiKey failure. Re-throw anything unexpected as a ConvexError so the
// actual message reaches the client instead of being silently swallowed.
function withSurfacedErrors<Args extends any[], Ret>(
  fn: (...args: Args) => Promise<Ret>
): (...args: Args) => Promise<Ret> {
  return async (...args: Args) => {
    try {
      return await fn(...args);
    } catch (err: any) {
      if (err instanceof ConvexError) throw err;
      throw new ConvexError(`${err?.name || "Error"}: ${err?.message || String(err)}`);
    }
  };
}

// ─── Connect / disconnect a personal override key ──────────────────────────

export const saveApiKey = action({
  args: { provider: PROVIDER, apiKey: v.string() },
  handler: withSurfacedErrors(async (ctx, { provider, apiKey }) => {
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
  }),
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
  "no preamble, no quotes, no signature. " +
  "Never write square-bracket placeholders like [project name], [insert detail], " +
  "or [specific theme, if mentioned] — you must never hand back a fill-in-the-blank " +
  "template. If you don't have a real, specific detail from the conversation to use, " +
  "write the sentence in a way that doesn't need one, or drop that sentence entirely. " +
  "Avoid AI-sounding filler words and phrases — do not use: elevate, unlock, leverage, " +
  "seamless, seamlessly, dive in, delve, game-changer, game-changing, revolutionize, " +
  "cutting-edge, next-level, unparalleled, robust, holistic, synergy, circle back, " +
  "touch base, at the end of the day, needless to say, it's worth noting, embark, " +
  "journey (as a metaphor for a process), tapestry, testament, boasts, bustling, " +
  "vibrant (as filler), landscape (as a metaphor for an industry), realm, myriad, " +
  "plethora, \"whether you're X or Y\" constructions, \"not only... but also\", " +
  "\"I'm thrilled\", \"I'm stoked\", or back-to-back exclamation marks.";

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
  out = out.replace(/^["'“”]+|["'“”]+$/g, "").trim();
  // Defensive: the prompt tells the model never to leave a [placeholder]
  // like [project name], but strip any that slip through anyway — a
  // slightly awkward sentence beats a literal bracket in a sent message.
  out = out
    .replace(/\s*\[[^\]]*\]\s*/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .trim();
  return out;
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

// OpenAI and OpenRouter both speak the same OpenAI-compatible chat-completions
// wire format — only the base URL, model, and provider label differ.
async function draftWithOpenAiCompatible(
  label: string,
  url: string,
  apiKey: string,
  model: string,
  prompt: string
): Promise<string> {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      messages: [
        { role: "system", content: DRAFT_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    throw new ConvexError(`${label} request failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
  const data: any = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new ConvexError("AI response contained no text.");
  return cleanDraftText(text);
}

export const draftReply = action({
  args: { threadKey: v.string(), instruction: v.optional(v.string()), recipientName: v.optional(v.string()) },
  handler: withSurfacedErrors(async (ctx, { threadKey, instruction, recipientName }): Promise<{ draft: string; provider: Provider | "collabnb" }> => {
    const caller = await requireAuthedProfileAction(ctx, api.profiles.getByClerkUserId);
    if (caller.is_verified !== true && caller.is_admin !== true) {
      throw new ConvexError("Your account is pending verification. AI drafting unlocks once you're approved.");
    }
    const ownerId = String(caller._id);
    await ctx.runMutation(internal.aiAssistant.checkDraftRateLimit, { key: `ai_draft:${ownerId}` });

    const messages: any[] = await ctx.runQuery(api.threadMessages.getByThread, { threadKey });
    const trimmedInstruction = instruction?.trim().slice(0, 500);
    const who = recipientName?.trim() ? ` to ${recipientName.trim()}` : "";

    let task: string;
    if (messages.length === 0) {
      task = trimmedInstruction
        ? `This is the very first message${who} — there's no conversation yet. Write the opening message. Follow this instruction: "${trimmedInstruction}"`
        : `This is the very first message${who} — there's no conversation yet. Write a short, warm opening message: introduce yourself, say hello, and express interest in collaborating. Keep it casual and general since there are no specific details to reference yet.`;
    } else {
      task = trimmedInstruction
        ? `Draft the next reply. Follow this instruction from the user about what to say or how to say it: "${trimmedInstruction}"`
        : "Draft the next reply.";
    }
    const prompt = messages.length > 0
      ? `Conversation so far:\n\n${formatThreadForPrompt(messages.slice(-20))}\n\n${task}`
      : task;

    const keyRow: any = await ctx.runQuery(internal.aiAssistant.getKeyForOwner, { ownerId });
    if (keyRow) {
      const apiKey = await decryptSecret(keyRow.encrypted_key, keyRow.iv);
      const provider: Provider = keyRow.provider;
      const draft =
        provider === "anthropic"
          ? await draftWithAnthropic(apiKey, prompt)
          : provider === "openrouter"
            ? await draftWithOpenAiCompatible("OpenRouter", "https://openrouter.ai/api/v1/chat/completions", apiKey, DEFAULT_MODEL.openrouter, prompt)
            : await draftWithOpenAiCompatible("OpenAI", "https://api.openai.com/v1/chat/completions", apiKey, DEFAULT_MODEL.openai, prompt);
      await ctx.runMutation(internal.aiAssistant.touchLastUsed, { id: keyRow._id });
      return { draft, provider };
    }

    // No personal key connected — draft with Collabnb's own NVIDIA key.
    const raw = await llmChat([
      { role: "system", content: DRAFT_SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ], 400);
    return { draft: cleanDraftText(raw), provider: "collabnb" };
  }),
});
