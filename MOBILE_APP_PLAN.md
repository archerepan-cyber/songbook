# Mobile App Plan — «Мой сборник»

Porting the existing PWA (`index.html`, 2300 lines, zero dependencies) to a native
iOS + Android app with cloud sync.

**Decisions taken:** React Native / Expo · App Store + Google Play · cloud sync across devices.

---

## 1. What the web app actually does today

Verified by reading `index.html`. This is the parity checklist.

### Screens
| Screen | id | Purpose |
|---|---|---|
| Playlists | `scr-pl` | Playlist grid + "Песни без плейлиста" (loose songs) |
| Repertoire | `scr-rep` | Flat list of all songs, searchable |
| Songs | `scr-songs` | Songs within one playlist (`filterPl` holds the playlist **name**) |
| Internet search | `scr-inet` | lrclib.net search, history, batch import |
| Song view | `scr-detail` | Lyrics, prompter, pinch zoom, inline edit |
| Settings | `scr-settings` | Background colour/image + darkening overlay |

Plus 4 modals: `#choiceModal`, `#modal` (add/edit form), `#assignModal` (long-press
menu), `#batchModal`. Navigation is `show(id)` toggling `.screen.active`, with a manual
`curScr` / `prevScr` / `prevPrevScr` back-chain — no hash routing, no History API.

### Features
- Playlist CRUD — emoji, colour, description, cover image
- Song CRUD, assign to playlist, long-press context menus (`lpStart` 900ms / `plLpStart` 1000ms)
- Favourites (`toggleFav`)
- **Drag & drop reorder** — 500ms long-press, `navigator.vibrate(40)`, floating ghost clone,
  edge auto-scroll. ~145 lines. Works on playlists and both song lists.
- **Prompter / autoscroll** (`startScroll`, `changeSpd`) — `setInterval` 30ms, sub-pixel
  accumulator, speed 1–10, auto-stops at the bottom
- **Pinch-to-zoom** lyrics 1.0×–3.0× (`sb_zoom`), focal-point preservation, weight
  interpolation, snap-back below 1.08
- Custom background: 11 presets, colour picker, gallery image, darkening slider (`sb_bg`)
- Lyrics auto-format (`autoFormatLyrics`) — labels `[Куплет 1]`, `[Припев]` etc.
- Online lyrics search via **lrclib.net** (no key, no rate-limit handling), batch import
  (300ms throttle, progress, cancel-with-rollback), search history (`HIST_KEY`)
- Cover art via **iTunes Search API** — live inside `inetSearch` (`100x100`→`600x600`);
  songs otherwise inherit the playlist cover via `sCover()`
- Copy repertoire / playlist to clipboard
- **Context-switching tab bar**: outside detail → 4 nav tabs; inside detail → Плейлист /
  Суфлёр / Скорость. Distinctive; worth keeping.
- **Swipe navigation** between tabs (>50px) and swipe-right to go back

### Not present (don't assume parity requires them)
No transposition · no capo · no metronome · no tuner · no chord diagrams ·
no export/backup · no print · no light theme · no tags/categories (the `.tag/.tk/.tg/.tp`
CSS exists but nothing renders it) · **no chord rendering at all** (see below) ·
search covers title + artist only, never lyrics.

### Data model
```js
const SK='sb_s_v6', PK='sb_p_v6', FK='sb_f_v6';

song     { id, title, artist, key, instr:'Guitar', playlist:<name string>, lyrics, cover }
playlist { id, name, desc, emoji, color, img }
favs     Set<songId>          // persisted as an array
```
Other keys: `sb_zoom`, `sb_bg`, search-history key.

### Chord handling — read this before estimating anything

**Chords are never parsed.** `renderLyrics()` classifies each line by regex only:
`/^\[.+\]$/` → orange section label; empty → spacer; **everything else → plain lyric line.**

- `isChord()` (line 1013) is a complete, working chord regex — and is **never called**.
- The `.cl` class (monospace cyan `#64d2ff` chord line) is styled in CSS and referenced in
  `applyZoom()` — but `renderLyrics()` **never emits it**.

