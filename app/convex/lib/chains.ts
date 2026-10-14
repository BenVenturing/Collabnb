// Editable chain-hotel list + outreach ranking. Pure TS (no Convex imports) so
// Discovery.jsx can import it directly. To add/remove a brand, edit CHAINS.
//
// Matching only looks at display_name, website and contact_url — never the
// address or bio, so "12 Hilton Street" can't trigger it.
//   strong = website domain belongs to the brand (hilton.com, marriott.com…)
//   weak   = only the property name contains the brand ("Hilton Garden Inn
//            Austin" but also "Hilton Family Farmhouse") — shown amber.
// Franchised/owner-run properties: set prospect.chain_override = 'independent'.

export type ChainMatch = { brand: string; group: string; strength: "strong" | "weak" };

type ChainDef = { group: string; domains: string[]; names: string[] };

export const CHAINS: ChainDef[] = [
  { group: "Marriott", domains: ["marriott.com", "ritzcarlton.com", "sheraton.com", "westin.com", "w-hotels.com", "stregis.com", "luxurycollection.com", "autographhotels.com", "courtyard.com", "fairfieldinn.com", "residenceinn.com", "springhillsuites.com", "towneplacesuites.com", "aloft-hotels.com", "moxy-hotels.com"],
    names: ["Marriott", "Ritz-Carlton", "Ritz Carlton", "Sheraton", "Westin", "St. Regis", "JW Marriott", "Courtyard", "Fairfield Inn", "Residence Inn", "SpringHill Suites", "TownePlace Suites", "Aloft", "Moxy", "Renaissance Hotel", "Le Meridien", "Le Méridien", "Delta Hotels", "Gaylord", "Four Points", "Element by Westin", "AC Hotel", "Protea Hotel", "Tribute Portfolio", "Autograph Collection", "Bulgari Hotel", "Edition Hotel"] },
  { group: "Hilton", domains: ["hilton.com", "hiltongrandvacations.com", "doubletree.com", "hamptoninn.com", "embassysuites.com", "homewoodsuites.com", "waldorfastoria.com", "conradhotels.com", "curiocollection.com", "tapestrycollection.com", "canopybyhilton.com", "tru-hilton.com"],
    names: ["Hilton", "DoubleTree", "Hampton Inn", "Embassy Suites", "Homewood Suites", "Home2 Suites", "Waldorf Astoria", "Conrad", "Curio Collection", "Tapestry Collection", "Canopy by Hilton", "LXR Hotels", "Tempo by Hilton", "Motto by Hilton", "Signia by Hilton"] },
  { group: "IHG", domains: ["ihg.com", "holidayinn.com", "crowneplaza.com", "intercontinental.com", "kimptonhotels.com", "hotelindigo.com", "staybridge.com", "candlewood.com", "voco.com", "ihgarmy.com"],
    names: ["InterContinental", "Holiday Inn", "Crowne Plaza", "Kimpton", "Hotel Indigo", "Staybridge Suites", "Candlewood Suites", "voco Hotels", "Regent Hotels", "Six Senses", "Vignette Collection", "Even Hotels", "Avid Hotels", "Atwell Suites"] },
  { group: "Hyatt", domains: ["hyatt.com", "andaz.com", "thompsonhotels.com", "parkhyatt.com", "grandhyatt.com", "hyattregency.com", "alilahotels.com", "miraval.com"],
    names: ["Hyatt", "Andaz", "Thompson Hotel", "Alila", "Miraval", "Destination by Hyatt", "Caption by Hyatt", "Hyatt Place", "Hyatt House", "Dream Hotel"] },
  { group: "Wyndham", domains: ["wyndhamhotels.com", "wyndham.com", "ramada.com", "daysinn.com", "super8.com", "lq.com", "travelodge.com", "baymont.com", "microtel.com", "wingate.com", "howardjohnson.com", "tryp.com"],
    names: ["Wyndham", "Ramada", "Days Inn", "Super 8", "La Quinta", "Travelodge", "Baymont", "Microtel", "Wingate", "Howard Johnson", "TRYP", "Dolce Hotels", "Dazzler", "Hawthorn Suites"] },
  { group: "Choice", domains: ["choicehotels.com", "comfortinn.com", "qualityinn.com", "econolodge.com", "rodeway.com", "sleepinn.com", "cambria.com", "ascendhotels.com", "clarionhotel.com"],
    names: ["Comfort Inn", "Comfort Suites", "Quality Inn", "Clarion", "Econo Lodge", "Rodeway Inn", "Sleep Inn", "Cambria Hotel", "Ascend Hotel", "MainStay Suites", "Suburban Studios", "Woodspring"] },
  { group: "Accor", domains: ["accor.com", "all.accor.com", "sofitel.com", "novotel.com", "ibis.com", "mercure.com", "fairmont.com", "raffles.com", "swissotel.com", "pullman-hotels.com", "mgallery.com", "sofitel-legend.com", "sofitel.accor.com", "mantis.com"],
    names: ["Accor", "Sofitel", "Novotel", "ibis", "Mercure", "Fairmont", "Raffles", "Swissôtel", "Swissotel", "Pullman", "MGallery", "Banyan Tree", "Movenpick", "Mövenpick", "Mama Shelter", "Grand Mercure", "Adagio", "Orient Express", "Delano", "SLS Hotel", "21c Museum"] },
  { group: "Best Western", domains: ["bestwestern.com"], names: ["Best Western", "BW Premier", "Sure Stay", "SureStay", "Vib Hotel", "Glo Hotel"] },
  { group: "Radisson", domains: ["radissonhotels.com", "radissonblu.com", "parkinn.com", "countryinns.com", "radissonrewards.com"], names: ["Radisson", "Park Inn", "Country Inn & Suites", "Park Plaza", "Prizeotel"] },
  { group: "Hospitality brands", domains: ["omnihotels.com", "loewshotels.com", "ennismore.com", "hotelcollection.com", "ushotel.com"], names: ["Omni Hotel", "Loews Hotel", "Kempinski", "Shangri-La", "Mandarin Oriental", "Four Seasons", "Rosewood", "Peninsula Hotel", "Anantara", "Minor Hotels", "Dusit", "Centara", "Jumeirah", "Langham", "Oberoi", "Taj Hotel", "Taj Palace", "Hard Rock Hotel", "Sonesta", "Red Roof", "Motel 6", "Extended Stay", "Premier Inn", "NH Hotel", "Meliá", "Melia", "Barceló", "Barcelo", "Iberostar", "Riu Hotel", "Hotel RIU", "Eurostars", "Leonardo Hotel", "Steigenberger", "Maritim", "Scandic", "Nordic Choice", "Thon Hotel", "Dorchester Collection", "Belmond", "Aman", "Soho House", "citizenM", "Jurys Inn", "Maldron", "Copthorne", "Millennium Hotel"] },
];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const COMPILED = CHAINS.map((c) => ({
  group: c.group,
  domains: c.domains,
  names: c.names.map((n) => ({ brand: n, re: new RegExp(`(^|[^a-z0-9])${esc(norm(n))}([^a-z0-9]|$)`) })),
}));

