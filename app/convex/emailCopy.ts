// Shared email copy registry + renderer.
// Defaults live here in code; admin edits are stored as overrides in the
// email_templates table and merged over these at send time.

export const FROM = "Collabnb <hello@collabnb.com>";
export const BASE_URL = "https://www.collabnb.com";
// Logo hosted in Convex file storage (permanent CDN URL, independent of the
// frontend deploy) so it always loads in email clients.
export const LOGO_URL = "https://outgoing-anaconda-357.convex.cloud/api/storage/b6d28787-59e6-45ec-8093-80a04d34bcd8";
// Trustpilot Automatic Feedback Service: BCC'ing this address on an email makes
// Trustpilot send its own review invitation to the "to" recipient.
export const TRUSTPILOT_BCC = "collabnb.com+46e7d484c3@invite.trustpilot.com";
export const TRUSTPILOT_REVIEW_URL = "https://www.trustpilot.com/evaluate/collabnb.com";

// Category hero illustrations (watercolor, warm/cream palette), hosted in
// Convex file storage same as LOGO_URL. Keyed by TemplateDef.category so
// renderTemplate can pick the right one automatically.
export const HERO_URLS: Record<string, string> = {
  Account: "https://outgoing-anaconda-357.convex.cloud/api/storage/202e3911-974f-4d05-bbe9-6dba8781b478",
  "Collabs & Messaging": "https://outgoing-anaconda-357.convex.cloud/api/storage/df4624bf-59e4-47f0-834d-6747e1e4e81b",
  "Contracts & Payments": "https://outgoing-anaconda-357.convex.cloud/api/storage/c53c86b7-f8f3-476c-8a93-03031b21cc36",
  Trials: "https://outgoing-anaconda-357.convex.cloud/api/storage/3f1ef632-055f-4c81-b936-5d830be58c24",
};

export type TemplateCopy = {
  subject: string;
  heading: string;
  body: string;
  calloutLabel?: string;
  calloutText?: string;
  callout2Label?: string;
  callout2Text?: string;
  buttonLabel?: string;
  footnote?: string;
};

export type TemplateDef = {
  name: string;
  trigger: string;
  category: string;
  vars: string[];
  calloutColor?: string;
  callout2Color?: string;
  buttonHref?: string;
  copy: TemplateCopy;
};