So chord lines sitting inside `lyrics` render as ordinary text today. The only chord UI is
the free-text `key` string (`"Am-G-Em-C"`) in the header bar, which is never tokenized.

**Consequence:** real chord rendering, transposition and diagrams are net-new features, not
ports. But `isChord`'s regex plus the orphaned `.cl` styling tell you exactly what the
original design intended — that's a head start, not a blocker.

### Known defects to fix in the port, not carry over
1. **`song.playlist` stores a playlist *name*, not an id.** Renaming forces a fan-out write
   over every song (line 1575). The cloud schema must use a real foreign key.
2. **A song belongs to exactly one playlist** (`playlist` is a scalar). Almost certainly
   wrong for real use — the same song lives in several sets. Use a join table.
3. **Favourites duplicate the entire song object.** `toggleFav()` adds the id to `favs` *and*
   pushes a full copy `{...orig, id:'__fav__'+origId, playlist:'Избранное'}` into `songs`.
   The song now exists twice, edits to the original don't propagate to the copy, and every
   list render must filter `!s.id.startsWith('__fav__')`. Model as a flag or join table.
4. **The AI lyrics formatter is dead code.** `autoFormatLyrics` is defined twice —
   async+Anthropic at line 960, sync+regex at line 1182. Declarations hoist and the later
   wins, so the AI path is unreachable. It would have failed anyway: no API key, and
   browsers can't call `api.anthropic.com` (CORS). `ИНСТРУКЦИЯ.txt` still instructs users to
   set `ANTHROPIC_API_KEY` for it. Treat AI formatting as **unimplemented**.
5. **`netlify.toml` redirects `/api/search` to a Netlify function that doesn't exist**, and
   nothing ever calls `/api/search`. Dead config.
6. **Covers and backgrounds are base64 data-URLs in `localStorage`** — the ~5 MB quota will
   be hit, and `sv()` swallows the exception, so saves fail *silently*. On mobile they
   belong in a storage bucket, referenced by URL.
7. `/home/stissshak/Documents/songbook/songbook` is a **stale artifact** — `ИНСТРУКЦИЯ.txt`
   concatenated with an older full copy of the app. `index.html` is the source of truth.
   Delete it, or it will get ported by mistake.
8. **Other dead code — don't port, don't be misled by it:**
   - `openTitleEdit`/`closeTitleEdit`/`saveTitle`/`openArtistEdit`/`closeArtistEdit`/
     `saveArtist` (`:1721-1726`) — empty stubs
   - `fetchCoverArt()` (`:1588`) — fully written, **never wired to any input**
   - `isChord()` (`:1013`) — works, never called
   - `quickImp()`, `toggleLyricsEdit()` — orphaned
   - `saveLyricsEdit()` — unreachable; `#lyricsEditWrap` is empty
   - `mep*` cover functions — reference `mepCoverPreview`, which isn't in the DOM
   - `.s-tags` markup renders on every song row but is always empty
   - `slide-in-right` etc. are referenced in `show()` but never defined in CSS
9. Autoscroll speed (`curSpd`) is **not persisted** — resets to 3 on every reload. Worth
   fixing in the port; it's a per-song property in practice (a ballad and a fast song want
   different speeds), so store it on the song row alongside `bpm`.

---

## 2. Target architecture

```
Expo (latest SDK) + expo-router      file-based navigation
expo-sqlite                          local source of truth, offline-first
Legend-State v3 + Supabase plugin    observable state + sync engine
Supabase                             Postgres + Auth + Storage + RLS
```

**Why local-first:** a songbook must open instantly on a stage with no signal. The device
DB is authoritative; sync is a background reconciler, never a read path.

**Why Legend-State over alternatives:** PowerSync is purpose-built but priced for teams;
WatermelonDB's sync is DIY; plain TanStack Query leaves conflict resolution to you.
Legend-State's Supabase plugin gives last-write-wins on `updated_at` out of the box, which
is exactly right for a single-user-multi-device app.

