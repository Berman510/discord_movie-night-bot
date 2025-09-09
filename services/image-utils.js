// Image utilities for Discord event cover composition
// Uses Jimp (pure JS) to convert portrait posters into 16:9 banners

const Jimp = require('jimp');

/**
 * Compose a 16:9 event cover image from a poster buffer.
 * - Creates a 1280x720 canvas (black background)
 * - Scales the poster to fit within the canvas (contain), preserving the whole poster
 * - Centers the poster, resulting in tasteful side letterboxing for portrait images
 * - Exports JPEG ~85 quality to keep size within Discord limits
 *
 * @param {Buffer} posterBuffer Raw image bytes (JPEG/PNG/etc.)
 * @param {number} width Target width (default 1280)
 * @param {number} height Target height (default 720)
 * @returns {Promise<Buffer>} JPEG buffer suitable for Discord Scheduled Event image
 */
async function composeEventCoverFromPoster(posterBuffer, width = 1280, height = 720) {
  const canvas = new Jimp(width, height, 0x000000FF); // opaque black
  const poster = await Jimp.read(posterBuffer);

  // Scale poster to fit within the canvas while preserving aspect ratio
  poster.scaleToFit(width, height, Jimp.RESIZE_BILINEAR);

  // Center it
  const x = Math.round((width - poster.bitmap.width) / 2);
  const y = Math.round((height - poster.bitmap.height) / 2);

  canvas.composite(poster, x, y);

  // Export as JPEG at a reasonable quality
  const out = await canvas.quality(85).getBufferAsync(Jimp.MIME_JPEG);
  return out;
}

module.exports = {
  composeEventCoverFromPoster,
};