export const TEMPLATE_DEFAULTS: Record<string, TemplateDef> = {
  welcome_creator: {
    name: "Welcome — Creator waitlist",
    trigger: "Creator signs up on the marketing site",
    category: "Account",
    vars: ["firstName"],
    calloutColor: "#8B6F52",
    copy: {
      subject: "You're on the Collabnb creator waitlist 🎬",
      heading: "Hey {{firstName}} 👋",
      body: "We're hand-picking a founding group of creators to partner with boutique hospitality brands. You're in the queue.",
      calloutLabel: "What happens next",
      calloutText: "We'll reach out personally as we approach launch with early access details. Founding members get priority placement, locked-in rates, and a direct line to the team.",
      footnote: "In the meantime, spread the word — every signup helps us build something worth waiting for.",
    },
  },
  welcome_host: {
    name: "Welcome — Host waitlist",
    trigger: "Host signs up on the marketing site",
    category: "Account",
    vars: ["firstName"],
    calloutColor: "#8B6F52",
    copy: {
      subject: "You're on the Collabnb host waitlist 🏡",
      heading: "Hey {{firstName}} 👋",
      body: "We're hand-picking a founding group of hosts to list their properties and connect with creators. You're in the queue.",
      calloutLabel: "What happens next",
      calloutText: "We'll reach out personally as we approach launch with early access details. Founding members get priority placement, locked-in rates, and a direct line to the team.",
      footnote: "In the meantime, spread the word — every signup helps us build something worth waiting for.",
    },
  },
  access_granted_creator: {
    name: "Access granted — Creator",
    trigger: "Admin approves a creator (any approve path)",
    category: "Account",
    vars: ["firstName"],
    calloutColor: "#8B6F52",
    callout2Color: "#8B6F52",
    buttonHref: `${BASE_URL}/login.html`,
    copy: {
      subject: "You've been granted access to Collabnb ✅",
      heading: "You're in, {{firstName}} 🎉",
      body: "Your Collabnb creator account has been approved. Create your login below to access the platform.",
      calloutLabel: "You're a founding member",
      calloutText: "As one of our first creators, you're a Founding Member — lifetime free access as part of the inaugural cohort.",
      callout2Label: "Full launch is July 15",
      callout2Text: "In the meantime, log in and complete your creator profile so hosts can find you on launch day.",
      buttonLabel: "Create your account",
      footnote: "Sign up with email or continue with Google — takes 30 seconds.",
    },
  },
  access_granted_host: {
    name: "Access granted — Host",
    trigger: "Admin approves a host (any approve path)",
    category: "Account",
    vars: ["firstName"],
    calloutColor: "#8B6F52",
    callout2Color: "#8B6F52",
    buttonHref: `${BASE_URL}/login.html`,
    copy: {
      subject: "You've been granted access to Collabnb ✅",
      heading: "You're in, {{firstName}} 🎉",
      body: "Your Collabnb host account has been approved. Create your login below to access the platform.",
      calloutLabel: "You're a founding member",
      calloutText: "As one of our first hosts, you're a Founding Member — lifetime free access as part of the inaugural cohort.",
      callout2Label: "Full launch is July 15",
      callout2Text: "In the meantime, log in and start building your listing so you're ready to go live on day one.",
      buttonLabel: "Create your account",
      footnote: "Sign up with email or continue with Google — takes 30 seconds.",
    },
  },
  rejection: {
    name: "Application rejected",
    trigger: "Admin rejects a profile (reason shown only if provided)",
    category: "Account",
    vars: ["firstName", "reason"],
    calloutColor: "#8B6F52",
    copy: {
      subject: "Your Collabnb application",
      heading: "Hey {{firstName}},",
      body: "Thank you for applying to Collabnb. After reviewing your application, we're not able to offer access at this time.",
      calloutLabel: "Feedback",
      calloutText: "{{reason}}",
      footnote: "We're being selective with our founding cohort to keep quality high for everyone on the platform. We appreciate your interest and wish you the best.",
    },
  },
  application_received: {
    name: "New application (to host)",
    trigger: "Creator applies to a listing",
    category: "Collabs & Messaging",
    vars: ["firstName", "creatorName", "listingTitle"],
    calloutColor: "#8B6F52",
    buttonHref: `${BASE_URL}/inbox`,
    copy: {
      subject: "New application from {{creatorName}}",
      heading: "New application, {{firstName}}",
      body: "<strong>{{creatorName}}</strong> just applied to collaborate on <strong>{{listingTitle}}</strong>.",
      calloutLabel: "Next step",
      calloutText: "Review their profile and pitch in your dashboard, then accept or decline.",
      buttonLabel: "Review application",
    },
  },
  host_stale_applications: {
    name: "Applications waiting (to host)",
    trigger: "Host has applications still undecided after 48h — repeats every 3 days, stops at 14 days",
    category: "Collabs & Messaging",
    vars: ["firstName", "applicationsLabel", "oldestListing", "waitingDays"],
    calloutColor: "#8B6F52",
    buttonHref: `${BASE_URL}/host/proposals`,
    copy: {
      subject: "{{applicationsLabel}} still waiting on you",
      heading: "Don't leave them hanging, {{firstName}}",
      body: "You have <strong>{{applicationsLabel}}</strong> you haven't responded to yet. The oldest is for <strong>{{oldestListing}}</strong>, sent {{waitingDays}} ago.",
      calloutLabel: "Why it matters",
      calloutText: "Creators apply to several listings at once and move on to whoever answers first. A quick accept or decline keeps your listings worth applying to.",
      buttonLabel: "Review applications",
    },
  },
  host_awaiting_reply: {
    name: "Messages awaiting reply (to host)",
    trigger: "Host has creator messages unanswered for 24h+ — repeats every 3 days",
    category: "Collabs & Messaging",
    vars: ["firstName", "conversationsLabel", "creatorNames"],
    calloutColor: "#8B6F52",
    buttonHref: `${BASE_URL}/inbox`,
    copy: {
      subject: "{{conversationsLabel}} waiting for your reply",
      heading: "You have unanswered messages, {{firstName}}",
      body: "<strong>{{conversationsLabel}}</strong> in your inbox are waiting on a reply from you.",
      calloutLabel: "Waiting to hear back",
      calloutText: "{{creatorNames}}",
      buttonLabel: "Open inbox",
    },
  },
  creator_awaiting_reply: {
    name: "Messages awaiting reply (to creator)",
    trigger: "Creator has host messages unanswered for 24h+ — repeats every 3 days",
    category: "Collabs & Messaging",
    vars: ["firstName", "conversationsLabel", "hostNames"],
    calloutColor: "#8B6F52",
    buttonHref: `${BASE_URL}/inbox`,
    copy: {
      subject: "{{conversationsLabel}} waiting for your reply",
      heading: "You have unanswered messages, {{firstName}}",
      body: "<strong>{{conversationsLabel}}</strong> in your inbox are waiting on a reply from you.",
      calloutLabel: "Waiting to hear back",
      calloutText: "{{hostNames}}",
      buttonLabel: "Open inbox",
    },
  },
  creator_host_unresponsive: {
    name: "Host never responded (to creator)",
    trigger: "Application still undecided after the host nudge window closes (14 days)",
    category: "Collabs & Messaging",
    vars: ["firstName", "listingTitle", "waitingDays"],
    calloutColor: "#6b7280",
    buttonHref: `${BASE_URL}/explore`,
    copy: {
      subject: "Still no answer on {{listingTitle}}",
      heading: "We chased this one for you, {{firstName}}",
      body: "Your application for <strong>{{listingTitle}}</strong> has been waiting {{waitingDays}} and the host hasn't responded. We reminded them several times.",
      calloutLabel: "What this means",
      calloutText: "Your application is still open in case they come back to it — nothing has been cancelled. But it's worth putting your time into hosts who are actively reviewing.",
      buttonLabel: "Find active listings",
    },
  },
  application_accepted: {
    name: "Application accepted (to creator)",
    trigger: "Host accepts a creator's application",
    category: "Collabs & Messaging",
    vars: ["firstName", "hostName", "listingTitle"],
    calloutColor: "#8B6F52",
    buttonHref: `${BASE_URL}/inbox`,
    copy: {
      subject: "{{hostName}} accepted your application 🎉",
      heading: "You got the collab, {{firstName}} 🙌",
      body: "<strong>{{hostName}}</strong> accepted your application for <strong>{{listingTitle}}</strong>.",
      calloutLabel: "What's next",
      calloutText: "Head to your inbox to connect with your host and align on dates, deliverables, and logistics.",
      buttonLabel: "Open your inbox",
    },
  },
  application_declined: {
    name: "Application declined (to creator)",
    trigger: "Host passes on a creator's application",
    category: "Collabs & Messaging",
    vars: ["firstName", "hostName", "listingTitle"],
    calloutColor: "#6b7280",
    buttonHref: BASE_URL,
    copy: {
      subject: "Update on your application to {{hostName}}",
      heading: "Hey {{firstName}},",
      body: "{{hostName}} passed on your application for <strong>{{listingTitle}}</strong> this time.",
      calloutLabel: "Keep going",
      calloutText: "There are more listings waiting. Browse other hosts and keep pitching — the right collab is out there.",
      buttonLabel: "Browse listings",
    },
  },
  new_message: {
    name: "New message notification",
    trigger: "User receives an inbox message",
    category: "Collabs & Messaging",
    vars: ["firstName", "senderName", "preview"],
    calloutColor: "#8B6F52",
    buttonHref: `${BASE_URL}/inbox`,
    copy: {
      subject: "{{senderName}} sent you a message",
      heading: "New message, {{firstName}}",
      body: "<strong>{{senderName}}</strong> sent you a message.",
      calloutLabel: "Message preview",
      calloutText: "{{preview}}",
      buttonLabel: "Reply in inbox",
    },
  },
  collab_complete_creator: {
    name: "Collab complete (to creator)",
    trigger: "Collaboration marked complete and platform fee settled",
    category: "Contracts & Payments",
    vars: ["name", "propertyLabel"],
    calloutColor: "#8B6F52",
    copy: {
      subject: "Your Collabnb collaboration is complete",
      heading: "All wrapped up, {name} 🎉",
      body: "The <strong>{{propertyLabel}}</strong> collaboration is officially complete — the platform fee has been settled on the host's end. There's nothing left for you to do here.",
      calloutLabel: "What's next",
      calloutText: "Coordinate any remaining details with your collaborator in Collabnb.",
    },
  },
  fee_receipt_host: {
    name: "Fee receipt (to host)",
    trigger: "Platform fee charged on collab completion",
    category: "Contracts & Payments",
    vars: ["name", "propertyLabel", "amount", "feeMethod"],
    calloutColor: "#8B6F52",
    copy: {
      subject: "Receipt: Collabnb platform fee charged",
      heading: "Collaboration complete, {name} 💸",
      body: "Your <strong>{{propertyLabel}}</strong> collaboration is marked complete and the Collabnb platform fee has been charged to your card on file.",
      calloutLabel: "Receipt",
      calloutText: "Amount charged: ${{amount}} ({{feeMethod}}). This is Collabnb's platform fee for the completed collaboration — not a charge from your collaborator.",
    },
  },
  trial_ending: {
    name: "Trial ending soon",
    trigger: "Daily 9am UTC cron — trial ends within 3 days (sent once)",
    category: "Trials",
    vars: ["firstName", "days"],
    buttonHref: `${BASE_URL}/#/profile`,
    copy: {
      subject: "{{days}} left on your Collabnb trial",
      heading: "{{days}} left on your trial, {{firstName}}",
      body: "Subscribe to Creator Plus to keep exploring listings, applying to campaigns, and pitching hosts without interruption.",
      buttonLabel: "Subscribe to Creator Plus",
    },
  },
  trial_ended: {
    name: "Trial ended",
    trigger: "Midnight UTC cron — 30-day trial expired",
    category: "Trials",
    vars: ["firstName"],
    calloutColor: "#8B6F52",
    buttonHref: `${BASE_URL}/#/profile`,
    copy: {
      subject: "Your Collabnb trial has ended",
      heading: "Your trial has ended, {{firstName}}",
      body: "Your 30-day Collabnb trial is over. Subscribe to Creator Plus to keep exploring listings, applying to campaigns, and pitching hosts.",
      calloutLabel: "Creator Plus",
      calloutText: "$10/month or $60/year — cancel anytime. Founding Members keep free access forever.",
      buttonLabel: "Subscribe to Creator Plus",
    },
  },
  review_request: {
    name: "Trustpilot review invite",
    trigger: "Sent when a party submits their rating while closing out a collab (BCC'd to Trustpilot, which follows up with its own invitation)",
    category: "Collabs & Messaging",
    vars: ["firstName", "propertyLabel"],
    buttonHref: TRUSTPILOT_REVIEW_URL,
    copy: {
      subject: "Thanks for your rating — one last thing 💚",
      heading: "Thanks, {{firstName}}!",
      body: "Your rating for <strong>{{propertyLabel}}</strong> is in. If you have 60 seconds, we'd love an honest review of your Collabnb experience on Trustpilot — it helps creators and hosts trust the platform.",
      buttonLabel: "Review us on Trustpilot",
      footnote: "You may also receive an invitation email from Trustpilot — reviewing through either link works.",
    },
  },
  finish_signup: {
    name: "Finish creating your account",
    trigger: "Admin nudges an email-only signup to complete their account",
    category: "Account",
    vars: ["firstName"],
    calloutColor: "#8B6F52",
    buttonHref: `${BASE_URL}/login.html`,
    copy: {
      subject: "Finish setting up your Collabnb account",
      heading: "You're almost there, {{firstName}} 👋",
      body: "You started signing up for Collabnb but haven't finished creating your login yet. It only takes 30 seconds — set your password (or continue with Google) and you're in.",
      calloutLabel: "One step left",
      calloutText: "Create your login below to complete your account and unlock your dashboard.",
      buttonLabel: "Finish creating your account",
      footnote: "If you didn't start a Collabnb signup, you can safely ignore this email.",
    },
  },
  finish_signup_followup: {
    name: "Finish creating your account — follow-up",
    trigger: "Still hasn't finished creating a login a few days after the first finish_signup nudge — final reminder in the sequence",
    category: "Account",
    vars: ["firstName"],
    calloutColor: "#8B6F52",
    buttonHref: `${BASE_URL}/login.html`,
    copy: {
      subject: "Last reminder: finish your Collabnb account",
      heading: "One more nudge, {{firstName}}",
      body: "We reached out a few days ago — you still haven't finished creating your Collabnb login. It only takes 30 seconds to pick up where you left off.",
      calloutLabel: "This is our last reminder",
      calloutText: "You're welcome to finish anytime after this, but we won't keep emailing you about it.",
      buttonLabel: "Finish creating your account",
      footnote: "If you didn't start a Collabnb signup, you can safely ignore this email.",
    },
  },
  application_incomplete_creator: {
    name: "Incomplete application (to creator)",
    trigger: "Creator applicant hasn't finished their profile/application after N days — nudge, not yet wired to a cron",
    category: "Account",
    vars: ["firstName"],
    calloutColor: "#8B6F52",
    buttonHref: `${BASE_URL}/login.html`,
    copy: {
      subject: "Finish your Collabnb creator application",
      heading: "You're not done yet, {{firstName}}",
      body: "You started applying to Collabnb as a creator but never finished setting up your profile. Log back in to pick up right where you left off.",
      calloutLabel: "Why finish now",
      calloutText: "Hosts can't review incomplete applications. Add your details and you'll be back in the queue for our founding cohort.",
      buttonLabel: "Finish your application",
      footnote: "If you no longer want to apply, you can safely ignore this email.",
    },
  },
  application_incomplete_host: {
    name: "Incomplete application (to host)",
    trigger: "Host applicant hasn't finished their listing/setup after N days — nudge, not yet wired to a cron",
    category: "Account",
    vars: ["firstName"],
    calloutColor: "#8B6F52",
    buttonHref: `${BASE_URL}/login.html`,
    copy: {
      subject: "Finish setting up your Collabnb listing",
      heading: "You're not done yet, {{firstName}}",
      body: "You started applying to Collabnb as a host but never finished setting up your listing. Log back in to pick up right where you left off.",
      calloutLabel: "Why finish now",
      calloutText: "Creators can't discover incomplete listings. Add your details and you'll be back in the queue for our founding cohort.",
      buttonLabel: "Finish your listing",
      footnote: "If you no longer want to apply, you can safely ignore this email.",
    },
  },
  password_reset: {
    name: "Password reset",
    trigger: "User requests a password reset — buttonHref must be overridden per-send with the tokenized reset link",
    category: "Account",
    vars: ["firstName"],
    calloutColor: "#8B6F52",
    buttonHref: `${BASE_URL}/login.html`,
    copy: {
      subject: "Reset your Collabnb password",
      heading: "Let's get you back in, {{firstName}}",
      body: "We received a request to reset the password on your Collabnb account. Click below to verify it's you and choose a new one.",
      calloutLabel: "Didn't request this?",
      calloutText: "If you didn't ask to reset your password, you can safely ignore this email — your account is still secure.",
      buttonLabel: "Reset your password",
      footnote: "For your security, this link will expire shortly and can only be used once.",
    },
  },
};

