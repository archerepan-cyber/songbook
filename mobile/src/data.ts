// Seed data copied from index.html:623-638 (defPL / defSongs).
//
// NOTE ON THE MODEL: the web app links songs to playlists by NAME (song.playlist = 'Рок')
// and implements favourites by duplicating the whole song row with a '__fav__' id prefix.
// Both are carried over here ONLY so the prototype matches what you see today.
// The real port replaces them with playlist_id FKs + a join table — see MOBILE_APP_PLAN.md §1.

export type Song = {
  id: string;
  title: string;
  artist: string;
  key: string; // free text, e.g. 'Am-G-Em-C' — never parsed
  instr: 'Guitar' | 'Piano' | 'Both';
  playlist: string; // playlist NAME, not id (see above)
  lyrics: string;
};

export type Playlist = {
  id: string;
  name: string;
  desc: string;
  emoji: string;
  color: string;
};

export const PLAYLISTS: Playlist[] = [
  { id: 'p1', name: 'Рок', desc: 'Список с новыми композициями', emoji: '🎸', color: '#e8375a' },
  { id: 'p2', name: 'Популярные', desc: 'Список всех музыкантов и исполнителей', emoji: '🎤', color: '#ff6b35' },
  { id: 'p3', name: 'Иностранные', desc: 'Песня для начинающих музыкантов', emoji: '🌍', color: '#0a84ff' },
  { id: 'p4', name: 'Новый Плейлист 1', desc: 'Песни, которые часто звучат на каналах', emoji: '🎵', color: '#30d158' },
  { id: 'p5', name: 'Новый Плейлист 2', desc: 'Музыка для маленьких детей', emoji: '🎀', color: '#bf5af2' },
  { id: 'p6', name: 'Лаунж', desc: 'Песни, которые часто играются на радио', emoji: '🎹', color: '#ff9f0a' },
  { id: 'p7', name: 'Танцевальные', desc: 'Список всех музыкантов, играющих на органе', emoji: '💃', color: '#ff375f' },
];

export const SONGS: Song[] = [
  {
    id: 's1',
    title: 'Wonderwall',
    artist: 'Oasis',
    key: 'Am-G-Em-C',
    instr: 'Guitar',
    playlist: 'Рок',
    lyrics: `[Куплет 1]
Am            G
Today is gonna be the day
Em                     Am
That they're gonna throw it back to you
By now you should've somehow
Realised what you gotta do

[Припев]
C                G
And all the roads we have to walk are winding
Am              G
And all the lights that lead us there are blinding

[Финал]
Maybe, you're gonna be the one that saves me
And after all, you're my Wonderwall`,
  },
  {
    id: 's2',
    title: 'Let Her Go',
    artist: 'Passenger',
    key: 'G-D-Em-C',
    instr: 'Guitar',
    playlist: 'Популярные',
    lyrics: `[Куплет]
G                    D
Well, you only need the light
Em              C
When it's burning low
Only miss the sun when it starts to snow

[Припев]
And you let her go`,
  },
  {
    id: 's3',
    title: 'Skinny Love',
    artist: 'Bon Iver',
    key: 'Am-C-F-G',
    instr: 'Piano',
    playlist: 'Лаунж',
    lyrics: `[Куплет]
Come on skinny love, just last the year
Pour a little salt, we were never here

[Припев]
My, my, my, my...
Staring at the sink of blood`,
  },
  {
    id: 's4',
    title: 'The Night We Met',
    artist: 'Lord Huron',
    key: 'Dm-Bb-F-C',
    instr: 'Guitar',
    playlist: 'Иностранные',
    lyrics: `[Куплет]
Dm              Bb
I had all and then most of you
F               C
Take me back to the night we met

[Припев]
I don't know what I'm supposed to do
Haunted by the ghost of you`,
  },
  {
    id: 's5',
    title: 'Clair de Lune',
    artist: 'Debussy',
    key: 'Db-Ab-Gb-Bbm',
    instr: 'Piano',
    playlist: 'Лаунж',
    lyrics: `[Тема A]
Andante très expressif ♩=60

[Развитие]
Crescendo — нарастание
Forte — кульминация

[Реприза]
Pianissimo — Morendo`,
  },
];

/** Russian plural forms — index.html hand-rolls this; Intl does it properly. */
const PR = new Intl.PluralRules('ru-RU');
export function songCount(n: number): string {
  const form = PR.select(n);
  const word = form === 'one' ? 'песня' : form === 'few' ? 'песни' : 'песен';
  return `${n} ${word}`;
}
