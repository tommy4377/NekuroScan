// Mappa source reali → codici anonimi per URL (white-label)
const SOURCE_MAP = {
  'mangaWorld': 'm',
  'mangaWorldAdult': 'ma'
};

const REVERSE_MAP = {
  'm': 'mangaWorld',
  'ma': 'mangaWorldAdult'
};

export const encodeSource = (source) => {
  return SOURCE_MAP[source] || source;
};

export const decodeSource = (encodedSource) => {
  return REVERSE_MAP[encodedSource] || encodedSource;
};

export default { encodeSource, decodeSource };

