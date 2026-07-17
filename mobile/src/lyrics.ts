// Lyrics line classification.
//
// Ported from renderLyrics() (index.html:921) — but with one deliberate difference:
// the web app never detects chord lines. isChord() exists at index.html:1013 and is
// never called, and the .cl chord style is defined in CSS but never emitted, so chord
// lines currently render as ordinary lyrics. Here that regex is actually wired up.
// See MOBILE_APP_PLAN.md §1 "Chord handling".

export type LineKind = 'section' | 'chord' | 'gap' | 'lyric';

const CHORD_RE = /^[A-G][#b]?(m|maj|min|dim|aug|sus|add)?[0-9]*(\/[A-G][#b]?)?$/;

/** index.html:1013, verbatim: a line is chords if >=60% of its tokens parse as chords. */
export function isChordLine(line: string): boolean {
  if (!line || line.length > 80) return false;
  const words = line.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return false;
  return words.filter((w) => CHORD_RE.test(w)).length >= words.length * 0.6;
}

export function classifyLine(line: string): LineKind {
  const t = line.trim();
  if (!t) return 'gap';
  if (/^\[.+\]$/.test(t)) return 'section';
  if (isChordLine(t)) return 'chord';
  return 'lyric';
}

export type Line = { key: string; kind: LineKind; text: string };

export function parseLyrics(lyrics: string): Line[] {
  return lyrics.split('\n').map((raw, i) => ({
    key: String(i),
    kind: classifyLine(raw),
    // chord lines keep their leading whitespace — it's what aligns chords over syllables
    text: classifyLine(raw) === 'chord' ? raw.replace(/\s+$/, '') : raw.trim(),
  }));
}
