/**
 * The name filter (spec 02, ADR-010), shared by nicknames and team names.
 * Names are normalized before matching: lower case, accents removed,
 * look-alikes mapped, separators removed and repeated letters collapsed.
 */

const LOOK_ALIKES: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  $: "s",
  "!": "i",
  "|": "i",
};

const fold = (s: string) =>
  s.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/đ/g, "d");

const collapse = (s: string) => s.replace(/(.)\1+/gu, "$1");

/** One run of a name: look-alikes mapped, anything but letters and numbers dropped. */
const plain = (s: string) =>
  collapse(s.replace(/[013457@$!|]/g, (c) => LOOK_ALIKES[c] ?? c).replace(/[^\p{L}\p{N}]/gu, ""));

const normalizeTerm = (term: string) => plain(fold(term));

// Blocked anywhere in a name, even inside a longer word.
const ANYWHERE = [
  "fuck",
  "shit",
  "cunt",
  "bitch",
  "whore",
  "slut",
  "nigger",
  "nigga",
  "faggot",
  "nazi",
  "hitler",
  "porn",
  "penis",
  "vagina",
  "dildo",
  "pussy",
  "asshole",
  "twat",
  "wank",
  "retard",
  "bastard",
  "milf",
  "horny",
  "cocksucker",
].map(normalizeTerm);

// Short words blocked only on their own, so "Cassie" and "Dickens" pass.
const WHOLE_WORDS = new Set(
  [
    "ass",
    "asses",
    "tit",
    "tits",
    "dick",
    "dicks",
    "cock",
    "cocks",
    "sex",
    "sexy",
    "cum",
    "fag",
    "fags",
    "rape",
    "anal",
    "hoe",
    "hoes",
    "piss",
    "jizz",
    "kys",
    "fuk",
    "nig",
    "spic",
    "chink",
    "gook",
    "kike",
  ].map(normalizeTerm),
);

/** Whether a name should be refused. `extra` is the event's own list, matched anywhere. */
export function isBlockedName(name: string, extra: readonly string[] = []): boolean {
  const words = fold(name)
    .split(/[\s\-._']+/u)
    .map(plain)
    .filter(Boolean);
  const joined = collapse(words.join(""));
  const anywhere = [...ANYWHERE, ...extra.map(normalizeTerm).filter(Boolean)];
  return anywhere.some((t) => joined.includes(t)) || words.some((w) => WHOLE_WORDS.has(w));
}
