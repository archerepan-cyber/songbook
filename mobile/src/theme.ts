// Palette lifted from index.html:14 — the live iOS-dark tokens.
// NOT the #1a0a2e purple in manifest.json, which is stale (see MOBILE_APP_PLAN.md §1).

export const C = {
  bg: '#121212',
  bg2: '#1c1c1e',
  bg3: '#2c2c2e',
  bg4: '#3a3a3c',

  text: '#ffffff',
  text2: 'rgba(235,235,245,0.8)',
  text3: 'rgba(235,235,245,0.6)',

  accent: '#0a84ff', // iOS blue
  accent2: '#30d158', // green
  red: '#ff453a',

  section: '#ff9f0a', // [Куплет 1] labels
  chord: '#64d2ff', // the .cl class the web app styles but never emits
  playing: '#1db954', // Spotify green, prompter active
  fav: '#e8375a',

  sep: 'rgba(255,255,255,0.1)',
} as const;

export const TAB_H = 50;
