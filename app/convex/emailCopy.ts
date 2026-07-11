// Shared email copy registry + renderer.
// Defaults live here in code; admin edits are stored as overrides in the
// email_templates table and merged over these at send time.

export const FROM = "Collabnb <hello@collabnb.com>";
export const BASE_URL = "https://www.collabnb.com";

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
    calloutColor: "#2dd4bf",
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
    calloutColor: "#2dd4bf",
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
    calloutColor: "#2dd4bf",
    callout2Color: "#f59e0b",
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
    calloutColor: "#2dd4bf",
    callout2Color: "#f59e0b",
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
    calloutColor: "#f59e0b",
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
    calloutColor: "#7c3aed",
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
  application_accepted: {
    name: "Application accepted (to creator)",
    trigger: "Host accepts a creator's application",
    category: "Collabs & Messaging",
    vars: ["firstName", "hostName", "listingTitle"],
    calloutColor: "#2dd4bf",
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
    calloutColor: "#2dd4bf",
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
    calloutColor: "#2dd4bf",
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
    calloutColor: "#2dd4bf",
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
    calloutColor: "#f59e0b",
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
  } as TemplateCopy & { calloutColor?: string; callout2Color?: string; buttonHref?: string };
}

// ─── HTML rendering ───────────────────────────────────────────────────────────

export function layout(body: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F5F2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5F2;padding:48px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #E8E4DF;box-shadow:0 4px 24px rgba(25,37,36,0.07);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#192524,#2d4a3e);padding:36px 40px;text-align:center;">
            <div style="font-size:26px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Collabnb</div>
            <div style="font-size:11px;color:#7ecfc4;margin-top:5px;letter-spacing:2px;text-transform:uppercase;">Creator-First Hospitality Marketing</div>
          </td>
        </tr>
        <!-- Body -->
        <tr><td style="padding:40px 40px 32px;">${body}</td></tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;background:#F7F5F2;border-top:1px solid #E8E4DF;text-align:center;">
            <p style="margin:0;font-size:12px;color:#959D90;">© 2026 Collabnb · <a href="${BASE_URL}" style="color:#2dd4bf;text-decoration:none;">collabnb.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function callout(color: string, label: string, text: string) {
  return `<div style="background:${color}12;border:1px solid ${color}30;border-radius:12px;padding:18px 22px;margin-bottom:24px;">
    <div style="font-size:11px;color:${color};font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">${label}</div>
    <p style="margin:0;font-size:14px;color:#3C5759;line-height:1.65;">${text}</p>
  </div>`;
}

export function button(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;margin-top:8px;padding:14px 32px;background:linear-gradient(135deg,#192524,#2d4a3e);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:12px;letter-spacing:-0.1px;">${label}</a>`;
}

// Assemble a full email (subject + html) from merged copy + variables.
// `buttonHref` can be overridden per-send for dynamic links (e.g. application deep links).
export function renderTemplate(
  t: TemplateCopy & { calloutColor?: string; callout2Color?: string; buttonHref?: string },
  vars: Record<string, string>,
  buttonHref?: string
) {
  const f = (s?: string) => fill(s, vars);
  const parts: string[] = [
    `<p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#192524;">${f(t.heading)}</p>`,
    `<p style="margin:0 0 24px;font-size:15px;color:#3C5759;line-height:1.65;">${f(t.body)}</p>`,
  ];
  if (t.calloutText && f(t.calloutText).trim()) {
    parts.push(callout(t.calloutColor || "#2dd4bf", f(t.calloutLabel), f(t.calloutText)));
  }
  if (t.callout2Text && f(t.callout2Text).trim()) {
    parts.push(callout(t.callout2Color || "#f59e0b", f(t.callout2Label), f(t.callout2Text)));
  }
  const href = buttonHref || t.buttonHref;
  if (t.buttonLabel && href) {
    parts.push(button(href, f(t.buttonLabel)));
  }
  if (t.footnote && f(t.footnote).trim()) {
    parts.push(`<p style="margin:12px 0 0;font-size:13px;color:#959D90;line-height:1.65;">${f(t.footnote)}</p>`);
  }
  return { subject: f(t.subject), html: layout(parts.join("\n")) };
}

export async function sendViaResend(apiKey: string, to: string, subject: string, html: string) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  });
}
