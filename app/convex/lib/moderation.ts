// Redacts common profanity/slurs from user-submitted text before it's stored,
// since Help Center questions can go live on the public FAQ immediately.
const BANNED_WORDS = [
  "fuck", "shit", "bitch", "asshole", "bastard", "dick", "piss", "crap",
  "damn", "cunt", "whore", "slut", "douche", "prick", "twat", "wank",
  "nigger", "nigga", "faggot", "fag", "retard", "spic", "chink", "kike",
  "tranny", "dyke", "gook", "wetback", "coon",
  // common compounds not covered by suffix matching alone
  "bullshit", "dickhead", "shithead", "asswipe", "motherfucker",
  "dumbass", "jackass", "dipshit", "horseshit",
];

const SUFFIXES = "(s|es|ing|ted|ty|er|ers|y)?";
const BANNED_PATTERN = new RegExp(
  `\\b(${BANNED_WORDS.join("|")})${SUFFIXES}\\b`,
  "gi"
);

export function redactText(text: string): string {
  if (!text) return text;
  return text.replace(BANNED_PATTERN, (match) => "*".repeat(match.length));
}
