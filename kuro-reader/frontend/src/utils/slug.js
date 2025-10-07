// Utilità per gestire slug e mappature locali

export function toSlug(title) {
  if (!title) return '';
  return title
    .toString()
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 80);
}

export function getSlugMap() {
  try {
    return JSON.parse(localStorage.getItem('slugMap') || '{}');
  } catch {
    return {};
  }
}

export function saveSlugMap(map) {
  localStorage.setItem('slugMap', JSON.stringify(map));
}

export function registerMangaSlug(manga) {
  if (!manga?.title || !manga?.url) return null;
  const slug = toSlug(manga.title);
  const map = getSlugMap();
  map[slug] = {
    title: manga.title,
    cover: manga.cover || manga.coverUrl,
    source: manga.source || (manga.isAdult ? 'mangaWorldAdult' : 'mangaWorld'),
    mangaUrl: manga.url,
    chapters: manga.chapters || []
  };
  saveSlugMap(map);
  return slug;
}

export function updateChaptersForSlug(slug, chapters) {
  const map = getSlugMap();
  if (!map[slug]) return;
  map[slug].chapters = chapters || [];
  saveSlugMap(map);
}

export function getBySlug(slug) {
  const map = getSlugMap();
  return map[slug] || null;
}

export function getChapterUrlByIndex(slug, chapterIndex) {
  const entry = getBySlug(slug);
  if (!entry) return null;
  const chapter = entry.chapters?.[chapterIndex];
  return chapter?.url || null;
}


