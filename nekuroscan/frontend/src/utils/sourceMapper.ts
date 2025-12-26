/**
 * SOURCE MAPPER - Mapping source names per white-label URLs
 * Converte source reali ↔ codici anonimi
 */

import type { MangaSource } from '@/types/manga';
import type { SourceCode } from '@/config/sources';

// ========== TYPES ==========

type SourceMap = Record<MangaSource, SourceCode>;
type ReverseMap = Record<SourceCode, MangaSource>;

// ========== MAPS ==========

const SOURCE_MAP: SourceMap = {
  'mangaWorld': 'm',
  'mangaWorldAdult': 'ma'
} as const;

const REVERSE_MAP: ReverseMap = {
  'm': 'mangaWorld',
  'ma': 'mangaWorldAdult'
} as const;

// ========== FUNCTIONS ==========

export const encodeSource = (source: MangaSource): SourceCode => {
  return SOURCE_MAP[source] ?? source as SourceCode;
};

export const decodeSource = (encodedSource: SourceCode): MangaSource => {
  return REVERSE_MAP[encodedSource] ?? encodedSource as MangaSource;
};

export default { encodeSource, decodeSource };

