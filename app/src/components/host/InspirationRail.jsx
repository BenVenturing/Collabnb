import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin } from "lucide-react";
import { useQuery } from "convex/react";
import { useTranslation } from "react-i18next";
import i18nInstance from "../../i18n";
import { api } from "../../../convex/_generated/api";

const CYCLE_MS = 5200;
const TIP_MS = 6500;

// ─── Country → ISO-2 (for the flag sticker) ──────────────────────────────────
const COUNTRY_ISO = {
  "united states": "us", "usa": "us", "u.s.": "us", "u.s.a.": "us",
  indonesia: "id", argentina: "ar", thailand: "th", "south africa": "za",
  cyprus: "cy", mexico: "mx", canada: "ca", "united kingdom": "gb", uk: "gb",
  france: "fr", spain: "es", italy: "it", portugal: "pt", greece: "gr",
  germany: "de", australia: "au", "new zealand": "nz", japan: "jp", india: "in",
  brazil: "br", "costa rica": "cr", morocco: "ma", iceland: "is", switzerland: "ch",
};
const US_STATES = new Set(["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"]);

function listingToIso(listing) {
  const raw = (listing.location_country || "").trim();
  if (raw) {
    if (US_STATES.has(raw.toUpperCase())) return "us";
    const iso = COUNTRY_ISO[raw.toLowerCase()];
    if (iso) return iso;
  }
  // Fall back to the trailing token of "City, Region/Country"
  const tail = (listing.location || "").split(",").pop()?.trim() || "";
  if (US_STATES.has(tail.toUpperCase())) return "us";
  return COUNTRY_ISO[tail.toLowerCase()] || null;
}

function CountryFlagSticker({ listing, size = 26 }) {
  const iso = listingToIso(listing);
  const wrap = {
    width: size, height: size, borderRadius: 7, flexShrink: 0,
    overflow: "hidden", border: "2px solid #fff",
    boxShadow: "0 2px 6px rgba(25,37,36,0.28)",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(60,87,89,0.12)",
  };
  if (!iso) {
    return <div style={wrap}><MapPin size={size * 0.55} color="var(--slate)" /></div>;
  }
  return (
    <div style={wrap}>
      <img
        src={`https://flagcdn.com/w80/${iso}.png`}
        srcSet={`https://flagcdn.com/w160/${iso}.png 2x`}
        alt=""
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      />
    </div>
  );
}

// ─── Compensation + deliverables (match demo listing format) ─────────────────
function formatComp(l) {
  if (l.compensation) return l.compensation;
  const cash = Number(l.cash_amount || 0).toLocaleString();
  const cur = l.currency && l.currency !== "USD" ? ` ${l.currency}` : "";
  const tr = (key, opts) => i18nInstance.t(`inspirationRail:${key}`, opts);
  if (l.compensation_type === "paid") return `$${cash}${cur} ${tr('cashSuffix')}`;
  if (l.compensation_type === "hybrid") return `$${cash}${cur} ${tr('plusNights', { nights: l.nights || "?" })}`;
  return "";
}
function formatDeliv(l) {
  const tr = (key, opts) => i18nInstance.t(`inspirationRail:${key}`, opts);
  if (typeof l.deliverable_count === "number" && l.deliverable_count > 0) return tr('deliverables', { count: l.deliverable_count });
  if (l.deliverables_list?.length) {
    const n = l.deliverables_list.reduce((s, d) => s + (d.quantity || 0), 0);
    if (n > 0) return tr('deliverables', { count: n });
  }
  if (l.deliverables) return l.deliverables;
  return "";
}

