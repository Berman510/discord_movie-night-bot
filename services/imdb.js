/**
 * IMDb Service
 * Handles IMDb/OMDb API integration for movie data
 */

const { OMDB_API_KEY, IMDB_CACHE_ENABLED, IMDB_CACHE_TTL_DAYS, IMDB_CACHE_MAX_ROWS } = process.env;

async function searchMovie(title) {
  if (!OMDB_API_KEY) {
    console.warn('⚠️ OMDB_API_KEY not set - IMDb features disabled');
    return null;
  }

  try {
    const response = await fetch(`http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(title)}&type=movie`);
    const data = await response.json();

    if (data.Response === 'True' && data.Search) {
      return data.Search.slice(0, 10); // Return up to 10 results
    }

    return null;
  } catch (error) {
    console.error('Error searching IMDb:', error.message);
    return null;
  }
}

async function getMovieDetails(imdbId) {
  if (!OMDB_API_KEY) {
    console.warn('⚠️ OMDB_API_KEY not set - IMDb features disabled');
    return null;
  }

  try {
    const response = await fetch(`http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdbId}&plot=short`);
    const data = await response.json();

    if (data.Response === 'True') {
      return data;
    }

    return null;
  } catch (error) {
    console.error('Error getting movie details:', error.message);
    return null;
  }
}

function formatMovieForEmbed(movie) {
  if (!movie) return null;

  const embed = {
    title: `🍿 ${movie.Title}`,
    color: 0x5865f2,
    fields: [],
    thumbnail: movie.Poster && movie.Poster !== 'N/A' ? { url: movie.Poster } : null
  };

  if (movie.Year && movie.Year !== 'N/A') {
    embed.fields.push({ name: 'Year', value: movie.Year, inline: true });
  }

  if (movie.Rated && movie.Rated !== 'N/A') {
    embed.fields.push({ name: 'Rated', value: movie.Rated, inline: true });
  }

  if (movie.Runtime && movie.Runtime !== 'N/A') {
    embed.fields.push({ name: 'Runtime', value: movie.Runtime, inline: true });
  }

  if (movie.Genre && movie.Genre !== 'N/A') {
    embed.fields.push({ name: 'Genre', value: movie.Genre, inline: false });
  }

  if (movie.Director && movie.Director !== 'N/A') {
    embed.fields.push({ name: 'Director', value: movie.Director, inline: true });
  }

  if (movie.Actors && movie.Actors !== 'N/A') {
    embed.fields.push({ name: 'Top Cast', value: movie.Actors, inline: false });
  }

  if (movie.Plot && movie.Plot !== 'N/A') {
    embed.description = movie.Plot;
  }

  if (movie.imdbRating && movie.imdbRating !== 'N/A') {
    embed.fields.push({ name: 'IMDb Rating', value: `⭐ ${movie.imdbRating}/10`, inline: true });
  }

  return embed;
}


async function getMovieDetailsCached(imdbId) {
  // Prefer cache when enabled; fall back to live fetch if missing or stale
  const cacheEnabled = String(IMDB_CACHE_ENABLED || 'true').toLowerCase() !== 'false';
  const ttlDays = parseInt(IMDB_CACHE_TTL_DAYS || '90', 10);
  const maxRows = parseInt(IMDB_CACHE_MAX_ROWS || '10000', 10);
  const ttlMs = isNaN(ttlDays) ? (90 * 86400000) : (ttlDays * 86400000);

  const database = require('../database');

  if (cacheEnabled && database && database.isConnected) {
    try {
      const cached = await database.getImdbCache(imdbId);
      if (cached && cached.data) {
        const refreshedAt = cached.last_refreshed ? new Date(cached.last_refreshed).getTime() : 0;
        const isFresh = ttlMs <= 0 ? true : (Date.now() - refreshedAt) < ttlMs;
        if (isFresh) {
          try { return typeof cached.data === 'string' ? JSON.parse(cached.data) : cached.data; } catch { return cached.data; }
        }
      }
    } catch (e) {
      console.warn('IMDb cache read failed:', e.message);
    }
  }

  // If no API key but we had a stale cache, still return it
  if (!OMDB_API_KEY) {
    if (cacheEnabled && database && database.isConnected) {
      try {
        const cached = await database.getImdbCache(imdbId);
        if (cached && cached.data) {
          try { return typeof cached.data === 'string' ? JSON.parse(cached.data) : cached.data; } catch { return cached.data; }
        }
      } catch {}
    }
    console.warn('⚠️ OMDB_API_KEY not set - IMDb features disabled');
    return null;
  }

  // Fetch live and update cache
  const live = await getMovieDetails(imdbId);
  if (live && cacheEnabled && database && database.isConnected) {
    try {
      await database.upsertImdbCache(imdbId, live);
      await database.evictImdbCacheOverLimit(maxRows);
    } catch (e) {
      console.warn('IMDb cache write/evict failed:', e.message);
    }
  }
  return live;
}

module.exports = {
  searchMovie,
  getMovieDetails,
  getMovieDetailsCached,
  formatMovieForEmbed
};