### Schema (Supabase)
```sql
profiles(id uuid pk → auth.users, display_name, created_at)
playlists(id uuid pk, user_id uuid, name, description, emoji, color, cover_url,
          sort_order int, updated_at, deleted_at)
songs(id uuid pk, user_id uuid, title, artist, song_key text, instrument,
      lyrics text, cover_url, updated_at, deleted_at)
playlist_songs(playlist_id, song_id, position int, primary key(playlist_id, song_id))
favorites(user_id, song_id, primary key(user_id, song_id))
```
- RLS on every table: `auth.uid() = user_id`.
- `deleted_at` soft deletes — a hard delete can't propagate to an offline device.
- `updated_at` maintained by trigger, drives last-write-wins.
- Covers → Supabase Storage bucket, per-user prefix.

### Migration from the web app
One-time importer: read `sb_s_v6` / `sb_p_v6` / `sb_f_v6`, resolve `song.playlist`
name→id against playlists, emit `playlist_songs` rows, upload `cover`/`img` data-URLs to
Storage. Ship it as a "Import from web version" screen that accepts a pasted JSON blob, and
add an export button to the PWA to produce it.

---

## 3. Phases

### Phase 0 — Foundations (~3 days)
Expo app scaffold, expo-router, TypeScript, design tokens, EAS Build for both platforms,
dev build on a real device.

**Design tokens — the app is Apple-style dark, _not_ purple.** The `#1a0a2e` purple in
`manifest.json` is a leftover from an older design and only ever shows on the PWA splash
screen; don't build the native theme around it.
```
--bg:#121212   --bg2:#1c1c1e   --bg3:#2c2c2e   --bg4:#3a3a3c
--text:#fff    --text2:rgba(235,235,245,.8)    --text3:rgba(235,235,245,.6)
--accent:#0a84ff (iOS blue)   --accent2:#30d158   --red:#ff453a
--sep:rgba(255,255,255,.1)
section labels #ff9f0a · chords #64d2ff · playing #1db954 · fav/rock #e8375a
```
Deliberately Spotify/Apple-Music-like: 62px playlist covers, 52px song covers, 10–12px
radii, 0.5px hairline separators, `backdrop-filter: blur(24px)` tab bar, bottom sheets with
a drag handle. Safe-area insets throughout.

**Exit:** blank themed app installs on your iPhone and an Android device.

### Phase 1 — Local feature parity (~2–3 weeks) ← the bulk of the work
Local SQLite + Legend-State, no network. Port in this order:

1. Playlist grid + CRUD (emoji/colour/cover picker). Note the song counts use Russian
   plural forms (`песня` / `песни` / `песен`) — hand-rolled in the PWA; use
   `Intl.PluralRules('ru')` natively rather than porting the branching.
2. Song list + CRUD + assign to playlists (now many-to-many)
3. **Song view** — the heart of the app:
   - Lyrics renderer — port the `renderLyrics()` line classification (section label /
     spacer / lyric). Chord lines stay plain text for now; see Phase 4.
   - Prompter: `react-native-reanimated` driving a scroll offset. Do **not** port the
     `setInterval` approach — use a shared value + `scrollTo` on the UI thread, or it will
     stutter. Keep the *pacing curve*, which is real tuned domain logic:
     `boost = spd > 6 ? spd*0.10 : spd*0.08` per 30ms tick, speed 1–10, default 3
     (≈8 px/s at speed 3, superlinear above 6). The sub-pixel accumulator exists only
     because `scrollTop` is integer — a float offset makes it unnecessary.
   - `expo-keep-awake` — non-negotiable for a songbook, screen must not sleep mid-song
   - Pinch-to-zoom via `react-native-gesture-handler`, background customisation
4. Repertoire + search
5. Favourites — **redesign as a flag/join table**, do not port the duplication model
6. Drag & drop reorder → a native reorderable list (e.g. `react-native-draggable-flatlist`).
   Delete the 145-line ghost-clone IIFE outright.
