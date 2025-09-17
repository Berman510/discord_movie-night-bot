#!/usr/bin/env node

/**
 * Script to update database.js to use dynamic table names
 * This will replace hardcoded 'movie_sessions' references with dynamic table name calls
 */

const fs = require('fs');
const path = require('path');

const DATABASE_FILE = path.join(__dirname, '..', 'database.js');

// Functions that need to be updated to use dynamic table names
const FUNCTIONS_TO_UPDATE = [
  'createVotingSession',
  'getActiveVotingSession', 
  'getAllSessions',
  'updateSessionStatus',
  'updateSessionWinner',
  'updateSessionDetails',
  'getSessionById',
  'deleteSession',
  'updateSessionRSVP',
  'getVotingSessions',
  'updateSessionStatusToDecided',
  'associateMovieWithSession',
  'getGuildStats',
  'getSessionByAssociatedMovie',
  'getSessionsByGuild',
  'getSessionsWithWinners',
  'getActiveSessionsWithEvents',
  'updateSessionDiscordEvent',
  'removeSessionById',
  'updateSessionAssociatedMovie'
];

function updateDatabaseFile() {
  console.log('Reading database.js...');
  let content = fs.readFileSync(DATABASE_FILE, 'utf8');
  
  let changes = 0;
  
  // Pattern to match SQL queries with movie_sessions
  const patterns = [
    // Simple SELECT/INSERT/UPDATE/DELETE patterns
    {
      regex: /(`[^`]*\b)movie_sessions(\b[^`]*`)/g,
      replacement: (match, prefix, suffix) => {
        changes++;
        return `${prefix}\${sessionsTable}${suffix}`;
      }
    },
    // String concatenation patterns
    {
      regex: /('.*?\b)movie_sessions(\b.*?')/g,
      replacement: (match, prefix, suffix) => {
        changes++;
        return `${prefix}\${sessionsTable}${suffix}`;
      }
    }
  ];
  
  // Apply patterns
  patterns.forEach(pattern => {
    content = content.replace(pattern.regex, pattern.replacement);
  });
  
  // Now we need to add sessionsTable variable to functions that use it
  FUNCTIONS_TO_UPDATE.forEach(functionName => {
    const functionRegex = new RegExp(`(async ${functionName}\\([^)]*\\)\\s*{[^}]*?)(\\s*try\\s*{)`, 's');
    const match = content.match(functionRegex);
    
    if (match && !match[0].includes('getSessionsTableName')) {
      const replacement = match[0].replace(
        match[2], 
        `\n    const sessionsTable = await this.getSessionsTableName();${match[2]}`
      );
      content = content.replace(match[0], replacement);
      changes++;
      console.log(`Updated function: ${functionName}`);
    }
  });
  
  if (changes > 0) {
    console.log(`Making ${changes} changes...`);
    fs.writeFileSync(DATABASE_FILE, content);
    console.log('✅ Database file updated successfully!');
  } else {
    console.log('No changes needed.');
  }
}

if (require.main === module) {
  updateDatabaseFile();
}

module.exports = { updateDatabaseFile };
