// Dati di fallback quando i server non sono disponibili
export const fallbackManga = [
  {
    url: 'https://www.mangaworld.cx/manga/4393/i-ll-raise-you-well-in-this-life-your-majesty',
    title: "I'll Raise You Well in This Life, Your Majesty!",
    cover: 'https://www.mangaworld.cx/uploads/thumbs/cover_i-ll-raise-you-well-in-this-life-your-majesty.jpg',
    source: 'mangaWorld',
    type: 'manga',
    isAdult: false,
    isRecent: true
  },
  {
    url: 'https://www.mangaworld.cx/manga/2485/dandadan',
    title: 'Dandadan',
    cover: 'https://www.mangaworld.cx/uploads/thumbs/cover_dandadan.jpg',
    source: 'mangaWorld',
    type: 'manga',
    isAdult: false,
    isTrending: true
  },
  {
    url: 'https://www.mangaworld.cx/manga/1/one-piece',
    title: 'One Piece',
    cover: 'https://www.mangaworld.cx/uploads/thumbs/cover_one-piece.jpg',
    source: 'mangaWorld',
    type: 'manga',
    isAdult: false,
    isTopManga: true
  },
  {
    url: 'https://www.mangaworld.cx/manga/2/attack-on-titan',
    title: 'Attack on Titan',
    cover: 'https://www.mangaworld.cx/uploads/thumbs/cover_attack-on-titan.jpg',
    source: 'mangaWorld',
    type: 'manga',
    isAdult: false,
    isTopManga: true
  },
  {
    url: 'https://www.mangaworld.cx/manga/3/demon-slayer',
    title: 'Demon Slayer',
    cover: 'https://www.mangaworld.cx/uploads/thumbs/cover_demon-slayer.jpg',
    source: 'mangaWorld',
    type: 'manga',
    isAdult: false,
    isTopManga: true
  },
  {
    url: 'https://www.mangaworld.cx/manga/4/jujutsu-kaisen',
    title: 'Jujutsu Kaisen',
    cover: 'https://www.mangaworld.cx/uploads/thumbs/cover_jujutsu-kaisen.jpg',
    source: 'mangaWorld',
    type: 'manga',
    isAdult: false,
    isTrending: true
  },
  {
    url: 'https://www.mangaworld.cx/manga/5/chainsaw-man',
    title: 'Chainsaw Man',
    cover: 'https://www.mangaworld.cx/uploads/thumbs/cover_chainsaw-man.jpg',
    source: 'mangaWorld',
    type: 'manga',
    isAdult: false,
    isTrending: true
  },
  {
    url: 'https://www.mangaworld.cx/manga/6/spy-x-family',
    title: 'Spy x Family',
    cover: 'https://www.mangaworld.cx/uploads/thumbs/cover_spy-x-family.jpg',
    source: 'mangaWorld',
    type: 'manga',
    isAdult: false,
    isRecent: true
  }
];

export const fallbackCategories = {
  'azione': fallbackManga.slice(0, 4),
  'romance': fallbackManga.slice(2, 6),
  'fantasy': fallbackManga.slice(1, 5),
  'horror': fallbackManga.slice(3, 7),
  'comedy': fallbackManga.slice(0, 3)
};