export default function InspirationRail() {
  const { t } = useTranslation('inspirationRail');
  const TIPS = t('tips', { returnObjects: true });
  const navigate = useNavigate();
  const all = useQuery(api.listings.getAll);
  const samples = useQuery(api.listings.getSamples);

  const listings = useMemo(() => {
    const published = (all || []).filter((l) => l.status === "published" && (l.image || l.gallery_images?.length));
    if (published.length >= 3) return published.slice(0, 12);
    const fill = (samples || []).filter((l) => l.image || l.gallery_images?.length);
    const seen = new Set(published.map((l) => String(l._id)));
    return [...published, ...fill.filter((l) => !seen.has(String(l._id)))].slice(0, 12);
  }, [all, samples]);

  const [idx, setIdx] = useState(0);
  const [tipIdx, setTipIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || listings.length <= 1) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % listings.length), CYCLE_MS);
    return () => clearInterval(t);
  }, [paused, listings.length]);

  useEffect(() => {
    const t = setInterval(() => setTipIdx((i) => (i + 1) % TIPS.length), TIP_MS);
    return () => clearInterval(t);
  }, []);

  // Keep idx valid if the list shrinks
  useEffect(() => { if (idx >= listings.length && listings.length) setIdx(0); }, [listings.length, idx]);

  if (!listings.length) return <div style={{ width: 340 }} />;

  const listing = listings[idx % listings.length];
  const id = String(listing._id);
  const locText = listing.location || [listing.location_city, listing.location_country].filter(Boolean).join(", ");
  const compText = formatComp(listing);
  const delivText = formatDeliv(listing);

  return (
    <aside
      style={{
        width: 340, margin: "0 auto",
        position: "sticky", top: 24, height: "calc(100vh - 150px)",
        display: "flex", flexDirection: "column", justifyContent: "center",
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div style={{ fontFamily: "var(--font-body, Satoshi, sans-serif)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--sage)", marginBottom: 12, textAlign: "center" }}>
        {t('liveNow')}
      </div>

      {/* Detail-hero mini card */}
      <div style={{ position: "relative", height: 360 }}>
        <button
          key={id + idx}
          onClick={() => navigate(`/listing/${id}`)}
          style={{
            position: "absolute", inset: 0, padding: 0, border: "none", cursor: "pointer",
            borderRadius: "1.25rem", overflow: "hidden", display: "block", width: "100%",
            boxShadow: "0 12px 36px rgba(25,37,36,0.16)",
            animation: `railCard ${CYCLE_MS}ms ease-in-out`,
            background: "var(--bone)",
          }}
        >
          <img
            src={listing.image || listing.gallery_images?.[0]}
            alt={listing.title}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
          {/* gradient scrim */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(15,22,21,0.82) 0%, rgba(15,22,21,0.25) 45%, rgba(15,22,21,0) 70%)" }} />

          {/* flag sticker */}
          <div style={{ position: "absolute", top: 14, right: 14 }}>
            <CountryFlagSticker listing={listing} />
          </div>

          {/* title + location (left) and specifics (bottom-right) overlay */}
          <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "18px 18px 16px", display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
            <div style={{ minWidth: 0, flex: 1, textAlign: "left" }}>
              <div style={{ fontFamily: "var(--font-display, 'Cabinet Grotesk', serif)", fontWeight: 800, fontSize: 20, color: "#fff", lineHeight: 1.15, textShadow: "0 1px 8px rgba(0,0,0,0.3)" }}>
                {listing.title}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6 }}>
                <MapPin size={13} color="rgba(255,255,255,0.85)" />
                <span style={{ fontFamily: "var(--font-body, Satoshi, sans-serif)", fontSize: 13, color: "rgba(255,255,255,0.92)" }}>{locText}</span>
              </div>
            </div>
            {(compText || delivText) && (
              <div style={{ flexShrink: 0, textAlign: "right" }}>
                {compText && (
                  <div style={{ fontFamily: "var(--font-body, Satoshi, sans-serif)", fontWeight: 700, fontSize: 13, color: "#fff", lineHeight: 1.2, textShadow: "0 1px 8px rgba(0,0,0,0.35)" }}>{compText}</div>
                )}
                {delivText && (
                  <div style={{ fontFamily: "var(--font-body, Satoshi, sans-serif)", fontSize: 11.5, color: "rgba(255,255,255,0.88)", marginTop: 3 }}>{delivText}</div>
                )}
              </div>
            )}
          </div>
        </button>
      </div>

      {/* dots */}
      {listings.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 14 }}>
          {listings.map((_, i) => (
            <span key={i} style={{ width: i === idx ? 18 : 6, height: 6, borderRadius: 9999, background: i === idx ? "var(--ink)" : "rgba(25,37,36,0.18)", transition: "all 300ms" }} />
          ))}
        </div>
      )}

      {/* rotating tip / quote */}
      <div style={{ marginTop: 22, minHeight: 56 }}>
        <p key={tipIdx} style={{ fontFamily: "var(--font-display, 'Cabinet Grotesk', serif)", fontSize: 16, lineHeight: 1.45, color: "var(--ink)", animation: "railTip 600ms ease", margin: 0, textAlign: "center" }}>
          {TIPS[tipIdx]}
        </p>
      </div>

      <style>{`
        @keyframes railCard {
          0%   { opacity: 0; transform: scale(0.94); filter: blur(8px); }
          12%  { opacity: 1; transform: scale(1);    filter: blur(0); }
          82%  { opacity: 1; transform: scale(1);    filter: blur(0); }
          100% { opacity: 0.12; transform: scale(0.9); filter: blur(8px); }
        }
        @keyframes railTip {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </aside>
  );
}
