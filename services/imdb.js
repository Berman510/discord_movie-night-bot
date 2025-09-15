/**
 * IMDb Service
 * Handles IMDb/OMDb API integration for movie data with fuzzy matching and spell checking
 */

// Conditional import for fuse.js to handle environments where it might not be installed
let Fuse = null;
try {
  Fuse = require('fuse.js');
  console.log('✅ fuse.js loaded successfully - spell checking enabled');
} catch (error) {
  console.warn('⚠️ fuse.js not available - spell checking suggestions will be disabled');
  console.warn('⚠️ Error details:', error.message);
}

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
 * Search for TV shows/series
 */
async function searchSeries(title) {
  if (!OMDB_API_KEY) {
    console.warn('⚠️ OMDB_API_KEY not set - IMDb features disabled');
    return null;
  }

  try {
    const response = await fetch(`http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(title)}&type=series`);
    const data = await response.json();

    if (data.Response === 'True' && data.Search) {
      return data.Search.slice(0, 10); // Return up to 10 results
    }

    return null;
  } catch (error) {
    console.error('Error searching IMDb for series:', error.message);
    return null;
  }
}

/**
 * Search for both movies and TV shows
 */
async function searchContent(title) {
  if (!OMDB_API_KEY) {
    console.warn('⚠️ OMDB_API_KEY not set - IMDb features disabled');
    return null;
  }

  try {
    // Search without type restriction to get both movies and series
    const response = await fetch(`http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&s=${encodeURIComponent(title)}`);
    const data = await response.json();

    if (data.Response === 'True' && data.Search) {
      return data.Search.slice(0, 10); // Return up to 10 results
    }

    return null;
  } catch (error) {
    console.error('Error searching IMDb for content:', error.message);
    return null;
  }
}

/**
 * Parse episode information from title
 * Supports formats like "Show Name S1E1", "Show Name Season 1 Episode 1", "Show Name 1x01", "Show Name Episode 101"
 */
function parseEpisodeInfo(title) {
  const episodePatterns = [
    // S1E1, S01E01, s1e1 format
    /^(.+?)\s+[Ss](\d+)[Ee](\d+)(?:\s|$)/,
    // Season 1 Episode 1 format
    /^(.+?)\s+[Ss]eason\s+(\d+)\s+[Ee]pisode\s+(\d+)(?:\s|$)/i,
    // 1x01, 1x1 format
    /^(.+?)\s+(\d+)x(\d+)(?:\s|$)/,
    // Episode 101, Episode 302 format (season + episode as 3 digits)
    /^(.+?)\s+[Ee]pisode\s+(\d)(\d{2})(?:\s|$)/,
    // Ep 101, Ep302 format
    /^(.+?)\s+[Ee]p\s*(\d)(\d{2})(?:\s|$)/,
    // Show Name - 302 format
    /^(.+?)\s*-\s*(\d)(\d{2})(?:\s|$)/
  ];

  for (const pattern of episodePatterns) {
    const match = title.match(pattern);
    if (match) {
      const [, showName, season, episode] = match;
      return {
        isEpisode: true,
        showName: showName.trim(),
        season: parseInt(season),
        episode: parseInt(episode),
        originalTitle: title
      };
    }
  }

  return { isEpisode: false, originalTitle: title };
}

/**
 * Search for a specific TV episode using OMDb API
 */
async function searchEpisode(showName, season, episode) {
  if (!OMDB_API_KEY) {
    console.warn('⚠️ OMDB_API_KEY not set - IMDb features disabled');
    return null;
  }

  try {
    const url = `http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(showName)}&Season=${season}&Episode=${episode}`;
    console.log(`🔍 Searching for episode: ${showName} S${season}E${episode}`);

    const response = await fetch(url);
    const data = await response.json();

    if (data.Response === 'True') {
      console.log(`✅ Found episode: ${data.Title} (${data.Year})`);
      return data;
    } else {
      console.log(`❌ Episode not found: ${data.Error || 'Unknown error'}`);
      return null;
    }
  } catch (error) {
    console.error('Error searching for episode:', error.message);
    return null;
  }
}

/**
 * Enhanced search with fuzzy matching and spell checking suggestions (movies, TV shows, and episodes)
 */
