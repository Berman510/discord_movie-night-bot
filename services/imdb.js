/**
 * IMDb Service
 * Handles IMDb/OMDb API integration for movie data with fuzzy matching and spell checking
 */

const Fuse = require('fuse.js');
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

/**
 * Enhanced search with fuzzy matching and spell checking suggestions
 */
async function searchMovieWithSuggestions(title) {
  if (!OMDB_API_KEY) {
    console.warn('⚠️ OMDB_API_KEY not set - IMDb features disabled');
    return { results: null, suggestions: [] };
  }

  try {
    // First, try exact search
    const exactResults = await searchMovie(title);
    if (exactResults && exactResults.length > 0) {
      return { results: exactResults, suggestions: [] };
    }

    // If no exact results, try fuzzy search with common variations
    const suggestions = await generateSpellingSuggestions(title);
    let bestResults = null;
    let bestSuggestion = null;

    for (const suggestion of suggestions) {
      const suggestionResults = await searchMovie(suggestion);
      if (suggestionResults && suggestionResults.length > 0) {
        bestResults = suggestionResults;
        bestSuggestion = suggestion;
        break;
      }
    }

    return {
      results: bestResults,
      suggestions: bestSuggestion ? [bestSuggestion] : suggestions.slice(0, 3),
      originalTitle: title
    };
  } catch (error) {
    console.error('Error in enhanced movie search:', error.message);
    return { results: null, suggestions: [] };
  }
}

/**
 * Generate spelling suggestions for movie titles
 */
async function generateSpellingSuggestions(title) {
  const suggestions = [];

  // Common movie title corrections
  const commonCorrections = {
    // Common misspellings
    'teh': 'the',
    'adn': 'and',
    'fo': 'of',
    'wiht': 'with',
    'taht': 'that',
    'thier': 'their',
    'recieve': 'receive',
    'seperate': 'separate',
    'definately': 'definitely',

    // Movie-specific corrections
    'avengers': 'avengers',
    'spiderman': 'spider-man',
    'xmen': 'x-men',
    'starwars': 'star wars',
    'lordoftherings': 'lord of the rings',
    'harrypotter': 'harry potter',
    'jurassicpark': 'jurassic park',
    'backtothe': 'back to the',
    'indianajones': 'indiana jones',
    'missionimpossible': 'mission impossible'
  };

  // Apply common corrections
  let correctedTitle = title.toLowerCase();
  for (const [wrong, right] of Object.entries(commonCorrections)) {
    correctedTitle = correctedTitle.replace(new RegExp(wrong, 'gi'), right);
  }

  if (correctedTitle !== title.toLowerCase()) {
    suggestions.push(toTitleCase(correctedTitle));
  }

  // Generate variations
  const variations = [
    // Remove extra spaces
    title.replace(/\s+/g, ' ').trim(),
    // Add "The" prefix if not present
    title.toLowerCase().startsWith('the ') ? title.slice(4) : `The ${title}`,
    // Remove "The" prefix if present
    title.toLowerCase().startsWith('the ') ? title.slice(4) : title,
    // Replace numbers with words
    title.replace(/\b2\b/g, 'Two').replace(/\b3\b/g, 'Three').replace(/\b4\b/g, 'Four'),
    // Replace words with numbers
    title.replace(/\bTwo\b/gi, '2').replace(/\bThree\b/gi, '3').replace(/\bFour\b/gi, '4'),
    // Common abbreviations
    title.replace(/\b&\b/g, 'and').replace(/\band\b/gi, '&'),
    // Remove punctuation
    title.replace(/[^\w\s]/g, ''),
    // Add common suffixes
    `${title}: The Movie`,
    `${title} Movie`
  ];

  // Add unique variations
  variations.forEach(variation => {
    const trimmed = variation.trim();
    if (trimmed && trimmed !== title && !suggestions.includes(trimmed)) {
      suggestions.push(trimmed);
    }
  });

  return suggestions.slice(0, 5); // Return top 5 suggestions
}

/**
 * Convert string to title case
 */
function toTitleCase(str) {
  return str.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
  );
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
  // Always read from cache; no live fetch fallback
  const database = require('../database');
  if (!database || !database.isConnected) return null;
  try {
    const cached = await database.getImdbCache(imdbId);
    if (cached && cached.data) {
      try { return typeof cached.data === 'string' ? JSON.parse(cached.data) : cached.data; } catch { return cached.data; }
    }
    return null;
  } catch (e) {
    console.warn('IMDb cache read failed:', e.message);
    return null;
  }
}

module.exports = {
  searchMovie,
  searchMovieWithSuggestions,
  getMovieDetails,
  getMovieDetailsCached,
  formatMovieForEmbed
};
