/**
 * lib/communityRecommendations.js
 *
 * Curated list of popular community Stremio addons for discovery.
 * Includes metadata for display and search capabilities.
 */

/**
 * @typedef {object} CommunityAddon
 * @property {string} id           Unique identifier
 * @property {string} name         Human-readable name
 * @property {string} transportUrl The addon's transport URL
 * @property {string} description  Short description of what the addon does
 * @property {string} type         Primary addon type (e.g. 'subtitle', 'torrent', 'debrid')
 * @property {string[]} categories Tags for grouping/filtering
 */

/**
 * Curated list of popular Stremio addons.
 * @type {CommunityAddon[]}
 */
const RECOMMENDED_ADDONS = [
  {
    id: 'community.opensubtitles',
    name: 'OpenSubtitles',
    transportUrl: 'https://opensubtitles.strem.io',
    description: 'Official OpenSubtitles addon providing high-quality subtitles in multiple languages for movies and TV shows.',
    type: 'subtitle',
    categories: ['subtitle', 'official', 'popular'],
  },
  {
    id: 'community.debrid-stream',
    name: 'Debrid-Stream',
    transportUrl: 'https://debrid-stream.strem.io',
    description: 'Integrates with Real-Debrid, AllDebrid, and other debrid services to stream premium cached torrents instantly.',
    type: 'debrid',
    categories: ['debrid', 'streaming', 'premium'],
  },
  {
    id: 'community.torrentio',
    name: 'Torrentio',
    transportUrl: 'https://torrentio.strem.io',
    description: 'Scrapes popular torrent sites for high-quality streams with support for debrid services and filtering by quality and size.',
    type: 'torrent',
    categories: ['torrent', 'streaming', 'popular'],
  },
  {
    id: 'community.fanart',
    name: 'FanArt.tv',
    transportUrl: 'https://fanart.strem.io',
    description: 'Provides high-resolution fan artwork, posters, logos, and banners for movies and TV shows from FanArt.tv.',
    type: 'metadata',
    categories: ['metadata', 'artwork', 'official'],
  },
  {
    id: 'community.anime',
    name: 'Anime Kitsu',
    transportUrl: 'https://anime-kitsu.strem.io',
    description: 'Comprehensive anime catalog with metadata, posters, and streaming links sourced from Kitsu database.',
    type: 'metadata',
    categories: ['metadata', 'anime', 'catalog'],
  },
  {
    id: 'community.cinemeta',
    name: 'Cinemeta',
    transportUrl: 'https://v3-cinemeta.strem.io',
    description: 'Default Stremio metadata addon providing rich movie and series information, posters, and background art.',
    type: 'metadata',
    categories: ['metadata', 'official', 'default'],
  },
  {
    id: 'community.watchhub',
    name: 'WatchHub',
    transportUrl: 'https://watchhub.strem.io',
    description: 'Aggregates streaming sources from multiple providers with quality sorting, language filters, and debrid support.',
    type: 'streaming',
    categories: ['streaming', 'aggregator', 'popular'],
  },
  {
    id: 'community.commafeed',
    name: 'Commafeed RSS',
    transportUrl: 'https://commafeed.strem.io',
    description: 'RSS feed reader addon that lets you subscribe to and browse RSS/Atom feeds within Stremio.',
    type: 'other',
    categories: ['rss', 'utility'],
  },
  {
    id: 'community.i18n',
    name: 'I18N Subtitles',
    transportUrl: 'https://i18n-subtitles.strem.io',
    description: 'Machine-translated subtitles powered by Google Translate for virtually any language pair.',
    type: 'subtitle',
    categories: ['subtitle', 'translation'],
  },
  {
    id: 'community.youtube',
    name: 'YouTube',
    transportUrl: 'https://youtube.strem.io',
    description: 'Browse and watch YouTube videos and channels directly within Stremio with full search support.',
    type: 'streaming',
    categories: ['streaming', 'video', 'official'],
  },
  {
    id: 'community.tubi',
    name: 'Tubi TV',
    transportUrl: 'https://tubi.strem.io',
    description: 'Free, legal streaming from Tubi\'s extensive library of movies and TV shows with ad-supported viewing.',
    type: 'streaming',
    categories: ['streaming', 'free', 'official'],
  },
  {
    id: 'community.sports',
    name: 'Sports Central',
    transportUrl: 'https://sports-central.strem.io',
    description: 'Aggregates live sports streams, schedules, and VOD replays from various free sports sources.',
    type: 'streaming',
    categories: ['streaming', 'sports', 'live'],
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
