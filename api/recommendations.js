/**
 * api/recommendations.js
 * Vercel serverless function — returns community-curated addon recommendations.
 * Public endpoint (no auth required). No rate limit (read-only).
 *
 * GET:  returns all recommendations
 * POST: { query: string } — filters recommendations by query string
 * POST: { transportUrl: string } — resolves an addon manifest server-side
 *       (avoids CORS issues when fetching manifests from addon servers)
 */

const { setSecurityHeaders } = require('../lib/securityHeaders');
const { setPublicCors } = require('../lib/cors');
const { hitRateLimit } = require('../lib/rateLimiter');
const { getClientIp } = require('../lib/ip');

// Block private/reserved IP ranges to prevent SSRF
const BLOCKED_HOSTS = /^(localhost|127\.|10\.\d|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.|::1|\[::1\])/i;

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
// Synced with lib/communityRecommendations.js — top 20 addons from stremio-addons.net by popularity
const FALLBACK_RECOMMENDATIONS = [
  {
    name: 'Torrentio',
    transportUrl: 'https://torrentio.strem.fun',
    description: 'Provides torrent streams from scraped torrent providers. Supports YTS, EZTV, RARBG, 1337x, ThePirateBay, and more with debrid support.',
    types: ['movie', 'series', 'anime'],
  },
  {
    name: 'Comet | ElfHosted',
    transportUrl: 'https://comet.stremio.ru/stremio',
    description: "Stremio's fastest torrent/debrid search add-on with comprehensive provider support.",
    types: ['movie', 'series', 'anime'],
  },
  {
    name: 'MediaFusion | ElfHosted',
    transportUrl: 'https://mediafusionfortheweebs.midnightignite.me',
    description: 'Open-source streaming platform for Movies, Series, and Live TV with extensive provider support.',
    types: ['movie', 'series', 'tv'],
  },
  {
    name: 'Streaming Catalogs',
    transportUrl: 'https://7a82163c306e-stremio-netflix-catalog-addon.baby-beamup.club',
    description: 'Trending movies and series on Netflix, HBO Max, Disney+, Apple TV+ and more.',
    types: ['movie', 'series'],
  },
  {
    name: 'AIOStreams | ElfHosted',
    transportUrl: 'https://aiostreams.elfhosted.com/stremio',
    description: 'Consolidates multiple Stremio addons and debrid services into a single, configurable addon.',
    types: ['movie', 'series'],
  },
  {
    name: 'USA TV',
    transportUrl: 'https://848b3516657c-usatv.baby-beamup.club',
    description: "Access channels across local, news, sports, entertainment, premium, lifestyle, kids' shows, and more.",
    types: ['tv'],
  },
  {
    name: 'The Movie Database Addon',
    transportUrl: 'https://94c8cb9f702d-tmdb-addon.baby-beamup.club',
    description: 'Rich metadata for movies and TV shows from TMDB with customizable catalogs and IMDb integration.',
    types: ['movie', 'series'],
  },
  {
    name: 'TOP Streaming',
    transportUrl: 'https://top-streaming.stream',
    description: 'Top 10 Catalog Lists from 40 main Streaming Platforms across 93 Countries.',
    types: ['movie', 'series'],
  },
  {
    name: 'ThePirateBay+',
    transportUrl: 'https://thepiratebay-plus.strem.fun',
    description: 'Search for movies, series and anime from ThePirateBay.',
    types: ['movie', 'series'],
  },
  {
    name: 'opensubtitles PRO',
    transportUrl: 'https://opensubtitlesv3-pro.dexter21767.com',
    description: 'Ad-free and spam-free subtitles addon with comprehensive multi-language support.',
    types: ['movie', 'series'],
  },
  {
    name: 'WebStreamr | Hayduk',
    transportUrl: 'https://webstreamr.hayd.uk',
    description: 'Provides HTTP URLs from streaming websites. Supports multiple languages including German, Spanish, French, Hindi, and more.',
    types: ['movie', 'series'],
  },
  {
    name: 'TorrentsDB',
    transportUrl: 'https://torrentsdb.com',
    description: 'Provides torrent streams from multiple providers with debrid service support.',
    types: ['movie', 'series', 'anime'],
  },
  {
    name: 'Marvel',
    transportUrl: 'https://addon-marvel.onrender.com',
    description: 'Watch the entire Marvel catalog! MCU and X-Men chronologically organized.',
    types: ['movie', 'series'],
  },
  {
    name: 'AutoStream',
    transportUrl: 'https://autostreamtest.onrender.com',
    description: 'Curated best-pick streams with optional debrid support and Nuvio direct-host.',
    types: ['movie', 'series'],
  },
  {
    name: 'FilmWhisper',
    transportUrl: 'https://filmwhisper.dev',
    description: 'Find movies and TV using natural language queries powered by AI.',
    types: ['movie', 'series'],
  },
  {
    name: 'IlCorsaroViola',
    transportUrl: 'https://corsaro.stremio.dpdns.org',
    description: 'Italian streaming from UIndex, CorsaroNero, Knaben and Jackettio with debrid support.',
    types: ['movie', 'series', 'anime'],
  },
  {
    name: 'StreamViX | ElfHosted',
    transportUrl: 'https://streamvix.hayd.uk',
    description: 'StreamViX addon with Vixsrc, Guardaserie, AnimeUnity, Eurostreaming, TV and Live Events.',
    types: ['movie', 'series', 'tv', 'anime'],
  },
  {
    name: 'Brazuca Torrents',
    transportUrl: 'https://94c8cb9f702d-brazuca-torrents.baby-beamup.club',
    description: 'Provides dubbed movie and series streams from Brazilian torrent providers.',
    types: ['movie', 'series', 'anime'],
  },
  {
    name: 'Minha TV',
    transportUrl: 'https://da5f663b4690-minhatv.baby-beamup.club',
    description: 'O Melhor do IPTV na sua TV — Best IPTV for your TV.',
    types: ['tv'],
  },
  {
    name: 'stremio-addons.net',
    transportUrl: 'https://web.strem.io',
    description: 'Provides the Community Stremio Addons catalog from stremio-addons.net.',
    types: ['movie', 'series', 'tv'],
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
      const { query, transportUrl } = req.body || {};

      // Resolve manifest for a single addon (server-side, no CORS)
      if (transportUrl) {
        if (typeof transportUrl !== 'string' || !/^https:\/\/.+/i.test(transportUrl)) {
          res.status(400).json({ ok: false, error: 'Invalid transportUrl. Must be HTTPS.' });
          return;
        }
        try {
          const urlObj = new URL(transportUrl);
          if (BLOCKED_HOSTS.test(urlObj.hostname)) {
            res.status(400).json({ ok: false, error: 'Private/internal URLs are not allowed.' });
            return;
          }
        } catch {
          res.status(400).json({ ok: false, error: 'Invalid URL.' });
          return;
        }
        const ip = getClientIp(req);
        const limit = hitRateLimit(`resolve:${ip}`, { max: 30, windowMs: 60_000 });
        if (limit.limited) {
          res.status(429).json({ ok: false, error: 'Rate limit exceeded.' });
          return;
        }
        try {
          const manifestUrl = transportUrl.replace(/\/+$/, '') + '/manifest.json';
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 10000);
          const fetchRes = await fetch(manifestUrl, {
            method: 'GET',
            signal: controller.signal,
            headers: { 'Accept': 'application/json' },
          });
          clearTimeout(timer);
          if (!fetchRes.ok) {
            res.status(200).json({ ok: false, error: `Manifest returned HTTP ${fetchRes.status}` });
          } else {
            const manifest = await fetchRes.json();
            res.status(200).json({ ok: true, manifest });
          }
        } catch (err) {
          res.status(200).json({ ok: false, error: err.name === 'AbortError' ? 'Manifest fetch timed out.' : 'Could not reach addon server.' });
        }
        return;
      }

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
