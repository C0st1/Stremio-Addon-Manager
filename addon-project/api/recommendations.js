/**
 * api/recommendations.js
 * Vercel serverless function — returns community-curated addon recommendations.
 * Public endpoint (no auth required). No rate limit (read-only).
 *
 * GET:  returns all recommendations
 * POST: filters recommendations by query string
 */

const { setSecurityHeaders } = require('../lib/securityHeaders');
const { setPublicCors } = require('../lib/cors');

let getRecommendations, searchRecommendations;

try {
  const mod = require('../lib/communityRecommendations');
  getRecommendations = mod.getRecommendations;
  searchRecommendations = mod.searchRecommendations;
} catch {
  getRecommendations = null;
  searchRecommendations = null;
}

// Hardcoded fallback when lib/communityRecommendations.js is not available
const FALLBACK_RECOMMENDATIONS = [
  {
    name: 'OpenSubtitles',
    transportUrl: 'https://opensubtitles.strem.io',
    description: 'Subtitle addon with support for multiple languages from OpenSubtitles.org.',
    types: ['movie', 'series'],
    logo: 'https://opensubtitles.strem.io/logo.png',
  },
  {
    name: 'Torrentio',
    transportUrl: 'https://torrentio.strem.fun',
    description: 'Stream torrents directly in Stremio with debrid support.',
    types: ['movie', 'series'],
    logo: 'https://torrentio.strem.fun/logo.png',
  },
  {
    name: 'Debrid Media Manager',
    transportUrl: 'https://debrid-stremio.thrashy.io',
    description: 'Premium link support via Real-Debrid, AllDebrid, and other debrid services.',
    types: ['movie', 'series'],
    logo: 'https://debrid-stremio.thrashy.io/logo.png',
  },
  {
    name: 'YouTube',
    transportUrl: 'https://youtube.strem.io',
    description: 'Watch YouTube content directly inside Stremio.',
    types: ['movie', 'series', 'channel'],
    logo: 'https://youtube.strem.io/logo.png',
  },
  {
    name: 'DuckieTV',
    transportUrl: 'https://duckietv.strem.io',
    description: 'Track your TV shows and get calendar-based episode reminders.',
    types: ['series'],
    logo: 'https://duckietv.strem.io/logo.png',
  },
  {
    name: 'Fanart',
    transportUrl: 'https://fanart.strem.io',
    description: 'High-quality fan art and posters for movies and series.',
    types: ['movie', 'series'],
    logo: 'https://fanart.strem.io/logo.png',
  },
  {
    name: 'IMDB',
    transportUrl: 'https://imdb.strem.io',
    description: 'IMDB ratings, reviews, and metadata for movies and series.',
    types: ['movie', 'series'],
    logo: 'https://imdb.strem.io/logo.png',
  },
  {
    name: 'Trakt',
    transportUrl: 'https://trakttv.strem.io',
    description: 'Track your watched content and discover new shows via Trakt.tv.',
    types: ['movie', 'series'],
    logo: 'https://trakttv.strem.io/logo.png',
  },
  {
    name: 'AdultSwim',
    transportUrl: 'https://adultswim.strem.io',
    description: 'Watch Adult Swim shows and clips.',
    types: ['series'],
    logo: 'https://adultswim.strem.io/logo.png',
  },
  {
    name: 'Crunchyroll',
    transportUrl: 'https://crunchyroll.strem.io',
    description: 'Watch anime from Crunchyroll directly in Stremio.',
    types: ['series'],
    logo: 'https://crunchyroll.strem.io/logo.png',
  },
];

/**
 * Case-insensitive fallback filter when the library is not available.
 */
function fallbackFilter(recommendations, query) {
  if (!query || typeof query !== 'string') return recommendations;
  const q = query.toLowerCase().trim();
  if (!q) return recommendations;
  return recommendations.filter(r => {
    const name = (r.name || '').toLowerCase();
    const desc = (r.description || '').toLowerCase();
    return name.includes(q) || desc.includes(q);
  });
}

module.exports = async (req, res) => {
  setSecurityHeaders(res);
  setPublicCors(req, res);
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed' });
    return;
  }

  try {
    if (req.method === 'POST') {
      const { query } = req.body || {};

      if (searchRecommendations && typeof searchRecommendations === 'function') {
        const results = searchRecommendations(query);
        res.status(200).json({ ok: true, recommendations: results });
      } else {
        const filtered = fallbackFilter(FALLBACK_RECOMMENDATIONS, query);
        res.status(200).json({ ok: true, recommendations: filtered });
      }
    } else {
      // GET — return all
      const all = getRecommendations ? getRecommendations() : FALLBACK_RECOMMENDATIONS;
      res.status(200).json({ ok: true, recommendations: all });
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Failed to load recommendations.' });
  }
};
