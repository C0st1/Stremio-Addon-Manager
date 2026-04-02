/**
 * lib/communityRecommendations.js
 *
 * Popular community Stremio addons for discovery, sourced from
 * https://stremio-addons.net/addons (sorted by popularity).
 */

/**
 * @typedef {object} CommunityAddon
 * @property {string} id           Unique identifier
 * @property {string} name         Human-readable name
 * @property {string} transportUrl The addon's transport URL
 * @property {string} description  Short description of what the addon does
 * @property {string} type         Primary addon type (e.g. 'subtitle', 'torrent', 'debrid')
 * @property {string[]} types      Content types for tag display (movie, series, etc.)
 * @property {string[]} categories Tags for grouping/filtering
 */

/**
 * Curated list of the most popular Stremio addons from stremio-addons.net.
 * @type {CommunityAddon[]}
 */
const RECOMMENDED_ADDONS = [
  {
    id: 'popular.torrentio',
    name: 'Torrentio',
    transportUrl: 'https://torrentio.strem.fun',
    description: 'Provides torrent streams from scraped torrent providers. Supports YTS, EZTV, RARBG, 1337x, ThePirateBay, and more with RealDebrid/Premiumize/AllDebrid support.',
    type: 'torrent',
    types: ['movie', 'series', 'anime'],
    categories: ['torrent', 'streaming', 'popular', 'movie', 'series', 'anime'],
  },
  {
    id: 'popular.comet-elfhosted',
    name: 'Comet | ElfHosted',
    transportUrl: 'https://comet.stremio.ru/stremio',
    description: "Stremio's fastest torrent/debrid search add-on with comprehensive provider support.",
    type: 'torrent',
    types: ['movie', 'series', 'anime'],
    categories: ['torrent', 'streaming', 'popular', 'movie', 'series', 'anime'],
  },
  {
    id: 'popular.mediafusion-elfhosted',
    name: 'MediaFusion | ElfHosted',
    transportUrl: 'https://mediafusionfortheweebs.midnightignite.me',
    description: 'Open-source streaming platform for Movies, Series, and Live TV with extensive provider support.',
    type: 'streaming',
    types: ['movie', 'series', 'tv'],
    categories: ['streaming', 'popular', 'movie', 'series', 'tv', 'events'],
  },
  {
    id: 'popular.streaming-catalogs',
    name: 'Streaming Catalogs',
    transportUrl: 'https://7a82163c306e-stremio-netflix-catalog-addon.baby-beamup.club',
    description: 'Trending movies and series on Netflix, HBO Max, Disney+, Apple TV+ and more. Configure to choose your favourite services.',
    type: 'metadata',
    types: ['movie', 'series'],
    categories: ['metadata', 'catalog', 'popular', 'movie', 'series'],
  },
  {
    id: 'popular.aiostreams-elfhosted',
    name: 'AIOStreams | ElfHosted',
    transportUrl: 'https://aiostreams.elfhosted.com/stremio',
    description: 'Consolidates multiple Stremio addons and debrid services into a single, configurable addon with filtering, sorting, and proxy support.',
    type: 'streaming',
    types: ['movie', 'series'],
    categories: ['streaming', 'popular', 'movie', 'series'],
  },
  {
    id: 'popular.usa-tv',
    name: 'USA TV',
    transportUrl: 'https://848b3516657c-usatv.baby-beamup.club',
    description: "Access channels across local, news, sports, entertainment, premium, lifestyle, kids' shows, documentaries, and Latino programming.",
    type: 'streaming',
    types: ['tv'],
    categories: ['streaming', 'live', 'tv'],
  },
  {
    id: 'popular.tmdb-addon',
    name: 'The Movie Database Addon',
    transportUrl: 'https://94c8cb9f702d-tmdb-addon.baby-beamup.club',
    description: 'Rich metadata for movies and TV shows from TMDB, featuring customizable catalogs, multi-language support, favorites, watchlist, ratings, and IMDb integration.',
    type: 'metadata',
    types: ['movie', 'series'],
    categories: ['metadata', 'popular', 'movie', 'series'],
  },
  {
    id: 'popular.top-streaming',
    name: 'TOP Streaming',
    transportUrl: 'https://top-streaming.stream',
    description: 'Top 10 Catalog Lists from the main Streaming Platforms - Available Platforms: 40, Available Countries: 93.',
    type: 'metadata',
    types: ['movie', 'series'],
    categories: ['metadata', 'catalog', 'movie', 'series'],
  },
  {
    id: 'popular.thepiratebay-plus',
    name: 'ThePirateBay+',
    transportUrl: 'https://thepiratebay-plus.strem.fun',
    description: 'Search for movies, series and anime from ThePirateBay.',
    type: 'torrent',
    types: ['movie', 'series'],
    categories: ['torrent', 'streaming', 'movie', 'series'],
  },
  {
    id: 'popular.stremio-addons-catalog',
    name: 'stremio-addons.net',
    transportUrl: 'https://web.strem.io',
    description: 'Provides the Community Stremio Addons catalog from stremio-addons.net directly inside Stremio.',
    type: 'other',
    types: ['movie', 'series', 'tv'],
    categories: ['catalog', 'utility', 'movie', 'series', 'tv'],
  },
  {
    id: 'popular.opensubtitles-pro',
    name: 'opensubtitles PRO',
    transportUrl: 'https://opensubtitlesv3-pro.dexter21767.com',
    description: 'Ad-free and spam-free subtitles addon with comprehensive multi-language support.',
    type: 'subtitle',
    types: ['movie', 'series'],
    categories: ['subtitle', 'popular', 'movie', 'series'],
  },
  {
    id: 'popular.webstreamr',
    name: 'WebStreamr | Hayduk',
    transportUrl: 'https://webstreamr.hayd.uk',
    description: 'Provides HTTP URLs from streaming websites. Supports multiple languages including Albanian, German, Spanish, French, Hindi, Italian, and more.',
    type: 'streaming',
    types: ['movie', 'series'],
    categories: ['streaming', 'movie', 'series'],
  },
  {
    id: 'popular.torrentsdb',
    name: 'TorrentsDB',
    transportUrl: 'https://torrentsdb.com',
    description: 'Provides torrent streams from scraped torrent providers. Supports YTS, EZTV, 1337x, ThePirateBay, KickassTorrents, AnimeTosho, and more with debrid service support.',
    type: 'torrent',
    types: ['movie', 'series', 'anime'],
    categories: ['torrent', 'streaming', 'movie', 'series', 'anime'],
  },
  {
    id: 'popular.marvel',
    name: 'Marvel',
    transportUrl: 'https://addon-marvel.onrender.com',
    description: 'Watch the entire Marvel catalog! MCU and X-Men chronologically organized, Movies, Series, and Animations!',
    type: 'streaming',
    types: ['movie', 'series'],
    categories: ['streaming', 'catalog', 'movie', 'series'],
  },
  {
    id: 'popular.autostream',
    name: 'AutoStream',
    transportUrl: 'https://autostreamtest.onrender.com',
    description: 'Curated best-pick streams with optional debrid support and Nuvio direct-host integration.',
    type: 'streaming',
    types: ['movie', 'series'],
    categories: ['streaming', 'movie', 'series'],
  },
  {
    id: 'popular.filmwhisper',
    name: 'FilmWhisper',
    transportUrl: 'https://filmwhisper.dev',
    description: 'Find movies and TV using natural language queries powered by AI. Supports OpenAI, Gemini, Claude, DeepSeek and ALL Featherless.ai models.',
    type: 'streaming',
    types: ['movie', 'series'],
    categories: ['streaming', 'ai', 'movie', 'series'],
  },
  {
    id: 'popular.ilcorsaroviola',
    name: 'IlCorsaroViola',
    transportUrl: 'https://corsaro.stremio.dpdns.org',
    description: 'Italian streaming from UIndex, CorsaroNero DB, Knaben and Jackettio with optional Real-Debrid, Torbox and Alldebrid support.',
    type: 'torrent',
    types: ['movie', 'series', 'anime'],
    categories: ['torrent', 'streaming', 'movie', 'series', 'anime'],
  },
  {
    id: 'popular.streamvix-elfhosted',
    name: 'StreamViX | ElfHosted',
    transportUrl: 'https://streamvix.hayd.uk',
    description: 'StreamViX addon with Vixsrc, Guardaserie, Altadefinizione, AnimeUnity, AnimeSaturn, AnimeWorld, Eurostreaming, TV ed Eventi Live.',
    type: 'streaming',
    types: ['movie', 'series', 'tv', 'anime'],
    categories: ['streaming', 'movie', 'series', 'tv', 'anime'],
  },
  {
    id: 'popular.brazuca-torrents',
    name: 'Brazuca Torrents',
    transportUrl: 'https://94c8cb9f702d-brazuca-torrents.baby-beamup.club',
    description: 'Provides dubbed movie and series streams from Brazilian torrent providers. Supports ApacheTorrent, EraiRaws, NyaaSi, and more.',
    type: 'torrent',
    types: ['movie', 'series', 'anime'],
    categories: ['torrent', 'streaming', 'movie', 'series', 'anime'],
  },
  {
    id: 'popular.minha-tv',
    name: 'Minha TV',
    transportUrl: 'https://da5f663b4690-minhatv.baby-beamup.club',
    description: 'O Melhor do IPTV na sua TV — Best IPTV for your TV with extensive channel coverage.',
    type: 'streaming',
    types: ['tv'],
    categories: ['streaming', 'live', 'tv'],
  },
];

/**
 * Returns the full list of community-recommended addons.
 *
 * @returns {CommunityAddon[]}
 */
function getRecommendations() {
  return [...RECOMMENDED_ADDONS];
}

/**
 * Searches community recommendations by name or description.
 * Case-insensitive substring match.
 *
 * @param {string} query  The search query string
 * @returns {CommunityAddon[]} Matching addons
 */
function searchRecommendations(query) {
  if (!query || typeof query !== 'string') return [];

  const lower = query.toLowerCase().trim();
  if (!lower) return [...RECOMMENDED_ADDONS];

  return RECOMMENDED_ADDONS.filter(addon => {
    return (
      addon.name.toLowerCase().includes(lower) ||
      addon.description.toLowerCase().includes(lower) ||
      addon.type.toLowerCase().includes(lower) ||
      addon.categories.some(c => c.toLowerCase().includes(lower))
    );
  });
}

module.exports = { getRecommendations, searchRecommendations };