// Sample values used by "Send test" in the admin panel.
export const SAMPLE_VARS: Record<string, string> = {
  firstName: "Ben",
  name: "Ben",
  reason: "This is a sample rejection reason.",
  creatorName: "Rachel Norton",
  hostName: "Landen Scott",
  listingTitle: "Lakeside Forest Treehouse",
  senderName: "Rachel Norton",
  preview: "Hey! Just confirming the shoot dates for next month — does the 12th through the 15th still work on your end?",
  propertyLabel: "Lakeside Forest Treehouse",
  amount: "45.00",
  feeMethod: "flat $20 fee",
  days: "3 days",
  applicationsLabel: "3 applications",
  oldestListing: "Lakeside Forest Treehouse",
  waitingDays: "4 days",
  conversationsLabel: "2 conversations",
  creatorNames: "Rachel Norton, Maya Chen",
  hostNames: "Landen Scott, Priya Nair",
};

export function fill(str: string | undefined, vars: Record<string, string>) {
  if (!str) return "";
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? "");
}

// Merge an admin override (email_templates row) over the code defaults.
export async function mergedCopy(db: any, templateId: string) {
  const def = TEMPLATE_DEFAULTS[templateId];
  if (!def) throw new Error(`Unknown email template: ${templateId}`);
  const override = await db
    .query("email_templates")
    .withIndex("by_template", (q: any) => q.eq("template_id", templateId))
    .unique();
  const copy: Record<string, string | undefined> = { ...def.copy };
  if (override) {
    for (const k of Object.keys(def.copy)) {
      const v = (override as any)[k];
      if (typeof v === "string" && v.trim() !== "") copy[k] = v;
    }
  }
  return {
    ...copy,
    calloutColor: def.calloutColor,
    callout2Color: def.callout2Color,
    buttonHref: def.buttonHref,
    category: def.category,
  } as TemplateCopy & { calloutColor?: string; callout2Color?: string; buttonHref?: string; category?: string };
}

