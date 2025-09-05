/**
 * IMDb Service
 * Handles IMDb/OMDb API integration for movie data
 */

const { OMDB_API_KEY } = process.env;

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

module.exports = {
  searchMovie,
  getMovieDetails,
  formatMovieForEmbed
};
