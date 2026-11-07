// Pure helpers (no Convex imports) so the email can be rendered and
// previewed outside the Convex runtime.

const COUNTRY_TZ: Record<string, string> = {
  Brazil: "America/Sao_Paulo",
  Singapore: "Asia/Singapore",
  "United States": "America/Chicago",
};

export function tzForApplicant(country: string, basedIn?: string): string {
  if (country === "United States" && basedIn) {
    if (/\b(CA|WA|OR|NV|California|Seattle)\b/i.test(basedIn)) return "America/Los_Angeles";
    if (/\b(NY|NJ|MA|Miami|New York|Boston)\b/i.test(basedIn)) return "America/New_York";
  }
  return COUNTRY_TZ[country] ?? "UTC";
}

// Ben is on Asia/Jakarta (UTC+7, no DST): 8pm there is 13:00 UTC.
export function defaultInviteSlots(now = Date.now()): number[] {
  const out: number[] = [];
  const d = new Date(now);
  d.setUTCHours(13, 0, 0, 0);
  while (out.length < 3) {
    d.setUTCDate(d.getUTCDate() + 1);
    const wd = d.getUTCDay();
    if (wd !== 0 && wd !== 6 && d.getTime() - now > 24 * 3600 * 1000) out.push(d.getTime());
  }
  return out;
}

function fmt(ms: number, tz: string) {
  const day = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long", month: "short", day: "numeric" }).format(ms);
  const time = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(ms);
  return { day, time };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));

export function buildAmbassadorInviteHtml({ name, hook, tz, slots }: { name: string; hook?: string; tz: string; slots: number[] }): string {
  const first = esc((name || "there").trim().split(" ")[0]);
  const rows = slots
    .map((ms, i) => {
      const { day, time } = fmt(ms, tz);
      const border = i === slots.length - 1 ? "" : "border-bottom:1px solid #e1eadf;";
      return `<tr><td style="padding:14px 20px;${border}font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;color:#1c2a22;"><strong>${day}</strong><span style="color:#3f6b52;float:right;">${time}</span></td></tr>`;
    })
    .join("\n");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Collabnb Ambassador Program</title></head>
<body style="margin:0;padding:0;background:#f4f6f3;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f3;padding:32px 16px;"><tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6ebe4;">
<tr><td style="padding:28px 36px 0 36px;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:bold;color:#1c2a22;letter-spacing:-0.3px;">Collabnb</td></tr>
<tr><td style="padding:20px 36px 0 36px;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;line-height:1.65;color:#2b3530;">
<p style="margin:0 0 16px 0;">Hi ${first},</p>
<p style="margin:0 0 16px 0;">Thank you for applying to the Collabnb Ambassador Program. I read through your application and loved what you shared.${hook ? " " + esc(hook) : ""}</p>
<p style="margin:0 0 20px 0;">The next step is a short Zoom call (about 20 minutes) so we can get to know each other and walk through how the program works. Here are a few times that work for me, shown in your local time:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f8f3;border:1px solid #e1eadf;border-radius:12px;margin:0 0 20px 0;">
${rows}
</table>
<p style="margin:0 0 16px 0;">Just reply with the one that suits you best. If none of them work, send me a couple of times that do and I'll make it happen. I'll send the Zoom link as soon as we've locked it in.</p>
<p style="margin:0 0 24px 0;">Looking forward to meeting you.</p>
<p style="margin:0 0 4px 0;">Warmly,</p>
<p style="margin:0 0 28px 0;"><strong style="color:#1c2a22;">Ben</strong><br><span style="color:#6b766f;">Founder, Collabnb</span></p>
</td></tr>
<tr><td style="padding:18px 36px;background:#fafbf9;border-top:1px solid #eef1ec;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;font-size:12px;color:#8a948d;">
<a href="https://collabnb.com" style="color:#3f6b52;text-decoration:none;">collabnb.com</a> &nbsp;·&nbsp; Connecting boutique stays with creators</td></tr>
</table></td></tr></table></body></html>`;
}
