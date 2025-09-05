/**
 * Services Module
 * Exports all business logic services
 */

const imdbService = require('./imdb');
const sessionService = require('./sessions');
const discordEventService = require('./discord-events');
const timezoneService = require('./timezone');
const permissionService = require('./permissions');
const cleanupService = require('./cleanup');
const statsService = require('./stats');
const configurationService = require('./configuration');

module.exports = {
  imdb: imdbService,
  sessions: sessionService,
  discordEvents: discordEventService,
  timezone: timezoneService,
  permissions: permissionService,
  cleanup: cleanupService,
  stats: statsService,
  configuration: configurationService
};
