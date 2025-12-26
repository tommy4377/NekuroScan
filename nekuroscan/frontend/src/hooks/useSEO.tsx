/**
 * USE SEO - Dynamic SEO management with React Helmet
 * Provides comprehensive meta tags for all pages
 */

import { Helmet } from 'react-helmet-async';

// ========== TYPES ==========

interface SEOOptions {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article' | 'profile';
  keywords?: string[];
  author?: string;
  noindex?: boolean;
  canonicalUrl?: string;
}

interface MangaSEO {
  title: string;
  plot?: string;
  coverUrl?: string;
  chaptersNumber?: number;
  genres?: string[];
  authors?: string[];
  type?: string;
  status?: string;
  source: string;
  url: string;
}

// ========== CONSTANTS ==========

const SITE_NAME = 'NeKuro Scan';
const BASE_URL = 'https://nekuro-scan.vercel.app';
const DEFAULT_IMAGE = `${BASE_URL}/web-app-manifest-512x512.webp`;

// ========== HOOK ==========

export const useSEO = ({
  title,
  description,
  image,
  url,
  type = 'website',
  keywords = [],
  author,
  noindex = false,
  canonicalUrl
}: SEOOptions) => {
  const fullTitle = title 
    ? `${title} | ${SITE_NAME}`
    : `${SITE_NAME} - Manga Reader Online Gratuito`;
  
  const fullUrl = url ? `${BASE_URL}${url}` : BASE_URL;
  const canonical = canonicalUrl || fullUrl;
  
  const fullImage = image && image.startsWith('http') 
    ? image 
    : image 
      ? `${BASE_URL}${image}`
      : DEFAULT_IMAGE;
  
  const finalDescription = description || 
    'Leggi manga, manhwa e light novel gratuitamente. Migliaia di titoli disponibili con lettore avanzato e modalità offline.';
  
  const allKeywords = [
    'manga',
    'manhwa', 
    'manhua',
    'lettore manga',
    'manga online',
    'light novel',
    ...keywords
  ].join(', ');

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={allKeywords} />
      {author && <meta name="author" content={author} />}
      
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}
      
      <link rel="canonical" href={canonical} />
      
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title || SITE_NAME} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="it_IT" />
      
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={fullImage} />
      <meta name="twitter:image:alt" content={title || SITE_NAME} />
    </Helmet>
  );
};

// ========== TEMPLATES ==========

export const SEOTemplates = {
  manga: (manga: MangaSEO): SEOOptions => ({
    title: manga.title,
    description: `Leggi ${manga.title} su NeKuro Scan. ${manga.plot ? manga.plot.substring(0, 150) + '...' : `${manga.chaptersNumber || 0} capitoli disponibili.`} Generi: ${manga.genres?.join(', ') || 'Manga'}.`,
    image: manga.coverUrl,
    url: `/manga/${manga.source}/${btoa(manga.url).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}`,
    type: 'article',
    keywords: [
      manga.title,
      ...(manga.genres || []),
      ...(manga.authors || []),
      manga.type || 'Manga',
      manga.status || ''
    ].filter(Boolean),
    author: manga.authors?.join(', ')
  }),
  
  category: (categoryName: string): SEOOptions => ({
    title: `${categoryName.charAt(0).toUpperCase() + categoryName.slice(1)} - Manga`,
    description: `Scopri i migliori manga ${categoryName} su NeKuro Scan. Leggi gratuitamente migliaia di titoli ${categoryName}.`,
    url: `/categories?category=${categoryName}`,
    keywords: [categoryName, `manga ${categoryName}`, `${categoryName} online`]
  }),
  
  search: (query: string, resultsCount: number): SEOOptions => ({
    title: `Ricerca: ${query}`,
    description: `Risultati ricerca per "${query}" su NeKuro Scan. ${resultsCount} manga trovati.`,
    url: `/search?q=${encodeURIComponent(query)}`,
    keywords: [query, 'ricerca manga', 'cerca manga'],
    noindex: true
  }),
  
  latest: (): SEOOptions => ({
    title: 'Ultimi Capitoli Aggiunti',
    description: 'Scopri gli ultimi capitoli manga pubblicati su NeKuro Scan. Aggiornamenti quotidiani con i nuovi capitoli dei tuoi manga preferiti.',
    url: '/latest',
    keywords: ['ultimi capitoli', 'nuovi capitoli', 'aggiornamenti manga', 'manga recenti']
  }),
  
  popular: (): SEOOptions => ({
    title: 'Manga Più Popolari',
    description: 'I manga più letti e popolari su NeKuro Scan. Scopri cosa leggono gli altri utenti e trova il tuo prossimo manga preferito.',
    url: '/popular',
    keywords: ['manga popolari', 'più letti', 'top manga', 'migliori manga']
  }),
  
  trending: (): SEOOptions => ({
    title: 'Manga di Tendenza',
    description: 'I manga più trendy del momento su NeKuro Scan. Scopri le serie più discusse e seguite della settimana.',
    url: '/trending',
    keywords: ['manga trending', 'tendenze', 'hot manga', 'manga del momento']
  }),
  
  profile: (username: string, isPublic: boolean): SEOOptions => ({
    title: `Profilo di ${username}`,
    description: isPublic 
      ? `Profilo pubblico di ${username} su NeKuro Scan. Scopri i manga preferiti e la libreria di ${username}.`
      : `Profilo privato di ${username}`,
    url: `/user/${username}`,
    noindex: !isPublic,
    keywords: isPublic ? ['profilo utente', username, 'lista manga'] : []
  }),
  
  library: (): SEOOptions => ({
    title: 'La Mia Libreria',
    description: 'Gestisci la tua libreria personale di manga. Tieni traccia dei manga che stai leggendo, completati e abbandonati.',
    url: '/library',
    noindex: true
  }),
  
  settings: (): SEOOptions => ({
    title: 'Impostazioni',
    description: 'Personalizza la tua esperienza su NeKuro Scan. Gestisci account, preferenze e notifiche.',
    url: '/settings',
    noindex: true
  }),
  
  chapter: (mangaTitle: string, chapterNumber: string | number): SEOOptions => ({
    title: `${mangaTitle} - Capitolo ${chapterNumber}`,
    description: `Leggi ${mangaTitle} Capitolo ${chapterNumber} online su NeKuro Scan. Lettore manga gratuito e ottimizzato.`,
    url: `/read/${chapterNumber}`,
    type: 'article',
    keywords: [mangaTitle, `capitolo ${chapterNumber}`, 'leggi manga online', 'lettore manga']
  })
};

export default useSEO;