7. Long-press menus → `expo-haptics` + native context menus
8. Lyrics auto-format (port the live line-1182 regex version; ignore the dead AI one)

**Delete rather than port** — roughly 40% of the JS is web-platform workaround that has no
native equivalent: `updateChordsOverlays()` (~45 lines, exists purely to defeat CSS
`transform` hit-testing), the manual swipe-detection IIFE (~57), the drag ghost (~145),
`applyZoom`'s transform maths (~56), viewport-meta juggling to stop iOS input zoom.

The genuine domain logic — data model, `autoFormatLyrics`, `renderLyrics` classification,
lrclib/iTunes calls, autoscroll timing, batch import — is only **~400 lines**. The native
effort is UI, not logic.

**Exit:** the app does everything the PWA does, offline, with no account.

### Phase 2 — Backend + sync (~1.5–2 weeks)
Supabase project, schema + RLS, Sign in with Apple + Google + email, Legend-State sync
config, Storage for covers, the web-import screen, conflict/offline testing (airplane mode
on two devices, edit both, reconcile).

**Exit:** edit on the phone, see it on the tablet.

### Phase 3 — Online search (~4 days)
Port lrclib.net lyrics search, batch import, search history, iTunes cover art.
Route third-party calls through a Supabase Edge Function rather than calling them from the
client — keeps keys server-side and lets you swap providers without an app release.
See the copyright note in §4 before committing to lrclib.

### Phase 4 — Native wins the PWA can't do (~1 week, optional but high value)
Ranked by value/effort:
1. **Real chord rendering + transposition + capo.** Bigger than it first looks, because
   chord rendering doesn't exist yet (§1). Three steps: emit chord lines as `.cl` using the
   orphaned `isChord()` regex → tokenize them → transpose (~40 lines once tokenized).
   Biggest single feature gap for a guitarist, and the original design clearly intended it.
2. **Metronome** — `expo-audio`, tempo per song (add a `bpm` column now, in Phase 2, so you
   don't migrate twice).
3. Share sheet, Handoff, home-screen widget for a "next gig" setlist.
4. Tuner (mic + pitch detection) — genuinely hard, cut unless you want it.

### Phase 5 — Store release (~1 week + review latency)
Icons/splash from existing `icons/`, screenshots, privacy policy (mandatory — you collect
accounts), App Privacy + Data Safety forms, **in-app account deletion** (required by both
stores), TestFlight + internal testing track, submit.

---

## 4. Risks

| Risk | Mitigation |
|---|---|
| **Lyrics copyright.** Shipping an app that fetches full lyrics from lrclib to the App Store is a plausible review rejection and a real legal question — a personal PWA and a listed app are not the same exposure. | Get clarity before Phase 3. Safest: user pastes their own lyrics; search is a convenience you may have to drop. |
| Apple requires Sign in with Apple if you offer Google sign-in | Ship both in Phase 2, not later |
| Prompter smoothness — JS-thread scrolling stutters | Reanimated UI-thread animation from day one |
| Sync conflicts on the same song from two devices | Last-write-wins on `updated_at`; acceptable single-user, document it |
| Scope creep from Phase 4 | Phases 0–2 are the product; 3–4 are upside |
| `$99/yr` Apple + `$25` Google | Budget before Phase 5 |

## 5. Effort

**~6–8 weeks part-time to a store-ready v1** (Phases 0–2 + 5), plus 1–2 weeks for 3–4.

Phase 1 dominates. Source is ~1680 lines JS / ~290 CSS / ~310 HTML, ~60 top-level
functions — but only ~400 lines are real domain logic, ~40% is web workaround to delete,
and the rest is UI that must be rewritten (`.screen.active` toggling and `innerHTML`
templating have no RN equivalent).

## 6. Recommended first step

Don't start with the scaffold. Start by **adding an export button to the PWA** that dumps
`sb_s_v6` / `sb_p_v6` / `sb_f_v6` as one JSON file. It's an hour of work, it's useful
immediately as a backup, it de-risks the whole migration, and it gives Phase 1 real test
data instead of the five hardcoded demo songs.