async function searchContentWithSuggestions(title) {
  if (!OMDB_API_KEY) {
    console.warn('⚠️ OMDB_API_KEY not set - IMDb features disabled');
    return { results: null, suggestions: [] };
  }

  try {
    // Check if this looks like an episode request
    const episodeInfo = parseEpisodeInfo(title);

    if (episodeInfo.isEpisode) {
      console.log(`🔍 Detected episode request: ${episodeInfo.showName} S${episodeInfo.season}E${episodeInfo.episode}`);

      // Search for the specific episode
      const episodeResult = await searchEpisode(episodeInfo.showName, episodeInfo.season, episodeInfo.episode);
      if (episodeResult) {
        return {
          results: [episodeResult],
          suggestions: [],
          isEpisode: true,
          episodeInfo: episodeInfo
        };
      }

      // If episode not found, try searching for the show itself
      console.log(`❌ Episode not found, searching for show: ${episodeInfo.showName}`);
      const showResults = await searchContent(episodeInfo.showName, 'series');
      if (showResults && showResults.length > 0) {
        return {
          results: showResults,
          suggestions: [],
          isEpisode: false,
          episodeInfo: episodeInfo,
          episodeNotFound: true
        };
      }
    }

    // First, try exact search for both movies and series
    const exactResults = await searchContent(title);
    if (exactResults && exactResults.length > 0) {
      return { results: exactResults, suggestions: [] };
    }

    // If no exact results, try fuzzy search with common variations (if available)
    if (!Fuse) {
      console.log('⚠️ Spell checking disabled - fuse.js not available');
      return { results: null, suggestions: [], originalTitle: title };
    }

    const suggestions = await generateSpellingSuggestions(title);
    let bestResults = null;
    let bestSuggestion = null;

    for (const suggestion of suggestions) {
      const suggestionResults = await searchContent(suggestion);
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
    console.error('Error in enhanced content search:', error.message);
    return { results: null, suggestions: [] };
  }
}

/**
 * Enhanced search with fuzzy matching and spell checking suggestions (movies only - for backward compatibility)
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
    'missionimpossible': 'mission impossible',

    // Specific movie corrections
    'matrixc': 'matrix',
    'matric': 'matrix',
    'matrxi': 'matrix',
    'matirx': 'matrix',
    'inceptoin': 'inception',
    'incepton': 'inception',
    'incpetion': 'inception',
    'avatr': 'avatar',
    'avater': 'avatar',
    'titanci': 'titanic',
    'titanik': 'titanic'
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

/**
 * Get details for any content (movie or series)
 */
async function getContentDetails(imdbId) {
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
    console.error('Error getting content details:', error.message);
    return null;
  }
}

/**
 * Get season information for a TV series
 */
async function getSeasonDetails(imdbId, season) {
  if (!OMDB_API_KEY) {
    console.warn('⚠️ OMDB_API_KEY not set - IMDb features disabled');
    return null;
  }

  try {
    const response = await fetch(`http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&i=${imdbId}&Season=${season}`);
    const data = await response.json();

    if (data.Response === 'True') {
      return data;
    }

    return null;
  } catch (error) {
    console.error('Error getting season details:', error.message);
    return null;
  }
}

function formatMovieForEmbed(movie) {
  if (!movie) return null;

  // Determine if this is a TV show, episode, or movie
  const isShow = movie.Type === 'series';
  const isEpisode = movie.Type === 'episode';
  const isTVContent = isShow || isEpisode;
  const emoji = isTVContent ? '📺' : '🍿';

  let typeLabel, title;

  if (isEpisode) {
    // For episodes, show series name with season/episode info
    const seriesTitle = movie.seriesID ? movie.seriesID : (movie.Title || '').split(' - ')[0];
    const episodeTitle = movie.Title || '';
    const season = movie.Season ? `S${movie.Season}` : '';
    const episode = movie.Episode ? `E${movie.Episode}` : '';
    const seasonEpisode = season && episode ? `${season}${episode}` : '';

    if (seasonEpisode && seriesTitle !== episodeTitle) {
      title = `${emoji} ${seriesTitle} - ${seasonEpisode} - ${episodeTitle}`;
    } else {
      title = `${emoji} ${episodeTitle}`;
    }
    typeLabel = 'TV Episode';
  } else if (isShow) {
    title = `${emoji} ${movie.Title}`;
    typeLabel = 'TV Show';
  } else {
    title = `${emoji} ${movie.Title}`;
    typeLabel = 'Movie';
  }

  const embed = {
    title: title,
    color: isTVContent ? 0xff6b35 : 0x5865f2, // Orange for TV content, blue for movies
    fields: [],
    thumbnail: movie.Poster && movie.Poster !== 'N/A' ? { url: movie.Poster } : null
  };

  // Add type indicator
  if (movie.Type && movie.Type !== 'N/A') {
    embed.fields.push({ name: 'Type', value: typeLabel, inline: true });
  }

  if (movie.Year && movie.Year !== 'N/A') {
    embed.fields.push({ name: isShow ? 'Years' : 'Year', value: movie.Year, inline: true });
  }

  if (movie.Rated && movie.Rated !== 'N/A') {
    embed.fields.push({ name: 'Rated', value: movie.Rated, inline: true });
  }

  // For TV shows, show total seasons; for episodes, show season/episode; for movies, show runtime
  if (isShow && movie.totalSeasons && movie.totalSeasons !== 'N/A') {
    embed.fields.push({ name: 'Seasons', value: movie.totalSeasons, inline: true });
  } else if (isEpisode) {
    if (movie.Season && movie.Episode) {
      embed.fields.push({ name: 'Season/Episode', value: `S${movie.Season}E${movie.Episode}`, inline: true });
    }
    if (movie.Runtime && movie.Runtime !== 'N/A') {
      embed.fields.push({ name: 'Runtime', value: movie.Runtime, inline: true });
    }
  } else if (!isTVContent && movie.Runtime && movie.Runtime !== 'N/A') {
    embed.fields.push({ name: 'Runtime', value: movie.Runtime, inline: true });
  }

  if (movie.Genre && movie.Genre !== 'N/A') {
    embed.fields.push({ name: 'Genre', value: movie.Genre, inline: false });
  }

  // For TV shows, show creator instead of director
  if (isShow && movie.Writer && movie.Writer !== 'N/A') {
    embed.fields.push({ name: 'Creator', value: movie.Writer, inline: true });
  } else if (!isShow && movie.Director && movie.Director !== 'N/A') {
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
  searchSeries,
  searchContent,
  searchMovieWithSuggestions,
  searchContentWithSuggestions,
  searchEpisode,
  parseEpisodeInfo,
  getMovieDetails,
  getContentDetails,
  getSeasonDetails,
  getMovieDetailsCached,
  formatMovieForEmbed
};