// ─── HTML rendering ───────────────────────────────────────────────────────────

export function layout(body: string, heroUrl?: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F4EF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EF;padding:44px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #EAE3D9;box-shadow:0 8px 40px rgba(40,32,20,0.08);">
        <!-- Cream header with plain logo -->
        <tr>
          <td bgcolor="#F3EEE6" style="background:linear-gradient(135deg,#F3EEE6 0%,#FBF8F3 48%,#EFE7DA 100%);padding:32px 40px 28px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.6);">
            <img src="${LOGO_URL}" alt="Collabnb" width="52" height="52" style="display:block;width:52px;height:52px;margin:0 auto;border:0;outline:none;" />
            <div style="font-size:21px;font-weight:800;color:#241F19;letter-spacing:-0.4px;margin-top:12px;">Collabnb</div>
            <div style="font-size:10.5px;color:#8A7A63;margin-top:4px;letter-spacing:2.2px;text-transform:uppercase;font-weight:600;">Creator-First Hospitality</div>
          </td>
        </tr>
        <!-- Warm accent line -->
        <tr><td bgcolor="#8B6F52" style="height:3px;background:linear-gradient(90deg,rgba(139,111,82,0) 0%,#8B6F52 30%,#EFE3D3 50%,#8B6F52 70%,rgba(139,111,82,0) 100%);font-size:0;line-height:0;">&nbsp;</td></tr>
        ${heroUrl ? `<!-- Category hero art -->
        <tr><td style="line-height:0;"><img src="${heroUrl}" alt="" width="560" style="display:block;width:100%;height:auto;border:0;outline:none;" /></td></tr>` : ""}
        <!-- Body -->
        <tr><td style="padding:38px 40px 8px;">${body}</td></tr>
        <!-- Warm sign-off -->
        <tr>
          <td style="padding:8px 40px 34px;">
            <p style="margin:0;font-size:15px;color:#5C5347;line-height:1.65;">With gratitude,</p>
            <p style="margin:2px 0 0;font-size:15px;font-weight:700;color:#241F19;">The Collabnb Team <span style="color:#8B6F52;">🤎</span></p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td bgcolor="#F7F4EE" style="padding:22px 40px;background:#F7F4EE;border-top:1px solid #EDE6DA;text-align:center;">
            <p style="margin:0 0 4px;font-size:12px;color:#9C9182;">Creators &amp; boutique stays, matched with care.</p>
            <p style="margin:0;font-size:12px;color:#A69C8C;">© 2026 Collabnb · <a href="${BASE_URL}" style="color:#8B6F52;text-decoration:none;font-weight:600;">collabnb.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// The email's focal point: the key line / summary paragraph in a liquid-glass chip.
export function heroChip(text: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;"><tr>
    <td bgcolor="#F7F2EA" style="background:linear-gradient(135deg,#F3EBDD 0%,#FBF7F0 100%);border:1px solid rgba(255,255,255,0.9);border-radius:18px;padding:22px 24px;box-shadow:0 6px 20px rgba(40,32,20,0.06);">
      <p style="margin:0;font-size:16px;font-weight:500;color:#241F19;line-height:1.6;">${text}</p>
    </td>
  </tr></table>`;
}

export function callout(color: string, label: string, text: string) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;"><tr>
    <td style="background:${color}14;border:1px solid ${color}33;border-left:3px solid ${color};border-radius:14px;padding:16px 20px;">
      <div style="font-size:11px;color:${color};font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">${label}</div>
      <p style="margin:0;font-size:14px;color:#5C5347;line-height:1.65;">${text}</p>
    </td>
  </tr></table>`;
}

export function button(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:4px;padding:14px 34px;background:linear-gradient(135deg,#241F19,#4A3B2E);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:999px;letter-spacing:-0.1px;box-shadow:0 6px 18px rgba(139,111,82,0.28);">${label}</a>`;
}

// Assemble a full email (subject + html) from merged copy + variables.
// `buttonHref` can be overridden per-send for dynamic links (e.g. application deep links).
export function renderTemplate(
  t: TemplateCopy & { calloutColor?: string; callout2Color?: string; buttonHref?: string; category?: string },
  vars: Record<string, string>,
  buttonHref?: string
) {
  const f = (s?: string) => fill(s, vars);
  const parts: string[] = [
    `<p style="margin:0 0 18px;font-size:22px;font-weight:700;color:#241F19;">${f(t.heading)}</p>`,
    // The body doubles as the focal summary — shown in the liquid-glass chip.
    heroChip(f(t.body)),
  ];
  if (t.calloutText && f(t.calloutText).trim()) {
    parts.push(callout(t.calloutColor || "#8B6F52", f(t.calloutLabel), f(t.calloutText)));
  }
  if (t.callout2Text && f(t.callout2Text).trim()) {
    parts.push(callout(t.callout2Color || "#8B6F52", f(t.callout2Label), f(t.callout2Text)));
  }
  const href = buttonHref || t.buttonHref;
  if (t.buttonLabel && href) {
    parts.push(button(href, f(t.buttonLabel)));
  }
  if (t.footnote && f(t.footnote).trim()) {
    parts.push(`<p style="margin:12px 0 0;font-size:13px;color:#A69C8C;line-height:1.65;">${f(t.footnote)}</p>`);
  }
  const heroUrl = t.category ? HERO_URLS[t.category] : undefined;
  return { subject: f(t.subject), html: layout(parts.join("\n"), heroUrl) };
}

export async function sendViaResend(apiKey: string, to: string, subject: string, html: string, bcc?: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, ...(bcc ? { bcc: [bcc] } : {}) }),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error(`Resend send failed (${res.status}) to ${to}: ${errBody}`);
    throw new Error(`Resend send failed (${res.status}): ${errBody}`);
  }
}