function hostOf(url?: string): string {
  if (!url) return "";
  try {
    return new URL(/^https?:/i.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

type ChainFields = {
  display_name?: string;
  website?: string;
  contact_url?: string;
  chain_override?: string;
};

export function detectChain(p: ChainFields): ChainMatch | null {
  if (p.chain_override === "independent") return null;
  const hosts = [hostOf(p.website), hostOf(p.contact_url)].filter(Boolean);
  for (const c of COMPILED) {
    const d = c.domains.find((dom) => hosts.some((h) => h === dom || h.endsWith(`.${dom}`)));
    if (d) return { brand: c.names[0]?.brand || c.group, group: c.group, strength: "strong" };
  }
  const name = norm(p.display_name || "");
  if (name) {
    for (const c of COMPILED) {
      const n = c.names.find((x) => x.re.test(name));
      if (n) return { brand: n.brand, group: c.group, strength: p.chain_override === "chain" ? "strong" : "weak" };
    }
  }
  if (p.chain_override === "chain") return { brand: "Marked chain", group: "Manual", strength: "strong" };
  return null;
}

type RankFields = ChainFields & {
  target?: boolean;
  starred?: boolean;
  contact_checked_at?: number;
  marketing_email?: string;
  email?: string;
  decision_maker_name?: string;
  room_count?: number;
};

// Higher = work it first. Verified scraped contact up, chains down, targets up.
export function outreachRank(p: RankFields): number {
  let s = 0;
  if (p.contact_checked_at && (p.marketing_email || p.email)) s += 3;
  else if (p.marketing_email) s += 1.5;
  if (p.decision_maker_name) s += 1;
  if (p.target) s += 4;
  const chain = detectChain(p);
  if (chain) s -= chain.strength === "strong" ? 6 : 3;
  if (typeof p.room_count === "number" && p.room_count > 0) s += p.room_count <= 50 ? 1 : -1;
  return s;
}
